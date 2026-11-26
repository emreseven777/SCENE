import { useInfiniteQuery } from "@tanstack/react-query";
import { savedTmdbTitle, type Title } from "./catalog";
import { PROFILE_FIELDS, type Person, type ProfileRow } from "./store";
import { requireSupabase } from "./supabase";

const PAGE_SIZE = 24;
type Cursor = { profile_id: string; shared_favorites: number };
type FavoriteRow = { user_id: string; title_id: string; title_metadata: unknown };
type Page = { profiles: Person[]; titles: Record<string, Record<string, Title>>; next?: Cursor };

export function useDiscoveryFeed(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["scene-discovery-feed", userId],
    enabled: Boolean(userId),
    initialPageParam: null as Cursor | null,
    getNextPageParam: (page: Page | null) => page?.next,
    queryFn: async ({ pageParam, signal }): Promise<Page | null> => {
      const db = requireSupabase();
      const { data, error } = await db.rpc("scene_discover_candidates", {
        page_size: PAGE_SIZE + 1, after_shared: pageParam?.shared_favorites ?? null, after_id: pageParam?.profile_id ?? null,
      }).abortSignal(signal);
      if (error?.code === "PGRST202") return null; // Keep older database deployments compatible.
      if (error) throw error;

      const ranked = (data as Cursor[]).slice(0, PAGE_SIZE);
      const next = data.length > PAGE_SIZE ? ranked.at(-1) : undefined;
      if (!ranked.length) return { profiles: [], titles: {} };

      const ids = ranked.map((row) => row.profile_id);
      const [profiles, favorites] = await Promise.all([
        db.from("scene_profiles").select(PROFILE_FIELDS).in("id", ids).abortSignal(signal),
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
        next, titles,
        profiles: ids.flatMap((id) => {
          const profile = rowsById.get(id);
          return profile ? [{ ...profile, favorites: favoriteIds[id] ?? [] }] : [];
        }),
      };
    },
  });
}
