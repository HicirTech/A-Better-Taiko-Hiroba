/**
 * The model's one testable promise is that every entity survives JSON whole — the use-case
 * boundary serializes everything it returns (epic #13). The literals here use non-default values
 * on purpose: a round trip that "passes" on zeros and empty strings proves nothing.
 */
import { describe, expect, test } from "bun:test";

import { type DanRecord, isBetterDanClearState, type Profile, type Score } from "../src/index";

function roundTrip<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const listOnlyScore: Score = {
  taikoNo: "000000000000",
  songNo: "1178",
  level: 4,
  crown: "played",
  scoreRank: 3,
  fidelity: "list",
  record: null,
  fetchedAt: "2026-07-26T09:00:00.000Z",
};

const detailScore: Score = {
  taikoNo: "000000000000",
  songNo: "1178",
  level: 4,
  crown: "gold",
  scoreRank: 6,
  fidelity: "detail",
  record: {
    highScore: 968200,
    good: 1710,
    ok: 41,
    bad: 25,
    drumroll: 146,
    maxCombo: 833,
    stageCount: 12,
    clearCount: 9,
    fullComboCount: 1,
    donderfulComboCount: 0,
    options: {
      speed: 2,
      doron: false,
      abekobe: false,
      random: "none",
      // The detail page never shows サポート譜面, so a detail-fed record cannot know it.
      supportChart: null,
    },
  },
  fetchedAt: "2026-07-26T09:00:00.000Z",
};

const profileWithoutDan: Profile = {
  taikoNo: "000000000000",
  nickname: "Donder",
  title: "電脳 神化 3.0",
  region: "香港",
  danLabelImageUrl: null,
  medal: { name: "どんメダル2026", count: 37 },
  myDonImageUrl: "https://donderhiroba.jp/imgsrc_mydon.php?taiko_no=000000000000",
  favoriteSong: { songNo: "1346", title: "サンプル曲アルファ" },
  favoriteFolderTitles: ["サンプル曲ベータ", "サンプル曲ガンマ"],
  summary: {
    countLevel: 5,
    crownCounts: { silver: 128, gold: 45, donderful: 3 },
    rankCounts: { 2: 4, 3: 11, 4: 25, 5: 40, 6: 52, 7: 30, 8: 14 },
  },
  fetchedAt: "2026-07-26T09:00:00.000Z",
};

const danRecord: DanRecord = {
  taikoNo: "000000000000",
  dan: 9,
  clearState: "redClear",
  hasRecord: true,
  totalScore: 2691580,
  totalCounts: { good: 1710, ok: 400, bad: 25, drumroll: 146, maxCombo: 1219, hits: 2256 },
  conditions: [
    { kind: "course", name: "魂ゲージ", requirement: "98%以上", achieved: "100%" },
    // The same condition, tightened song by song — one pair per 課題曲, not one for the run.
    {
      kind: "perSong",
      name: "可",
      songs: [
        { requirement: "18未満", achieved: "14回" },
        { requirement: "25未満", achieved: "22回" },
        { requirement: "30未満", achieved: "-回" },
      ],
    },
  ],
  conditionBests: [{ kind: "course", name: "不可", requirement: "33未満", achieved: "25回" }],
  songs: [
    {
      title: "課題曲その一",
      level: 4,
      record: { good: 570, ok: 14, bad: 8, drumroll: 49, maxCombo: 300, hits: 641 },
    },
    // Reached, played, and the run ended here — the third was never started.
    { title: "課題曲その二", level: 5, record: null },
    // 十段 masks its later songs outright, so there is no title to carry either.
    { title: null, level: null, record: null },
  ],
  updatedAt: "2026/06/15 16:20:59",
  fetchedAt: "2026-07-26T09:00:00.000Z",
};

describe("the model survives JSON whole", () => {
  test("a list-fidelity score, where null record means not known yet", () => {
    expect(roundTrip(listOnlyScore)).toEqual(listOnlyScore);
  });

  test("a detail-fidelity score carrying the full record", () => {
    expect(roundTrip(detailScore)).toEqual(detailScore);
  });

  test("a profile whose missing dan is a normal state", () => {
    expect(roundTrip(profileWithoutDan)).toEqual(profileWithoutDan);
  });

  test("a dan record with mixed-unit conditions kept as printed", () => {
    expect(roundTrip(danRecord)).toEqual(danRecord);
  });
});

describe("dan clear states rank the way the game ranks them", () => {
  test("the tier outranks the frame: a rainbow red pass is below a plain gold pass", () => {
    expect(isBetterDanClearState("goldClear", "redDonderful")).toBe(true);
    expect(isBetterDanClearState("redDonderful", "goldClear")).toBe(false);
  });

  test("within a tier, the frame decides", () => {
    expect(isBetterDanClearState("redFullCombo", "redClear")).toBe(true);
    expect(isBetterDanClearState("goldDonderful", "goldFullCombo")).toBe(true);
  });

  test("nothing beats itself, and everything beats none", () => {
    expect(isBetterDanClearState("goldDonderful", "goldDonderful")).toBe(false);
    expect(isBetterDanClearState("redClear", "none")).toBe(true);
  });
});

describe("the shaping decisions hold", () => {
  test("played is representable on a score fed by the detail page", () => {
    // crown_large_0 with stageCount > 0 is what the detail page's "played" looks like; the type
    // must allow the parser to say so.
    const playedFromDetail: Score = { ...detailScore, crown: "played" };
    expect(playedFromDetail.crown).toBe("played");
  });

  test("a detail-fidelity score may hold a null record: Hiroba's own not-played answer", () => {
    const notPlayed: Score = {
      ...listOnlyScore,
      fidelity: "detail",
      crown: "none",
      scoreRank: null,
    };
    expect(notPlayed.record).toBeNull();
  });

  test("a rank is knowable while the record is not, so it sits outside the record", () => {
    // The genre list names crown and rank in one image, and its Score has no record at all.
    expect(listOnlyScore.record).toBeNull();
    expect(listOnlyScore.scoreRank).toBe(3);
  });
});
