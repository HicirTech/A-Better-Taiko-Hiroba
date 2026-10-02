/**
 * The rules a release's version follows: what a version is, how a bump raises it, and the
 * versionCode it gets. The last tests read the files that carry the same rules, so the Gradle
 * script and apps/gui/package.json cannot drift from them unseen.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  type Bump,
  bumpVersion,
  compareVersions,
  formatVersion,
  MAJOR_WEIGHT,
  MAX_MINOR_OR_PATCH,
  MAX_VERSION_CODE,
  MINOR_WEIGHT,
  parseVersion,
  readPackageVersion,
  releaseCommitMessage,
  releaseTag,
  releaseTitle,
  resolveTarget,
  setPackageVersion,
  type Version,
  versionCode,
} from "../scripts/release-version";

const ROOT = join(import.meta.dir, "..");

/** A version the test data states as text, which has to be one. */
function v(text: string): Version {
  const version = parseVersion(text);
  if (version === null) {
    throw new Error(`The test's own version is not one: ${text}`);
  }
  return version;
}

/** The largest versionCode, which belongs to 210000.0.0: one patch more has none. */
const LAST_MAJOR = MAX_VERSION_CODE / MAJOR_WEIGHT;

describe("parseVersion", () => {
  test("reads MAJOR.MINOR.PATCH", () => {
    expect(parseVersion("0.1.0")).toEqual({ major: 0, minor: 1, patch: 0 });
    expect(parseVersion("12.34.56")).toEqual({ major: 12, minor: 34, patch: 56 });
  });

  test.each<[text: string]>([
    [""],
    ["1"],
    ["1.2"],
    ["1.2.3.4"],
    ["v1.2.3"],
    ["1.2.3-rc.1"],
    ["1.2.3+build.5"],
    ["01.2.3"],
    ["1.02.3"],
    ["1.2.03"],
    ["1.2.x"],
    ["-1.2.3"],
    [" 1.2.3"],
    ["1.2.3\n"],
  ])("refuses %p, which is not exactly MAJOR.MINOR.PATCH", (text) => {
    expect(parseVersion(text)).toBeNull();
  });

  test("takes minor and patch up to the last number a versionCode has room for, and no further", () => {
    expect(parseVersion(`1.${MAX_MINOR_OR_PATCH}.${MAX_MINOR_OR_PATCH}`)).not.toBeNull();
    expect(parseVersion(`1.${MAX_MINOR_OR_PATCH + 1}.0`)).toBeNull();
    expect(parseVersion(`1.0.${MAX_MINOR_OR_PATCH + 1}`)).toBeNull();
  });

  test("takes a major up to the last versionCode Android allows, and no further", () => {
    expect(parseVersion(`${LAST_MAJOR}.0.0`)).not.toBeNull();
    expect(parseVersion(`${LAST_MAJOR}.0.1`)).toBeNull();
    expect(parseVersion(`${LAST_MAJOR + 1}.0.0`)).toBeNull();
    expect(parseVersion(`${"9".repeat(400)}.0.0`)).toBeNull();
  });
});

describe("formatVersion", () => {
  test.each<[text: string]>([["0.1.0"], ["1.2.3"], ["10.20.30"], ["0.0.0"]])(
    "writes back what parseVersion read from %p",
    (text) => {
      expect(formatVersion(v(text))).toBe(text);
    },
  );
});

describe("compareVersions", () => {
  type OrderCase = [earlier: string, later: string];

  test.each<OrderCase>([
    ["0.1.0", "0.1.1"],
    ["0.1.9", "0.2.0"],
    ["0.99.99", "1.0.0"],
    ["1.2.3", "2.0.0"],
    ["0.0.99", "0.1.0"],
  ])("puts %p before %p, whichever place differs", (earlier, later) => {
    expect(Math.sign(compareVersions(v(earlier), v(later)))).toBe(-1);
    expect(Math.sign(compareVersions(v(later), v(earlier)))).toBe(1);
  });

  test("calls the same version equal", () => {
    expect(compareVersions(v("0.1.0"), v("0.1.0"))).toBe(0);
  });

  test("compares numbers, not text: 0.10.0 is after 0.9.0", () => {
    expect(compareVersions(v("0.10.0"), v("0.9.0"))).toBeGreaterThan(0);
  });
});

describe("bumpVersion", () => {
  type BumpCase = [from: string, bump: Bump, to: string];

  test.each<BumpCase>([
    ["0.1.0", "patch", "0.1.1"],
    ["0.1.5", "minor", "0.2.0"],
    ["1.2.3", "major", "2.0.0"],
    ["0.1.99", "minor", "0.2.0"],
    ["0.99.99", "major", "1.0.0"],
  ])("raises %p by %p to %p, and sets the places after it to 0", (from, bump, to) => {
    expect(bumpVersion(v(from), bump)).toEqual(v(to));
  });

  test("refuses a bump that takes a number past what a versionCode holds", () => {
    expect(bumpVersion(v(`0.1.${MAX_MINOR_OR_PATCH}`), "patch")).toBeNull();
    expect(bumpVersion(v(`0.${MAX_MINOR_OR_PATCH}.5`), "minor")).toBeNull();
    expect(bumpVersion(v(`${LAST_MAJOR}.0.0`), "major")).toBeNull();
  });
});

