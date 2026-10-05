import { describe, expect, test } from "bun:test";
import { err, ok, type SaveReading } from "@abth/core";

import {
  canReadFavoritesAgain,
  type FavoritesAction,
  type FavoritesNotice,
  type FavoritesStep,
  isWritingFavorites,
  reduceFavorites,
  shownFavoritesOf,
  UNREAD,
} from "../src/favorites/favorites-state";
import type {
  FavoriteSongState,
  FavoritesView,
  FolderState,
  ReadFailure,
  WriteOutcomeView,
} from "../src/session-port";

const SAVE: SaveReading = { answer: "json", code: 0, message: null, report: "report" };
const song = (songNo: string | null, ura = false): FavoriteSongState => ({ songNo, ura });
const FAILURE: ReadFailure = { kind: "unreachable" };

const folderOf = (...songs: string[]): FolderState => ({
  slots: [...songs, ...Array.from({ length: 30 - songs.length }, () => null)],
});
const viewOf = (songNo: string | null = "1001", folder: string[] = ["1001", "1002"]) => {
  const shown = (one: string) => ({ songNo: one, title: `曲${one}`, genre: 1 }) as const;
  return {
    folder: { state: folderOf(...folder), songs: folder.map(shown) },
    song: { state: song(songNo), song: songNo === null ? null : shown(songNo) },
  } satisfies FavoritesView;
};

const ready = (
  view: FavoritesView = viewOf(),
  draft: FavoriteSongState | null = null,
  notice: FavoritesNotice | null = null,
): FavoritesStep => ({ name: "ready", view, draft, notice });
const saving = (
  write: "favoriteSong" | "folder",
  view: FavoritesView = viewOf(),
  draft: FavoriteSongState | null = null,
): FavoritesStep => ({ name: "saving", write, view, draft });

const run = (step: FavoritesStep, ...actions: FavoritesAction[]) =>
  actions.reduce(reduceFavorites, step);

const appliedSong = (
  before: FavoriteSongState,
  after: FavoriteSongState,
): WriteOutcomeView<FavoriteSongState> => ({
  kind: "applied",
  before,
  after,
  save: SAVE,
  cross: "off",
});
const appliedFolder = (before: FolderState, after: FolderState): WriteOutcomeView<FolderState> => ({
  kind: "applied",
  before,
  after,
  save: SAVE,
  cross: "off",
});

describe("a read of the favourites", () => {
  test("begins from nothing held when they have not been read", () => {
    expect(run(UNREAD, { type: "readStarted" })).toEqual({ name: "loading", held: null });
  });

  test("opens them as read, with no draft and no notice", () => {
    const view = viewOf("1003");
    const step = run(UNREAD, { type: "readStarted" }, { type: "readEnded", result: ok(view) });
    expect(step).toEqual({ name: "ready", view, draft: null, notice: null });
  });

  test("says why it failed, holding nothing the first time", () => {
    const step = run(UNREAD, { type: "readStarted" }, { type: "readEnded", result: err(FAILURE) });
    expect(step).toEqual({ name: "loadFailed", failure: FAILURE, held: null });
  });

  test("keeps a draft when the song set is the one it was made over", () => {
    const draft = song("1005");
    const fresh = viewOf("1001", ["1009"]);
    const step = run(
      ready(viewOf("1001"), draft),
      { type: "readStarted" },
      { type: "readEnded", result: ok(fresh) },
    );
    expect(step).toEqual({ name: "ready", view: fresh, draft, notice: null });
  });

  test("drops a draft when the song set has moved since", () => {
    const fresh = viewOf("1007");
    const step = run(
      ready(viewOf("1001"), song("1005")),
      { type: "readStarted" },
      { type: "readEnded", result: ok(fresh) },
    );
    expect(step).toEqual({ name: "ready", view: fresh, draft: null, notice: null });
  });

  test("holds the view and the draft through a read that fails, for the read after it", () => {
    const view = viewOf("1001");
    const draft = song("1005");
    const failed = run(
      ready(view, draft),
      { type: "readStarted" },
      { type: "readEnded", result: err(FAILURE) },
    );
    expect(failed).toEqual({ name: "loadFailed", failure: FAILURE, held: { view, draft } });
    expect(run(failed, { type: "readStarted" })).toEqual({
      name: "loading",
      held: { view, draft },
    });
  });

  test("does not begin while one runs or a write is on its way", () => {
    const loading = run(UNREAD, { type: "readStarted" });
    expect(run(loading, { type: "readStarted" })).toBe(loading);
    const busy = saving("folder");
    expect(run(busy, { type: "readStarted" })).toBe(busy);
  });

  test("ends only a read that was begun", () => {
    const step = ready();
    expect(run(step, { type: "readEnded", result: ok(viewOf("1009")) })).toBe(step);
    expect(run(UNREAD, { type: "readEnded", result: ok(viewOf()) })).toBe(UNREAD);
  });

  test("is forgotten when a session ends", () => {
    expect(run(ready(viewOf(), song("1005")), { type: "forget" })).toBe(UNREAD);
  });
});

