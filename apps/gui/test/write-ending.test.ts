import { describe, expect, test } from "bun:test";
import type { SaveReading } from "@abth/core";
import {
  type Noticed,
  noticeOf,
  refreshed,
  sendHeld,
  sessionNoticeOf,
} from "../src/my-page/write-ending";
import type { WriteOutcomeView } from "../src/session-port";

interface Shown {
  readonly state: { readonly title: string };
  readonly other: string;
}

const SAVE: SaveReading = { answer: "json", code: 0, message: null, report: "report" };
const OLD = { title: "サンプルの称号" };
const PLANNED = { title: "別のサンプル称号" };
const FOUND = { title: "三つ目のサンプル称号" };
const SHOWN: Shown = { state: OLD, other: "kept" };

describe("refreshed", () => {
  type Case = [
    label: string,
    outcome: WriteOutcomeView<{ title: string }>,
    state: { title: string },
  ];
  test.each<Case>([
    [
      "an applied write, to the set read back",
      { kind: "applied", before: OLD, after: PLANNED, save: SAVE, cross: "unchanged" },
      PLANNED,
    ],
    [
      "a write that did not reach the game server",
      { kind: "appliedNotSynced", before: OLD, after: PLANNED, save: SAVE, cross: "unchanged" },
      PLANNED,
    ],
    [
      "a write the site answered and left as it was",
      {
        kind: "notApplied",
        before: OLD,
        after: OLD,
        reason: { kind: "unchanged" },
        save: SAVE,
        cross: "unchanged",
      },
      OLD,
    ],
    [
      "a write that ended elsewhere than planned, to where it ended",
      {
        kind: "diverged",
        before: OLD,
        expectedAfter: PLANNED,
        after: FOUND,
        save: SAVE,
        cross: "off",
      },
      FOUND,
    ],
    [
      "a write stopped because the set had moved, to the set found",
      { kind: "changedSincePreview", current: FOUND },
      FOUND,
    ],
  ])("shows %s", (_label, outcome, state) => {
    expect(refreshed(SHOWN, outcome)).toEqual({ ...SHOWN, state });
  });

  test.each<WriteOutcomeView<{ title: string }>>([
    { kind: "maintenance" },
    { kind: "nothingToChange" },
    { kind: "invalidTarget", field: "title.notOwned" },
    { kind: "interrupted" },
    { kind: "busy" },
    { kind: "sessionGone", writeMayHaveHappened: false },
    {
      kind: "outcomeUnknown",
      before: OLD,
      expectedAfter: PLANNED,
      save: SAVE,
      failure: { kind: "unreachable" },
    },
  ])("leaves the editor as it was after %p", (outcome) => {
    expect(refreshed(SHOWN, outcome)).toBe(SHOWN);
  });
});

describe("noticeOf", () => {
  test("says nothing of a write that applied", () => {
    const applied: WriteOutcomeView<{ title: string }> = {
      kind: "applied",
      before: OLD,
      after: PLANNED,
      save: SAVE,
      cross: "unchanged",
    };
    expect(noticeOf(applied)).toBeNull();
  });

  test.each<Noticed<{ title: string }>>([
    { kind: "appliedNotSynced", before: OLD, after: PLANNED, save: SAVE, cross: "unchanged" },
    {
      kind: "notApplied",
      before: OLD,
      after: OLD,
      reason: { kind: "unchanged" },
      save: SAVE,
      cross: "unchanged",
    },
    { kind: "changedSincePreview", current: FOUND },
    { kind: "maintenance" },
    { kind: "interrupted" },
    { kind: "busy" },
  ])("gives every other ending as it is: %p", (outcome) => {
    expect(noticeOf(outcome)).toBe(outcome);
  });
});

describe("sendHeld", () => {
  const laneOf = () => {
    const calls: string[] = [];
    return {
      calls,
      lane: { hold: () => calls.push("hold"), release: () => calls.push("release") },
    };
  };

  test("holds the lane for the write and lets it go after, and gives the write's ending", async () => {
    const { calls, lane } = laneOf();
    const sent = await sendHeld(lane, async () => {
      calls.push("send");
      return { kind: "maintenance" };
    });
    expect(sent).toEqual({ kind: "maintenance" });
    expect(calls).toEqual(["hold", "send", "release"]);
  });

  test("ends a call that throws as interrupted, with the lane let go", async () => {
    const { calls, lane } = laneOf();
    const sent = await sendHeld(lane, async () => {
      throw new Error("The bridge refused it");
    });
    expect(sent).toEqual({ kind: "interrupted" });
    expect(calls).toEqual(["hold", "release"]);
  });
});

describe("sessionNoticeOf", () => {
  test("says what the sign-in card says for a write that found the session gone", () => {
    expect(sessionNoticeOf({ kind: "notSignedIn" })).toBe("failure.notSignedIn");
    expect(sessionNoticeOf({ kind: "sessionGone", writeMayHaveHappened: false })).toBe(
      "write.sessionGone",
    );
    expect(
      sessionNoticeOf({
        kind: "sessionGone",
        writeMayHaveHappened: true,
        before: OLD,
        expectedAfter: PLANNED,
        save: SAVE,
      }),
    ).toBe("write.sessionGoneAfterSave");
  });

  test("says nothing for any other ending", () => {
    for (const outcome of [
      { kind: "maintenance" },
      { kind: "busy" },
      { kind: "interrupted" },
    ] as const) {
      expect(sessionNoticeOf(outcome)).toBeNull();
    }
  });
});
