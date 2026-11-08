import { isGenre, isLevel, isObject, isRank } from "../guards";
import type { RecentPlay } from "../hiroba-dom-parser/types";
import type { RandomMode } from "../hiroba-models/score";
import type { CrownState } from "../hiroba-models/vocabulary";

export const CROWNS = new Set<CrownState>(["none", "played", "silver", "gold", "donderful"]);
const RANDOMS = new Set<RandomMode>(["none", "kimagure", "detarame"]);

/** The well-formed rows of a stored walk; what is not a list of rows is none. */
export function readStoredRecentPlays(stored: unknown): RecentPlay[] | null {
  return Array.isArray(stored) ? stored.flatMap(playOf) : null;
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
