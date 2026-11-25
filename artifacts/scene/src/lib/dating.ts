export const GENDERS = { woman: "Kadın", man: "Erkek", nonbinary: "Non-binary", other: "Diğer" };
export const LOOKING_FOR = { women: "Kadınlarla", men: "Erkeklerle", everyone: "Herkesle" };
export const GOALS = { relationship: "İlişki", dates: "Tanışma ve flört", friends: "Arkadaşlık", undecided: "Henüz karar vermedim" };

function overlap(left: readonly string[], right: readonly string[]) {
  const a = new Set(left);
  const b = new Set(right);
  return [...a].filter((value) => b.has(value)).length / new Set([...a, ...b]).size;
}

export const CINEMA_FIT_DESCRIPTION = "Ortak favorilerin payı %75, ortak türlerin payı %25 ağırlık taşır. Tür bilgisi eksikse oran yalnızca favorilere dayanır.";

export function cinemaFit(
  left: readonly string[], right: readonly string[],
  leftGenres: readonly string[] = [], rightGenres: readonly string[] = [],
): number | null {
  if (new Set(left).size < 3 || new Set(right).size < 3) return null;
  const titles = overlap(left, right);
  const genres = leftGenres.length && rightGenres.length ? overlap(leftGenres, rightGenres) : null;
  return Math.round(100 * (genres === null ? titles : .75 * titles + .25 * genres));
}
