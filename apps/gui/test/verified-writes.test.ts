/** Which writes a run may send: the gate, as a pure function of the platform, the build and its env. */
import { describe, expect, test } from "bun:test";

import {
  enabledWrites,
  unverifiedWritesOpen,
  VERIFIED_WRITES,
  type WritePlatform,
} from "../src/hiroba-session";
import { WRITE_KINDS } from "../src/session-port";

const OPEN = { ABTH_UNVERIFIED_WRITES: "1" };
const PLATFORMS: WritePlatform[] = ["desktop", "android"];

describe("unverifiedWritesOpen", () => {
  test.each(PLATFORMS)(
    "opens only for an unpackaged %s run with ABTH_UNVERIFIED_WRITES=1",
    (platform) => {
      expect(unverifiedWritesOpen({ platform, isPackaged: false, env: OPEN })).toBe(true);
      expect(unverifiedWritesOpen({ platform, isPackaged: false, env: {} })).toBe(false);
      expect(
        unverifiedWritesOpen({
          platform,
          isPackaged: false,
          env: { ABTH_UNVERIFIED_WRITES: "true" },
        }),
      ).toBe(false);
    },
  );

  test.each(PLATFORMS)(
    "never opens in a packaged %s build, whatever its environment says",
    (platform) => {
      expect(unverifiedWritesOpen({ platform, isPackaged: true, env: OPEN })).toBe(false);
    },
  );
});

describe("enabledWrites", () => {
  test.each(PLATFORMS)(
    "nothing is verified on %s yet, so a packaged build may send no write",
    (platform) => {
      expect(VERIFIED_WRITES[platform]).toEqual([]);
      expect(enabledWrites({ platform, isPackaged: true, env: OPEN })).toEqual([]);
      expect(enabledWrites({ platform, isPackaged: false, env: {} })).toEqual([]);
    },
  );

  test.each(PLATFORMS)(
    "the open gate enables every kind on %s, marked as not verified",
    (platform) => {
      expect(enabledWrites({ platform, isPackaged: false, env: OPEN })).toEqual(
        WRITE_KINDS.map((kind) => ({ kind, verified: false })),
      );
    },
  );

  test.each(PLATFORMS)(
    "a packaged %s build may send exactly the kinds verified on it",
    (platform) => {
      expect(enabledWrites({ platform, isPackaged: true, env: OPEN })).toEqual(
        VERIFIED_WRITES[platform].map((kind) => ({ kind, verified: true })),
      );
    },
  );

  test.each(PLATFORMS)(
    "a kind on the list is enabled on %s as verified, packaged or not",
    (platform) => {
      const verified = [...WRITE_KINDS];
      const costume = WRITE_KINDS.map((kind) => ({ kind, verified: true }));
      expect(enabledWrites({ platform, isPackaged: true, env: {} }, verified)).toEqual(costume);
      expect(enabledWrites({ platform, isPackaged: false, env: OPEN }, verified)).toEqual(costume);
    },
  );
});
