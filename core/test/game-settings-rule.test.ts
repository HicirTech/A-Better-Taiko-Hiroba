import { describe, expect, test } from "bun:test";

import {
  allowsStars,
  checkGameSettingsTarget,
  draftGameSettings,
  GAME_SETTING_KEYS,
  GAME_SETTINGS_FIELDS,
  type GameSettings,
  sameGameSettings,
} from "../src/index";
import { CHOICES, SETTINGS } from "./game-settings-fixtures";

const settings = (changes: Partial<GameSettings> = {}): GameSettings => ({
  ...SETTINGS,
  ...changes,
});
const OPEN = { state: SETTINGS, choices: CHOICES, doubleChartsLocked: false };
const SHUT = { ...OPEN, doubleChartsLocked: true };

describe("allowsStars", () => {
  type StarsCase = [difficulty: string, stars: string, allowed: boolean];
  test.each<StarsCase>([
    ["1", "5", true],
    ["1", "6", false],
    ["2", "7", true],
    ["2", "8", false],
    ["3", "8", true],
    ["3", "9", false],
    ["4", "10", true],
    ["5", "10", true],
    ["4", "11", false],
    ["1", "99", true],
    ["5", "99", true],
    ["0", "99", false],
    ["99", "1", false],
    ["0", "0", true],
    ["99", "0", true],
    ["7", "1", false],
    ["4", "-1", false],
    ["constructor", "1", false],
  ])("under difficulty %p takes ★ %p: %p", (difficulty, stars, allowed) => {
    expect(allowsStars(difficulty, stars)).toBe(allowed);
  });
});

describe("draftGameSettings", () => {
  test("changes the one setting picked and nothing else", () => {
    expect(draftGameSettings(SETTINGS, "voice", "1")).toEqual(settings({ voice: "1" }));
  });

  type DifficultyCase = [label: string, stars: string, difficulty: string, kept: string];
  test.each<DifficultyCase>([
    ["keeps a ★ the new difficulty takes", "5", "1", "5"],
    ["drops a ★ the new difficulty cannot take", "8", "2", "0"],
    ["drops each time for a difficulty but おに裏", "99", "4", "0"],
    ["keeps each time for おに裏", "99", "5", "99"],
    ["drops any ★ for no difficulty", "3", "0", "0"],
    ["drops any ★ for a difficulty chosen in the game", "3", "99", "0"],
  ])("%s", (_label, stars, difficulty, kept) => {
    const drafted = draftGameSettings(
      settings({ folderStars: stars }),
      "folderDifficulty",
      difficulty,
    );

    expect(drafted).toEqual(settings({ folderDifficulty: difficulty, folderStars: kept }));
  });

  test("leaves the ★ alone when the ★ itself is picked", () => {
    expect(draftGameSettings(SETTINGS, "folderStars", "99").folderStars).toBe("99");
  });
});

describe("checkGameSettingsTarget", () => {
  test("takes settings the page's lists offer, as a copy", () => {
    const target = settings({ speed: "35", tone: "21" });
    const checked = checkGameSettingsTarget(OPEN, target);

    expect(checked).toEqual({ ok: true, value: target });
    expect(checked.ok && checked.value).not.toBe(target);
  });

  test.each<[label: string, target: GameSettings]>([
    ["a speed the page does not list", settings({ speed: "45" })],
    ["a drum sound this player does not have", settings({ tone: "13" })],
    ["a region the page does not list", settings({ region: "KHM" })],
  ])("refuses %s", (_label, target) => {
    expect(checkGameSettingsTarget(OPEN, target)).toEqual({
      ok: false,
      error: { field: GAME_SETTINGS_FIELDS.notOffered },
    });
  });

  test("refuses a ★ the difficulty in the same settings cannot take", () => {
    const target = settings({ folderDifficulty: "1", folderStars: "8" });

    expect(checkGameSettingsTarget(OPEN, target)).toEqual({
      ok: false,
      error: { field: GAME_SETTINGS_FIELDS.stars },
    });
  });

  test("refuses a 双打 change while the page shuts that list, and takes any other change", () => {
    expect(checkGameSettingsTarget(SHUT, settings({ doubleCharts: "0" }))).toEqual({
      ok: false,
      error: { field: GAME_SETTINGS_FIELDS.locked },
    });
    expect(checkGameSettingsTarget(SHUT, settings({ speed: "35" })).ok).toBe(true);
    expect(checkGameSettingsTarget(OPEN, settings({ doubleCharts: "0" })).ok).toBe(true);
  });
});

describe("sameGameSettings", () => {
  test.each([...GAME_SETTING_KEYS])("tells settings apart by %s alone", (key) => {
    expect(sameGameSettings(SETTINGS, settings({ [key]: "x" }))).toBe(false);
    expect(sameGameSettings(SETTINGS, settings())).toBe(true);
  });
});
