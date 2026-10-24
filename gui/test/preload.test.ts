import { describe, expect, test } from "bun:test";

import { ELECTRON_BUILD } from "../scripts/electron-build";

describe("the desktop's preload", () => {
  test("requires no module but electron, as a sandboxed preload can load no other", async () => {
    const { outdir: _outdir, sourcemap: _sourcemap, ...inMemory } = ELECTRON_BUILD;
    const built = await Bun.build(inMemory);

    const preload = built.outputs.find((output) => output.path.endsWith("preload.cjs"));
    const text = (await preload?.text()) ?? "";
    expect(built.success).toBe(true);
    expect([...new Set(text.match(/require\("[^"]+"\)/g))]).toEqual(['require("electron")']);
  });
});
