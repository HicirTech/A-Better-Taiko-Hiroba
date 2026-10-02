/**
 * Where the Android signing keys live, and the files that have to agree on it. The tests that read
 * the Gradle script, the release workflow and the script that makes a key keep them from drifting
 * from the rule here.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  DEBUG_KEYSTORE,
  DEFAULT_KEYS_FOLDER,
  KEYS_FOLDER_VARIABLE,
  KEYSTORE_PROPERTIES,
  RELEASE_KEYSTORE,
  resolveKeysFolder,
} from "../scripts/release-keys";

const GUI = join(import.meta.dir, "..");

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

describe("the Gradle script", () => {
  const gradle = readFileSync(join(GUI, "android/app/build.gradle"), "utf8");

  test("finds the keys folder by the same variable and the same default", () => {
    expect(gradle).toContain(`System.getenv("${KEYS_FOLDER_VARIABLE}")`);
    expect(gradle).toContain(`"${DEFAULT_KEYS_FOLDER}"`);
  });

  test("refuses a variable that is not an absolute path, as the scripts do", () => {
    expect(gradle).toContain(`${KEYS_FOLDER_VARIABLE} must be an absolute path`);
  });

  test("takes the release key and the debug key from that folder, by the same names", () => {
    expect(gradle).toContain(`new File(keysFolder, "${KEYSTORE_PROPERTIES}")`);
    expect(gradle).toContain(`new File(keysFolder, "${DEBUG_KEYSTORE}")`);
  });

  test("reads no key from the Android project", () => {
    expect(gradle).not.toContain('rootProject.file("keystore.properties")');
    expect(gradle).not.toContain("rootProject.file(keystoreProperties");
  });

  test("signs the debug build with Android's standard debug credentials", () => {
    expect(gradle).toContain('storePassword "android"');
    expect(gradle).toContain('keyAlias "androiddebugkey"');
    expect(gradle).toContain('keyPassword "android"');
    expect(gradle).toContain("signingConfig signingConfigs.debug");
  });
});
