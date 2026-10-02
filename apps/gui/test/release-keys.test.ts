import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { KEYSTORE_PROPERTIES, resolveKeysFolder } from "../scripts/release-keys";

const GUI = join(import.meta.dir, "..");

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

function emptyFolder(): string {
  const folder = mkdtempSync(join(tmpdir(), "abth-keys-"));
  folders.push(folder);
  return folder;
}

describe("resolveKeysFolder", () => {
  test("is the folder ABTH_RELEASE_KEYS names", () => {
    const folder = join(tmpdir(), "keys");
    expect(resolveKeysFolder({ ABTH_RELEASE_KEYS: folder })).toEqual({ kind: "set", folder });
  });

  test.each<[value: string | undefined]>([[undefined], [""], [" "]])("is unset for %p", (value) => {
    expect(resolveKeysFolder({ ABTH_RELEASE_KEYS: value })).toEqual({ kind: "unset" });
  });

  test("refuses a relative path", () => {
    expect(resolveKeysFolder({ ABTH_RELEASE_KEYS: "keys" }).kind).toBe("invalid");
  });
});

describe("scripts/android.ts", () => {
  /** Runs the script with `folder` as the keys folder, or with no variable when it is undefined. */
  function android(folder: string | undefined, command: string) {
    const { ABTH_RELEASE_KEYS: _inherited, ...inherited } = process.env;
    const done = Bun.spawnSync([process.execPath, "scripts/android.ts", command], {
      cwd: GUI,
      env: folder === undefined ? inherited : { ...inherited, ABTH_RELEASE_KEYS: folder },
      stdout: "pipe",
      stderr: "pipe",
      timeout: 15_000,
    });
    return { code: done.exitCode, stderr: done.stderr.toString() };
  }

  test("release stops when ABTH_RELEASE_KEYS is not set", () => {
    const { code, stderr } = android(undefined, "release");
    expect(code).toBe(1);
    expect(stderr).toContain("ABTH_RELEASE_KEYS is not set");
  });

  test("release stops when the keys folder has no key, and names the folder", () => {
    const folder = emptyFolder();
    const { code, stderr } = android(folder, "release");
    expect(code).toBe(1);
    expect(stderr).toContain(folder);
  });

  test("keystore leaves an existing key as it is", () => {
    const folder = emptyFolder();
    writeFileSync(join(folder, KEYSTORE_PROPERTIES), "storeFile=a-key.jks\n");
    const { code } = android(folder, "keystore");
    expect(code).toBe(1);
    expect(readdirSync(folder)).toEqual([KEYSTORE_PROPERTIES]);
    expect(readFileSync(join(folder, KEYSTORE_PROPERTIES), "utf8")).toBe("storeFile=a-key.jks\n");
  });
});
