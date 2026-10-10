import * as nodeFs from "node:fs";
import { dirname } from "node:path";

/** The file operations `replaceFile` makes: node's own, unless a test hands in its own. */
export type ReplaceFiles = Pick<typeof nodeFs, "mkdirSync" | "renameSync" | "writeFileSync">;

/** Writes `text` over `path` by way of a flushed temporary file renamed over it, so a crash
 * leaves the old file or the new one. */
export function replaceFile(path: string, text: string, files: ReplaceFiles = nodeFs): void {
  const temporary = `${path}.tmp`;
  files.mkdirSync(dirname(path), { recursive: true });
  files.writeFileSync(temporary, text, { flush: true });
  files.renameSync(temporary, path);
}
