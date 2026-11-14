import { describe, expect, mock, test } from "bun:test";
import { ok } from "@abth/core";
import { act, renderHook } from "@testing-library/react/pure";

import { UNREAD } from "../src/my-page/costume-editor-state";
import { useCostumeEditor } from "../src/my-page/use-costume-editor";
import type { CostumeEditorView, WriteOutcomeView } from "../src/shared/session-port";
import { entryOf, SET, withFace } from "../test/history-fixtures";
import { inADocument } from "./document";
import { answeredByHand, counted, portAnswering, SAVE, writeLane } from "./write-fakes";

inADocument();

const EDITOR: CostumeEditorView = {
  state: SET,
  palette: [{ id: 3, hex: "#336699" }],
  slots: [[1], [2], [3], [4], [5]],
};
const WORN_BEFORE = entryOf(7);
const PICKED = entryOf(9);
const APPLIED: WriteOutcomeView = {
  kind: "applied",
  before: SET,
  after: withFace(9),
  save: SAVE,
  cross: "unchanged",
};
const SESSION_GONE: WriteOutcomeView = { kind: "sessionGone", writeMayHaveHappened: false };

/** The Costume page, not shown, on a port whose writes wait for the test's answers. */
function costumePage() {
  const changeCostume = answeredByHand<WriteOutcomeView>();
  const openCostumeEditor = counted(ok(EDITOR));
  const costumeHistory = counted([WORN_BEFORE]);
  const port = portAnswering({
    changeCostume: changeCostume.call,
    openCostumeEditor: openCostumeEditor.call,
    costumeHistory: costumeHistory.call,
  });
  const { lane, held, renewed } = writeLane();
  const onSessionGone = mock(() => undefined);
  const { result } = renderHook(() =>
    useCostumeEditor({ port, lane, shown: false, onSessionGone }),
  );
  const readThenSave = async () => {
    await act(() => result.current.read());
    act(() => result.current.pickHistory(PICKED));
    act(() => {
      void result.current.save();
    });
  };
  return {
    result,
    changeCostume,
    openCostumeEditor,
    costumeHistory,
    held,
    renewed,
    onSessionGone,
    readThenSave,
  };
}

describe("the costume's write when the session ends on its way", () => {
  test.each([
    ["applied", APPLIED],
    ["sessionGone", SESSION_GONE],
  ])("drops the ended session's %s answer, then reads and writes again", async (_kind, late) => {
    const page = costumePage();
    await page.readThenSave();
    act(() => page.result.current.forget());

    await act(async () => page.changeCostume.answer(late));

    expect(page.onSessionGone).not.toHaveBeenCalled();
    expect(page.renewed).toEqual([]);
    expect(page.costumeHistory.made()).toBe(1);
    expect(page.result.current.history).toEqual([]);
    expect(page.result.current.step).toEqual(UNREAD);
    expect(page.held()).toBe(0);

    await page.readThenSave();
    expect(page.openCostumeEditor.made()).toBe(2);
    expect(page.changeCostume.made()).toBe(2);
  });

  test("forgets the page and says why when its write finds the session gone", async () => {
    const page = costumePage();
    await page.readThenSave();

    await act(async () => page.changeCostume.answer(SESSION_GONE));

    expect(page.onSessionGone).toHaveBeenCalledWith("write.sessionGone");
    expect(page.renewed).toEqual([]);
    expect(page.result.current.history).toEqual([]);
    expect(page.result.current.step).toEqual(UNREAD);
    expect(page.held()).toBe(0);
  });
});

describe("the costume's writes", () => {
  test("send one write when two are asked for at once", async () => {
    const page = costumePage();
    await act(() => page.result.current.read());
    act(() => page.result.current.pickHistory(PICKED));
    act(() => {
      void page.result.current.save();
      void page.result.current.save();
    });

    expect(page.changeCostume.made()).toBe(1);

    await act(async () => page.changeCostume.answer(APPLIED));
    expect(page.held()).toBe(0);
  });
});
