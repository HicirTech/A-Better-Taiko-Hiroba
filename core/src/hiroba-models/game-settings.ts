/** The settings Hiroba's その他設定・編集 page holds, by the app's names, in the page's order. */
export const GAME_SETTING_KEYS = [
  "region",
  "visibility",
  "scoresShown",
  "scoresDifficulty",
  "danShown",
  "speed",
  "doron",
  "abekobe",
  "random",
  "skip",
  "notePosition",
  "voice",
  "tone",
  "doubleCharts",
  "folderDifficulty",
  "folderStars",
  "folderOrder",
] as const;

export type GameSettingKey = (typeof GAME_SETTING_KEYS)[number];

/** A setting's value as the page's list writes it: the page, not the app, says what may be. */
export type GameSettings = Readonly<Record<GameSettingKey, string>>;

/** One entry of a setting's list: its value, and Hiroba's words for it. */
export interface GameSettingChoice {
  readonly value: string;
  readonly label: string;
}

/** Each setting's list, as the page offers it. */
export type GameSettingChoices = Readonly<Record<GameSettingKey, readonly GameSettingChoice[]>>;

/** A value as the page's lists write them: a region's code, or a number such as `-5` or `99`. */
const SETTING_VALUE = /^-?[0-9A-Za-z]{1,8}$/;

export function isGameSettingValue(value: unknown): value is string {
  return typeof value === "string" && SETTING_VALUE.test(value);
}
