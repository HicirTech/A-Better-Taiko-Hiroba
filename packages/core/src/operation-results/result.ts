import type { Err, Ok, Result } from "./types";

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
