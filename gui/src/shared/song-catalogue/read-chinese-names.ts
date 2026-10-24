import { err, ok, type Result, type Transport } from "@abth/core";

import { parseChineseNamesBatch } from "./chinese-names";
import type { ChineseNamesPage, ChineseNamesRead, SongCatalogueFailure } from "./types";

const BATCH_TIMEOUT_MS = 20_000;
// The category holds some 2,400 songs, 50 a batch; a wiki that never stops is cut off here.
const MAX_BATCHES = 100;

/** Every song page in the category with each page's opening section, which holds the Songbox. */
const QUERY = {
  action: "query",
  generator: "categorymembers",
  gcmtitle: "Category:按照曲ID排列",
  gcmtype: "page",
  gcmlimit: "50",
  prop: "revisions",
  rvprop: "content",
  rvslots: "main",
  rvsection: "0",
  format: "json",
  formatversion: "2",
} as const;

/** The official names on the Chinese wiki's song pages: one GET a batch, one batch at a time,
 * or a failure with no request when there is no address. */
export async function readChineseNames(
  transport: Transport,
  url: string | undefined,
  now: () => number = Date.now,
): Promise<Result<ChineseNamesRead, SongCatalogueFailure>> {
  if (url === undefined) {
    return err({ code: "notConfigured" });
  }
  const sentAt = now();
  const pages: ChineseNamesPage[] = [];
  let next: Readonly<Record<string, string>> | null = {};
  for (let batch = 0; next !== null; batch++) {
    if (batch === MAX_BATCHES) {
      return err({ code: "badAnswer" });
    }
    const address = new URL(url);
    for (const [name, value] of Object.entries({ ...QUERY, ...next })) {
      address.searchParams.set(name, value);
    }
    const sent = await transport.send(
      { method: "GET", url: address.href },
      AbortSignal.timeout(BATCH_TIMEOUT_MS),
    );
    if (!sent.ok) {
      return err({ code: sent.error.kind === "unreachable" ? "unreachable" : "timedOut" });
    }
    if (sent.value.status !== 200) {
      return err({ code: "badAnswer" });
    }
    const read = parseChineseNamesBatch(new TextDecoder().decode(sent.value.body));
    if (!read.ok) {
      return read;
    }
    pages.push(...read.value.pages.filter((page) => page.names.length > 0));
    next = read.value.next;
  }
  return ok({ pages, sentAt });
}
