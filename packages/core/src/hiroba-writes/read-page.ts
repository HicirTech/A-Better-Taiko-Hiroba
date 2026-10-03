import type { ParseFailure } from "../hiroba-dom-parser";
import { err, isErr, ok, type Result } from "../operation-results";
import { describeAnswer } from "./ajax";
import { landingOf } from "./landing";
import type { HirobaReadFailure, ReadDeps } from "./types";

/** Reads one page for a write, once; a failure carries codes only, never the page's text. */
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
  // Check where the read ended first: a lost session is answered with the login page at 200.
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

export function sessionEnded(failure: HirobaReadFailure): boolean {
  return failure.kind === "loggedOut" || failure.kind === "cardSelectUnfinished";
}
