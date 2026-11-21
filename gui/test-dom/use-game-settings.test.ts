import { describe, expect, mock, test } from "bun:test";
import { ok } from "@abth/core";
import { act, renderHook } from "@testing-library/react/pure";

import { CHOICES, SETTINGS } from "../../core/test/game-settings-fixtures";
import { UNREAD } from "../src/game-settings/game-settings-state";
import { useGameSettings } from "../src/game-settings/use-game-settings";
import type {
  GameSettings,
  GameSettingsChange,
  GameSettingsView,
  WriteOutcomeView,
} from "../src/shared/session-port";
import { inADocument } from "./document";
import { answeredByHand, counted, portAnswering, SAVE, writeLane } from "./write-fakes";

inADocument();

const VIEW: GameSettingsView = { state: SETTINGS, choices: CHOICES, doubleChartsLocked: false };
const WANTED: GameSettings = { ...SETTINGS, voice: "1" };
const SESSION_GONE: WriteOutcomeView<GameSettings> = {
  kind: "sessionGone",
  writeMayHaveHappened: true,
  before: SETTINGS,
  expectedAfter: WANTED,
  save: SAVE,
};
const NOT_SIGNED_IN: WriteOutcomeView<GameSettings> = { kind: "notSignedIn" };

/** The Game settings page on a port whose write waits for the test's answer. */
function settingsPage() {
  const changeGameSettings = answeredByHand<WriteOutcomeView<GameSettings>>();
  const openGameSettings = counted(ok(VIEW));
  const refreshHiroba = counted(ok(undefined));
  const sent: GameSettingsChange[] = [];
  const port = portAnswering({
    changeGameSettings: (change) => {
      sent.push(change);
      return changeGameSettings.call();
    },
    openGameSettings: openGameSettings.call,
    refreshHiroba: refreshHiroba.call,
  });
  const { lane, held } = writeLane();
  const onSessionGone = mock(() => undefined);
  const { result } = renderHook(() => useGameSettings({ port, lane, onSessionGone }));
  const readThenSave = async () => {
    await act(() => result.current.read());
    act(() => result.current.pick("voice", "1"));
    act(() => {
      void result.current.save();
    });
  };
  return {
    result,
    changeGameSettings,
    openGameSettings,
    refreshHiroba,
    sent,
    held,
    onSessionGone,
    readThenSave,
  };
}

describe("the game settings' read", () => {
  test("reads the page once, and after Hiroba's refresh when read again", async () => {
    const page = settingsPage();
    await act(() => page.result.current.read());
    expect(page.openGameSettings.made()).toBe(1);
    expect(page.refreshHiroba.made()).toBe(0);

    await act(() => page.result.current.read(true));
    expect(page.openGameSettings.made()).toBe(2);
    expect(page.refreshHiroba.made()).toBe(1);
  });
});

describe("the game settings' write", () => {
  test("sends every setting as read and every setting wanted, once however often it is asked", async () => {
    const page = settingsPage();
    await act(() => page.result.current.read());
    act(() => page.result.current.pick("voice", "1"));
    act(() => {
      void page.result.current.save();
      void page.result.current.save();
    });
    act(() => {
      void page.result.current.save();
    });

    expect(page.sent).toEqual([{ expected: SETTINGS, target: WANTED }]);
    expect(page.result.current.writing).toBe(true);
    expect(page.held()).toBe(1);

    await act(async () =>
      page.changeGameSettings.answer({
        kind: "applied",
        before: SETTINGS,
        after: WANTED,
        save: SAVE,
        cross: "off",
      }),
    );
    expect(page.result.current.step).toEqual({
      name: "ready",
      view: { ...VIEW, state: WANTED },
      draft: null,
      notice: null,
    });
    expect(page.held()).toBe(0);
  });

  test("forgets the page and says why when its write finds the session gone", async () => {
    const page = settingsPage();
    await page.readThenSave();

    await act(async () => page.changeGameSettings.answer(SESSION_GONE));

    expect(page.onSessionGone).toHaveBeenCalledWith("write.sessionGoneAfterSave");
    expect(page.result.current.step).toEqual(UNREAD);
    expect(page.held()).toBe(0);
  });

  test.each([
    ["sessionGone", SESSION_GONE],
    ["notSignedIn", NOT_SIGNED_IN],
  ])("drops the ended session's %s answer, then reads and writes again", async (_kind, late) => {
    const page = settingsPage();
    await page.readThenSave();
    act(() => page.result.current.forget());

    await act(async () => page.changeGameSettings.answer(late));

    expect(page.onSessionGone).not.toHaveBeenCalled();
    expect(page.result.current.step).toEqual(UNREAD);
    expect(page.held()).toBe(0);

    await page.readThenSave();
    expect(page.openGameSettings.made()).toBe(2);
    expect(page.changeGameSettings.made()).toBe(2);
  });

  test("leaving the page drops the draft and keeps what was read", async () => {
    const page = settingsPage();
    await act(() => page.result.current.read());
    act(() => page.result.current.pick("voice", "1"));

    act(() => page.result.current.dropEdits());

    expect(page.result.current.step).toEqual({
      name: "ready",
      view: VIEW,
      draft: null,
      notice: null,
    });
  });
});
