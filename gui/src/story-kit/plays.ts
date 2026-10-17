import type { CrownState, Level, RecentPlay, ScoreRank, ScoreRecord } from "@abth/core";

import { packData } from "./pack";
import { storySong } from "./songs";

/** A made-up record of a cleared Extreme play; every field can be changed. */
export const storyRecord = (changes: Partial<ScoreRecord> = {}): ScoreRecord => ({
  highScore: 987650,
  good: 812,
  ok: 23,
  bad: 4,
  drumroll: 61,
  maxCombo: 655,
  stageCount: 12,
  clearCount: 9,
  fullComboCount: 3,
  donderfulComboCount: 1,
  options: { speed: 1, doron: false, abekobe: false, random: "none", supportChart: false },
  ...changes,
});

interface PlayShape {
  readonly level?: Level;
  readonly crown?: CrownState;
  readonly scoreRank?: ScoreRank | null;
  readonly record?: Partial<ScoreRecord>;
}

/** A recent play of a stand-in song, named as Hiroba names it. */
export function storyPlay(songNo: string, shape: PlayShape = {}): RecentPlay {
  const song = storySong(songNo);
  return {
    songTitle: song.title,
    genre: song.genres[0] ?? null,
    level: shape.level ?? 4,
    crown: shape.crown ?? "gold",
    scoreRank: shape.scoreRank === undefined ? 6 : shape.scoreRank,
    record: storyRecord(shape.record),
  };
}

const PLAIN = {
  speed: 1,
  doron: false,
  abekobe: false,
  random: "none",
  supportChart: false,
} as const;

/** Recent plays with every crown, a few ranks and each kind of play option. */
export const STORY_PLAYS: readonly RecentPlay[] = [
  storyPlay("1005", { level: 5, crown: "donderful", scoreRank: 8, record: { ok: 0, bad: 0 } }),
  storyPlay("1001"),
  storyPlay("1008", {
    crown: "silver",
    scoreRank: 5,
    record: { highScore: 912300, ok: 61, bad: 18, options: { ...PLAIN, speed: 2 } },
  }),
  storyPlay("1012", {
    level: 3,
    crown: "played",
    scoreRank: 3,
    record: { highScore: 602100, bad: 96, options: { ...PLAIN, doron: true, random: "kimagure" } },
  }),
  storyPlay("1010", {
    crown: "played",
    scoreRank: null,
    record: { highScore: 254300, good: 301, ok: 112, bad: 240, drumroll: 12, maxCombo: 48 },
  }),
  storyPlay("1002", {
    level: 2,
    record: { options: { ...PLAIN, abekobe: true, random: "detarame", supportChart: true } },
  }),
  storyPlay("1009", { crown: "gold", scoreRank: 7, record: { options: { ...PLAIN, speed: 3.5 } } }),
];

/** The recent plays a whole page reads: the resource pack's, else the made-up ones. */
export const PAGE_PLAYS: readonly RecentPlay[] = packData("recentPlays") ?? STORY_PLAYS;
