import { describe, expect, test } from "bun:test";
import { createTranslator } from "@abth/i18n";

import { SETTINGS } from "../../core/test/game-settings-fixtures";
import { settingChoices } from "../src/game-settings/setting-choices";

const i18n = createTranslator("en");
const offered = (...values: [value: string, label: string][]) =>
  values.map(([value, label]) => ({ value, label }));

describe("settingChoices", () => {
  test("words what the app knows in its own words, and the rest in Hiroba's, marked as Japanese", () => {
    const regions = offered(["NON", "設定しない(デフォルト)"], ["JPN", "日本"], ["ATA", "南極"]);
    expect(settingChoices("region", regions, SETTINGS, i18n)).toEqual([
      { value: "NON", label: "Not set" },
      { value: "JPN", label: "Japan" },
      { value: "ATA", label: "南極", lang: "ja" },
    ]);
  });

  test("keeps the drum sounds' names as Hiroba writes them", () => {
    expect(settingChoices("tone", offered(["9", "8ビット太鼓"]), SETTINGS, i18n)).toEqual([
      { value: "9", label: "8ビット太鼓", lang: "ja" },
    ]);
  });

  test("words the speed, the notes' shift and the ★ by their numbers, within the page's range", () => {
    const words = (key: "speed" | "notePosition" | "folderStars", value: string) =>
      settingChoices(key, offered([value, "ひろば"]), SETTINGS, i18n)[0];
    expect(words("speed", "10")).toEqual({ value: "10", label: "×1.0" });
    expect(words("speed", "35")).toEqual({ value: "35", label: "×3.5" });
    expect(words("speed", "45")).toEqual({ value: "45", label: "ひろば", lang: "ja" });
    expect(words("notePosition", "-5")).toEqual({ value: "-5", label: "Left 5" });
    expect(words("notePosition", "0")).toEqual({ value: "0", label: "0" });
    expect(words("notePosition", "2")).toEqual({ value: "2", label: "Right 2" });
    expect(words("folderStars", "10")).toEqual({ value: "10", label: "★10" });
  });

  test("puts a toggle's choices in the app's order, off or hidden first, whatever the page's", () => {
    const voice = offered(["1", "あり（デフォルト）"], ["0", "なし"]);
    expect(settingChoices("voice", voice, SETTINGS, i18n).map(({ label }) => label)).toEqual([
      "Off",
      "On",
    ]);
    const shown = offered(["1", "表示する（デフォルト）"], ["0", "表示しない"]);
    expect(settingChoices("scoresShown", shown, SETTINGS, i18n).map(({ label }) => label)).toEqual([
      "Hidden",
      "Shown",
    ]);
  });

  test("keeps a list's own order, and shuts each ★ the folder's difficulty cannot take", () => {
    const stars = offered(["0", "設定しない"], ["99", "都度"], ["5", "５"], ["6", "６"]);
    const easy = { ...SETTINGS, folderDifficulty: "1" };
    expect(
      settingChoices("folderStars", stars, easy, i18n).map(({ value, disabled }) => [
        value,
        disabled === true,
      ]),
    ).toEqual([
      ["0", false],
      ["99", false],
      ["5", false],
      ["6", true],
    ]);
  });
});
