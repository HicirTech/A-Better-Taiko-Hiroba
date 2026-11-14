import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const CORE = join(ROOT, "core", "src");
const I18N = join(ROOT, "i18n", "src");

interface Imported {
  readonly file: string;
  readonly from: string;
  /** `import type` or `export type`, which leaves nothing behind at run time. */
  readonly typeOnly: boolean;
}

/** Every import and re-export in a package's source. */
function importsIn(folder: string): readonly Imported[] {
  const found: Imported[] = [];
  const walk = (at: string) => {
    for (const name of readdirSync(at)) {
      const path = join(at, name);
      if (statSync(path).isDirectory()) {
        walk(path);
      } else if (/\.tsx?$/.test(name)) {
        const text = readFileSync(path, "utf8");
        const file = relative(ROOT, path);
        for (const match of text.matchAll(
          /\b(?:import|export)\s+(type\s+)?[^;"]*?\bfrom\s+"([^"]+)"/g,
        )) {
          found.push({ file, from: match[2] ?? "", typeOnly: match[1] !== undefined });
        }
        for (const match of text.matchAll(/\bimport\s*\(?\s*"([^"]+)"/g)) {
          found.push({ file, from: match[1] ?? "", typeOnly: false });
        }
      }
    }
  };
  walk(folder);
  return found;
}

/** Whether an import reaches another of the project's packages, by its name or by a path. */
const leaves = (folder: string, { file, from }: Imported) =>
  from.startsWith("@abth/") ||
  (from.startsWith(".") && !resolve(ROOT, dirname(file), from).startsWith(folder + sep));

describe("the packages' boundaries", () => {
  test("keep i18n a package of its own, which imports neither core nor the GUI", () => {
    expect(importsIn(I18N).filter((one) => leaves(I18N, one))).toEqual([]);
  });

  test("let core take types alone from i18n, and nothing from the GUI", () => {
    const wrong = importsIn(CORE).filter(
      (one) => leaves(CORE, one) && !(one.from === "@abth/i18n" && one.typeOnly),
    );
    expect(wrong).toEqual([]);
  });

  test("read the imports they guard, of types alone and of values", () => {
    const core = importsIn(CORE);
    expect(core).toContainEqual({
      file: join("core", "src", "song-catalogue", "song-names.ts"),
      from: "@abth/i18n",
      typeOnly: true,
    });
    expect(core).toContainEqual({
      file: join("core", "src", "index.ts"),
      from: "./song-catalogue",
      typeOnly: false,
    });
  });
});
