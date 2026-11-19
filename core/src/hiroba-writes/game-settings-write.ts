import {
  GAME_SETTING_LISTS,
  type GameSettingsControl,
  type GameSettingsEditorReading,
  parseGameSettingsPage,
} from "../hiroba-dom-parser";
import type { FormToken, GameSettingChoices, GameSettings } from "../hiroba-models";
import { isErr, ok, type Result } from "../operation-results";
import { checkGameSettingsTarget, sameGameSettings } from "./game-settings-rule";
import { readHirobaPage } from "./read-page";
import { runWrite } from "./run-write";
import type {
  AjaxPost,
  HirobaReadFailure,
  NotAppliedReason,
  ReadDeps,
  SaveCodes,
  SaveReading,
  WriteDeps,
  WriteOutcome,
  WriteSpec,
} from "./types";

const PAGE = "mypage_other_setting.php";
const SAVE_PATH = "ajax/mypage_other.php";

/** The settings page as the interface shows it: no token, nor the controls it only passes on. */
export interface GameSettingsView {
  readonly state: GameSettings;
  readonly choices: GameSettingChoices;
  readonly doubleChartsLocked: boolean;
}

/** From `settingComp`: each of these shows Hiroba's `errmsg`, and any other code fails. */
const REFUSING_CODES: ReadonlySet<number> = new Set([
  ...Array.from({ length: 14 }, (_, index) => index + 1),
  24,
  25,
  26,
  600,
  705,
  900,
  901,
  999,
]);

const GAME_SETTINGS_CODES: SaveCodes = {
  reason(save: SaveReading): NotAppliedReason {
    if (save.answer !== "json") {
      return { kind: save.answer };
    }
    if (save.code === 0) {
      return { kind: "unchanged" };
    }
    return save.code !== null && REFUSING_CODES.has(save.code)
      ? { kind: "refused", code: save.code, message: save.message }
      : { kind: "failed", code: save.code };
  },
};

/** The settings `settingComp` sends again after the form, from their lists. */
const SENT_AGAIN = ["speed", "doron", "abekobe", "random", "notePosition"] as const;

function postedValue(
  control: GameSettingsControl,
  editor: GameSettingsEditorReading,
  body: GameSettings,
): string | FormToken {
  switch (control.kind) {
    case "token":
      return editor.token;
    case "setting":
      return body[control.key];
    case "served":
      return control.value;
  }
}

/** The form as `settingComp` posts it: each control in the page's order, then what it adds. */
function settingsForm(editor: GameSettingsEditorReading, body: GameSettings): AjaxPost["form"] {
  // The script's serialize() skips a disabled list, as the 双打 one is while the page shuts it.
  const shut = editor.doubleChartsLocked ? GAME_SETTING_LISTS.doubleCharts : null;
  return [
    ...editor.controls
      .filter((control) => control.name !== shut)
      .map((control) => [control.name, postedValue(control, editor, body)] as const),
    // The page has no control for either, so its script always adds both as 0.
    ["disp_level_self", "0"],
    ["disp_level_chassis", "0"],
    ...SENT_AGAIN.map((key) => [GAME_SETTING_LISTS[key], body[key]] as const),
  ];
}

const readEditor = (deps: ReadDeps) => readHirobaPage(deps, PAGE, parseGameSettingsPage);

/** One post of the whole form, as the page sends it; no pre-check, as its script has none. */
export const GAME_SETTINGS_WRITE: WriteSpec<
  GameSettings,
  GameSettings,
  GameSettings,
  GameSettingsEditorReading,
  never
> = {
  readEditor,
  same: sameGameSettings,
  normalise: checkGameSettingsTarget,
  expectedAfter: (_before, body) => body,
  save: (editor, body) => ({ path: SAVE_PATH, referer: PAGE, form: settingsForm(editor, body) }),
  codes: GAME_SETTINGS_CODES,
  readBack: async (deps) => {
    const read = await readEditor(deps);
    return isErr(read) ? read : ok(read.value.state);
  },
};

export async function openGameSettings(
  deps: ReadDeps,
): Promise<Result<GameSettingsView, HirobaReadFailure>> {
  const read = await readEditor(deps);
  if (isErr(read)) {
    return read;
  }
  const { state, choices, doubleChartsLocked } = read.value;
  return ok({ state, choices, doubleChartsLocked });
}

export function changeGameSettings(
  input: { readonly expected: GameSettings; readonly target: GameSettings },
  deps: WriteDeps,
): Promise<WriteOutcome<GameSettings>> {
  return runWrite(GAME_SETTINGS_WRITE, input, deps);
}
