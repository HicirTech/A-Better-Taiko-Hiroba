import { err, type Result, type Transport } from "@abth/core";

import { parseUpdateFeed, type UpdateFeed, type UpdateFeedFailure } from "./update-feed";

const FEED_TIMEOUT_MS = 10_000;

/** One GET of the feed at `url`, or a failure with no request when there is no address. */
export async function readUpdateFeed(
  transport: Transport,
  url: string | undefined,
): Promise<Result<UpdateFeed, UpdateFeedFailure>> {
  if (url === undefined) {
    return err({ code: "notConfigured" });
  }
  const sent = await transport.send({ method: "GET", url }, AbortSignal.timeout(FEED_TIMEOUT_MS));
  if (!sent.ok) {
    // The timeout above is the only thing that cancels this request.
    return err({ code: sent.error.kind === "unreachable" ? "unreachable" : "timedOut" });
  }
  if (sent.value.status !== 200) {
    return err({ code: "badAnswer" });
  }
  const feed = parseUpdateFeed(new TextDecoder().decode(sent.value.body));
  return feed.ok ? feed : err({ code: "badAnswer" });
}
