import { canonicalTitle, savedTmdbTitle, type Title, type TitleType } from "./catalog";
import { requireSupabase } from "./supabase";

export async function fetchCatalog(query: string, type: TitleType | "all", page: number, signal: AbortSignal) {
  const { data, error } = await requireSupabase().functions.invoke<{ titles: Title[]; nextPage: number | null }>(
    "tmdb-catalog",
    { body: { query, type, page }, signal },
  );
  if (error || !data) throw error ?? new Error("Katalog yüklenemedi.");
  const titles = data.titles.flatMap((item) => {
    const title = savedTmdbTitle(item.id, item);
    return title ? [canonicalTitle(title)] : [];
  });
  return { titles, nextPage: data.nextPage };
}
