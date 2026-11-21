import {
  allowsStars,
  type GameSettingChoice,
  type GameSettingKey,
  type GameSettings,
  HIROBA_LANG,
} from "@abth/core";
import type { PlainMessageKey, Translator } from "@abth/i18n";

import type { Choice } from "../ui/choice-toggles";

const NOT_SET = "gameSettings.notSet";
const EACH_TIME = "gameSettings.eachTime";
const SHOWN_OR_HIDDEN = { "0": "gameSettings.hidden", "1": "gameSettings.shown" } as const;
const OFF_OR_ON = { "0": "gameSettings.off", "1": "gameSettings.on" } as const;

/** The values the app words itself, by setting; any other shows in Hiroba's own words. */
const WORDS: Readonly<Record<GameSettingKey, Readonly<Record<string, PlainMessageKey>>>> = {
  region: {
    NON: NOT_SET,
    JPN: "gameSettings.region.JPN",
    TWN: "gameSettings.region.TWN",
    KOR: "gameSettings.region.KOR",
    MYS: "gameSettings.region.MYS",
    HKG: "gameSettings.region.HKG",
    MAC: "gameSettings.region.MAC",
    SGP: "gameSettings.region.SGP",
    AUS: "gameSettings.region.AUS",
    NZL: "gameSettings.region.NZL",
    VNM: "gameSettings.region.VNM",
    IND: "gameSettings.region.IND",
    IDN: "gameSettings.region.IDN",
    THA: "gameSettings.region.THA",
    PHL: "gameSettings.region.PHL",
    KHM: "gameSettings.region.KHM",
    BRN: "gameSettings.region.BRN",
    LKA: "gameSettings.region.LKA",
    MMR: "gameSettings.region.MMR",
    USA: "gameSettings.region.USA",
  },
  visibility: { "0": "gameSettings.everyone", "1": "gameSettings.friendsOnly" },
  scoresShown: SHOWN_OR_HIDDEN,
  scoresDifficulty: {
    "0": NOT_SET,
    "1": "difficulty.easy",
    "2": "difficulty.normal",
    "3": "difficulty.hard",
    "4": "difficulty.oni",
    "5": "gameSettings.oniAndUra",
  },
  danShown: SHOWN_OR_HIDDEN,
  speed: {},
  doron: OFF_OR_ON,
  abekobe: OFF_OR_ON,
  random: { "0": "gameSettings.off", "1": "history.kimagure", "2": "history.detarame" },
  skip: OFF_OR_ON,
  notePosition: {},
  voice: { "0": "gameSettings.voiceOff", "1": "gameSettings.voiceOn" },
  // The drum sounds keep Hiroba's names.
  tone: {},
  doubleCharts: SHOWN_OR_HIDDEN,
  folderDifficulty: {
    "0": NOT_SET,
    "99": EACH_TIME,
    "1": "difficulty.easy",
    "2": "difficulty.normal",
    "3": "difficulty.hard",
    "4": "difficulty.oni",
    "5": "difficulty.ura",
  },
  folderStars: { "0": NOT_SET, "99": EACH_TIME },
  folderOrder: {
    "0": NOT_SET,
    "99": EACH_TIME,
    "1": "gameSettings.usualOrder",
    "2": "gameSettings.notClearedFirst",
    "3": "gameSettings.noFullComboFirst",
    "4": "gameSettings.noDonderfulFirst",
  },
};

const WHOLE = /^-?\d{1,2}$/;

/** A value the app words by its number: the speed in tenths, the note's shift, the ★. */
function numbered(key: GameSettingKey, value: string, { t, number }: Translator): string | null {
  if (!WHOLE.test(value)) {
    return null;
  }
  const count = Number(value);
  switch (key) {
    case "speed":
      return count >= 10 && count <= 40
        ? t("gameSettings.speedValue", { speed: (count / 10).toFixed(1) })
        : null;
    case "notePosition":
      return count < 0
        ? t("gameSettings.left", { n: -count })
        : count > 0
          ? t("gameSettings.right", { n: count })
          : number(0);
    case "folderStars":
      return count >= 1 && count <= 10 ? t("picker.level", { level: count }) : null;
    default:
      return null;
  }
}

/** One value as the page shows it: in the app's words, else Hiroba's, marked as Japanese. */
function choiceOf(key: GameSettingKey, offered: GameSettingChoice, i18n: Translator) {
  const words = Object.hasOwn(WORDS[key], offered.value) ? WORDS[key][offered.value] : undefined;
  const label = words === undefined ? numbered(key, offered.value, i18n) : i18n.t(words);
  return label === null
    ? { value: offered.value, label: offered.label, lang: HIROBA_LANG }
    : { value: offered.value, label };
}

/** The settings shown as toggles, in the app's order: off, hidden or everyone first. */
export const TOGGLED: ReadonlySet<GameSettingKey> = new Set([
  "visibility",
  "scoresShown",
  "danShown",
  "doron",
  "abekobe",
  "random",
  "skip",
  "voice",
  "doubleCharts",
]);

const byValue = (left: GameSettingChoice, right: GameSettingChoice) =>
  Number(left.value) - Number(right.value);

/** A setting's choices as Hiroba's page offers them; a ★ the difficulty cannot take is shut. */
export function settingChoices(
  key: GameSettingKey,
  offered: readonly GameSettingChoice[],
  settings: GameSettings,
  i18n: Translator,
): readonly Choice<string>[] {
  const ordered = TOGGLED.has(key) ? [...offered].sort(byValue) : offered;
  return ordered.map((one) => {
    const choice = choiceOf(key, one, i18n);
    return key === "folderStars" && !allowsStars(settings.folderDifficulty, one.value)
      ? { ...choice, disabled: true }
      : choice;
  });
}
