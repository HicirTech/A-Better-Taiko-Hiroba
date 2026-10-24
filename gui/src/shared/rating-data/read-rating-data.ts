import {
  err,
  type OurTaikoV1Data,
  ok,
  parseOurTaikoV1Data,
  type Result,
  type Transport,
} from "@abth/core";

import type { SongCatalogueFailure } from "../song-catalogue";

// Some 400 kilobytes.
const RATING_DATA_TIMEOUT_MS = 30_000;

/** A rating system's data, as the text its parser takes, and when it was asked for. */
export interface RatingDataRead {
  readonly text: string;
  readonly sentAt: number;
}

/** One GET of a rating system's data, or a failure with no request when there is no address. */
export async function readRatingData(
  transport: Transport,
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
  return sent.value.status === 200 && ratingDataOf(text) !== null
    ? ok({ text, sentAt })
    : err({ code: "badAnswer" });
}

/** The OurTaiko V1 data in `text`, or null when it holds no song. */
export function ratingDataOf(text: string): OurTaikoV1Data | null {
  let answer: unknown;
  try {
    answer = JSON.parse(text);
  } catch {
    return null;
  }
  const data = parseOurTaikoV1Data(answer);
  return data !== null && data.size > 0 ? data : null;
}
