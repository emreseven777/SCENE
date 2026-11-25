export const GENDERS = { woman: "Kadın", man: "Erkek", nonbinary: "Non-binary", other: "Diğer" };
export const LOOKING_FOR = { women: "Kadınlarla", men: "Erkeklerle", everyone: "Herkesle" };
export const GOALS = { relationship: "İlişki", dates: "Tanışma ve flört", friends: "Arkadaşlık", undecided: "Henüz karar vermedim" };

export function cinemaFit(left: string[], right: string[]): number | null {
  const a = new Set(left);
  const b = new Set(right);
  if (a.size < 3 || b.size < 3) return null;
  const common = [...a].filter((id) => b.has(id)).length;
  return Math.round(100 * common / new Set([...a, ...b]).size);
}
