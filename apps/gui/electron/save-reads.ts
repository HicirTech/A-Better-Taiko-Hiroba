import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Transport } from "@abth/core";

/** Image types kept under their own extension, so the file opens as what it is. */
const IMAGE_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/png": "png",
  "image/gif": "gif",
};

/**
 * For debugging against the live site only, and off unless ABTH_DEBUG_SAVE_READS=1: every page a
 * read brings back is written to `folder` — the body as last-read.html, and the status, final path
 * and content type as last-read.json — so a page the parsers refuse can be looked at as it came.
 * An image, such as the dan label a read asks for after my page, goes to last-image.png (.gif, or
 * .bin for another type) and last-image.json instead, so it never takes the page's place.
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
        const contentType = headers["content-type"] ?? null;
        const mediaType = (contentType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
        const [name, extension] = mediaType.startsWith("image/")
          ? ["last-image", IMAGE_EXTENSIONS[mediaType] ?? "bin"]
          : ["last-read", "html"];
        mkdirSync(folder, { recursive: true });
        writeFileSync(join(folder, `${name}.${extension}`), body);
        const meta = { status, path: pathOf(url), contentType };
        writeFileSync(join(folder, `${name}.json`), `${JSON.stringify(meta, null, 2)}\n`);
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
