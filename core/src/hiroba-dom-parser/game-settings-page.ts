import type { HTMLElement } from "node-html-parser";

import {
  GAME_SETTING_KEYS,
  type GameSettingChoice,
  type GameSettingChoices,
  type GameSettingKey,
  type GameSettings,
  isGameSettingValue,
} from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { readEditorToken } from "./favorite-fields";
import { parsePage } from "./parser";
import type { GameSettingsControl, GameSettingsEditorReading, ParseFailure } from "./types";

const PAGE = "mypage_other_setting.php";
const FORM = `form[name="setting"]`;
const FORM_ACTION = "ajax/mypage_other.php";
const TOKEN = "_tckt";
const CONTROLS = "input, select, textarea";

/** Each setting's list, by its `name`: a paired setting's list is its `select_` half. */
export const GAME_SETTING_LISTS: Readonly<Record<GameSettingKey, string>> = {
  region: "country_code",
  visibility: "open_status",
  scoresShown: "disp_achievement",
  scoresDifficulty: "disp_achievement_type",
  danShown: "dan_disp",
  speed: "op1",
  doron: "op2",
  abekobe: "op3",
  random: "op4",
  skip: "skip",
  notePosition: "notes_position",
  voice: "voice",
  tone: "default_tone_setting",
  doubleCharts: "select_double_song_disp",
  folderDifficulty: "select_default_difficulty_course",
  folderStars: "select_default_difficulty_star",
  folderOrder: "select_default_difficulty_sort",
};

/** The hidden half of each paired setting: Hiroba reads one half or the other, so both carry it. */
const PAIRED_HALVES: readonly (readonly [GameSettingKey, string])[] = [
  ["doubleCharts", "double_song_disp"],
  ["folderDifficulty", "default_difficulty_course"],
  ["folderStars", "default_difficulty_star"],
  ["folderOrder", "default_difficulty_sort"],
];

const HALF_OF: ReadonlyMap<GameSettingKey, string> = new Map(PAIRED_HALVES);
const KEY_OF_HALF: ReadonlyMap<string, GameSettingKey> = new Map(
  PAIRED_HALVES.map(([key, name]) => [name, key]),
);
const KEY_OF_LIST: ReadonlyMap<string, GameSettingKey> = new Map(
  GAME_SETTING_KEYS.map((key) => [GAME_SETTING_LISTS[key], key]),
);

// The page's script switches the 双打 list on at load; `true` here is the switch shutting it.
const DOUBLE_CHARTS_SHUT =
  /\$\(\s*'select\[name="select_double_song_disp"\]'\s*\)\s*\.prop\(\s*'disabled'\s*,\s*true\s*\)/;

/** Reads その他設定・編集: every setting with its list, and the form's controls in the page's order. */
export function parseGameSettingsPage(
  html: string,
): Result<GameSettingsEditorReading, ParseFailure> {
  const page = parsePage(html, PAGE);
  if (isErr(page)) {
    return page;
  }
  const form = formOf(page.value);
  if (isErr(form)) {
    return form;
  }
  const token = readEditorToken(form.value, PAGE);
  if (isErr(token)) {
    return token;
  }
  const controls = readControls(form.value);
  if (isErr(controls)) {
    return controls;
  }
  const lists = readLists(form.value);
  if (isErr(lists)) {
    return lists;
  }
  return ok({
    state: lists.value.state,
    token: token.value,
    choices: lists.value.choices,
    doubleChartsLocked: DOUBLE_CHARTS_SHUT.test(html),
    controls: controls.value,
  });
}

function formOf(root: HTMLElement): Result<HTMLElement, ParseFailure> {
  const forms = root.querySelectorAll(FORM);
  const [form] = forms;
  if (form === undefined) {
    return err({ kind: "missingMarker", page: PAGE, marker: FORM });
  }
  if (forms.length > 1) {
    return err({ kind: "unreadableValue", page: PAGE, marker: FORM, raw: `${forms.length} forms` });
  }
  const action = form.getAttribute("action") ?? "";
  return action === FORM_ACTION
    ? ok(form)
    : err({ kind: "unreadableValue", page: PAGE, marker: `${FORM}[action]`, raw: action });
}

/** The controls a browser would post, in their order; an unnamed one is never posted. */
function readControls(form: HTMLElement): Result<GameSettingsControl[], ParseFailure> {
  const controls: GameSettingsControl[] = [];
  for (const element of form.querySelectorAll(CONTROLS)) {
    const name = element.getAttribute("name") ?? "";
    if (name === "") {
      continue;
    }
    const control = controlOf(element, name);
    if (isErr(control)) {
      return control;
    }
    controls.push(control.value);
  }
  return ok(controls);
}