describe("resolveTarget", () => {
  test("reads patch, minor and major as bumps of the current version", () => {
    const current = v("0.1.0");
    expect(resolveTarget(current, "patch")).toEqual({ ok: true, version: v("0.1.1") });
    expect(resolveTarget(current, "minor")).toEqual({ ok: true, version: v("0.2.0") });
    expect(resolveTarget(current, "major")).toEqual({ ok: true, version: v("1.0.0") });
  });

  test("takes a version as it is written, the current one included", () => {
    expect(resolveTarget(v("0.1.0"), "0.1.0")).toEqual({ ok: true, version: v("0.1.0") });
    expect(resolveTarget(v("0.1.0"), "2.0.0")).toEqual({ ok: true, version: v("2.0.0") });
  });

  test.each<[argument: string]>([["v1.2.3"], ["next"], [""], ["Patch"], ["1.2"], ["1.2.3-rc.1"]])(
    "refuses %p and says what it is not",
    (argument) => {
      const target = resolveTarget(v("0.1.0"), argument);
      expect(target).toMatchObject({ ok: false, reason: expect.stringContaining(`"${argument}"`) });
    },
  );

  test("refuses a bump that has no versionCode, and names the bump", () => {
    const target = resolveTarget(v(`0.1.${MAX_MINOR_OR_PATCH}`), "patch");
    expect(target).toMatchObject({ ok: false, reason: expect.stringContaining("patch") });
  });
});

describe("versionCode", () => {
  type CodeCase = [version: string, code: number];

  test.each<CodeCase>([
    ["0.0.1", 1],
    ["0.1.0", 100],
    ["0.1.1", 101],
    ["1.0.0", 10000],
    ["1.2.3", 10203],
    ["0.99.99", 9999],
    [`${LAST_MAJOR}.0.0`, MAX_VERSION_CODE],
  ])("gives %p the code %p", (version, code) => {
    expect(versionCode(v(version))).toBe(code);
  });

  test("weighs major, minor and patch as MAJOR_WEIGHT, MINOR_WEIGHT and 1", () => {
    expect(versionCode({ major: 3, minor: 4, patch: 5 })).toBe(
      3 * MAJOR_WEIGHT + 4 * MINOR_WEIGHT + 5,
    );
  });

  test("rises with every later version, across the edges where a place carries over", () => {
    const inOrder = ["0.0.1", "0.0.99", "0.1.0", "0.1.99", "0.2.0", "0.99.99", "1.0.0", "1.0.1"];
    const codes = inOrder.map((version) => versionCode(v(version)));
    expect(codes).toEqual([...codes].sort((a, b) => a - b));
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("the package.json of the app", () => {
  /** A package.json as npm and Biome write one, with a "version" of its own deeper down. */
  const PACKAGE_JSON = `{
  "name": "@abth/example",
  "version": "0.1.0",
  "scripts": {
    "build": "bun run build"
  },
  "config": {
    "version": "9.9.9"
  }
}
`;

  test("has its top-level version changed, and every other byte as it was", () => {
    expect(setPackageVersion(PACKAGE_JSON, v("0.2.0"))).toBe(
      PACKAGE_JSON.replace('"version": "0.1.0"', '"version": "0.2.0"'),
    );
  });

  test("keeps a nested version, and the file's CRLF line endings", () => {
    const crlf = PACKAGE_JSON.replaceAll("\n", "\r\n");
    const changed = setPackageVersion(crlf, v("10.0.0"));
    expect(changed).toBe(crlf.replace('"version": "0.1.0"', '"version": "10.0.0"'));
    expect(changed).toContain('"version": "9.9.9"');
  });

  test("reads back the version it was given", () => {
    const changed = setPackageVersion(PACKAGE_JSON, v("3.4.5"));
    expect(changed === null ? null : readPackageVersion(changed)).toEqual(v("3.4.5"));
  });

  test("is not changed when it has no top-level version line", () => {
    expect(setPackageVersion('{\n  "name": "x"\n}\n', v("0.2.0"))).toBeNull();
    expect(
      setPackageVersion('{\n  "config": {\n    "version": "1.0.0"\n  }\n}\n', v("0.2.0")),
    ).toBeNull();
  });

  test.each<[json: string]>([['{ "name": "x" }'], ['{ "version": 1 }'], ['{ "version": "next" }']])(
    "states no version a release can use in %p",
    (json) => {
      expect(readPackageVersion(json)).toBeNull();
    },
  );
});

describe("the names of a release", () => {
  test("are v<version> for the tag, chore(release): <version> for the commit and a title for GitHub", () => {
    const version = v("0.1.0");
    expect(releaseTag(version)).toBe("v0.1.0");
    expect(releaseCommitMessage(version)).toBe("chore(release): 0.1.0");
    expect(releaseTitle(version)).toBe("A Better Taiko Hiroba 0.1.0");
  });
});

describe("the files that carry the same rules", () => {
  const gradle = readFileSync(join(ROOT, "apps/gui/android/app/build.gradle"), "utf8");
  const packageJson = readFileSync(join(ROOT, "apps/gui/package.json"), "utf8");

  test("package.json states a version a release can use", () => {
    expect(readPackageVersion(packageJson)).not.toBeNull();
  });

  test("the Gradle script reads versionName and versionCode from that package.json", () => {
    expect(gradle).toContain('rootProject.file("../package.json")');
    expect(gradle).toContain("versionName appVersion");
    expect(gradle).toContain("versionCode appVersionCode");
  });

  test("the Gradle script weighs the numbers as versionCode does", () => {
    expect(gradle).toContain(`major * ${MAJOR_WEIGHT} + minor * ${MINOR_WEIGHT} + patch`);
  });

  test("the Gradle script refuses the versions parseVersion refuses for want of a versionCode", () => {
    const limits = `minor > ${MAX_MINOR_OR_PATCH} || patch > ${MAX_MINOR_OR_PATCH} || appVersionCode > ${MAX_VERSION_CODE}`;
    expect(gradle).toContain(limits);
  });
});
