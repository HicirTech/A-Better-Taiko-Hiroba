/**
 * The public surface of the headless core.
 *
 * Everything reachable from here must work in any JavaScript runtime: no `bun:*` module, no
 * platform API. Desktop, mobile, a browser and a future web server all consume this same package,
 * and each supplies its own transport and its own database dialect.
 */
export type { Err, Ok, Result } from "./result";
export { err, isErr, isOk, ok } from "./result";
