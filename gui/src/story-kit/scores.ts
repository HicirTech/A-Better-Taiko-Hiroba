import type { CrownState, Level, ScoreRank, Song } from "@abth/core";

import type { ListedChart, ListedChartsView, ScoresView, ScoreView } from "../session-port";
import { DIFFICULTIES, type Difficulty } from "../song-catalogue/types";
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

/** The scores, listed charts and OurTaiko data a whole page reads: the pack's, else made up. */
export const PAGE_SCORES: ScoresView = packData("scores") ?? STORY_SCORES;
export const PAGE_LISTED: ListedChartsView = packData("listedCharts") ?? STORY_LISTED;
export const PAGE_RATING_DATA: string = packData("ratingData") ?? STORY_RATING_DATA;
