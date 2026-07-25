/**
 * The outcome of an operation whose failures the caller is expected to handle.
 *
 * Hiroba answers with a login page, an unexpected page shape, a refused write or a rate limit far
 * more often than it fails outright. Those are ordinary outcomes of talking to it, so they are
 * values the type system makes a caller acknowledge, not exceptions it can forget to catch.
 * Throwing stays reserved for programming errors and for faults nothing here can recover from.
 */
export { err, isErr, isOk, ok } from "./result";
export type { Err, Ok, Result } from "./types";
