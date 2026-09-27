import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Transport } from "@abth/core";

/**
 * For debugging against the live site only, and off unless ABTH_DEBUG_SAVE_READS=1: every page a
 * read brings back is written to `folder` — the body as last-read.html, and the status, final path
 * and content type as last-read.json — so a page the parsers refuse can be looked at as it came.
 *
 * The page is the signed-in player's own and carries their identity, so it stays in this local
 * folder. Nothing written here holds the session cookie: no request headers, and of the response
 * headers only the content type.
 */
export function saveReads(transport: Transport, folder: string): Transport {
  return {
    async send(request) {
      const sent = await transport.send(request);
      if (sent.ok) {
        const { status, url, headers, body } = sent.value;
        mkdirSync(folder, { recursive: true });
        writeFileSync(join(folder, "last-read.html"), body);
        const meta = { status, path: pathOf(url), contentType: headers["content-type"] ?? null };
        writeFileSync(join(folder, "last-read.json"), `${JSON.stringify(meta, null, 2)}\n`);
      }
      return sent;
    },
  };
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "?";
  }
}
