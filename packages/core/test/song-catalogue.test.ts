/**
 * The catalogue is fed by `score_list.php?genre=N` — the site has no separate song-picker page to
 * read — so these tests start from what the list parser emits: one Song per song number, ura
 * folded into its song already.
 */
import { describe, expect, test } from "bun:test";

import { type Genre, mergeGenreIntoCatalogue, type Song } from "../src/index";

function song(songNo: string, title: string, ...genres: Genre[]): Song {
  return { songNo, title, genres };
}

describe("mergeGenreIntoCatalogue", () => {
  test("an empty catalogue takes the whole genre", () => {
    const merged = mergeGenreIntoCatalogue([], 1, [
      song("1002", "二番目", 1),
      song("1001", "最初", 1),
    ]);

    expect(merged).toEqual([song("1001", "最初", 1), song("1002", "二番目", 1)]);
  });

  test("a song in two genres is one song whose genres accumulate", () => {
    const afterFirst = mergeGenreIntoCatalogue([], 1, [song("1001", "両方の歌", 1)]);

    const afterSecond = mergeGenreIntoCatalogue(afterFirst, 4, [song("1001", "両方の歌", 4)]);

    expect(afterSecond).toHaveLength(1);
    expect(afterSecond[0]?.genres).toEqual([1, 4]);
  });

  test("the result does not depend on the order the genres were fetched in", () => {
    const oneThenFour = mergeGenreIntoCatalogue(
      mergeGenreIntoCatalogue([], 1, [song("1001", "両方の歌", 1), song("1003", "一だけ", 1)]),
      4,
      [song("1001", "両方の歌", 4), song("1002", "四だけ", 4)],
    );

    const fourThenOne = mergeGenreIntoCatalogue(
      mergeGenreIntoCatalogue([], 4, [song("1001", "両方の歌", 4), song("1002", "四だけ", 4)]),
      1,
      [song("1001", "両方の歌", 1), song("1003", "一だけ", 1)],
    );

    expect(oneThenFour).toEqual(fourThenOne);
  });

  test("re-fetching a genre adds the new song and leaves the others the very same objects", () => {
    const known = mergeGenreIntoCatalogue([], 1, [
      song("1001", "古い歌", 1),
      song("1002", "別の歌", 1),
    ]);

    const merged = mergeGenreIntoCatalogue(known, 1, [
      song("1001", "古い歌", 1),
      song("1002", "別の歌", 1),
      song("1500", "新曲", 1),
    ]);

    expect(merged).toHaveLength(3);
    expect(merged[0]).toBe(known[0] as Song);
    expect(merged[1]).toBe(known[1] as Song);
    expect(merged[2]).toEqual(song("1500", "新曲", 1));
  });

  test("a corrected title is written in place, not added beside the old one", () => {
    const known = mergeGenreIntoCatalogue([], 1, [song("1001", "誤った表記", 1)]);

    const merged = mergeGenreIntoCatalogue(known, 1, [song("1001", "正しい表記", 1)]);

    expect(merged).toEqual([song("1001", "正しい表記", 1)]);
  });

  test("a song the genre no longer lists loses that genre and stays under the others", () => {
    const known = [song("1001", "移った歌", 1, 4)];

    const merged = mergeGenreIntoCatalogue(known, 1, []);

    expect(merged).toEqual([song("1001", "移った歌", 4)]);
  });

  test("a retired song that belonged to no other genre leaves the catalogue", () => {
    const known = [song("1001", "残る歌", 1), song("1002", "引退した歌", 1)];

    const merged = mergeGenreIntoCatalogue(known, 1, [song("1001", "残る歌", 1)]);

    expect(merged).toEqual([song("1001", "残る歌", 1)]);
  });

  test("re-reading one genre never touches a song that lives in another", () => {
    const known = [song("2001", "四の歌", 4)];

    const merged = mergeGenreIntoCatalogue(known, 1, [song("1001", "一の歌", 1)]);

    expect(merged).toHaveLength(2);
    expect(merged[1]).toBe(known[0] as Song);
  });
});