function controlOf(element: HTMLElement, name: string): Result<GameSettingsControl, ParseFailure> {
  const tag = element.rawTagName.toLowerCase();
  const marker = `${FORM} ${tag}[name="${name}"]`;
  if (tag === "select") {
    const key = KEY_OF_LIST.get(name);
    if (key !== undefined) {
      return ok({ kind: "setting", name, key });
    }
    const value = chosenValue(element);
    return value === null
      ? err({ kind: "missingMarker", page: PAGE, marker: `${marker} option` })
      : ok({ kind: "served", name, value });
  }
  const type = (element.getAttribute("type") ?? "text").toLowerCase();
  // Hidden fields and lists are all the form has held; any other control is a form not seen yet.
  if (tag !== "input" || type !== "hidden") {
    return err({ kind: "unreadableValue", page: PAGE, marker, raw: `${tag} ${type}` });
  }
  if (name === TOKEN) {
    return ok({ kind: "token", name });
  }
  const key = KEY_OF_HALF.get(name);
  return ok(
    key === undefined
      ? { kind: "served", name, value: element.getAttribute("value") ?? "" }
      : { kind: "setting", name, key },
  );
}

/** A list's value as a browser takes it: its last option marked selected, else its first. */
function chosenValue(list: HTMLElement): string | null {
  const options = list.querySelectorAll("option");
  const chosen = options.findLast((option) => option.hasAttribute("selected")) ?? options[0];
  return chosen === undefined ? null : (chosen.getAttribute("value") ?? chosen.text.trim());
}

function readLists(
  form: HTMLElement,
): Result<{ state: GameSettings; choices: GameSettingChoices }, ParseFailure> {
  const state = {} as Record<GameSettingKey, string>;
  const choices = {} as Record<GameSettingKey, readonly GameSettingChoice[]>;
  for (const key of GAME_SETTING_KEYS) {
    const list = readList(form, GAME_SETTING_LISTS[key]);
    if (isErr(list)) {
      return list;
    }
    const half = HALF_OF.get(key);
    const disagrees = half === undefined ? null : halfDisagrees(form, half, list.value.value);
    if (disagrees !== null) {
      return err(disagrees);
    }
    state[key] = list.value.value;
    choices[key] = list.value.choices;
  }
  return ok({ state, choices });
}

function readList(
  form: HTMLElement,
  name: string,
): Result<{ value: string; choices: GameSettingChoice[] }, ParseFailure> {
  const marker = `${FORM} select[name="${name}"]`;
  const lists = form.querySelectorAll(`select[name="${name}"]`);
  const [list] = lists;
  if (list === undefined) {
    return err({ kind: "missingMarker", page: PAGE, marker });
  }
  if (lists.length > 1) {
    return err({ kind: "unreadableValue", page: PAGE, marker, raw: `${lists.length} lists` });
  }
  const choices: GameSettingChoice[] = [];
  for (const option of list.querySelectorAll("option")) {
    const value = option.getAttribute("value");
    if (!isGameSettingValue(value) || choices.some((choice) => choice.value === value)) {
      return err({
        kind: "unreadableValue",
        page: PAGE,
        marker: `${marker} option`,
        raw: value ?? "(no value)",
      });
    }
    choices.push({ value, label: option.text.trim() });
  }
  const value = chosenValue(list);
  return value === null
    ? err({ kind: "missingMarker", page: PAGE, marker: `${marker} option` })
    : ok({ value, choices });
}

/** A fresh page has always shown a pair's halves alike; any other shape is a page not seen. */
function halfDisagrees(form: HTMLElement, name: string, value: string): ParseFailure | null {
  const marker = `${FORM} input[name="${name}"]`;
  const halves = form.querySelectorAll(`input[name="${name}"]`);
  const [half] = halves;
  if (half === undefined) {
    return { kind: "missingMarker", page: PAGE, marker };
  }
  const held = half.getAttribute("value") ?? "";
  if (halves.length > 1) {
    return { kind: "unreadableValue", page: PAGE, marker, raw: `${halves.length} fields` };
  }
  return held === value
    ? null
    : { kind: "unreadableValue", page: PAGE, marker, raw: `${held}, but its list holds ${value}` };
}
