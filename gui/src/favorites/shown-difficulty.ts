import { createContext } from "react";

import { keepSetting, keptSetting, pageStorage } from "../kept-settings";
import { DIFFICULTIES, type Difficulty } from "../song-catalogue/types";

/** The difficulty whose level a song shows in front of the others; Extreme brings its inner chart. */
export type ShownDifficulty = Exclude<Difficulty, "ura">;

export const SHOWN_DIFFICULTIES = [
  "easy",
  "normal",
  "hard",
  "oni",
] as const satisfies readonly ShownDifficulty[];
export const DEFAULT_SHOWN: ShownDifficulty = "oni";

const KEY = "abth.shownDifficulty";

const IN_FRONT: Readonly<Record<ShownDifficulty, readonly Difficulty[]>> = {
  easy: ["easy"],
  normal: ["normal"],
  hard: ["hard"],
  oni: ["oni", "ura"],
};

const isShown = (value: unknown): value is ShownDifficulty =>
  (SHOWN_DIFFICULTIES as readonly unknown[]).includes(value);

export function keptShownDifficulty(storage: Storage | undefined = pageStorage()): ShownDifficulty {
  return keptSetting(KEY, isShown, storage) ?? DEFAULT_SHOWN;
}

export function keepShownDifficulty(
  shown: ShownDifficulty,
  storage: Storage | undefined = pageStorage(),
): void {
  keepSetting(KEY, shown, storage);
}

/** The difficulty that shows a chart in front: its own, or Extreme for the inner one. */
export const shownFor = (difficulty: Difficulty): ShownDifficulty =>
  difficulty === "ura" ? "oni" : difficulty;

export interface Chart {
  readonly difficulty: Difficulty;
  readonly level: number;
}

/** A song's charts in the game's order: those stacked before the front ones, those, and the rest. */
export interface LevelStack {
  readonly before: readonly Chart[];
  readonly front: readonly Chart[];
  readonly after: readonly Chart[];
}

/** With no chart of the shown difficulty, every chart is in front and none is stacked. */
export function stackOf(
  levels: Readonly<Record<Difficulty, number | null>>,
  shown: ShownDifficulty,
): LevelStack {
  const charted = DIFFICULTIES.flatMap((difficulty) => {
    const level = levels[difficulty];
    return level === null ? [] : [{ difficulty, level }];
  });
  const front = charted.filter(({ difficulty }) => IN_FRONT[shown].includes(difficulty));
  const [head] = front;
  if (head === undefined) {
    return { before: [], front: charted, after: [] };
  }

  const first = charted.indexOf(head);
  return { before: charted.slice(0, first), front, after: charted.slice(first + front.length) };
}

export const ShownDifficultyContext = createContext<ShownDifficulty>(DEFAULT_SHOWN);
