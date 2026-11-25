import { tmdbIdFor } from "./catalog";
import { GENRES, UNDISCLOSED, isTmdbPick, searchKey, type ProfileDetailsData } from "./profile-choices";
export const GENDERS = { woman: "Kadın", man: "Erkek", nonbinary: "Non-binary", other: "Diğer" };
export const LOOKING_FOR = { women: "Kadınlarla", men: "Erkeklerle", everyone: "Herkesle" };
export const GOALS = { relationship: "İlişki", dates: "Tanışma ve flört", friends: "Arkadaşlık", undecided: "Henüz karar vermedim" };

function overlap(left: readonly string[], right: readonly string[]) {
  const a = new Set(left);
  const b = new Set(right);
  return [...a].filter((value) => b.has(value)).length / new Set([...a, ...b]).size;
}

export const CINEMA_FIT_DESCRIPTION = "Ortak favori yapımlar %75, ortak türler %25 ağırlık taşır. Paylaşılan profil favorileri de hesaba katılır. Tür bilgisi eksikse yalnızca yapımlar karşılaştırılır.";

export function cinemaFit(
  left: readonly string[], right: readonly string[],
  leftGenres: readonly string[] = [], rightGenres: readonly string[] = [],
): number | null {
  if (new Set(left).size < 3 || new Set(right).size < 3) return null;
  const titles = overlap(left, right);
  const genres = leftGenres.length && rightGenres.length ? overlap(leftGenres, rightGenres) : null;
  return Math.round(100 * (genres === null ? titles : .75 * titles + .25 * genres));
}

export function profileCinemaSignals(
  favorites: readonly string[],
  details: ProfileDetailsData | undefined,
  resolve: (id: string) => { genres: string[] } | undefined,
) {
  const titles = new Set(favorites.map((id) => tmdbIdFor(id) ?? id));
  for (const field of ["movie", "series"] as const) {
    if (isTmdbPick(details?.[field], field)) titles.add(details[field].id);
  }
  const genres = new Map<string,string>();
  for (const genre of [...favorites.flatMap((id) => resolve(id)?.genres ?? []), ...profileGenres(details)]) {
    const key = searchKey(genre);
    if (key) genres.set(key, GENRES.find((label) => searchKey(label) === key) ?? genre);
  }
  return { titles: [...titles], genres: [...genres.values()] };
}

export function profileGenres(details: ProfileDetailsData | undefined) {
  return Array.isArray(details?.genres) ? details.genres.filter((genre) => GENRES.includes(genre)) : [];
}

export function selectedTrait(details: ProfileDetailsData | undefined, field: string) {
  const value = details?.[field];
  return typeof value === "string" && value !== UNDISCLOSED ? value : "";
}
