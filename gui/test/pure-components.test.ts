import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, relative, sep } from "node:path";

const SRC = join(import.meta.dir, "../src");

/** The folders whose components draw only from their props: the list only grows. */
const PURE: readonly string[] = [
  "hiroba-session",
  "history",
  "know-yourself",
  "name-title",
  "pictures",
  "pipelines-page",
  "platform",
  "profile",
  "rating",
  "read-again",
  "settings",
  "songs",
  "theme",
  "ui",
  "updates",
];

// Android Back's own contexts: a popup closes on Back wherever it is drawn.
const BACK_CONTEXTS = ["BackClosersContext", "BackModesContext"];
// What reads the window, the device or the frame for itself.
const OWN_READS = /\b(useTouchFirst|useWideWindow|useMediaQuery|useWiderFrame)\s*\(/g;

/** What a module reaches for beyond its props, as the code names it. */
function reachesOf(text: string): string[] {
  const found = [...text.matchAll(OWN_READS)].map((match) => match[1] ?? "");
  for (const [, context = ""] of text.matchAll(/\buseContext\(\s*(\w+)\s*\)/g)) {
    if (!BACK_CONTEXTS.includes(context)) {
      found.push(`useContext(${context})`);
    }
  }
  // What the device keeps, from wherever it is read; data hooks, from the shared layer.
  for (const [, names = "", from = ""] of text.matchAll(
    /import\s+\{([^}]*)\}\s+from\s+"(\.{1,2}\/[^"]+)"/g,
  )) {
    for (const name of names.split(",").map((part) => part.trim().replace(/^type\s+/, ""))) {
      if (
        /^(kept|keep|forget)[A-Z]/.test(name) ||
        (/^use[A-Z]/.test(name) && from.includes("/shared/"))
      ) {
        found.push(name);
      }
    }
  }
  return found;
}

const resolved = (from: string, specifier: string) => {
  const base = normalize(join(dirname(from), specifier));
  return [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")].find((path) =>
    statSync(path, { throwIfNoEntry: false })?.isFile(),
  );
};

/** A module's reaches, and those of the hooks it calls from modules of its own. */
function reachesThrough(path: string, seen: Set<string>): string[] {
  if (seen.has(path) || relative(SRC, path).startsWith(`shared${sep}`)) {
    return [];
  }
  seen.add(path);
  const text = readFileSync(path, "utf8");
  const called = new Set([...text.matchAll(/\b(use[A-Z]\w*)\s*\(/g)].map((match) => match[1]));
  const hooks = [...text.matchAll(/import\s+\{([^}]*)\}\s+from\s+"(\.{1,2}\/[^"]+)"/g)]
    .filter(([, names = ""]) => names.split(",").some((name) => called.has(name.trim())))
    .map(([, , specifier = ""]) => resolved(path, specifier))
    .filter((hook): hook is string => hook?.endsWith(".ts") ?? false);
  return [...reachesOf(text), ...hooks.flatMap((hook) => reachesThrough(hook, seen))];
}

/** Every component file in a folder, its stories left out. */
function componentsIn(folder: string): string[] {
  const found: string[] = [];
  const walk = (at: string) => {
    for (const name of readdirSync(at)) {
      const path = join(at, name);
      if (statSync(path).isDirectory()) {
        walk(path);
      } else if (name.endsWith(".tsx") && !name.endsWith(".stories.tsx")) {
        found.push(path);
      }
    }
  };
  walk(join(SRC, folder));
  return found;
}

describe("the pure folders' components", () => {
  test.each([...PURE])("in %s draw only from their props", (folder) => {
    const reaching = componentsIn(folder)
      .map((path) => ({ file: relative(SRC, path), reaches: reachesThrough(path, new Set()) }))
      .filter(({ reaches }) => reaches.length > 0);

    expect(reaching).toEqual([]);
  });
});
