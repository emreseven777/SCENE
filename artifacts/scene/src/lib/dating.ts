import { tmdbIdFor } from "./catalog";
import { GENRES, UNDISCLOSED, isTmdbPick, searchKey, type ProfileDetailsData } from "./profile-choices";
export const GENDERS = { woman: "Kadın", man: "Erkek", nonbinary: "Non-binary", other: "Diğer" };
export const LOOKING_FOR = { women: "Kadınlarla", men: "Erkeklerle", everyone: "Herkesle" };
export const GOALS = { relationship: "İlişki", dates: "Tanışma ve flört", friends: "Arkadaşlık", undecided: "Henüz karar vermedim" };

const cinemaId = (id: string) => tmdbIdFor(id) ?? id;

/** Return the other profile's IDs so its own catalog metadata still resolves. */
export function sharedFavorites(own: readonly string[], other: readonly string[]) {
  const mine = new Set(own.map(cinemaId));
  const seen = new Set<string>();
  return other.filter((id) => {
    const canonical = cinemaId(id);
    if (!mine.has(canonical) || seen.has(canonical)) return false;
    seen.add(canonical);
    return true;
  });
}

export const CINEMA_FIT_DESCRIPTION = "Ortak yapımlar %70, tür zevki %30 ağırlık taşır. Tür bilgisi eksikse yalnızca yapımlar karşılaştırılır.";

type CinemaSignals = ReturnType<typeof profileCinemaSignals>;

export function cinemaFit(left: CinemaSignals, right: CinemaSignals) {
  const sharedCount = sharedFavorites(left.titles, right.titles).length;
  const commonGenres = [...left.genres.entries()]
    .filter(([key]) => right.genres.has(key))
    .map(([key, genre]) => ({ label: genre.label, weight: Math.min(genre.weight, right.genres.get(key)!.weight) }))
    .sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label, "tr"))
    .map(({ label }) => label);
  if (left.titles.length < 3 || right.titles.length < 3) return { score: null, commonGenres, sharedCount };
  // Blend relative overlap with coverage of the smaller list so that adding
  // extra favorites to a long list does not erase a meaningful shared core.
  const union = left.titles.length + right.titles.length - sharedCount;
  const titleFit = .65 * sharedCount / union + .35 * sharedCount / Math.min(left.titles.length, right.titles.length);
  const genreFit = [...left.genres.entries()].reduce((total, [key, genre]) =>
    total + Math.min(genre.weight, right.genres.get(key)?.weight ?? 0), 0);
  const score = Math.round(100 * (left.genres.size && right.genres.size ? .7 * titleFit + .3 * genreFit : titleFit));
  return { score, commonGenres, sharedCount };
}

export function profileCinemaSignals(
  favorites: readonly string[],
  details: ProfileDetailsData | undefined,
  resolve: (id: string) => { genres: string[] } | undefined,
) {
  const titles = new Map<string, { genres: string[] } | undefined>();
  for (const id of favorites) {
    const canonical = cinemaId(id);
    if (!titles.get(canonical)?.genres.length) titles.set(canonical, resolve(id));
  }
  for (const field of ["movie", "series"] as const) {
    const pick = details?.[field];
    if (isTmdbPick(pick, field) && !titles.has(pick.id)) titles.set(pick.id, resolve(pick.id));
  }
  const genres = new Map<string, { label: string; weight: number }>();
  function addGenre(label: string) {
    const key = searchKey(label);
    if (!key) return;
    const existing = genres.get(key);
    genres.set(key, { label: existing?.label ?? GENRES.find((name) => searchKey(name) === key) ?? label,
      weight: (existing?.weight ?? 0) + 1 });
  }
  for (const title of titles.values()) {
    const unique = new Map((title?.genres ?? []).map((genre) => [searchKey(genre), genre]));
    for (const genre of unique.values()) addGenre(genre);
  }
  for (const genre of new Set(profileGenres(details))) addGenre(genre);
  const total = [...genres.values()].reduce((sum, genre) => sum + genre.weight, 0);
  for (const genre of genres.values()) genre.weight /= total;
  return { titles: [...titles.keys()], genres };
}

export function profileGenres(details: ProfileDetailsData | undefined) {
  return Array.isArray(details?.genres) ? details.genres.filter((genre) => GENRES.includes(genre)) : [];
}

export function selectedTrait(details: ProfileDetailsData | undefined, field: string) {
  const value = details?.[field];
  return typeof value === "string" && value !== UNDISCLOSED ? value : "";
}
