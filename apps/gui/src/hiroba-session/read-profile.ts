import {
  err,
  isErr,
  ok,
  type ParseFailure,
  parseProfilePage,
  type Result,
  type Transport,
} from "@abth/core";

import type { ProfileView, ReadFailure, ReadFailureKind } from "../session-port";
import { myPageUrl } from "./endpoints";
import { signInStep } from "./sign-in-step";
import type { HirobaEndpoints } from "./types";

/**
 * Only the kind leaves this module. A ParseFailure can carry page text (the taiko-number line, the
 * site's error message), so it is never shown, logged or sent anywhere verbatim.
 */
const READ_FAILURE_OF_PARSE_FAILURE = {
  loggedOut: "loggedOut",
  siteError: "siteError",
  missingMarker: "unexpectedPage",
  unreadableValue: "unexpectedPage",
  wrongPage: "unexpectedPage",
} as const satisfies Record<ParseFailure["kind"], ReadFailureKind>;

/**
 * Reads the signed-in player's own page once and keeps what the interface shows.
 *
 * The starting point's only read, in the one file a later HirobaClient replaces. One request, no
 * retry. The final URL is read before the body: Hiroba answers a lost session with its login page
 * at 200, and an unfinished card select would otherwise parse as a misleading unreadable value.
 */
export async function readProfile(
  transport: Transport,
  endpoints: HirobaEndpoints,
  now: () => Date = () => new Date(),
): Promise<Result<ProfileView, ReadFailure>> {
  const sent = await transport.send({ method: "GET", url: myPageUrl(endpoints) });
  if (isErr(sent)) {
    return err({ kind: sent.error.kind });
  }
  const response = sent.value;
  switch (signInStep(response.url, endpoints)) {
    case "hirobaLogin":
      return err({ kind: "loggedOut" });
    case "cardSelect":
      return err({ kind: "cardSelectUnfinished" });
    case "otherHiroba":
      break;
    default:
      return err({ kind: "unexpectedPage" });
  }
  const html = new TextDecoder("utf-8").decode(response.body);
  const parsed = parseProfilePage(html, now().toISOString());
  if (isErr(parsed)) {
    return err({ kind: READ_FAILURE_OF_PARSE_FAILURE[parsed.error.kind] });
  }
  const { nickname, title, summary, fetchedAt } = parsed.value;
  return ok({ nickname, title, crowns: summary.crownCounts, fetchedAt });
}
