import { describe, expect, mock, test } from "bun:test";
import type { TitleOption } from "@abth/core";
import { act, renderHook } from "@testing-library/react/pure";

import { IDLE } from "../src/name-title/title-editor-state";
import { useTitleEditor } from "../src/name-title/use-title-editor";
import type { TitleState, WriteOutcomeView } from "../src/shared/session-port";
import { inADocument } from "./document";
import { answeredByHand, portAnswering, SAVE, writeLane } from "./write-fakes";

inADocument();

const WORN: TitleOption = { id: 101, label: "サンプルの称号" };
const PICKED: TitleOption = { id: 102, label: "別のサンプル称号" };
const NEXT_PICKED: TitleOption = { id: 103, label: "三つ目のサンプル称号" };
const APPLIED: WriteOutcomeView<TitleState> = {
  kind: "applied",
  before: { title: WORN.label },
  after: { title: PICKED.label },
  save: SAVE,
  cross: "unchanged",
};
const SESSION_GONE: WriteOutcomeView<TitleState> = {
  kind: "sessionGone",
  writeMayHaveHappened: false,
};

/** The title's section on a port whose writes wait for the test's answers. */
function titleSection() {
  const changeTitle = answeredByHand<WriteOutcomeView<TitleState>>();
  const port = portAnswering({ changeTitle: changeTitle.call });
  const { lane, held } = writeLane();
  const onSessionGone = mock(() => undefined);
  const onTitle = mock(() => undefined);
  const onMoved = mock(() => undefined);
  const { result } = renderHook(() =>
    useTitleEditor({
      port,
      lane,
      profile: { title: WORN.label },
      onSessionGone,
      onTitle,
      onMoved,
    }),
  );
  const save = (option: TitleOption) => {
    let saved = Promise.resolve(false);
    act(() => result.current.pick(option));
    act(() => {
      saved = result.current.save();
    });
    return saved;
  };
  return { result, changeTitle, held, onSessionGone, onTitle, onMoved, save };
}

describe("the title's write when the session ends on its way", () => {
  test.each([
    ["applied", APPLIED],
    ["sessionGone", SESSION_GONE],
  ])("drops the ended session's %s answer, then writes again", async (_kind, late) => {
    const section = titleSection();
    const saved = section.save(PICKED);
    act(() => section.result.current.forget());

    expect(await section.save(NEXT_PICKED)).toBe(false);
    expect(section.changeTitle.made()).toBe(1);

    await act(async () => {
      section.changeTitle.answer(late);
      await saved;
    });

    expect(await saved).toBe(false);
    expect(section.onTitle).not.toHaveBeenCalled();
    expect(section.onMoved).not.toHaveBeenCalled();
    expect(section.onSessionGone).not.toHaveBeenCalled();
    expect(section.result.current.step).toEqual({ ...IDLE, picked: NEXT_PICKED });
    expect(section.held()).toBe(0);

    void section.save(NEXT_PICKED);
    expect(section.changeTitle.made()).toBe(2);
  });

  test("forgets the section and says why when its write finds the session gone", async () => {
    const section = titleSection();
    const saved = section.save(PICKED);

    await act(async () => {
      section.changeTitle.answer(SESSION_GONE);
      await saved;
    });

    expect(await saved).toBe(false);
    expect(section.onSessionGone).toHaveBeenCalledWith("write.sessionGone");
    expect(section.onTitle).not.toHaveBeenCalled();
    expect(section.onMoved).not.toHaveBeenCalled();
    expect(section.result.current.step).toEqual(IDLE);
    expect(section.held()).toBe(0);
  });
});
