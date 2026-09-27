import {
  err,
  isErr,
  ok,
  type ParseFailure,
  parseProfilePage,
  type Result,
  type Transport,
  type TransportResponse,
} from "@abth/core";

import type { ProfileView, ReadFailure, ReadFailureKind } from "../session-port";
import { myPageUrl } from "./endpoints";
import { signInStep } from "./sign-in-step";
import type { HirobaEndpoints, SignInStep } from "./types";

/**
 * Only the kind leaves this module, plus the codes `describe` builds. A ParseFailure can carry page
 * text (the taiko-number line, the site's error message) in `raw`, so that is never shown, logged
 * or sent anywhere.
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
  const step = signInStep(response.url, endpoints);
  switch (step) {
    case "hirobaLogin":
      return err({ kind: "loggedOut" });
    case "cardSelect":
      return err({ kind: "cardSelectUnfinished" });
    case "otherHiroba":
      break;
    default:
      return err({ kind: "unexpectedPage", detail: describe(response, step) });
  }
  const html = new TextDecoder("utf-8").decode(response.body);
  const parsed = parseProfilePage(html, now().toISOString());
  if (isErr(parsed)) {
    const kind = READ_FAILURE_OF_PARSE_FAILURE[parsed.error.kind];
    return err(
      kind === "unexpectedPage"
        ? { kind, detail: describe(response, step, parsed.error) }
        : { kind },
    );
  }
  const { nickname, title, summary, fetchedAt } = parsed.value;
  return ok({ nickname, title, crowns: summary.crownCounts, fetchedAt });
}

/**
 * Codes for a report of a page this app did not expect: where the read ended, what came back, and
 * what the parser said. The path is kept and the query dropped; the parser's `marker` is a
 * selector this code wrote, and its `raw` (page text) is left out.
 */
function describe(response: TransportResponse, step: SignInStep, parse?: ParseFailure): string {
  let path = "?";
  try {
    path = new URL(response.url).pathname;
  } catch {
    // The final URL did not parse; "?" says so.
  }
  const parts = [
    `step=${step}`,
    `path=${path}`,
    `status=${response.status}`,
    `type=${response.headers["content-type"] ?? "-"}`,
    `bytes=${response.body.byteLength}`,
  ];
  if (parse !== undefined) {
    parts.push(`parse=${parse.kind}${"marker" in parse ? `@${parse.marker}` : ""}`);
  }
  return parts.join(" ");
}
