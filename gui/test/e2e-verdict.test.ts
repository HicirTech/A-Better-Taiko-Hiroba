import { describe, expect, test } from "bun:test";

import { wrongChecks } from "../scripts/e2e/verdict";

const PASSING = {
  signedInAfterReopen: true,
  tokenInRendererDom: false,
  partitionsFolder: false,
  readsAfterSignIn: 1,
  readsAfterReadAgain: 3,
  readsOnReopen: 1,
  userDataHits: [],
  surface: { bridge: ["readProfile"] },
  sectionMs: { overview: 4200 },
};

describe("wrongChecks", () => {
  test("finds nothing wrong in a report with every value as required", () => {
    expect(wrongChecks(PASSING)).toEqual([]);
  });

  test("names a check that is false", () => {
    expect(wrongChecks({ ...PASSING, signedInAfterReopen: false })).toEqual([
      "signedInAfterReopen=false",
    ]);
  });

  test("names a listed value the report misses, a true one included", () => {
    expect(
      wrongChecks({
        ...PASSING,
        tokenInRendererDom: true,
        readsAfterReadAgain: 2,
        userDataHits: ["a"],
      }),
    ).toEqual(["tokenInRendererDom=true", "readsAfterReadAgain=2", 'userDataHits=["a"]']);
  });

  test("passes a run of some sections, whose report lacks the other sections' checks", () => {
    expect(wrongChecks({ signedInAfterReopen: true, sectionMs: { reopen: 9000 } })).toEqual([]);
  });
});
