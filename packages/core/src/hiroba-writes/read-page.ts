import type { ParseFailure } from "../hiroba-dom-parser";
import { err, isErr, ok, type Result } from "../operation-results";
import { describeAnswer } from "./ajax";
import { landingOf } from "./landing";
import type { HirobaReadFailure, ReadDeps } from "./types";

/**
 * Reads one of Hiroba's pages for a write, once: `path` relative to Hiroba's origin, the page
 * parsed by `parse`. Where the read ended is looked at before the body: a lost session is answered
 * with the login page at 200, and an unfinished card select would otherwise read as a page that
 * changed shape. A failure carries codes only, never the page's text.
 */
export async function readHirobaPage<T>(
  deps: ReadDeps,
  path: string,
  parse: (html: string) => Result<T, ParseFailure>,
): Promise<Result<T, HirobaReadFailure>> {
  const sent = await deps.transport.send({ method: "GET", url: `${deps.hirobaOrigin}/${path}` });
  if (isErr(sent)) {
    return err({ kind: sent.error.kind });
  }
  const response = sent.value;
  switch (landingOf(response.url, deps.hirobaOrigin)) {
    case "login":
      return err({ kind: "loggedOut" });
    case "cardSelect":
      return err({ kind: "cardSelectUnfinished" });
    case "elsewhere":
      return err({
        kind: "unexpectedPage",
        detail: `landing=elsewhere ${describeAnswer(response)}`,
      });
    case "hiroba":
      break;
  }
  const parsed = parse(new TextDecoder("utf-8").decode(response.body));
  if (!isErr(parsed)) {
    return ok(parsed.value);
  }
  const failure = parsed.error;
  if (failure.kind === "loggedOut" || failure.kind === "siteError") {
    return err({ kind: failure.kind });
  }
  // A parser's `marker` is a selector this code wrote; its `raw` is page text and stays out.
  const marker = "marker" in failure ? `@${failure.marker}` : "";
  return err({
    kind: "unexpectedPage",
    detail: `${describeAnswer(response)} parse=${failure.kind}${marker}`,
  });
}

/** A failure that means the session is over: the login page, or a card still to be chosen. */
export function sessionEnded(failure: HirobaReadFailure): boolean {
  return failure.kind === "loggedOut" || failure.kind === "cardSelectUnfinished";
}
