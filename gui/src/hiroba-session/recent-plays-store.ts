import type { CrownState, Genre, Level, RandomMode, RecentPlay, ScoreRank } from "@abth/core";

/** One player's recent plays, newest first. A missing store reads as none. */
export interface RecentPlaysStore {
  load(taikoNo: string): Promise<readonly RecentPlay[]>;
  save(taikoNo: string, plays: readonly RecentPlay[]): Promise<void>;
}

export const CROWNS = new Set<CrownState>(["none", "played", "silver", "gold", "donderful"]);
const RANDOMS = new Set<RandomMode>(["none", "kimagure", "detarame"]);

/** The well-formed rows of a stored walk. A broken file reads as a first read, not a crash. */
export function readStoredRecentPlays(stored: unknown): RecentPlay[] {
  return Array.isArray(stored) ? stored.flatMap(playOf) : [];
}

export function createMemoryRecentPlaysStore(): RecentPlaysStore {
  const players = new Map<string, readonly RecentPlay[]>();
  return {
    async load(taikoNo) {
      return players.get(taikoNo) ?? [];
    },
    async save(taikoNo, plays) {
      if (plays.length === 0) {
        players.delete(taikoNo);
      } else {
        players.set(taikoNo, plays);
      }
    },
  };
}

function playOf(value: unknown): RecentPlay[] {
  if (!isObject(value)) {
    return [];
  }
  const genre = value.genre;
  const level = value.level;
  const crown = value.crown;
  const scoreRank = value.scoreRank;
  const record = recordOf(value.record);
  if (
    typeof value.songTitle !== "string" ||
    value.songTitle === "" ||
    !isGenre(genre) ||
    !isLevel(level) ||
    typeof crown !== "string" ||
    !CROWNS.has(crown as CrownState) ||
    !isRank(scoreRank) ||
    record === null
  ) {
    return [];
  }
  return [
    {
      songTitle: value.songTitle,
      genre,
      level,
      crown: crown as CrownState,
      scoreRank,
      record,
    },
  ];
}

export function recordOf(value: unknown): RecentPlay["record"] | null {
  if (!isObject(value) || !isObject(value.options)) {
    return null;
  }
  const counts = [
    value.highScore,
    value.good,
    value.ok,
    value.bad,
    value.drumroll,
    value.maxCombo,
    value.stageCount,
    value.clearCount,
    value.fullComboCount,
    value.donderfulComboCount,
  ];
  if (!counts.every((count) => typeof count === "number" && Number.isInteger(count))) {
    return null;
  }
  const { speed, doron, abekobe, random, supportChart } = value.options;
  if (
    typeof speed !== "number" ||
    typeof doron !== "boolean" ||
    typeof abekobe !== "boolean" ||
    typeof random !== "string" ||
    !RANDOMS.has(random as RandomMode) ||
    (supportChart !== null && typeof supportChart !== "boolean")
  ) {
    return null;
  }
  return {
    highScore: value.highScore as number,
    good: value.good as number,
    ok: value.ok as number,
    bad: value.bad as number,
    drumroll: value.drumroll as number,
    maxCombo: value.maxCombo as number,
    stageCount: value.stageCount as number,
    clearCount: value.clearCount as number,
    fullComboCount: value.fullComboCount as number,
    donderfulComboCount: value.donderfulComboCount as number,
    options: {
      speed,
      doron,
      abekobe,
      random: random as RandomMode,
      supportChart,
    },
  };
}

export function isGenre(value: unknown): value is Genre | null {
  return value === null || (typeof value === "number" && value >= 1 && value <= 8);
}

export function isLevel(value: unknown): value is Level {
  return typeof value === "number" && value >= 1 && value <= 5;
}

export function isRank(value: unknown): value is ScoreRank | null {
  return value === null || (typeof value === "number" && value >= 2 && value <= 8);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
