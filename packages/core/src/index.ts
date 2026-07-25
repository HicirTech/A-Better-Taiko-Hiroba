/**
 * The public surface of the headless core.
 *
 * Desktop, mobile, a browser and a future web server all consume this same package, each supplying
 * its own transport and its own database dialect. So what lives here is meant to run in any
 * JavaScript runtime, and reaching for a platform module is a decision to make deliberately rather
 * than a line to slip in — nothing mechanical will catch it.
 *
 * Layout convention: one folder per domain, named so the contents are obvious at a glance;
 * `types.ts` holds the domain's contract apart from its implementation; the domain's `index.ts`
 * owns its public list and doc comment. Cross-domain imports go through that `index.ts`, never
 * into a domain's internals. This file only re-exports domains, one line each.
 */
export type * from "./hiroba-models";
export * from "./operation-results";
