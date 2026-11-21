import { describe, expect, test } from "bun:test";
import { err, ok, type SaveReading } from "@abth/core";

import { CHOICES, SETTINGS } from "../../core/test/game-settings-fixtures";
import {
  canReadGameSettingsAgain,
  type GameSettingsAction,
  type GameSettingsStep,
  isWritingGameSettings,
  reduceGameSettings,
  shownGameSettingsOf,
  UNREAD,
} from "../src/game-settings/game-settings-state";
import type {
  GameSettings,
  GameSettingsView,
  ReadFailure,
  WriteOutcomeView,
} from "../src/shared/session-port";
import type { Noticed } from "../src/shared/writes/write-ending";

const SAVE: SaveReading = { answer: "json", code: 0, message: null, report: "report" };
const FAILURE: ReadFailure = { kind: "unreachable" };
const settings = (changes: Partial<GameSettings> = {}): GameSettings => ({
  ...SETTINGS,
  ...changes,
});
const viewOf = (state: GameSettings = SETTINGS): GameSettingsView => ({
  state,
  choices: CHOICES,
  doubleChartsLocked: false,
});

const ready = (
  view: GameSettingsView = viewOf(),
  draft: GameSettings | null = null,
  notice: Noticed<GameSettings> | null = null,
): GameSettingsStep => ({ name: "ready", view, draft, notice });
const saving = (view: GameSettingsView, draft: GameSettings): GameSettingsStep => ({
  name: "saving",
  view,
  draft,
});

const run = (step: GameSettingsStep, ...actions: GameSettingsAction[]) =>
  actions.reduce(reduceGameSettings, step);
const pick = (key: keyof GameSettings, value: string): GameSettingsAction => ({
  type: "picked",
  key,
  value,
});

const applied = (before: GameSettings, after: GameSettings): WriteOutcomeView<GameSettings> => ({
  kind: "applied",
  before,
  after,
  save: SAVE,
  cross: "off",
});
const refused = (settingsNow: GameSettings): Noticed<GameSettings> => ({
  kind: "notApplied",
  before: settingsNow,
  after: settingsNow,
  reason: { kind: "refused", code: 25, message: "不明な値が設定されています。" },
  save: SAVE,
  cross: "off",
});

describe("a read of the game settings", () => {
  test("opens them as read, with no draft and no notice", () => {
    const view = viewOf();
    const step = run(UNREAD, { type: "readStarted" }, { type: "readEnded", result: ok(view) });
    expect(step).toEqual({ name: "ready", view, draft: null, notice: null });
  });

  test("says why it failed, holding nothing the first time", () => {
    const step = run(UNREAD, { type: "readStarted" }, { type: "readEnded", result: err(FAILURE) });
    expect(step).toEqual({ name: "loadFailed", failure: FAILURE, held: null });
    expect(shownGameSettingsOf(step)).toBeNull();
    expect(canReadGameSettingsAgain(step)).toBe(true);
  });

  test("again keeps the settings and the draft on screen, and gives them back when it fails", () => {
    const draft = settings({ voice: "1" });
    const step = run(ready(viewOf(), draft), { type: "readStarted" });
    expect(shownGameSettingsOf(step)).toMatchObject({ settings: draft, saving: false });
    expect(run(step, { type: "readEnded", result: err(FAILURE) })).toEqual(ready(viewOf(), draft));
  });

  test("again keeps the draft while Hiroba holds the settings it was made from, else drops it", () => {
    const draft = settings({ voice: "1" });
    const same = run(ready(viewOf(), draft), { type: "readStarted" });
    expect(run(same, { type: "readEnded", result: ok(viewOf()) })).toEqual(ready(viewOf(), draft));
    const moved = viewOf(settings({ region: "TWN" }));
    expect(run(same, { type: "readEnded", result: ok(moved) })).toEqual(ready(moved));
  });

  test("starts no second read while one runs, nor one while a write runs", () => {
    const loading = run(UNREAD, { type: "readStarted" });
    expect(run(loading, { type: "readStarted" })).toBe(loading);
    const busy = saving(viewOf(), settings({ voice: "1" }));
    expect(run(busy, { type: "readStarted" })).toBe(busy);
    expect(canReadGameSettingsAgain(busy)).toBe(false);
  });
});

describe("a pick", () => {
  test("puts every setting in the draft, the one picked changed", () => {
    expect(run(ready(), pick("speed", "35"))).toEqual(ready(viewOf(), settings({ speed: "35" })));
  });

  test("that puts the settings back as read leaves no draft", () => {
    expect(run(ready(), pick("speed", "35"), pick("speed", SETTINGS.speed))).toEqual(ready());
  });

  test("drops a ★ the new difficulty of the folder cannot take, as Hiroba's page does", () => {
    const step = run(ready(), pick("folderDifficulty", "1"));
    expect(shownGameSettingsOf(step)?.settings).toEqual(
      settings({ folderDifficulty: "1", folderStars: "0" }),
    );
  });

  test("clears the last write's notice, and the reset drops the draft", () => {
    const noticed = ready(viewOf(), null, refused(SETTINGS));
    expect(run(noticed, pick("voice", "1"))).toEqual(ready(viewOf(), settings({ voice: "1" })));
    expect(run(ready(viewOf(), settings({ voice: "1" })), { type: "draftDropped" })).toEqual(
      ready(),
    );
  });

  test("changes nothing while a write runs, and the same step comes back for a pick that changes nothing", () => {
    const busy = saving(viewOf(), settings({ voice: "1" }));
    expect(run(busy, pick("speed", "35"))).toBe(busy);
    const step = ready(viewOf(), settings({ voice: "1" }));
    expect(run(step, pick("voice", "1"))).toBe(step);
  });
});

describe("a write of the game settings", () => {
  test("starts only with a draft, and shuts the settings while it runs", () => {
    expect(run(ready(), { type: "saveStarted" })).toEqual(ready());
    const draft = settings({ voice: "1" });
    const step = run(ready(viewOf(), draft), { type: "saveStarted" });
    expect(step).toEqual(saving(viewOf(), draft));
    expect(isWritingGameSettings(step)).toBe(true);
    expect(shownGameSettingsOf(step)).toMatchObject({ settings: draft, saving: true });
  });

  test("that applied shows the settings read back, with no draft and nothing to say", () => {
    const draft = settings({ voice: "1" });
    const step = run(saving(viewOf(), draft), {
      type: "written",
      outcome: applied(SETTINGS, draft),
    });
    expect(step).toEqual(ready(viewOf(draft)));
  });

  test("that Hiroba refused shows the settings read back and says so", () => {
    const outcome = refused(SETTINGS);
    const step = run(saving(viewOf(), settings({ voice: "1" })), { type: "written", outcome });
    expect(step).toEqual(ready(viewOf(), null, outcome));
  });

  test("that ended without reading Hiroba back keeps the draft, to be sent again", () => {
    const draft = settings({ voice: "1" });
    const outcome: Noticed<GameSettings> = { kind: "interrupted" };
    const step = run(saving(viewOf(), draft), { type: "written", outcome });
    expect(step).toEqual(ready(viewOf(), draft, outcome));
    expect(run(step, { type: "noticeClosed" })).toEqual(ready(viewOf(), draft));
  });

  test("ends nothing that is not on its way", () => {
    const step = ready();
    expect(run(step, { type: "written", outcome: applied(SETTINGS, SETTINGS) })).toBe(step);
  });
});
