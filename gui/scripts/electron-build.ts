import { join } from "node:path";

const root = join(import.meta.dir, "..");

/** How Electron's main process and preload are bundled: together, as their shared code is. */
export const ELECTRON_BUILD = {
  entrypoints: [join(root, "electron", "main.ts"), join(root, "electron", "preload.ts")],
  outdir: join(root, "out", "electron"),
  target: "node",
  // CommonJS: a sandboxed preload cannot be an ES module.
  format: "cjs",
  external: ["electron"],
  naming: "[name].cjs",
  sourcemap: "linked",
} as const satisfies Parameters<typeof Bun.build>[0];
