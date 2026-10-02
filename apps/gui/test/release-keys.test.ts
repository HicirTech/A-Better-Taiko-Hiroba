/**
 * Where the Android signing keys live, and the files that have to agree on it. The tests that read
 * the Gradle script, the release workflow and the script that makes a key keep them from drifting
 * from the rule here.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
const ROOT = join(GUI, "..", "..");

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

/** A folder of its own, empty, which stands in for the keys folder. */
function keysFolder(): string {
  const folder = mkdtempSync(join(tmpdir(), "abth-keys-"));
  folders.push(folder);
  return folder;
}

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

describe("the release workflow", () => {
  const workflow = readFileSync(join(ROOT, ".github/workflows/release.yml"), "utf8");

  test("writes the key into the runner's temporary folder, as the file Gradle reads", () => {
    expect(workflow).toContain('keys="$RUNNER_TEMP/');
    expect(workflow).toContain(`> "$keys/${KEYSTORE_PROPERTIES}"`);
  });

  test("points the signed build at that folder with the variable the scripts read", () => {
    expect(workflow).toContain(`${KEYS_FOLDER_VARIABLE}: \${{ steps.key.outputs.folder }}`);
  });
});

describe("scripts/android.ts", () => {
  /**
   * Runs the script with `folder` as the keys folder. Every run here ends in a refusal, before any
   * build starts, so the timeout only guards against a refusal that is missing.
   */
  function android(folder: string, ...argv: string[]): { code: number | null; stderr: string } {
    const done = Bun.spawnSync([process.execPath, "scripts/android.ts", ...argv], {
      cwd: GUI,
      env: { ...process.env, ABTH_RELEASE_KEYS: folder },
      stdout: "pipe",
      stderr: "pipe",
      timeout: 15_000,
    });
    return { code: done.exitCode, stderr: done.stderr.toString() };
  }

  type RefusalCase = [command: string, argv: string[]];

  test.each<RefusalCase>([
    ["release", ["release"]],
    ["install-release", ["install-release", "no-such-device"]],
  ])(
    "%p stops when the keys folder has no key, and says where to look and what to set",
    (_command, argv) => {
      const folder = keysFolder();
      const { code, stderr } = android(folder, ...argv);
      expect(code).toBe(1);
      expect(stderr).toContain(folder);
      expect(stderr).toContain(KEYSTORE_PROPERTIES);
      expect(stderr).toContain("ABTH_RELEASE_KEYS");
      expect(stderr).toContain("android:keystore");
      expect(readdirSync(folder)).toEqual([]);
    },
  );

  test("release-unsigned stops when the keys folder has a key, which Gradle would sign with", () => {
    const folder = keysFolder();
    writeFileSync(join(folder, KEYSTORE_PROPERTIES), "storeFile=a-key.jks\n");
    const { code, stderr } = android(folder, "release-unsigned");
    expect(code).toBe(1);
    expect(stderr).toContain(folder);
    expect(stderr).toContain("android:release");
  });

  test("keystore refuses to make a second key beside one, and leaves it as it was", () => {
    const folder = keysFolder();
    const settings = "storeFile=a-key.jks\n";
    writeFileSync(join(folder, KEYSTORE_PROPERTIES), settings);
    const { code, stderr } = android(folder, "keystore");
    expect(code).toBe(1);
    expect(stderr).toContain(folder);
    expect(stderr).toContain(KEYSTORE_PROPERTIES);
    expect(readdirSync(folder)).toEqual([KEYSTORE_PROPERTIES]);
    expect(readFileSync(join(folder, KEYSTORE_PROPERTIES), "utf8")).toBe(settings);
  });

  test("keystore refuses to make a key where a store is already, and writes no settings", () => {
    const folder = keysFolder();
    writeFileSync(join(folder, RELEASE_KEYSTORE), "a store that is not to be replaced");
    const { code, stderr } = android(folder, "keystore");
    expect(code).toBe(1);
    expect(stderr).toContain(folder);
    expect(stderr).toContain(RELEASE_KEYSTORE);
    expect(readdirSync(folder)).toEqual([RELEASE_KEYSTORE]);
  });

  test.each<[command: string]>([["keystore"], ["release"], ["release-unsigned"]])(
    "%p stops on a keys folder that is not an absolute path, and says so",
    (command) => {
      const { code, stderr } = android("keys", command);
      expect(code).toBe(1);
      expect(stderr).toContain("ABTH_RELEASE_KEYS must be an absolute path");
    },
  );
});
