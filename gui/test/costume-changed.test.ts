import { describe, expect, test } from "bun:test";

import { changedTheCostume, type WriteOutcomeView } from "../src/session-port";

const SAVE = { answer: "json", code: 0, message: null, report: "report" } as const;
const SET = {
  colorBody: 12,
  colorLimb: 12,
  colorFace: 5,
  costume1: 0,
  costume2: 21,
  costume3: 68,
  costume4: 37,
  costume5: 140,
};

describe("changedTheCostume", () => {
  const OUTCOMES: Record<WriteOutcomeView["kind"], WriteOutcomeView> = {
    applied: { kind: "applied", before: SET, after: SET, save: SAVE, cross: "unchanged" },
    appliedNotSynced: {
      kind: "appliedNotSynced",
      before: SET,
      after: SET,
      save: SAVE,
      cross: "unchanged",
    },
    notApplied: {
      kind: "notApplied",
      before: SET,
      after: SET,
      reason: { kind: "unchanged" },
      save: SAVE,
      cross: "unchanged",
    },
    diverged: {
      kind: "diverged",
      before: SET,
      expectedAfter: SET,
      after: SET,
      save: SAVE,
      cross: "unchanged",
    },
    outcomeUnknown: {
      kind: "outcomeUnknown",
      before: SET,
      expectedAfter: SET,
      save: SAVE,
      failure: { kind: "timedOut" },
    },
    sessionGone: { kind: "sessionGone", writeMayHaveHappened: false },
    maintenance: { kind: "maintenance" },
    readFailed: { kind: "readFailed", failure: { kind: "timedOut" } },
    changedSincePreview: { kind: "changedSincePreview", current: SET },
    invalidTarget: { kind: "invalidTarget", field: "costume1" },
    nothingToChange: { kind: "nothingToChange" },
    needsConfirmation: { kind: "needsConfirmation" },
    stoppedBeforeWrite: { kind: "stoppedBeforeWrite", reason: "precheckRejected", code: "code" },
    notSignedIn: { kind: "notSignedIn" },
    interrupted: { kind: "interrupted" },
    busy: { kind: "busy" },
  };

  test("is true for an outcome that left the costume as written, and for no other", () => {
    const changed = Object.values(OUTCOMES)
      .filter((outcome) => changedTheCostume(outcome))
      .map(({ kind }) => kind);

    expect(changed).toEqual(["applied", "appliedNotSynced"]);
  });
});
