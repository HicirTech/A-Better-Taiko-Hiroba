/**
 * Where the Android signing keys live. The tests that read the files which have to agree on it,
 * the Gradle script, the release workflow and the script that makes a key, sit with the change that
 * makes each of them follow the rule.
 */
import { describe, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  DEBUG_KEYSTORE,
  KEYSTORE_PROPERTIES,
  RELEASE_KEYSTORE,
  resolveKeysFolder,
} from "../scripts/release-keys";

describe("resolveKeysFolder", () => {
  test("is the folder ABTH_RELEASE_KEYS names, when it is set", () => {
    const folder = join(tmpdir(), "somewhere else", "keys");
    expect(resolveKeysFolder({ ABTH_RELEASE_KEYS: folder })).toEqual({ ok: true, folder });
  });

  test("is W:/TaikoElaboation/release keys when the variable is not set", () => {
    expect(resolveKeysFolder({})).toEqual({ ok: true, folder: "W:/TaikoElaboation/release keys" });
  });

  test.each<[value: string]>([[""], [" "], ["\t\n"]])(
    "counts %p as not set, since an empty path would be the folder the script runs in",
    (value) => {
      expect(resolveKeysFolder({ ABTH_RELEASE_KEYS: value })).toEqual({
        ok: true,
        folder: "W:/TaikoElaboation/release keys",
      });
    },
  );

  test.each<[value: string]>([["keys"], ["./keys"], ["../release keys"]])(
    "refuses %p, which Gradle and the scripts would read from different folders",
    (value) => {
      const keys = resolveKeysFolder({ ABTH_RELEASE_KEYS: value });
      const reason = keys.ok ? "" : keys.reason;
      expect(keys.ok).toBe(false);
      expect(reason).toContain("ABTH_RELEASE_KEYS must be an absolute path");
      expect(reason).toContain(`"${value}"`);
    },
  );
});

describe("the files of the keys folder", () => {
  test("are named as the keys already in W:/TaikoElaboation/release keys are", () => {
    expect([KEYSTORE_PROPERTIES, RELEASE_KEYSTORE, DEBUG_KEYSTORE]).toEqual([
      "keystore.properties",
      "abth-local.jks",
      "debug.keystore",
    ]);
  });
});
