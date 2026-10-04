// Writes are open in every build, yet no run sees a gate in a packaged exe or release APK, so this
// reads the sources: every look at the build or environment is listed with what it decides.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const GUI = join(import.meta.dir, "..");

const SOURCES = [...new Bun.Glob("{src,electron}/**/*.{ts,tsx}").scanSync({ cwd: GUI })]
  .map((path) => path.split("\\").join("/"))
  .sort();

/** Looks at the build: isPackaged, import.meta.env, process.env, or an ABTH_ variable. */
const BUILD_PROBE =
  /^(?:(?:import\.meta\.env|process\.env)(?:\.\w+)?|[\w.]*\.isPackaged|[\w.]*\.(?:VITE_)?ABTH_\w+)$/;
const ENVIRONMENT = /^(?:import\.meta\.env|process\.env)$/;

function looksAtTheBuild(file: string, text: string): string[] {
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node) && BUILD_PROBE.test(node.getText(source))) {
      found.push(node.getText(source));
    } else if (
      ts.isElementAccessExpression(node) &&
      ENVIRONMENT.test(node.expression.getText(source))
    ) {
      found.push(`${node.expression.getText(source)}[…]`);
    } else {
      ts.forEachChild(node, visit);
    }
  };
  visit(source);
  return found.sort();
}

/** Every look at the build or environment, by file; none of them shuts or opens a write. */
const LOOKS_AT_THE_BUILD: Readonly<Record<string, readonly string[]>> = {
  // isPackaged and env feed desktopEnvironment: dev endpoints, data folder, server, clock, the
  // update feed and the song lists only. A packaged build has no menu; ABTH_DEBUG_SAVE_READS keeps a
  // debug copy of reads in any build.
  "electron/main.ts": [
    "app.isPackaged",
    "app.isPackaged",
    "process.env",
    "process.env.ABTH_DEBUG_SAVE_READS",
  ],
  "electron/desktop-environment.ts": [
    "env.ABTH_DEV_CHINESE_NAMES",
    "env.ABTH_DEV_HIROBA_ORIGIN",
    "env.ABTH_DEV_IDP_HOST",
    "env.ABTH_DEV_IMG_ORIGIN",
    "env.ABTH_DEV_NOW",
    "env.ABTH_DEV_SERVER_URL",
    "env.ABTH_DEV_SONG_CATALOGUE",
    "env.ABTH_DEV_UPDATE_FEED",
    "env.ABTH_DEV_USER_DATA",
  ],
  // A development build behind Vite's dev server may point at the stand-in, at a feed for the
  // update check and at the song lists; a production build, the release APK included, always reaches
  // the real sites.
  "src/platform/android.ts": [
    "import.meta.env.DEV",
    "import.meta.env.DEV",
    "import.meta.env.DEV",
    "import.meta.env.DEV",
    "import.meta.env.VITE_ABTH_DEV_CHINESE_NAMES",
    "import.meta.env.VITE_ABTH_DEV_HIROBA_ORIGIN",
    "import.meta.env.VITE_ABTH_DEV_IDP_HOST",
    "import.meta.env.VITE_ABTH_DEV_IMG_ORIGIN",
    "import.meta.env.VITE_ABTH_DEV_SONG_CATALOGUE",
    "import.meta.env.VITE_ABTH_DEV_UPDATE_FEED",
  ],
};

describe("the app's writes", () => {
  test("look at the build and the environment in no place beyond the ones listed here", () => {
    const actual = Object.fromEntries(
      SOURCES.map(
        (path) => [path, looksAtTheBuild(path, readFileSync(join(GUI, path), "utf8"))] as const,
      ).filter(([, found]) => found.length > 0),
    );
    const listed = Object.fromEntries(
      Object.entries(LOOKS_AT_THE_BUILD).map(([path, found]) => [path, [...found].sort()]),
    );
    expect(actual).toEqual(listed);
  });

  test("would see a gate added in a packaged build, a release or an environment variable", () => {
    const gates = [
      "export const shut = app.isPackaged;",
      "export const shut = import.meta.env.PROD;",
      'export const shut = import.meta.env["MODE"] === "production";',
      "export const shut = process.env.NODE_ENV === 'production';",
      "export const shut = process.env[name];",
      "export const shut = env.ABTH_UNVERIFIED_WRITES === '1';",
      "export const shut = import.meta.env.VITE_ABTH_UNVERIFIED_WRITES;",
    ];
    for (const gate of gates) {
      expect({ gate, looks: looksAtTheBuild("gate.ts", gate).length }).toEqual({ gate, looks: 1 });
    }
    expect(looksAtTheBuild("plain.ts", "export const open = true; // app.isPackaged")).toEqual([]);
  });
});
