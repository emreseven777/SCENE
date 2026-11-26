import { strict as assert } from "node:assert";
import { test } from "node:test";
import { quizResultLabel, quizResultMessage, readQuizResult } from "./quiz-result";

test("round trips each quiz result as a chat card", () => {
  const score = { kind: "trivia", correct: 8, total: 10 } as const;
  assert.deepEqual(readQuizResult(quizResultMessage(score)), score);
  assert.equal(quizResultLabel(score), "8 / 10 doğru");
  const profile = { kind: "personality", genres: ["Komedi", "Dram ve romantik"] } as const;
  assert.deepEqual(readQuizResult(quizResultMessage({ ...profile, genres: [...profile.genres] })), profile);
});

test("keeps malformed or unsupported quiz cards as text", () => {
  for (const payload of ["", "{}", '{"kind":"trivia","correct":11,"total":10}',
    '{"kind":"trivia","correct":1.5,"total":10}', '{"kind":"personality","genres":["Unknown"]}']) {
    assert.equal(readQuizResult("[MOVIA:QUIZ] " + payload), undefined);
  }
  assert.equal(readQuizResult("normal message"), undefined);
});
