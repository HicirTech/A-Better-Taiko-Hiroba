/**
 * The outcome of an operation whose failures the caller is expected to handle.
 *
 * Hiroba answers with a login page, an unexpected page shape, a refused write or a rate limit far
 * more often than it fails outright. Those are ordinary outcomes of talking to it, so they are
 * values the type system makes a caller acknowledge, not exceptions it can forget to catch.
 * Throwing stays reserved for programming errors and for faults nothing here can recover from.
 */
export type Result<T, E> = Ok<T> | Err<E>;

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/**
 * The two guards exist so a caller can narrow a result without reading `.ok` directly. Keeping the
 * discriminant behind a function leaves room to change how a result is represented later without
 * touching every call site.
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}