describe("a pick for the 大好きな曲", () => {
  test("puts the song in the draft", () => {
    expect(run(ready(), { type: "songPicked", song: song("1005") })).toEqual(
      ready(viewOf(), song("1005")),
    );
  });

  test("makes no draft of the song already set", () => {
    const step = ready(viewOf("1001"), song("1005"));
    expect(run(step, { type: "songPicked", song: song("1001") })).toEqual(ready(viewOf("1001")));
  });

  test("drafts the 裏 entry of the song already set: another entry, so a change", () => {
    expect(run(ready(viewOf("1001")), { type: "songPicked", song: song("1001", true) })).toEqual(
      ready(viewOf("1001"), song("1001", true)),
    );
  });

  test("can pick none, to clear the song", () => {
    expect(run(ready(), { type: "songPicked", song: song(null) })).toEqual(
      ready(viewOf(), song(null)),
    );
  });

  test("clears the last write's notice", () => {
    const notice: FavoritesNotice = { write: "folder", outcome: { kind: "nothingToChange" } };
    expect(run(ready(viewOf(), null, notice), { type: "songPicked", song: song("1005") })).toEqual(
      ready(viewOf(), song("1005")),
    );
  });

  test("changes nothing when it picks the song picked, or when the favourites are not shown", () => {
    const step = ready(viewOf(), song("1005"));
    expect(run(step, { type: "songPicked", song: song("1005") })).toBe(step);
    const busy = saving("favoriteSong", viewOf(), song("1005"));
    expect(run(busy, { type: "songPicked", song: song("1006") })).toBe(busy);
    expect(run(UNREAD, { type: "songPicked", song: song("1006") })).toBe(UNREAD);
  });
});

describe("dropping the draft", () => {
  test("puts the row back to the song set, with no notice", () => {
    const notice: FavoritesNotice = { write: "folder", outcome: { kind: "nothingToChange" } };
    expect(run(ready(viewOf(), song("1005"), notice), { type: "draftDropped" })).toEqual(ready());
  });

  test("returns the very same step when there is nothing to drop", () => {
    const step = ready();
    expect(run(step, { type: "draftDropped" })).toBe(step);
  });

  test("leaves a write on its way alone", () => {
    const busy = saving("favoriteSong", viewOf(), song("1005"));
    expect(run(busy, { type: "draftDropped" })).toBe(busy);
  });
});

describe("starting a save", () => {
  test("shuts the favourites while the song is written, keeping the draft", () => {
    const step = ready(viewOf(), song("1005"));
    expect(run(step, { type: "saveStarted", write: "favoriteSong" })).toEqual(
      saving("favoriteSong", viewOf(), song("1005")),
    );
  });

  test("does not write the song with no draft", () => {
    const step = ready();
    expect(run(step, { type: "saveStarted", write: "favoriteSong" })).toBe(step);
  });

  test("shuts the favourites while the folder is written, a draft or none", () => {
    expect(run(ready(), { type: "saveStarted", write: "folder" })).toEqual(saving("folder"));
    expect(run(ready(viewOf(), song("1005")), { type: "saveStarted", write: "folder" })).toEqual(
      saving("folder", viewOf(), song("1005")),
    );
  });

  test("does not begin a second write, or begin one before a read", () => {
    const busy = saving("folder");
    expect(run(busy, { type: "saveStarted", write: "favoriteSong" })).toBe(busy);
    expect(run(UNREAD, { type: "saveStarted", write: "folder" })).toBe(UNREAD);
  });
});

