import { describe, expect, test } from "bun:test";

import {
  GAME_SETTING_KEYS,
  type GameSettingsEditorReading,
  isErr,
  isOk,
  type ParseFailure,
  parseGameSettingsPage,
  type Result,
} from "../src/index";
import { LISTS, SETTINGS, settingsPage, TOKEN } from "./game-settings-fixtures";

const PAGE = "mypage_other_setting.php";
const FORM = `form[name="setting"]`;

function readOf(page: string): GameSettingsEditorReading {
  const result = parseGameSettingsPage(page);
  if (!isOk(result)) {
    throw new Error(`expected the settings, got ${JSON.stringify(result.error)}`);
  }
  return result.value;
}

function failureOf(result: Result<unknown, ParseFailure>): ParseFailure {
  if (!isErr(result)) {
    throw new Error("expected a refusal");
  }
  return result.error;
}

/** The controls as name and what they carry, in the order the reading lists them. */
const controlsOf = (reading: GameSettingsEditorReading) =>
  reading.controls.map((control) =>
    control.kind === "setting"
      ? [control.name, `=${control.key}`]
      : control.kind === "served"
        ? [control.name, control.value]
        : [control.name, "token"],
  );

describe("parseGameSettingsPage", () => {
  test("reads every setting, each with its list in Hiroba's words, and the token", () => {
    const { state, choices, token } = readOf(settingsPage());

    expect(state).toEqual(SETTINGS);
    for (const key of GAME_SETTING_KEYS) {
      expect(choices[key]).toEqual(LISTS[key].map(([value, label]) => ({ value, label })));
    }
    expect(token.reveal()).toBe(TOKEN);
  });

  test("lists the form's controls in the page's order, each setting's or as served", () => {
    expect(controlsOf(readOf(settingsPage()))).toEqual([
      ["_tckt", "token"],
      ["area_id", "0"],
      ["country_code", "=region"],
      ["open_status", "=visibility"],
      ["disp_achievement", "=scoresShown"],
      ["disp_achievement_type", "=scoresDifficulty"],
      ["dan_disp", "=danShown"],
      ["op1", "=speed"],
      ["op2", "=doron"],
      ["op3", "=abekobe"],
      ["op4", "=random"],
      ["skip", "=skip"],
      ["notes_position", "=notePosition"],
      ["voice", "=voice"],
      ["default_tone_setting", "0"],
      ["default_tone_setting", "=tone"],
      ["double_song_disp", "=doubleCharts"],
      ["select_double_song_disp", "=doubleCharts"],
      ["applicable_flg", "1"],
      ["default_difficulty_course", "=folderDifficulty"],
      ["select_default_difficulty_course", "=folderDifficulty"],
      ["default_difficulty_star", "=folderStars"],
      ["select_default_difficulty_star", "=folderStars"],
      ["default_difficulty_sort", "=folderOrder"],
      ["select_default_difficulty_sort", "=folderOrder"],
    ]);
  });

  test("reads a list as a browser does: its last option marked selected, else its first", () => {
    const twice = settingsPage().replace(
      `<option value="25">`,
      `<option value="25" selected="selected">`,
    );
    const none = settingsPage().replace(
      `<option value="20" selected="selected">`,
      `<option value="20">`,
    );

    expect(readOf(twice).state.speed).toBe("25");
    expect(readOf(none).state.speed).toBe("10");
  });

  test("reads each list by its name, though the box round it carries the same id", () => {
    const boxFirst = settingsPage().replace(
      `<div class="pull" id="op1">`,
      `<div class="pull" id="op1"><select id="op1"><option value="40" selected>x</option></select>`,
    );

    expect(readOf(boxFirst).state.speed).toBe(SETTINGS.speed);
  });

  test("leaves out the best score block the page has commented out", () => {
    const names = readOf(settingsPage()).controls.map((control) => control.name);

    expect(names).not.toContain("pull_chassis");
    expect(names).not.toContain("disp_level_self");
  });

  test("passes on a field or a list it has no setting for, as the page serves it", () => {
    const page = settingsPage().replace(
      `<input type="hidden" name="applicable_flg" value="1" />`,
      `<input type="hidden" name="applicable_flg" value="1" /><input type="hidden" name="new_flag" value="7" /><select name="new_list"><option value="a">A</option><option value="b" selected>B</option></select><input type="hidden" value="unnamed" />`,
    );

    expect(controlsOf(readOf(page))).toContainEqual(["new_flag", "7"]);
    expect(controlsOf(readOf(page))).toContainEqual(["new_list", "b"]);
    expect(readOf(page).controls.map((control) => control.name)).not.toContain("");
  });

  type LockCase = [label: string, shut: boolean | null, locked: boolean];
  test.each<LockCase>([
    ["switches it on", false, false],
    ["shuts it", true, true],
    ["says nothing of it", null, false],
  ])(
    "reads the 双打 list as locked only when the page's script shuts it: %s",
    (_l, shut, locked) => {
      expect(readOf(settingsPage({ doubleChartsShut: shut })).doubleChartsLocked).toBe(locked);
    },
  );

  test("takes the drum sound from its list, whatever its hidden twin holds", () => {
    const reading = readOf(settingsPage({ toneTwin: "21" }));

    expect(reading.state.tone).toBe(SETTINGS.tone);
    expect(controlsOf(reading)).toContainEqual(["default_tone_setting", "21"]);
  });

  test("keeps the token out of anything serialised", () => {
    expect(JSON.stringify(parseGameSettingsPage(settingsPage()))).not.toContain(TOKEN);
  });

  test("refuses the login page as a logged-out page", () => {
    const result = parseGameSettingsPage(
      `<form id="login_form" action="./login_process.php"></form>`,
    );

    expect(failureOf(result)).toEqual({ kind: "loggedOut", page: PAGE });
  });
});

