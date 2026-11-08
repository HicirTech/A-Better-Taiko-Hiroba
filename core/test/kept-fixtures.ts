import type {
  RatingHistory,
  RatingSnapshot,
  Score,
  ScoreBook,
  ScoreChange,
  ScoreChangeLog,
} from "../src/index";

export const PLAYER = "000000000000";

export const listed: Score = {
  taikoNo: PLAYER,
  songNo: "1178",
  level: 4,
  crown: "gold",
  scoreRank: 6,
  fidelity: "list",
  record: null,
  fetchedAt: "2026-10-10T12:00:00.000Z",
  ranking: null,
  sections: [],
};
export const detailed: Score = {
  ...listed,
  level: 5,
  fidelity: "detail",
  record: {
    highScore: 950180,
    good: 900,
    ok: 12,
    bad: 0,
    drumroll: 30,
    maxCombo: 912,
    stageCount: 4,
    clearCount: 4,
    fullComboCount: 2,
    donderfulComboCount: 0,
    options: { speed: 1.5, doron: false, abekobe: false, random: "none", supportChart: null },
  },
  ranking: 5503,
  sections: [{ crown: "gold", score: 139020, good: 100, ok: 6, bad: 0, drumroll: 0 }],
};
export const BOOK: ScoreBook = {
  songs: [{ songNo: "1178", title: "サンプル曲", genres: [1, 6] }],
  scores: { "1178/4": listed, "1178/5": detailed },
  stale: ["1178/5"],
  unlisted: [{ songTitle: "新曲", genre: 2, level: 4 }],
  full: false,
};

export const NO_HITS = { good: null, ok: null, bad: null, drumroll: null, maxCombo: null } as const;
export const HITS = { good: 900, ok: 12, bad: 0, drumroll: 30, maxCombo: 912 } as const;

/** 1178's Ura, first cleared, then played again for a better score. */
export const CHANGES: readonly ScoreChange[] = [
  {
    songNo: "1178",
    level: 5,
    from: {
      crown: "none",
      scoreRank: null,
      highScore: null,
      stageCount: null,
      clearCount: null,
      fullComboCount: null,
      donderfulComboCount: null,
      ...NO_HITS,
      fetchedAt: "2026-10-09T12:00:00.000Z",
    },
    to: {
      crown: "silver",
      scoreRank: 5,
      highScore: 940000,
      stageCount: 3,
      clearCount: 3,
      fullComboCount: 0,
      donderfulComboCount: 0,
      ...HITS,
      fetchedAt: "2026-10-10T12:00:00.000Z",
    },
  },
  {
    songNo: "1178",
    level: 5,
    from: {
      crown: "silver",
      scoreRank: 5,
      highScore: 940000,
      stageCount: 3,
      clearCount: 3,
      fullComboCount: 0,
      donderfulComboCount: 0,
      ...NO_HITS,
      fetchedAt: "2026-10-10T12:00:00.000Z",
    },
    to: {
      crown: "gold",
      scoreRank: 6,
      highScore: 950180,
      stageCount: 4,
      clearCount: 4,
      fullComboCount: 2,
      donderfulComboCount: 0,
      ...HITS,
      fetchedAt: "2026-10-11T12:00:00.000Z",
    },
  },
];
export const LOG: ScoreChangeLog = { baselined: true, changes: CHANGES };

export const snapshot = (at: string, rating: number): RatingSnapshot => ({
  at,
  figures: [
    { figure: "rating", value: rating, compensated: false },
    { figure: "stamina", value: 7.5, compensated: true },
  ],
  charts: [
    {
      songNo: "1178",
      level: 5,
      accuracy: 0.98,
      constant: 9.5,
      figures: { rating: 10.25, stamina: 8 },
    },
  ],
});
export const HISTORY: RatingHistory = {
  ourtaikoV1: [snapshot("2026-10-13T00:00:00.000Z", 8.68)],
  ourtaikoV2: [snapshot("2026-10-13T00:00:00.000Z", 8.8)],
};
