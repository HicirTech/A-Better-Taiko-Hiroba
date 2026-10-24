import { ELECTRON_BUILD } from "./electron-build";

const result = await Bun.build(ELECTRON_BUILD);
if (!result.success) {
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}
for (const output of result.outputs) {
  console.log(`${output.path}  ${(output.size / 1024).toFixed(1)} KB`);
}
