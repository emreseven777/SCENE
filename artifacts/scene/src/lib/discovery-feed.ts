import { useInfiniteQuery } from "@tanstack/react-query";
import { savedTmdbTitle, type Title } from "./catalog";
import { fetchProfiles, PROFILE_FIELDS, type Person, type ProfileRow } from "./store";
import { requireSupabase } from "./supabase";

const PAGE_SIZE = 24;
type Cursor = { profile_id: string; shared_favorites: number };
type FavoriteRow = { user_id: string; title_id: string; title_metadata: unknown };
type Page = { profiles: Person[]; titles: Record<string, Record<string, Title>>; next?: Cursor; legacy?: boolean };

export function useDiscoveryFeed(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["scene-discovery-feed", userId],
    enabled: Boolean(userId),
    initialPageParam: null as Cursor | null,
    getNextPageParam: (page: Page) => page.next,
    staleTime: 15_000,
    queryFn: async ({ pageParam, signal }): Promise<Page> => {
      const db = requireSupabase();
      const ranked = await db.rpc("scene_discover_candidates", {
        page_size: PAGE_SIZE + 1, after_shared: pageParam?.shared_favorites ?? null, after_id: pageParam?.profile_id ?? null,
      }).abortSignal(signal);
      // Older backends keep their client-side ranking, loaded only when this route is opened.
      const legacy = ranked.error?.code === "PGRST202";
      if (ranked.error && !legacy) throw ranked.error;
      const ranking = (ranked.data ?? []) as Cursor[];
      const ids = ranking.slice(0, PAGE_SIZE).map(({ profile_id }) => profile_id);
      const next = ranking.length > PAGE_SIZE ? ranking[PAGE_SIZE - 1] : undefined;
      if (!legacy && !ids.length) return { profiles: [], titles: {} };

      const [profiles, favorites] = await Promise.all(legacy ? [
        db.from("scene_profiles").select(PROFILE_FIELDS).abortSignal(signal),
        db.from("favorites").select("user_id,title_id,title_metadata").order("created_at").abortSignal(signal),
      ] : [
        fetchProfiles(ids, signal),
        db.from("favorites").select("user_id,title_id,title_metadata").in("user_id", ids).abortSignal(signal),
      ]);
      if (profiles.error) throw profiles.error;
      if (favorites.error) throw favorites.error;
      const rowsById = new Map((profiles.data as ProfileRow[]).map((row) => [row.id, row]));
      const favoriteIds: Record<string, string[]> = {};
      const titles: Page["titles"] = {};
      for (const item of favorites.data as FavoriteRow[]) {
        (favoriteIds[item.user_id] ??= []).push(item.title_id);
        const title = savedTmdbTitle(item.title_id, item.title_metadata);
        if (title) (titles[item.user_id] ??= {})[title.id] = title;
      }
      return {
        next, titles, legacy,
        profiles: (legacy ? [...rowsById.keys()].filter((id) => id !== userId) : ids).flatMap((id) => {
          const profile = rowsById.get(id);
          return profile ? [{ ...profile, favorites: favoriteIds[id] ?? [] }] : [];
        }),
      };
    },
  });
}
