import assert from "node:assert/strict";
import test from "node:test";
import { byId } from "./catalog";
import { cinemaFit, profileCinemaSignals, sharedFavorites } from "./dating";

test("matches old and canonical favorites once and preserves the viewed profile's ID", () => {
  assert.deepEqual(sharedFavorites(["inception"], ["tmdb-movie-27205", "inception", "matrix"]), ["tmdb-movie-27205"]);
  assert.deepEqual(sharedFavorites(["tmdb-tv-1396"], ["breakingbad"]), ["breakingbad"]);
  assert.deepEqual(sharedFavorites(["tmdb-tv-1396"], ["tmdb-movie-1396"]), []);
});

test("does not overstate confidence when a profile only has two distinct titles", () => {
  const short = profileCinemaSignals(["tmdb-movie-27205", "inception", "matrix"], undefined, byId);
  const long = profileCinemaSignals(["matrix", "inception", "interstellar"], undefined, byId);
  const result = cinemaFit(short, long);
  assert.equal(result.score, null);
  assert.equal(result.sharedCount, 2);
  assert.ok(result.commonGenres.includes("Bilim Kurgu"));
});

test("score is reciprocal and exact matches rank above genre-only matches", () => {
  const own = profileCinemaSignals(["inception", "interstellar", "matrix"], undefined, byId);
  const exact = profileCinemaSignals(["matrix", "inception", "interstellar"], undefined, byId);
  const genre = profileCinemaSignals(["darknight", "parasite", "fightclub"], undefined, byId);
  assert.equal(cinemaFit(own, exact).score, 100);
  const partial = cinemaFit(own, genre);
  assert.equal(partial.score, cinemaFit(genre, own).score);
  assert.ok(partial.score! > 0 && partial.score! < 31);
  assert.equal(partial.sharedCount, 0);
});

test("repeated genres influence similarity without counting duplicate title aliases", () => {
  const favorites = ["inception", "matrix", "whiplash"];
  const own = profileCinemaSignals(favorites, undefined, byId);
  const withAlias = profileCinemaSignals([...favorites, "tmdb-movie-27205"], undefined, byId);
  assert.deepEqual(withAlias, own);
  const sciFi = profileCinemaSignals(["a", "b", "c"], undefined, () => ({ genres: ["Bilim Kurgu"] }));
  const music = profileCinemaSignals(["d", "e", "f"], undefined, () => ({ genres: ["Müzik"] }));
  assert.ok(cinemaFit(own, sciFi).score! > cinemaFit(own, music).score!);
});
