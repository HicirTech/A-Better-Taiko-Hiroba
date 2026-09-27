/** Which writes a desktop run may send: the gate, as a pure function of the build and its env. */
import { describe, expect, test } from "bun:test";

import { enabledWrites, unverifiedWritesOpen, VERIFIED_WRITES } from "../src/hiroba-session";
import { WRITE_KINDS } from "../src/session-port";

const OPEN = { ABTH_UNVERIFIED_WRITES: "1" };

describe("unverifiedWritesOpen", () => {
  test("opens only for an unpackaged run with ABTH_UNVERIFIED_WRITES=1", () => {
    expect(unverifiedWritesOpen({ isPackaged: false, env: OPEN })).toBe(true);
    expect(unverifiedWritesOpen({ isPackaged: false, env: {} })).toBe(false);
    expect(
      unverifiedWritesOpen({ isPackaged: false, env: { ABTH_UNVERIFIED_WRITES: "true" } }),
    ).toBe(false);
  });

  test("never opens in a packaged build, whatever its environment says", () => {
    expect(unverifiedWritesOpen({ isPackaged: true, env: OPEN })).toBe(false);
  });
});

describe("enabledWrites", () => {
  test("nothing is verified yet, so a packaged build may send no write at all", () => {
    expect(VERIFIED_WRITES.desktop).toEqual([]);
    expect(enabledWrites({ isPackaged: true, env: OPEN })).toEqual([]);
    expect(enabledWrites({ isPackaged: false, env: {} })).toEqual([]);
  });

  test("the open gate enables every kind, marked as not verified", () => {
    expect(enabledWrites({ isPackaged: false, env: OPEN })).toEqual(
      WRITE_KINDS.map((kind) => ({ kind, verified: false })),
    );
  });
});
