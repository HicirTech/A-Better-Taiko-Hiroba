import type { GameSettingsEditorReading } from "../hiroba-dom-parser";
import { GAME_SETTING_KEYS, type GameSettingKey, type GameSettings } from "../hiroba-models";
import { err, ok, type Result } from "../operation-results";
import type { InvalidTarget } from "./types";

export const GAME_SETTINGS_FIELDS = {
  notOffered: "gameSettings.notOffered",
  stars: "gameSettings.stars",
  locked: "gameSettings.locked",
} as const;

/** The ★ every difficulty of the folder takes: none set. */
const NO_STARS = "0";
/** 都度ゲーム中に設定する: the ★ is chosen in the game each time. */
const EACH_TIME = "99";
/** おに裏, the one difficulty that keeps "each time" as the difficulty changes to it. */
const URA = "5";

/** The highest ★ each difficulty takes; the page's script lets any other take none. */
const MOST_STARS: Readonly<Record<string, number>> = { "1": 5, "2": 7, "3": 8, "4": 10, "5": 10 };

/** Whether the folder's difficulty takes that ★, by the page's script and Hiroba's own check. */
export function allowsStars(difficulty: string, stars: string): boolean {
  if (stars === NO_STARS) {
    return true;
  }
  const most = Object.hasOwn(MOST_STARS, difficulty) ? MOST_STARS[difficulty] : undefined;
  if (most === undefined) {
    return false;
  }
  return (
    stars === EACH_TIME || (/^\d+$/.test(stars) && Number(stars) >= 1 && Number(stars) <= most)
  );
}

/** One pick, as the page's script makes it: a new difficulty drops a ★ it does not keep. */
export function draftGameSettings(
  settings: GameSettings,
  key: GameSettingKey,
  value: string,
): GameSettings {
  const next = { ...settings, [key]: value };
  if (key !== "folderDifficulty") {
    return next;
  }
  const keeps =
    allowsStars(value, next.folderStars) && (next.folderStars !== EACH_TIME || value === URA);
  return keeps ? next : { ...next, folderStars: NO_STARS };
}

/** Checks a target by the page's lists, its 双打 lock and the ★ rule, naming what it refuses. */
export function checkGameSettingsTarget(
  editor: Pick<GameSettingsEditorReading, "state" | "choices" | "doubleChartsLocked">,
  target: GameSettings,
): Result<GameSettings, InvalidTarget> {
  for (const key of GAME_SETTING_KEYS) {
    if (!editor.choices[key].some((choice) => choice.value === target[key])) {
      return err({ field: GAME_SETTINGS_FIELDS.notOffered });
    }
  }
  if (editor.doubleChartsLocked && target.doubleCharts !== editor.state.doubleCharts) {
    return err({ field: GAME_SETTINGS_FIELDS.locked });
  }
  return allowsStars(target.folderDifficulty, target.folderStars)
    ? ok({ ...target })
    : err({ field: GAME_SETTINGS_FIELDS.stars });
}

export function sameGameSettings(left: GameSettings, right: GameSettings): boolean {
  return GAME_SETTING_KEYS.every((key) => left[key] === right[key]);
}
