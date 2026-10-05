import { type Result, sameFavoriteSong } from "@abth/core";

import { type Noticed, noticeOf, refreshed } from "../my-page/write-ending";
import type {
  FavoriteSongState,
  FavoritesView,
  FolderState,
  ReadFailure,
  WriteOutcomeView,
} from "../session-port";

/** The 大好きな曲 picked and not yet saved; none while nothing is picked. */
export type SongDraft = FavoriteSongState | null;

export interface HeldFavorites {
  readonly view: FavoritesView;
  readonly draft: SongDraft;
}

export type SavingWrite = "favoriteSong" | "folder";

export type FavoritesNotice =
  | { readonly write: "favoriteSong"; readonly outcome: Noticed<FavoriteSongState> }
  | { readonly write: "folder"; readonly outcome: Noticed<FolderState> };

export type FavoritesStep =
  | { readonly name: "unread" }
  | { readonly name: "loading"; readonly held: HeldFavorites | null }
  | {
      readonly name: "loadFailed";
      readonly failure: ReadFailure;
      readonly held: HeldFavorites | null;
    }
  | {
      readonly name: "ready";
      readonly view: FavoritesView;
      readonly draft: SongDraft;
      /** How the last write ended, until the next pick, reset, save or read; none if it applied. */
      readonly notice: FavoritesNotice | null;
    }
  | {
      readonly name: "saving";
      readonly write: SavingWrite;
      readonly view: FavoritesView;
      readonly draft: SongDraft;
    };

type ReadyStep = Extract<FavoritesStep, { readonly name: "ready" }>;
type SavingStep = Extract<FavoritesStep, { readonly name: "saving" }>;

export type FavoritesAction =
  | { readonly type: "forget" }
  | { readonly type: "readStarted" }
  | { readonly type: "readEnded"; readonly result: Result<FavoritesView, ReadFailure> }
  | { readonly type: "songPicked"; readonly song: FavoriteSongState }
  | { readonly type: "draftDropped" }
  | { readonly type: "saveStarted"; readonly write: SavingWrite }
  | { readonly type: "songWritten"; readonly outcome: WriteOutcomeView<FavoriteSongState> }
  | { readonly type: "folderWritten"; readonly outcome: WriteOutcomeView<FolderState> };

export const UNREAD: FavoritesStep = { name: "unread" };

/** An action the step cannot take returns the very same step, so the page does not draw again. */
export function reduceFavorites(step: FavoritesStep, action: FavoritesAction): FavoritesStep {
  switch (action.type) {
    case "forget":
      return UNREAD;
    case "readStarted":
      return readStarted(step);
    case "readEnded":
      return step.name === "loading" ? readEnded(step.held, action.result) : step;
    case "songPicked":
      return step.name === "ready" ? withDraft(step, draftOf(step, action.song)) : step;
    case "draftDropped":
      return step.name === "ready" ? withDraft(step, null) : step;
    case "saveStarted":
      return saveStarted(step, action.write);
    case "songWritten":
      return step.name === "saving" && step.write === "favoriteSong"
        ? songWritten(step, action.outcome)
        : step;
    case "folderWritten":
      return step.name === "saving" && step.write === "folder"
        ? folderWritten(step, action.outcome)
        : step;
  }
}

/** Picking the song already set is no change, so no draft. */
function draftOf(step: ReadyStep, song: FavoriteSongState): SongDraft {
  return sameFavoriteSong(song, step.view.song.state) ? null : song;
}

function sameDraft(left: SongDraft, right: SongDraft): boolean {
  return left === null || right === null ? left === right : sameFavoriteSong(left, right);
}

function withDraft(step: ReadyStep, draft: SongDraft): ReadyStep {
  return sameDraft(step.draft, draft) && step.notice === null
    ? step
    : { ...step, draft, notice: null };
}

function readStarted(step: FavoritesStep): FavoritesStep {
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
  held: HeldFavorites | null,
  result: Result<FavoritesView, ReadFailure>,
): FavoritesStep {
  if (!result.ok) {
    return { name: "loadFailed", failure: result.error, held };
  }

  const view = result.value;
  const keepsDraft = held !== null && sameFavoriteSong(held.view.song.state, view.song.state);
  return { name: "ready", view, draft: keepsDraft ? held.draft : null, notice: null };
}

function saveStarted(step: FavoritesStep, write: SavingWrite): FavoritesStep {
  if (step.name !== "ready" || (write === "favoriteSong" && step.draft === null)) {
    return step;
  }

  return { name: "saving", write, view: step.view, draft: step.draft };
}

function songWritten(
  step: SavingStep,
  outcome: WriteOutcomeView<FavoriteSongState>,
): FavoritesStep {
  const song = refreshed(step.view.song, outcome);
  const saved = sameDraft(step.draft, song.state);
  const noticed = noticeOf(outcome);
  return {
    name: "ready",
    view: { ...step.view, song },
    draft: saved ? null : step.draft,
    notice: noticed === null ? null : { write: "favoriteSong", outcome: noticed },
  };
}

function folderWritten(step: SavingStep, outcome: WriteOutcomeView<FolderState>): FavoritesStep {
  const noticed = noticeOf(outcome);
  return {
    name: "ready",
    view: { ...step.view, folder: refreshed(step.view.folder, outcome) },
    draft: step.draft,
    notice: noticed === null ? null : { write: "folder", outcome: noticed },
  };
}

/** The favourites to draw, and whether they are shut to presses while a write or a read runs. */
export interface ShownFavorites extends HeldFavorites {
  readonly notice: FavoritesNotice | null;
  readonly shut: boolean;
  /** The write on its way, if any. */
  readonly saving: SavingWrite | null;
}

/** A read again keeps the favourites it holds on screen, shut, until the read ends. */
export function shownFavoritesOf(step: FavoritesStep): ShownFavorites | null {
  switch (step.name) {
    case "ready":
      return { view: step.view, draft: step.draft, notice: step.notice, shut: false, saving: null };
    case "saving":
      return { view: step.view, draft: step.draft, notice: null, shut: true, saving: step.write };
    case "loading":
      return step.held === null ? null : { ...step.held, notice: null, shut: true, saving: null };
    case "loadFailed":
    case "unread":
      return null;
  }
}

export function canReadFavoritesAgain(step: FavoritesStep): boolean {
  return step.name === "ready" || step.name === "loadFailed";
}

export function isWritingFavorites(step: FavoritesStep): boolean {
  return step.name === "saving";
}
