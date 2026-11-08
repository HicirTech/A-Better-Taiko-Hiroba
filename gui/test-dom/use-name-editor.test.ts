import { describe, expect, mock, test } from "bun:test";
import { act, renderHook } from "@testing-library/react/pure";

import { IDLE } from "../src/name-title/name-editor-state";
import { useNameEditor } from "../src/name-title/use-name-editor";
import type { NameState, WriteOutcomeView } from "../src/shared/session-port";
import { inADocument } from "./document";
import { answeredByHand, portAnswering, SAVE, writeLane } from "./write-fakes";

inADocument();

const PROFILE = { nickname: "サンプルどん", rename: "open" } as const;
const TYPED = "あたらしい";
const NEXT_TYPED = "つぎのどん";
const APPLIED: WriteOutcomeView<NameState> = {
  kind: "applied",
  before: { nickname: PROFILE.nickname },
  after: { nickname: TYPED },
  save: SAVE,
  cross: "unchanged",
};
const SESSION_GONE: WriteOutcomeView<NameState> = {
  kind: "sessionGone",
  writeMayHaveHappened: false,
};

/** The nickname's section on a port whose writes wait for the test's answers. */
function nameSection() {
  const changeName = answeredByHand<WriteOutcomeView<NameState>>();
  const port = portAnswering({ changeName: changeName.call });
  const { lane, held } = writeLane();
  const onSessionGone = mock(() => undefined);
  const onNickname = mock(() => undefined);
  const { result } = renderHook(() =>
    useNameEditor({ port, lane, profile: PROFILE, onSessionGone, onNickname }),
  );
  const save = (typed: string) => {
    let saved = Promise.resolve(false);
    act(() => result.current.type(typed));
    act(() => {
      saved = result.current.save();
    });
    return saved;
  };
  return { result, changeName, held, onSessionGone, onNickname, save };
}

describe("the nickname's write when the session ends on its way", () => {
  test.each([
    ["applied", APPLIED],
    ["sessionGone", SESSION_GONE],
  ])("drops the ended session's %s answer, then writes again", async (_kind, late) => {
    const section = nameSection();
    const saved = section.save(TYPED);
    act(() => section.result.current.forget());

    expect(await section.save(NEXT_TYPED)).toBe(false);
    expect(section.changeName.made()).toBe(1);

    await act(async () => {
      section.changeName.answer(late);
      await saved;
    });

    expect(await saved).toBe(false);
    expect(section.onNickname).not.toHaveBeenCalled();
    expect(section.onSessionGone).not.toHaveBeenCalled();
    expect(section.result.current.step).toEqual({ name: "idle", typed: NEXT_TYPED, notice: null });
    expect(section.held()).toBe(0);

    void section.save(NEXT_TYPED);
    expect(section.changeName.made()).toBe(2);
  });

  test("forgets the section and says why when its write finds the session gone", async () => {
    const section = nameSection();
    const saved = section.save(TYPED);

    await act(async () => {
      section.changeName.answer(SESSION_GONE);
      await saved;
    });

    expect(await saved).toBe(false);
    expect(section.onSessionGone).toHaveBeenCalledWith("write.sessionGone");
    expect(section.onNickname).not.toHaveBeenCalled();
    expect(section.result.current.step).toEqual(IDLE);
    expect(section.held()).toBe(0);
  });
});
