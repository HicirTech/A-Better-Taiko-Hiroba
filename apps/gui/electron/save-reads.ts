import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Transport } from "@abth/core";

/** Image types kept under their own extension, so the file opens as what it is. */
const IMAGE_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/png": "png",
  "image/gif": "gif",
};

/** What stands in for a form token's value in a saved page. */
const TOKEN_STAND_IN = "<tckt>";

/**
 * For debugging against the live site only, and off unless ABTH_DEBUG_SAVE_READS=1: every page a
 * read brings back is written to `folder`, named after the page asked for — my page as
 * mypage_top.php.html, and its status, final path and content type as mypage_top.php.json — so a
 * page the parsers refuse can be looked at as it came, and the pages one write reads (the costume
 * editor, my page) do not overwrite each other. An image, such as the dan label a read asks for
 * after my page, keeps its own extension: imgsrc_danlabel.php.png (.gif, or .bin for another type).
 *
 * Only GETs are kept. A post is a write: neither what it sent nor what came back is written here.
 * Every form token (`_tckt`) a page carries is replaced with `<tckt>` before the page reaches the
 * disk, so no saved page holds one that could be posted.
 *
 * The page is the signed-in player's own and carries their identity, so it stays in this local
 * folder. Nothing written here holds the session cookie: no request headers, and of the response
 * headers only the content type.
 */
export function saveReads(transport: Transport, folder: string): Transport {
  return {
    async send(request, signal) {
      const sent = await transport.send(request, signal);
      if (sent.ok && request.method === "GET") {
        const { status, url, headers, body } = sent.value;
        const contentType = headers["content-type"] ?? null;
        const mediaType = (contentType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
        const isImage = mediaType.startsWith("image/");
        const name = fileNameOf(request.url);
        const extension = isImage ? (IMAGE_EXTENSIONS[mediaType] ?? "bin") : "html";
        mkdirSync(folder, { recursive: true });
        writeFileSync(join(folder, `${name}.${extension}`), isImage ? body : withoutTokens(body));
        const meta = { status, path: pathOf(url), contentType };
        writeFileSync(join(folder, `${name}.json`), `${JSON.stringify(meta, null, 2)}\n`);
      }
      return sent;
    },
  };
}

/**
 * The page's text with every form token's value replaced: the `value` of any `<input>` naming
 * `_tckt`, wherever its attributes sit, and a `"_tckt"` member of JSON.
 */
function withoutTokens(body: Uint8Array): Uint8Array {
  const text = new TextDecoder("utf-8").decode(body);
  const redacted = text
    .replace(/<input\b[^>]*>/gi, (tag) =>
      tag.includes("_tckt")
        ? tag.replace(/\bvalue\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/i, `value="${TOKEN_STAND_IN}"`)
        : tag,
    )
    .replace(/("_tckt"\s*:\s*)"[^"]*"/g, `$1"${TOKEN_STAND_IN}"`);
  return new TextEncoder().encode(redacted);
}

/** The page asked for, as a file name: the path's last part, and nothing a folder cannot hold. */
function fileNameOf(url: string): string {
  const last = pathOf(url).split("/").pop() ?? "";
  return last === "" ? "index" : last.replace(/[^A-Za-z0-9._-]/g, "_");
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "?";
  }
}
