/**
 * The public surface of the headless core.
 *
 * Desktop, mobile, a browser and a future web server all consume this same package, each supplying
 * its own transport and its own database dialect. So what lives here is meant to run in any
 * JavaScript runtime, and reaching for a platform module is a decision to make deliberately rather
 * than a line to slip in — nothing mechanical will catch it.
 */
// The model's public list lives in one place: models/index.ts owns it.
export type * from "./models";
export type { Err, Ok, Result } from "./result";
export { err, isErr, isOk, ok } from "./result";
