import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, relative, sep } from "node:path";

const SRC = join(import.meta.dir, "../src");

/** The GUI's layers, lowest first: a folder imports only from the layers below its own. */
const LAYERS: readonly (readonly string[])[] = [
  // Shared logic; its folders go into `shared/`, so for now they may import one another.
  [
    "shared",
    "session-port",
    "song-catalogue",
    "reads",
    "pipelines",
    "vendor",
    "kept-settings.ts",
    "read-failure-message.ts",
    "use-held-copy.ts",
  ],
  ["hiroba-session"],
  ["platform"],
  ["theme"],
  ["ui", "pictures"],
  [
    "favorites",
    "history",
    "know-yourself",
    "language",
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
  "favorites -> language": 3,
  "favorites -> my-page": 5,
  "favorites -> navigation": 12,
  "favorites -> read-again": 3,
  "favorites -> songs": 3,
  "history -> favorites": 10,
  "history -> language": 2,
  "history -> navigation": 1,
  "history -> read-again": 1,
  "history -> scores": 3,
  "history -> songs": 3,
  "know-yourself -> favorites": 15,
  "know-yourself -> language": 1,
  "know-yourself -> my-page": 3,
  "know-yourself -> navigation": 1,
  "know-yourself -> scores": 3,
  "know-yourself -> songs": 2,
  "language -> settings": 1,
  "my-page -> language": 3,
  "my-page -> navigation": 5,
  "my-page -> read-again": 3,
  "name-title -> language": 2,
  "name-title -> my-page": 9,
  "name-title -> navigation": 1,
  "navigation -> read-again": 4,
  "pipelines-page -> favorites": 1,
  "platform -> rating": 2,
  "platform -> updates": 1,
  "rating -> favorites": 1,
  "rating -> history": 1,
  "rating -> navigation": 1,
  "rating -> scores": 3,
  "read-again -> navigation": 2,
  "scores -> favorites": 9,
  "scores -> history": 3,
  "scores -> language": 1,
  "scores -> navigation": 2,
  "scores -> read-again": 3,
  "session-port -> rating": 1,
  "session-port -> updates": 1,
  "settings -> favorites": 2,
  "settings -> songs": 1,
  "settings -> updates": 2,
  "song-catalogue -> favorites": 1,
  "song-catalogue -> hiroba-session": 5,
  "songs -> favorites": 19,
  "songs -> language": 1,
  "songs -> my-page": 1,
  "songs -> navigation": 3,
  "songs -> read-again": 1,
  "ui -> my-page": 1,
  "ui -> navigation": 8,
  "ui -> read-again": 1,
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
      if (from === to || other < own || (own === 0 && other === 0)) {
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
