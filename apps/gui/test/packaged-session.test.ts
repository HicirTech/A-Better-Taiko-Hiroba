/** The refusal to start a packaged app that keeps a real session. */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { refusalToStart } from "../scripts/packaged-session";

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

function appData(): string {
  const folder = mkdtempSync(join(tmpdir(), "abth-smoke-"));
  folders.push(folder);
  return folder;
}

describe("refusalToStart", () => {
  test("refuses while the packaged app's data folder holds a session", () => {
    const folder = appData();
    mkdirSync(join(folder, "A Better Taiko Hiroba"));
    writeFileSync(join(folder, "A Better Taiko Hiroba", "session.json"), "{}");
    expect(refusalToStart(folder)).toContain("session.json");
  });

  test("lets it start when no session is kept", () => {
    expect(refusalToStart(appData())).toBeNull();
  });

  test("refuses when where the data folder is cannot be known", () => {
    expect(refusalToStart(undefined)).not.toBeNull();
    expect(refusalToStart("")).not.toBeNull();
  });
});
