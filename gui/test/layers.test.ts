import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, relative, sep } from "node:path";

const SRC = join(import.meta.dir, "../src");

/** The GUI's layers, lowest first: a folder imports only from the layers below its own. */
const LAYERS: readonly (readonly string[])[] = [
  ["vendor"],
  ["shared"],
  ["hiroba-session"],
  ["platform"],
  ["theme"],
  ["ui", "pictures"],
  [
    "favorites",
    "history",
    "know-yourself",
    "my-page",
    "name-title",
    "navigation",
    "pipelines-page",
    "rating",
    "read-again",
    "scores",
    "settings",
    "songs",
    "updates",
  ],
  ["pages"],
  ["app"],
  ["App.tsx"],
  ["shell.tsx"],
  ["main.tsx"],
];

/** Today's imports that break the layers, by folder and folder: the list only shrinks. */
const BREAKS: Readonly<Record<string, number>> = {
  "favorites -> songs": 3,
  "history -> favorites": 2,
  "history -> scores": 2,
  "history -> songs": 3,
  "know-yourself -> favorites": 2,
  "know-yourself -> my-page": 1,
  "know-yourself -> scores": 1,
  "know-yourself -> songs": 2,
  "name-title -> my-page": 1,
  "rating -> history": 1,
  "rating -> scores": 1,
  "scores -> history": 3,
  "songs -> favorites": 4,
};

// Stories, and the kit that serves them, stand above every layer.
const ABOVE_THE_LAYERS = ["story-kit", "vite-env.d.ts"];

/** Every module of the GUI, and the relative imports in it. */
function modules(): readonly { readonly path: string; readonly imports: readonly string[] }[] {
  const found: { path: string; imports: string[] }[] = [];
  const walk = (folder: string) => {
    for (const name of readdirSync(folder)) {
      const path = join(folder, name);
      if (statSync(path).isDirectory()) {
        walk(path);
      } else if (/\.tsx?$/.test(name) && !/\.stories\.tsx?$/.test(name)) {
        const text = readFileSync(path, "utf8");
        const imports = [
          ...text.matchAll(/\b(?:import|export)\b[^;"]*?\bfrom\s+"(\.{1,2}\/[^"]+)"/g),
          ...text.matchAll(/\bimport\s*\(?\s*"(\.{1,2}\/[^"]+)"/g),
        ].map((match) => match[1] ?? "");
        found.push({ path, imports });
      }
    }
  };
  walk(SRC);
  return found;
}

/** The folder a path stands in, or the file's name for a module at the root. */
const unitOf = (path: string) => relative(SRC, path).split(sep)[0] ?? "";

/** The module an import names: a file, or a folder's index. */
function resolved(from: string, specifier: string): string {
  const base = normalize(join(dirname(from), specifier));
  const candidates = [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")];
  return candidates.find((path) => statSync(path, { throwIfNoEntry: false })?.isFile()) ?? base;
}

const layerOf = (unit: string) => LAYERS.findIndex((layer) => layer.includes(unit));

/** Every import that breaks the layers, counted by the folders it goes from and to. */
function breaks(): Record<string, number> {
  const counted: Record<string, number> = {};
  for (const { path, imports } of modules()) {
    const from = unitOf(path);
    if (ABOVE_THE_LAYERS.includes(from)) {
      continue;
    }
    for (const specifier of imports) {
      const to = unitOf(resolved(path, specifier));
      const [own, other] = [layerOf(from), layerOf(to)];
      if (from === to || other < own) {
        continue;
      }
      const key = `${from} -> ${to}`;
      counted[key] = (counted[key] ?? 0) + 1;
    }
  }
  return Object.fromEntries(Object.entries(counted).sort(([a], [b]) => a.localeCompare(b)));
}

describe("the GUI's layers", () => {
  test("place every folder and root module in a layer", () => {
    const units = new Set(modules().map(({ path }) => unitOf(path)));
    const unplaced = [...units].filter(
      (unit) => !ABOVE_THE_LAYERS.includes(unit) && layerOf(unit) < 0,
    );

    expect(unplaced).toEqual([]);
  });

  test("hold no import that breaks them beyond those listed, and list none mended", () => {
    expect(breaks()).toEqual(BREAKS);
  });
});
