/**
 * Bundles Electron's main process and preload with Bun's bundler, @abth/core and all included.
 * Both are CommonJS: a sandboxed preload cannot be an ES module. `electron` itself is provided by
 * the runtime.
 */
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const result = await Bun.build({
  entrypoints: [join(root, "electron", "main.ts"), join(root, "electron", "preload.ts")],
  outdir: join(root, "out", "electron"),
  target: "node",
  format: "cjs",
  external: ["electron"],
  naming: "[name].cjs",
  sourcemap: "linked",
});
if (!result.success) {
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}
for (const output of result.outputs) {
  console.log(`${output.path}  ${(output.size / 1024).toFixed(1)} KB`);
}
