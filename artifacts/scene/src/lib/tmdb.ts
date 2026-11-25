import { canonicalTitle, savedTmdbTitle, type Title, type TitleType } from "./catalog";
import { isTmdbPick, type TmdbField, type TmdbPick } from "./profile-choices";
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

export async function fetchCinema(type: TitleType, genre: number | null, year: number | null, sort: string, page: number, signal: AbortSignal) {
  const { data, error } = await requireSupabase().functions.invoke<{ titles: Title[]; nextPage: number | null }>(
    "tmdb-catalog", { body: { mode: "discover", query: "", type, genre, year, sort, page }, signal },
  );
  if (error || !data) throw error ?? new Error("Sinema kataloğu yüklenemedi.");
  const titles = data.titles.flatMap((item) => {
    const title = savedTmdbTitle(item.id, item);
    return title ? [{ ...title, id: canonicalTitle(title).id, tmdbId: title.id }] : [];
  });
  return { titles, nextPage: data.nextPage };
}

export interface CinemaDetails { overview: string; cast: string[]; rating: number | null; trailer: string | null }

export async function fetchCinemaDetails(id: string, signal: AbortSignal) {
  const { data, error } = await requireSupabase().functions.invoke<CinemaDetails>(
    "tmdb-catalog", { body: { mode: "details", id }, signal },
  );
  if (error || !data) throw error ?? new Error("Yapım ayrıntıları yüklenemedi.");
  return data;
}

export async function searchProfileTmdb(field: TmdbField, query: string, page: number, signal: AbortSignal) {
  const { data, error } = await requireSupabase().functions.invoke<{ results: TmdbPick[]; nextPage: number | null }>(
    "tmdb-catalog", { body: { mode: "profile-search", field, query, page }, signal },
  );
  if (error || !data || !Array.isArray(data.results)) throw error ?? new Error("Arama yapılamadı.");
  return { results: data.results.filter((item) => isTmdbPick(item, field)), nextPage: data.nextPage };
}
