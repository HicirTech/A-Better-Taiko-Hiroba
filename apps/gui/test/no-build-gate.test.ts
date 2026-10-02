/**
 * Every kind of write is open in every build: the desktop in development, the installer and the
 * portable exe, and Android's debug and release APKs, with no flag and nothing to unlock (the user's
 * call, 2026-10-02). The end-to-end run is an unpackaged build and the unit tests are neither, so
 * nothing run could see a gate that shuts a write in a packaged exe or a release APK. This reads the
 * sources instead: every place the app looks at how it was built, or at its environment, is listed
 * below with what it is for, and a new one fails here until a person has decided it is not a gate.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const GUI = join(import.meta.dir, "..");

/** The code the app runs: the window's and the main process's, no tests and no scripts. */
const SOURCES = [...new Bun.Glob("{src,electron}/**/*.{ts,tsx}").scanSync({ cwd: GUI })]
  .map((path) => path.split("\\").join("/"))
  .sort();

/**
 * What a build or an environment is looked at through: whether Electron's app is packaged, Vite's
 * `import.meta.env`, and the process's environment, by whichever name; and a variable of the app's
 * own (`ABTH_` or `VITE_ABTH_`) wherever it is read from.
 */
const BUILD_PROBE =
  /^(?:(?:import\.meta\.env|process\.env)(?:\.\w+)?|[\w.]*\.isPackaged|[\w.]*\.(?:VITE_)?ABTH_\w+)$/;
/** The two environments a variable can be looked up in by a computed name. */
const ENVIRONMENT = /^(?:import\.meta\.env|process\.env)$/;

/** Every such look in `text`, as the text of the expression that makes it, in a sorted list. */
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

/**
 * Every look at the build or the environment the app makes, by file, and what it decides. None of
 * them shuts or opens a write.
 */
const LOOKS_AT_THE_BUILD: Readonly<Record<string, readonly string[]>> = {
  // The main process. `isPackaged` and the environment go to `desktopEnvironment`, which is tested
  // for a packaged build and for a development one, and that function decides the development
  // endpoints, data folder, dev server and clock, and nothing else. A packaged build has no
  // application menu. And a debug copy of what a read brings back is kept in any build, when asked.
  "electron/main.ts": [
    "app.isPackaged",
    "app.isPackaged",
    "process.env",
    "process.env.ABTH_DEBUG_SAVE_READS",
  ],
  "electron/desktop-environment.ts": [
    "env.ABTH_DEV_HIROBA_ORIGIN",
    "env.ABTH_DEV_IDP_HOST",
    "env.ABTH_DEV_IMG_ORIGIN",
    "env.ABTH_DEV_NOW",
    "env.ABTH_DEV_SERVER_URL",
    "env.ABTH_DEV_USER_DATA",
  ],
  // Android: a development build behind Vite's dev server may point at the stand-in; a production
  // build, the release APK included, always reaches the real sites.
  "src/platform/android.ts": [
    "import.meta.env.DEV",
    "import.meta.env.VITE_ABTH_DEV_HIROBA_ORIGIN",
    "import.meta.env.VITE_ABTH_DEV_IDP_HOST",
    "import.meta.env.VITE_ABTH_DEV_IMG_ORIGIN",
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
