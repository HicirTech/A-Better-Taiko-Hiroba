import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { createPipelineHistoryStore } from "../electron/pipeline-history-store";
import type { PipelineHistory } from "../src/pipelines";

const HISTORY: PipelineHistory = {
  ended: [
    {
      operation: "readProfile",
      kind: "read",
      startedAt: 1000,
      endedAt: 1300,
      requests: 2,
      outcome: "succeeded",
    },
  ],
  pictures: { came: 2, failed: 1 },
};
const NONE: PipelineHistory = { ended: [], pictures: { came: 0, failed: 0 } };

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

/** A path in a folder of its own that does not exist yet. */
const pathOfNew = () => {
  const folder = mkdtempSync(join(tmpdir(), "abth-pipelines-"));
  folders.push(folder);
  return join(folder, "pipelines", "io.json");
};

describe("createPipelineHistoryStore", () => {
  test("keeps a history for the next store of the same file, in a folder it makes", async () => {
    const path = pathOfNew();
    await createPipelineHistoryStore(path).save(HISTORY);

    expect(await createPipelineHistoryStore(path).load()).toEqual(HISTORY);
  });

  test("reads no file as an empty history", async () => {
    expect(await createPipelineHistoryStore(pathOfNew()).load()).toEqual(NONE);
  });

  test.each<[name: string, text: string]>([
    ["another version's", JSON.stringify({ version: 2, history: HISTORY })],
    ["a broken", "{"],
  ])("reads %s file as an empty history", async (_name, text) => {
    const path = pathOfNew();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);

    expect(await createPipelineHistoryStore(path).load()).toEqual(NONE);
  });
});