describe("parseGameSettingsPage refuses a page that is not the settings it knows", () => {
  type Case = [label: string, page: string, expected: ParseFailure];
  const missing = (marker: string): ParseFailure => ({ kind: "missingMarker", page: PAGE, marker });
  const unreadable = (marker: string, raw: string): ParseFailure => ({
    kind: "unreadableValue",
    page: PAGE,
    marker,
    raw,
  });
  const page = settingsPage();

  test.each<Case>([
    ["no settings form", page.replace(`name="setting"`, `name="other"`), missing(FORM)],
    [
      "a form posting elsewhere",
      page.replace(`action="ajax/mypage_other.php"`, `action="ajax/other.php"`),
      unreadable(`${FORM}[action]`, "ajax/other.php"),
    ],
    ["no token", page.replace(`id="_tckt"`, `id="other"`), missing("#_tckt")],
    ["an empty token, without repeating it", settingsPage({ token: "" }), unreadable("#_tckt", "")],
    [
      "a setting's list missing",
      page.replace(`name="op3"`, `name="op9"`),
      missing(`${FORM} select[name="op3"]`),
    ],
    [
      "a list with no entries",
      page.replace(/(<select name="voice"[^>]*>)[\s\S]*?(<\/select>)/, "$1$2"),
      missing(`${FORM} select[name="voice"] option`),
    ],
    [
      "an entry that is no setting's value",
      page.replace(`<option value="SGP"`, `<option value="S G P"`),
      unreadable(`${FORM} select[name="country_code"] option`, "S G P"),
    ],
    [
      "an entry with no value",
      page.replace(`<option value="SGP"`, `<option`),
      unreadable(`${FORM} select[name="country_code"] option`, "(no value)"),
    ],
    [
      "an entry listed twice",
      page.replace(`<option value="TWN"`, `<option value="JPN"`),
      unreadable(`${FORM} select[name="country_code"] option`, "JPN"),
    ],
    [
      "a pair whose halves disagree",
      settingsPage({ halves: { folderStars: "5" } }),
      unreadable(`${FORM} input[name="default_difficulty_star"]`, "5, but its list holds 8"),
    ],
    [
      "a pair with no hidden half",
      page.replace(`name="default_difficulty_sort" value`, `name="other_sort" value`),
      missing(`${FORM} input[name="default_difficulty_sort"]`),
    ],
    [
      "a control of a kind the page has never held",
      page.replace(
        `<input type="hidden" name="area_id" value="0" />`,
        `<input type="radio" name="area_id" value="0" />`,
      ),
      unreadable(`${FORM} input[name="area_id"]`, "input radio"),
    ],
    [
      "a list for a setting twice",
      page.replace("</form>", `<select name="op2"><option value="0">x</option></select></form>`),
      unreadable(`${FORM} select[name="op2"]`, "2 lists"),
    ],
  ])("%s", (_label, refused, expected) => {
    const failure = failureOf(parseGameSettingsPage(refused));

    expect(failure).toEqual(expected);
    expect(JSON.stringify(failure)).not.toContain(TOKEN);
  });
});
