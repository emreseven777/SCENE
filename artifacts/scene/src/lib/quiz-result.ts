export const cinemaPersonalities = ["Bilim kurgu ve fantastik", "Dram ve romantik", "Komedi"];

const quizResultPrefix = "[MOVIA:QUIZ] ";

export type QuizResult =
  | { kind: "trivia"; correct: number; total: number }
  | { kind: "personality"; genres: string[] };

export function quizResultMessage(result: QuizResult) {
  return quizResultPrefix + JSON.stringify(result);
}

export function readQuizResult(body: string): QuizResult | undefined {
  if (!body.startsWith(quizResultPrefix) || body.length > 300) return;
  try {
    const value: unknown = JSON.parse(body.slice(quizResultPrefix.length));
    if (typeof value !== "object" || value === null) return;
    const result = value as Partial<Record<"kind" | "correct" | "total" | "genres", unknown>>;
    if (result.kind === "trivia" && typeof result.correct === "number" && typeof result.total === "number"
      && Number.isInteger(result.correct) && Number.isInteger(result.total)
      && result.total > 0 && result.total <= 30 && result.correct >= 0 && result.correct <= result.total) {
      return { kind: result.kind, correct: result.correct, total: result.total };
    }
    if (result.kind === "personality" && Array.isArray(result.genres) && result.genres.length > 0
      && result.genres.length <= cinemaPersonalities.length
      && result.genres.every((genre) => cinemaPersonalities.includes(genre))) {
      return { kind: result.kind, genres: [...new Set<string>(result.genres)] };
    }
  } catch {
    // Text that isn't a valid card remains an ordinary message.
  }
  return undefined;
}

export function quizResultLabel(result: QuizResult) {
  return result.kind === "trivia" ? `${result.correct} / ${result.total} doğru` : result.genres.join(" · ");
}
