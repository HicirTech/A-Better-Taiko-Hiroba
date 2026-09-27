import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Transport, TransportResponse } from "@abth/core";

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
 * The latest copy of each page sits in `folder`. Every answer is also kept, in the order it came,
 * under `folder/history`: `<time>-<n>-<METHOD>-<page>.<ext>` and its `.json` (time, method, status,
 * final path, content type), so a write can be followed request by request — the editor before, the
 * pre-check's and the save's answers, the read-back. Of a post, only the answer is kept, never the
 * form it sent.
 * Every form token (`_tckt`) a page carries is replaced with `<tckt>` before the page reaches the
 * disk, so no saved page holds one that could be posted.
 *
 * The page is the signed-in player's own and carries their identity, so it stays in this local
 * folder. Nothing written here holds the session cookie: no request headers, and of the response
 * headers only the content type.
 *
 * Keeping a copy never changes what the read gets: a copy that cannot be written — a full disk, a
 * file another program holds open, a folder where the file should be — is dropped, and the answer
 * goes back as it came.
 */
export function saveReads(
  transport: Transport,
  folder: string,
  now: () => Date = () => new Date(),
): Transport {
  let count = 0;
  return {
    async send(request, signal) {
      const sent = await transport.send(request, signal);
      if (sent.ok) {
        count += 1;
        try {
          if (request.method === "GET") {
            keep(folder, request.url, sent.value);
          }
          const history = join(folder, "history");
          keepInHistory(history, now(), count, request.method, request.url, sent.value);
        } catch {
          // Only the debugging copy is lost; the read goes on as if it had not been asked for.
        }
      }
      return sent;
    },
  };
}

/** Writes one answer's copy and its status file. Throws when either cannot be written. */
function keep(folder: string, asked: string, response: TransportResponse): void {
  const { status, url, headers, body } = response;
  const contentType = headers["content-type"] ?? null;
  const mediaType = (contentType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  const isImage = mediaType.startsWith("image/");
  const name = fileNameOf(asked);
  const extension = isImage ? (IMAGE_EXTENSIONS[mediaType] ?? "bin") : "html";
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, `${name}.${extension}`), isImage ? body : withoutTokens(body));
  const meta = { status, path: pathOf(url), contentType };
  writeFileSync(join(folder, `${name}.json`), `${JSON.stringify(meta, null, 2)}\n`);
}

/** One answer in the history: its copy and a status file, named to sort in the order they came. */
function keepInHistory(
  folder: string,
  at: Date,
  count: number,
  method: string,
  asked: string,
  response: TransportResponse,
): void {
  const { status, url, headers, body } = response;
  const contentType = headers["content-type"] ?? null;
  const mediaType = (contentType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  const isImage = mediaType.startsWith("image/");
  // 2026-09-28T01:02:03.456Z → 20260928-010203: sorts by time, and a file name can hold it.
  const stamp = at.toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "-");
  const name = `${stamp}-${String(count).padStart(3, "0")}-${method}-${fileNameOf(asked)}`;
  const extension = isImage ? (IMAGE_EXTENSIONS[mediaType] ?? "bin") : "html";
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, `${name}.${extension}`), isImage ? body : withoutTokens(body));
  const meta = { at: at.toISOString(), method, status, path: pathOf(url), contentType };
  writeFileSync(
    join(folder, `${name}.json`),
    `${JSON.stringify(meta, null, 2)}
`,
  );
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
