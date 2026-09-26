/**
 * The public surface of the headless core.
 *
 * Desktop, mobile, a browser and a future web server all consume this same package, each supplying
 * its own transport and its own database dialect. So what lives here is meant to run in any
 * JavaScript runtime. The GUI's typecheck (`tsc -p apps/gui`: ESNext and DOM libs, no Bun or Node
 * types) compiles this source too, so a Bun or Node global or a `node:` import reached from here
 * fails the root typecheck, and this package's own typecheck has no DOM lib to accept `document`.
 * Neither catches what a browser and Bun both declare, such as `fetch`: reaching for that is still
 * a decision to make deliberately rather than a line to slip in.
 *
 * Layout convention: one folder per domain, named so the contents are obvious at a glance;
 * `types.ts` holds the domain's contract apart from its implementation; the domain's `index.ts`
 * owns its public list and doc comment. Cross-domain imports go through that `index.ts`, never
 * into a domain's internals. This file only re-exports domains, one line each.
 */
export * from "./hiroba-dan-images";
export * from "./hiroba-dom-parser";
export * from "./hiroba-models";
export * from "./http-transport";
export * from "./operation-results";
