/**
 * The debugging wrapper that keeps what a read brings back, against a stand-in transport and a
 * folder of its own under the system's temporary directory.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ok, type Transport } from "@abth/core";

import { saveReads } from "../electron/save-reads";

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

function newFolder(): string {
  const folder = mkdtempSync(join(tmpdir(), "abth-save-reads-"));
  folders.push(folder);
  return folder;
}

describe("saveReads", () => {
  test("hands the caller's abort signal on to the transport it wraps", async () => {
    const seen: (AbortSignal | undefined)[] = [];
    const inner: Transport = {
      async send(request, signal) {
        seen.push(signal);
        return ok({ status: 200, url: request.url, headers: {}, body: new Uint8Array() });
      },
    };
    const controller = new AbortController();
    await saveReads(inner, newFolder()).send(
      { method: "GET", url: "https://hiroba.test/mypage_top.php" },
      controller.signal,
    );
    expect(seen).toEqual([controller.signal]);
  });
});
