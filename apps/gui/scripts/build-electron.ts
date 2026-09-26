/**
 * Bundles Electron's main process with Bun's bundler, as CommonJS. `electron` itself is provided by
 * the runtime.
 */
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const result = await Bun.build({
  entrypoints: [join(root, "electron", "main.ts")],
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