describe("the end of a 大好きな曲 write", () => {
  const before = viewOf("1001");
  const draft = song("1005");

  test("takes the song read back, drops the draft it saved, and says nothing", () => {
    const step = run(saving("favoriteSong", before, draft), {
      type: "songWritten",
      outcome: appliedSong(song("1001"), draft),
    });
    expect(step).toEqual(ready({ ...before, song: { ...before.song, state: draft } }));
  });

  test("keeps the draft and says how it ended when nothing was saved", () => {
    const outcome: WriteOutcomeView<FavoriteSongState> = {
      kind: "notApplied",
      before: song("1001"),
      after: song("1001"),
      reason: { kind: "refused", code: 1, message: null },
      save: SAVE,
      cross: "off",
    };
    const step = run(saving("favoriteSong", before, draft), { type: "songWritten", outcome });
    expect(step).toEqual(ready(before, draft, { write: "favoriteSong", outcome }));
  });

  test("shows the song as the write last saw it, though it is not the draft", () => {
    const outcome: WriteOutcomeView<FavoriteSongState> = {
      kind: "diverged",
      before: song("1001"),
      expectedAfter: draft,
      after: song("1008"),
      save: SAVE,
      cross: "off",
    };
    const step = run(saving("favoriteSong", before, draft), { type: "songWritten", outcome });
    expect(step).toEqual(
      ready({ ...before, song: { ...before.song, state: song("1008") } }, draft, {
        write: "favoriteSong",
        outcome,
      }),
    );
  });

  test("shows the song another place set, when the write found it moved", () => {
    const outcome: WriteOutcomeView<FavoriteSongState> = {
      kind: "changedSincePreview",
      current: song("1005"),
    };
    const step = run(saving("favoriteSong", before, draft), { type: "songWritten", outcome });
    expect(step).toMatchObject({
      name: "ready",
      view: { song: { state: draft } },
      draft: null,
      notice: { write: "favoriteSong", outcome },
    });
  });

  test("leaves the view as it was for an ending that says nothing of the song", () => {
    const outcome: WriteOutcomeView<FavoriteSongState> = { kind: "interrupted" };
    const step = run(saving("favoriteSong", before, draft), { type: "songWritten", outcome });
    expect(step).toEqual(ready(before, draft, { write: "favoriteSong", outcome }));
  });

  test("ends only a write of the song that was begun", () => {
    const outcome = appliedSong(song("1001"), draft);
    const folderBusy = saving("folder", before, draft);
    expect(run(folderBusy, { type: "songWritten", outcome })).toBe(folderBusy);
    const step = ready(before, draft);
    expect(run(step, { type: "songWritten", outcome })).toBe(step);
  });
});

describe("the end of a folder write", () => {
  const view = viewOf("1001", ["1001", "1002"]);

  test("takes the folder read back and says nothing, leaving the draft alone", () => {
    const after = folderOf("1003", "1004", "1005");
    const draft = song("1009");
    const step = run(saving("folder", view, draft), {
      type: "folderWritten",
      outcome: appliedFolder(view.folder.state, after),
    });
    expect(step).toEqual(
      ready({ ...view, folder: { ...view.folder, state: { slots: after.slots } } }, draft),
    );
  });

  test("keeps the folder as it was and says so when Hiroba did not take every song", () => {
    const outcome: WriteOutcomeView<FolderState> = {
      kind: "notStaged",
      before: view.folder.state,
      staged: folderOf("1003"),
      expectedAfter: folderOf("1003", "1004"),
    };
    const step = run(saving("folder", view), { type: "folderWritten", outcome });
    expect(step).toEqual(ready(view, null, { write: "folder", outcome }));
  });

  test("shows the folder as the write last saw it when it ended apart from the plan", () => {
    const outcome: WriteOutcomeView<FolderState> = {
      kind: "diverged",
      before: view.folder.state,
      expectedAfter: folderOf("1003"),
      after: folderOf("1003", "1002"),
      save: SAVE,
      cross: "off",
    };
    const step = run(saving("folder", view), { type: "folderWritten", outcome });
    expect(step).toMatchObject({
      name: "ready",
      view: { folder: { state: folderOf("1003", "1002") } },
      notice: { write: "folder", outcome },
    });
  });

  test("ends only a write of the folder that was begun", () => {
    const outcome = appliedFolder(view.folder.state, folderOf("1003"));
    const songBusy = saving("favoriteSong", view, song("1005"));
    expect(run(songBusy, { type: "folderWritten", outcome })).toBe(songBusy);
  });
});

describe("what the page asks of a step", () => {
  const view = viewOf();
  const held = { view, draft: song("1005") };

  test("reads again only from the favourites shown or a failed read", () => {
    expect(canReadFavoritesAgain(ready())).toBe(true);
    expect(canReadFavoritesAgain({ name: "loadFailed", failure: FAILURE, held: null })).toBe(true);
    expect(canReadFavoritesAgain(UNREAD)).toBe(false);
    expect(canReadFavoritesAgain({ name: "loading", held: null })).toBe(false);
    expect(canReadFavoritesAgain(saving("folder"))).toBe(false);
  });

  test("is writing only while a save runs", () => {
    expect(isWritingFavorites(saving("favoriteSong"))).toBe(true);
    expect(isWritingFavorites(ready())).toBe(false);
  });

  test("shows the favourites ready, shut while a save runs or a read again runs, else nothing", () => {
    const notice: FavoritesNotice = { write: "folder", outcome: { kind: "nothingToChange" } };
    expect(shownFavoritesOf(ready(view, held.draft, notice))).toEqual({
      ...held,
      notice,
      shut: false,
      saving: null,
    });
    expect(shownFavoritesOf(saving("folder", view, held.draft))).toEqual({
      ...held,
      notice: null,
      shut: true,
      saving: "folder",
    });
    expect(shownFavoritesOf({ name: "loading", held })).toEqual({
      ...held,
      notice: null,
      shut: true,
      saving: null,
    });
    expect(shownFavoritesOf({ name: "loading", held: null })).toBeNull();
    expect(shownFavoritesOf({ name: "loadFailed", failure: FAILURE, held })).toBeNull();
    expect(shownFavoritesOf(UNREAD)).toBeNull();
  });
});
