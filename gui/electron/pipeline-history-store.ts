import * as nodeFs from "node:fs";

import { type PipelineHistoryStore, readPipelineHistory } from "../src/shared/pipelines";
import { replaceFile, type StoreFiles } from "./replace-file";

/** The shape the file is kept in, which a later shape would change. */
const VERSION = 1;

/** A pipeline's history on the desktop: one file, replaced whole at each save. */
export function createPipelineHistoryStore(
  path: string,
  files: StoreFiles = nodeFs,
): PipelineHistoryStore {
  return {
    async load() {
      try {
        const stored = JSON.parse(files.readFileSync(path, "utf8")) as {
          version?: unknown;
          history?: unknown;
        };
        return readPipelineHistory(stored.version === VERSION ? stored.history : undefined);
      } catch {
        return readPipelineHistory(undefined);
      }
    },
    async save(history) {
      replaceFile(path, JSON.stringify({ version: VERSION, history }), files);
    },
  };
}
