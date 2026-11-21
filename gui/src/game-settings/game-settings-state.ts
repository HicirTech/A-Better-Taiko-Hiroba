import { draftGameSettings, type GameSettingKey, type Result, sameGameSettings } from "@abth/core";
import type {
  GameSettings,
  GameSettingsView,
  ReadFailure,
  WriteOutcomeView,
} from "../shared/session-port";
import { endsTheEdit, type Noticed, noticeOf, refreshed } from "../shared/writes/write-ending";

/** The settings picked and not yet saved, all of them; none while nothing differs. */
export type SettingsDraft = GameSettings | null;

export interface HeldGameSettings {
  readonly view: GameSettingsView;
  readonly draft: SettingsDraft;
}

export type GameSettingsStep =
  | { readonly name: "unread" }
  | { readonly name: "loading"; readonly held: HeldGameSettings | null }
  | {
      readonly name: "loadFailed";
      readonly failure: ReadFailure;
      readonly held: HeldGameSettings | null;
    }
  | {
      readonly name: "ready";
      readonly view: GameSettingsView;
      readonly draft: SettingsDraft;
      /** How the last write ended, until it is said or the next pick, reset, save or read. */
      readonly notice: Noticed<GameSettings> | null;
    }
  | { readonly name: "saving"; readonly view: GameSettingsView; readonly draft: GameSettings };

type ReadyStep = Extract<GameSettingsStep, { readonly name: "ready" }>;
type SavingStep = Extract<GameSettingsStep, { readonly name: "saving" }>;

export type GameSettingsAction =
  | { readonly type: "forget" }
  | { readonly type: "readStarted" }
  | { readonly type: "readEnded"; readonly result: Result<GameSettingsView, ReadFailure> }
  | { readonly type: "picked"; readonly key: GameSettingKey; readonly value: string }
  | { readonly type: "draftDropped" }
  | { readonly type: "saveStarted" }
  | { readonly type: "written"; readonly outcome: WriteOutcomeView<GameSettings> }
  | { readonly type: "noticeClosed" };

export const UNREAD: GameSettingsStep = { name: "unread" };

/** An action the step cannot take returns the very same step, so the page does not draw again. */
export function reduceGameSettings(
  step: GameSettingsStep,
  action: GameSettingsAction,
): GameSettingsStep {
  switch (action.type) {
    case "forget":
      return UNREAD;
    case "readStarted":
      return readStarted(step);
    case "readEnded":
      return step.name === "loading" ? readEnded(step.held, action.result) : step;
    case "picked":
      return step.name === "ready" ? picked(step, action.key, action.value) : step;
    case "draftDropped":
      return step.name === "ready" ? withDraft(step, null) : step;
    case "saveStarted":
      return step.name === "ready" && step.draft !== null
        ? { name: "saving", view: step.view, draft: step.draft }
        : step;
    case "written":
      return step.name === "saving" ? written(step, action.outcome) : step;
    case "noticeClosed":
      return step.name === "ready" && step.notice !== null ? { ...step, notice: null } : step;
  }
}

/** A pick as Hiroba's page makes it; one that leaves every setting as read is no draft. */
function picked(step: ReadyStep, key: GameSettingKey, value: string): ReadyStep {
  const next = draftGameSettings(step.draft ?? step.view.state, key, value);
  return withDraft(step, sameGameSettings(next, step.view.state) ? null : next);
}

function sameDraft(left: SettingsDraft, right: SettingsDraft): boolean {
  return left === null || right === null ? left === right : sameGameSettings(left, right);
}

function withDraft(step: ReadyStep, draft: SettingsDraft): ReadyStep {
  return sameDraft(step.draft, draft) && step.notice === null
    ? step
    : { ...step, draft, notice: null };
}

function readStarted(step: GameSettingsStep): GameSettingsStep {
  switch (step.name) {
    case "unread":
      return { name: "loading", held: null };
    case "ready":
      return { name: "loading", held: { view: step.view, draft: step.draft } };
    case "loadFailed":
      return { name: "loading", held: step.held };
    default:
      return step;
  }
}

function readEnded(
  held: HeldGameSettings | null,
  result: Result<GameSettingsView, ReadFailure>,
): GameSettingsStep {
  if (!result.ok) {
    // A read again that failed gives the settings back as held: their read says the failure.
    return held === null
      ? { name: "loadFailed", failure: result.error, held }
      : { name: "ready", view: held.view, draft: held.draft, notice: null };
  }

  const view = result.value;
  const keepsDraft = held !== null && sameGameSettings(held.view.state, view.state);
  return { name: "ready", view, draft: keepsDraft ? held.draft : null, notice: null };
}

function written(step: SavingStep, outcome: WriteOutcomeView<GameSettings>): GameSettingsStep {
  return {
    name: "ready",
    view: refreshed(step.view, outcome),
    draft: endsTheEdit(outcome) ? null : step.draft,
    notice: noticeOf(outcome),
  };
}

/** The settings to draw, and whether a write on its way shuts them to presses. */
export interface ShownGameSettings extends HeldGameSettings {
  /** Every setting as the page shows it: the draft, else as read. */
  readonly settings: GameSettings;
  readonly notice: Noticed<GameSettings> | null;
  readonly saving: boolean;
}

const shownOf = (
  { view, draft }: HeldGameSettings,
  notice: Noticed<GameSettings> | null,
  saving: boolean,
): ShownGameSettings => ({ view, draft, settings: draft ?? view.state, notice, saving });

/** A read again keeps the settings it holds on screen until the read ends. */
export function shownGameSettingsOf(step: GameSettingsStep): ShownGameSettings | null {
  switch (step.name) {
    case "ready":
      return shownOf(step, step.notice, false);
    case "saving":
      return shownOf(step, null, true);
    case "loading":
      return step.held === null ? null : shownOf(step.held, null, false);
    case "loadFailed":
    case "unread":
      return null;
  }
}

export function canReadGameSettingsAgain(step: GameSettingsStep): boolean {
  return step.name === "ready" || step.name === "loadFailed";
}

export function isWritingGameSettings(step: GameSettingsStep): boolean {
  return step.name === "saving";
}
