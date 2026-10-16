/** Whether an e2e report passes: every check `true`, except the values listed here. */
import { same } from "./harness";

const EXPECTED: Readonly<Record<string, unknown>> = {
  tokenInRendererDom: false,
  partitionsFolder: false,
  readsAfterSignIn: 1,
  readsAfterReadAgain: 3,
  readsOnReopen: 1,
  userDataHits: [],
};

/** The checks a report gets wrong; a value that is neither listed nor a boolean only informs. */
export function wrongChecks(report: Readonly<Record<string, unknown>>): string[] {
  return Object.entries(report)
    .filter(([key, value]) =>
      key in EXPECTED ? !same(value, EXPECTED[key]) : typeof value === "boolean" && !value,
    )
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`);
}
