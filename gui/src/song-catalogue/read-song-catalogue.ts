import { err, ok, type Result, type Transport } from "@abth/core";

import type { SongCatalogueFailure, SongCatalogueRead } from "./types";
import { parseWikiSongs } from "./wiki-songs";

// The whole list is a few megabytes.
const CATALOGUE_TIMEOUT_MS = 30_000;

/** One GET of the songs at `url`, only those changed since `since` when it is given, or a failure
 * with no request when there is no address. */
export async function readSongCatalogue(
  transport: Transport,
  url: string | undefined,
  since: number | null,
  now: () => number = Date.now,
): Promise<Result<SongCatalogueRead, SongCatalogueFailure>> {
  if (url === undefined) {
    return err({ code: "notConfigured" });
  }
  const address = new URL(url);
  if (since !== null) {
    address.searchParams.set("after", String(since));
  }
  const sentAt = now();
  const sent = await transport.send(
    { method: "GET", url: address.href },
    AbortSignal.timeout(CATALOGUE_TIMEOUT_MS),
  );
  if (!sent.ok) {
    return err({ code: sent.error.kind === "unreachable" ? "unreachable" : "timedOut" });
  }
  if (sent.value.status !== 200) {
    return err({ code: "badAnswer" });
  }
  const songs = parseWikiSongs(new TextDecoder().decode(sent.value.body));
  return songs.ok ? ok({ ...songs.value, sentAt }) : songs;
}
