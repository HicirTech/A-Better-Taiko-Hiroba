/**
 * Synthetic songs throughout: what matters is the shape of a title collision, not which real songs
 * happen to collide today. The real duplicates are catalogue data and change with the site; a test
 * pinned to them would be testing Namco's release schedule.
 */
import { describe, expect, test } from "bun:test";

import { type Genre, resolveSongTitle, type Song } from "../src/index";

function song(songNo: string, title: string, ...genres: Genre[]): Song {
  return { songNo, title, genres };
}

const CATALOGUE: readonly Song[] = [
  song("100", "一つだけの歌", 6),
  song("200", "二重の歌", 1),
  song("300", "二重の歌", 6),
  song("400", "同ジャンルの歌", 2),
  song("500", "同ジャンルの歌", 2),
  song("600", "古いジャンルの歌", 6),
  song("700", "古いジャンルの歌", 6),
];

describe("resolveSongTitle", () => {
  test("a title only one song carries resolves to it", () => {
    expect(resolveSongTitle(CATALOGUE, "一つだけの歌", null)).toEqual({
      outcome: "resolved",
      songNo: "100",
    });
  });

  test("a title several songs carry names its candidates rather than picking one", () => {
    expect(resolveSongTitle(CATALOGUE, "二重の歌", null)).toEqual({
      outcome: "ambiguous",
      candidates: ["200", "300"],
    });
  });

  test("a title the catalogue does not carry says so, which a new song looks like", () => {
    expect(resolveSongTitle(CATALOGUE, "昨日追加された歌", 6)).toEqual({ outcome: "unknown" });
  });

  test("a genre hint separates two songs that share a title across genres", () => {
    expect(resolveSongTitle(CATALOGUE, "二重の歌", 1)).toEqual({
      outcome: "resolved",
      songNo: "200",
    });
    expect(resolveSongTitle(CATALOGUE, "二重の歌", 6)).toEqual({
      outcome: "resolved",
      songNo: "300",
    });
  });

  test("a genre hint that leaves both candidates standing resolves nothing", () => {
    expect(resolveSongTitle(CATALOGUE, "同ジャンルの歌", 2)).toEqual({
      outcome: "ambiguous",
      candidates: ["400", "500"],
    });
  });

  test("a genre no candidate lists is a stale catalogue, so still ambiguous with them all", () => {
    // The title exists, so this is never "unknown"; narrowing to nothing may not narrow at all.
    expect(resolveSongTitle(CATALOGUE, "古いジャンルの歌", 4)).toEqual({
      outcome: "ambiguous",
      candidates: ["600", "700"],
    });
  });

  test("matching is exact: neither a longer title nor a different case is the same song", () => {
    expect(resolveSongTitle(CATALOGUE, "一つだけの歌 (Remix)", 6)).toEqual({ outcome: "unknown" });
    expect(resolveSongTitle([song("800", "Fly Away", 1)], "fly away", 1)).toEqual({
      outcome: "unknown",
    });
  });

  test("an empty catalogue resolves nothing rather than throwing", () => {
    expect(resolveSongTitle([], "一つだけの歌", 6)).toEqual({ outcome: "unknown" });
  });
});
