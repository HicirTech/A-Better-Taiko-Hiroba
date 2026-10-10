import type { Result } from "@abth/core";

/** A failure as this app's reads answer one: a code, or a kind with a detail for some. */
export type CodedFailure =
  | { readonly code: string }
  | { readonly kind: string; readonly detail?: string };

/** `GroupAsked.failureOf` for a group that answers a `Result`: its error's code for a report. */
export function resultFailure(result: Result<unknown, CodedFailure>): string | null {
  if (result.ok) {
    return null;
  }
  const failure = result.error;
  if ("code" in failure) {
    return failure.code;
  }
  return failure.detail === undefined ? failure.kind : `${failure.kind} ${failure.detail}`;
}
