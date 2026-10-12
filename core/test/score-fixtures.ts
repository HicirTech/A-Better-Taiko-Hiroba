import type { CrownState, Level, Score, ScoreRecord } from "../src/index";

export const READ_AT = "2026-10-10T12:00:00.000Z";
export const LATER = "2026-10-11T12:00:00.000Z";

export const RECORD: ScoreRecord = {
  highScore: 900000,
  good: 400,
  ok: 20,
  bad: 1,
  drumroll: 9,
  maxCombo: 300,
  stageCount: 2,
  clearCount: 2,
  fullComboCount: 0,
  donderfulComboCount: 0,
  options: { speed: 1, doron: false, abekobe: false, random: "none", supportChart: null },
};

export const listed = (songNo: string, level: Level, crown: CrownState = "silver"): Score => ({
  taikoNo: "000000000000",
  songNo,
  level,
  crown,
  scoreRank: crown === "none" ? null : 5,
  fidelity: "list",
  record: null,
  fetchedAt: READ_AT,
});

/** The details of a chart as its list showed it. */
export const detailOf = (score: Score, fetchedAt = READ_AT): Score => ({
  ...score,
  fidelity: "detail",
  record: RECORD,
  fetchedAt,
});
