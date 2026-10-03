import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Transport, TransportResponse } from "@abth/core";

const IMAGE_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/png": "png",
  "image/gif": "gif",
};

const TOKEN_STAND_IN = "<tckt>";

// Latest copy only: the costume editor fetches a picture per pick and a thumbnail per item.
const LATEST_ONLY_PATHS: ReadonlySet<string> = new Set([
  "/imgsrc_mydon.php",
  "/imgsrc_kisekae.php",
]);
const COUNTED_PATHS: ReadonlySet<string> = new Set(["/imgsrc_kisekae.php"]);

/** Debug copy of each answer under `folder`: form tokens redacted, no request headers kept. */
export function saveReads(
  transport: Transport,
  folder: string,
  now: () => Date = () => new Date(),
): Transport {
  let count = 0;
  const counted = new Map<string, number>();
  return {
    async send(request, signal) {
      const sent = await transport.send(request, signal);
      if (sent.ok) {
        const path = pathOf(request.url);
        const latestOnly = request.method === "GET" && LATEST_ONLY_PATHS.has(path);
        if (!latestOnly) {
          count += 1;
        }
        const soFar = COUNTED_PATHS.has(path) ? (counted.get(path) ?? 0) + 1 : undefined;
        if (soFar !== undefined) {
          counted.set(path, soFar);
        }
        try {
          if (request.method === "GET") {
            keep(folder, request.url, sent.value, soFar);
          }
          if (!latestOnly) {
            const history = join(folder, "history");
            keepInHistory(history, now(), count, request.method, request.url, sent.value);
          }
        } catch {
          // Only the debugging copy is lost; the read goes on as if it had not been asked for.
        }
      }
      return sent;
    },
  };
}

function keep(folder: string, asked: string, response: TransportResponse, count?: number): void {
  const { status, url, headers, body } = response;
  const contentType = headers["content-type"] ?? null;
  const mediaType = (contentType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  const isImage = mediaType.startsWith("image/");
  const name = fileNameOf(asked);
  const extension = isImage ? (IMAGE_EXTENSIONS[mediaType] ?? "bin") : "html";
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, `${name}.${extension}`), isImage ? body : withoutTokens(body));
  const meta = { status, path: pathOf(url), contentType, ...(count !== undefined && { count }) };
  writeFileSync(join(folder, `${name}.json`), `${JSON.stringify(meta, null, 2)}\n`);
}

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
