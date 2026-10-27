import type { CrownState, Level, RatingSystem, ScoreRank, Song } from "@abth/core";

import type { ListedChart, ListedChartsView, ScoresView, ScoreView } from "../shared/session-port";
import { DIFFICULTIES, type Difficulty } from "../shared/song-catalogue/types";
import { packData } from "./pack";
import { storyRecord } from "./plays";
import { STORY_SONGS } from "./songs";

const CROWNS: readonly CrownState[] = ["donderful", "gold", "silver", "silver", "played"];
const RANKS: readonly (ScoreRank | null)[] = [8, 7, 6, 5, 3];
const READ_AT = "2026-10-16T21:04:00.000Z";

const levelOf = (difficulty: Difficulty): Level => (DIFFICULTIES.indexOf(difficulty) + 1) as Level;

/** Which charts the made-up player has played: every Extreme, every other Hard, a few inner ones. */
const playedCharts = STORY_SONGS.flatMap((song, at) =>
  DIFFICULTIES.filter(
    (difficulty) =>
      song.levels[difficulty] !== null &&
      (difficulty === "oni" ||
        (difficulty === "hard" && at % 2 === 0) ||
        (difficulty === "ura" && at % 3 === 0)),
  ).map((difficulty, played) => ({ song, difficulty, turn: at + played })),
);

function scoreOf({ song, difficulty, turn }: (typeof playedCharts)[number]): ScoreView {
  const crown = CROWNS[turn % CROWNS.length] ?? "played";
  const rank = RANKS[turn % RANKS.length] ?? null;
  const bad = crown === "donderful" ? 0 : (turn * 7) % 40;
  const ok = crown === "donderful" ? 0 : (turn * 13) % 90;
  const maxCombo = song.charts[difficulty]?.maxCombo ?? 600;
  const record = storyRecord({
    highScore: 1_000_000 - ok * 900 - bad * 3000,
    good: maxCombo - ok - bad,
    ok,
    bad,
    maxCombo: crown === "silver" ? Math.floor(maxCombo * 0.7) : maxCombo - bad,
  });
  return {
    songTitle: song.title,
    genre: song.genres[0] ?? null,
    level: levelOf(difficulty),
    crown,
    scoreRank: rank,
    record,
    songNo: song.songNo,
    genres: song.genres,
    ranking: turn % 4 === 0 ? 1200 + turn * 37 : null,
    sections: [],
    recent: turn < 7 ? turn : null,
    fetchedAt: READ_AT,
  };
}

const songsOfLists: readonly Song[] = STORY_SONGS.map(({ songNo, title, genres }) => ({
  songNo,
  title,
  genres,
}));

/** The made-up player's kept scores. */
export const STORY_SCORES: ScoresView = {
  scores: playedCharts.map(scoreOf),
  unread: 0,
  songs: songsOfLists,
};

/** Every chart the lists name, the played ones with their crowns and hits. */
export const STORY_LISTED: ListedChartsView = {
  charts: STORY_SONGS.flatMap((song) =>
    DIFFICULTIES.filter((difficulty) => song.levels[difficulty] !== null).map(
      (difficulty): ListedChart => {
        const level = levelOf(difficulty);
        const score = STORY_SCORES.scores.find(
          (one) => one.songNo === song.songNo && one.level === level,
        );
        return {
          songNo: song.songNo,
          level,
          crown: score?.crown ?? "none",
          scoreRank: score?.scoreRank ?? null,
          hits:
            score === undefined
              ? null
              : {
                  highScore: score.record.highScore,
                  good: score.record.good,
                  ok: score.record.ok,
                  bad: score.record.bad,
                },
        };
      },
    ),
  ),
  songs: songsOfLists,
};

/** OurTaiko's V1 data for the stand-in's Extreme and inner charts, in its own shape. */
export const STORY_RATING_DATA = JSON.stringify(
  STORY_SONGS.map((song, at) => {
    const chart = (difficulty: Difficulty) => ({
      constant: ((song.levels[difficulty] ?? 8) * 10 + (at % 9)) / 10,
      totalNotes: song.charts[difficulty]?.maxCombo ?? 600,
      rollSeconds: 0,
      balloonCount: 0,
      composite: 20 + (at % 50),
      avgDensity: 30 + (at % 40),
      instDensity: 40 + (at % 30),
      separation: 10 + (at % 35),
      bpmChange: at % 10,
      hsChange: 0,
    });
    return {
      id: Number(song.songNo),
      title: song.title,
      constants: {
        oni: chart("oni"),
        ...(song.levels.ura === null ? {} : { ura: chart("ura") }),
      },
    };
  }),
);

const V2_KEY: Readonly<Partial<Record<Level, string>>> = { 3: "hard", 4: "oni", 5: "edit" };
/** A made-up main constant by level, before each chart's own share: Hard's lowest. */
const V2_MAIN: Readonly<Partial<Record<Level, number>>> = { 3: 4, 4: 9, 5: 10 };
// The scale's ends: V2's data measures every chart between them.
const onTheScale = (value: number) => Math.min(Math.max(value, 0), 15.5);

/** OurTaiko's V2 data made up for each Hard, Extreme and inner chart `scores` holds. */
function madeUpV2(scores: readonly ScoreView[]): string {
  const songs = new Map<string, Readonly<Record<string, unknown>>>();
  scores.forEach(({ songNo, level, record }, at) => {
    const key = V2_KEY[level];
    const base = V2_MAIN[level];
    if (key === undefined || base === undefined) {
      return;
    }
    const main = base + (at % 9) / 10;
    const chart = {
      sub_constant_1: onTheScale(main - 1),
      main_constant: onTheScale(main),
      sub_constant_2: onTheScale(main + 0.8),
      stamina: onTheScale(main - 1.5 + (at % 5) / 5),
      handspeed: onTheScale(main - 0.5 + (at % 7) / 7),
      burst: onTheScale(main + (at % 4) / 4),
      complex: onTheScale(main - 2 + (at % 6) / 6),
      rhythm: onTheScale(main - 1 + (at % 8) / 8),
      // As many notes as the play met, so each play is rated by its own hits.
      totalNotes: record === null ? 600 : record.good + record.ok + record.bad,
    };
    songs.set(songNo, { ...songs.get(songNo), [key]: chart });
  });
  return JSON.stringify(Object.fromEntries(songs));
}

/** OurTaiko's V2 data for the made-up player's Hard, Extreme and inner charts, in its own shape. */
export const STORY_RATING_DATA_V2 = madeUpV2(STORY_SCORES.scores);

/** The scores, listed charts and OurTaiko data a whole page reads: the pack's, else made up. */
export const PAGE_SCORES: ScoresView = packData("scores") ?? STORY_SCORES;
export const PAGE_LISTED: ListedChartsView = packData("listedCharts") ?? STORY_LISTED;
export const PAGE_RATING_DATA: Readonly<Record<RatingSystem, string>> = {
  ourtaikoV1: packData("ratingData") ?? STORY_RATING_DATA,
  // Made up for the scores shown, the pack's too, where the pack holds no V2 data.
  ourtaikoV2: packData("ratingDataV2") ?? madeUpV2(PAGE_SCORES.scores),
};
