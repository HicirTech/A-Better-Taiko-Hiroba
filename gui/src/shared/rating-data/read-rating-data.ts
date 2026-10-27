import {
  err,
  ok,
  parseRatingData,
  type RatingData,
  type RatingSystem,
  type Result,
  type Transport,
} from "@abth/core";

import type { SongCatalogueFailure } from "../song-catalogue";

// V1's data is some 400 kilobytes, V2's some 1.1 megabytes.
const RATING_DATA_TIMEOUT_MS = 30_000;

/** A rating system's data, as the text its parser takes, and when it was asked for. */
export interface RatingDataRead {
  readonly text: string;
  readonly sentAt: number;
}

/** One GET of a rating system's data, or a failure with no request when there is no address. */
export async function readRatingData(
  transport: Transport,
  system: RatingSystem,
  url: string | undefined,
  now: () => number = Date.now,
): Promise<Result<RatingDataRead, SongCatalogueFailure>> {
  if (url === undefined) {
    return err({ code: "notConfigured" });
  }
  const sentAt = now();
  const sent = await transport.send(
    { method: "GET", url },
    AbortSignal.timeout(RATING_DATA_TIMEOUT_MS),
  );
  if (!sent.ok) {
    return err({ code: sent.error.kind === "unreachable" ? "unreachable" : "timedOut" });
  }
  const text = new TextDecoder().decode(sent.value.body);
  return sent.value.status === 200 && ratingDataOf(system, text) !== null
    ? ok({ text, sentAt })
    : err({ code: "badAnswer" });
}

/** The system's data in `text`, or null when it holds no song. */
export function ratingDataOf(system: RatingSystem, text: string): RatingData | null {
  let answer: unknown;
  try {
    answer = JSON.parse(text);
  } catch {
    return null;
  }
  const data = parseRatingData(system, answer);
  return data !== null && data.songs.size > 0 ? data : null;
}
