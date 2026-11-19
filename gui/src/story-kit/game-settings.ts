import {
  GAME_SETTING_KEYS,
  GAME_SETTING_LISTS,
  type GameSettingChoice,
  type GameSettingKey,
} from "@abth/core";

import {
  appSettingsOf,
  INITIAL_GAME_SETTINGS,
  SETTING_LISTS,
  type SettingList,
} from "../../scripts/mock-game-settings-lists";
import type { GameSettingsView } from "../shared/session-port";

const choicesOf = (key: GameSettingKey): GameSettingChoice[] =>
  SETTING_LISTS[GAME_SETTING_LISTS[key] as SettingList].map(([value, label]) => ({ value, label }));

/** The stand-in's player's settings page, as the app reads it. */
export const STORY_GAME_SETTINGS: GameSettingsView = {
  state: appSettingsOf(INITIAL_GAME_SETTINGS),
  choices: Object.fromEntries(GAME_SETTING_KEYS.map((key) => [key, choicesOf(key)])) as Record<
    GameSettingKey,
    GameSettingChoice[]
  >,
  doubleChartsLocked: false,
};
