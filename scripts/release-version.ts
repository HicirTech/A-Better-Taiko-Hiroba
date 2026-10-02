/**
 * The rules a release's version follows, kept apart from git so they can be tested on their own.
 * A version is MAJOR.MINOR.PATCH, three whole numbers, and "version" in apps/gui/package.json is
 * the one place it is written: electron-builder names the Windows files after it, and the Android
 * app's Gradle script (apps/gui/android/app/build.gradle) takes versionName and versionCode from it,
 * by the same formula as `versionCode` below. The tests read that script, so the two cannot drift.
 */

/** A version: three whole numbers, with no pre-release or build part, which a versionCode has no room for. */
export interface Version {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

/** The numbers a release can raise by name; the ones after it go back to 0. */
export type Bump = "major" | "minor" | "patch";

/** What each number is worth in a versionCode: major * 10000 + minor * 100 + patch. */
export const MAJOR_WEIGHT = 10000;
export const MINOR_WEIGHT = 100;
/**
 * The largest minor or patch number. One more would spill into the place above it, and a later
 * version could then have a lower or an equal versionCode, which Android will not update to.
 */
export const MAX_MINOR_OR_PATCH = 99;
/** The largest versionCode Android takes. */
export const MAX_VERSION_CODE = 2100000000;

/** Plain decimal numbers without leading zeros, as semver writes them: no `v`, no pre-release. */
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/**
 * The top-level "version" line of a package.json. Top-level keys sit two spaces in, as Biome and npm
 * write them, so a "version" inside a nested object, which sits deeper, is left alone.
 */
const VERSION_LINE = /^( {2}"version": ")[^"\\]*(")/m;

/** What each bump does to a version, one line per name: the keywords a release can be asked for. */
const RAISE: Readonly<Record<Bump, (version: Version) => Version>> = {
  major: (version) => ({ major: version.major + 1, minor: 0, patch: 0 }),
  minor: (version) => ({ major: version.major, minor: version.minor + 1, patch: 0 }),
  patch: (version) => ({ major: version.major, minor: version.minor, patch: version.patch + 1 }),
};

/** The result of reading what a release was asked for: the version, or why it cannot be one. */
export type Target =
  | { readonly ok: true; readonly version: Version }
  | { readonly ok: false; readonly reason: string };

/** The versionCode Android gets: it rises with the version, as updates need. */
export function versionCode(version: Version): number {
  return version.major * MAJOR_WEIGHT + version.minor * MINOR_WEIGHT + version.patch;
}

/** Whether a versionCode can be made of the version without two versions sharing one. */
function hasVersionCode(version: Version): boolean {
  return (
    version.minor <= MAX_MINOR_OR_PATCH &&
    version.patch <= MAX_MINOR_OR_PATCH &&
    versionCode(version) <= MAX_VERSION_CODE
  );
}

/** The version `text` spells, or null when it is not exactly MAJOR.MINOR.PATCH, or has no versionCode. */
export function parseVersion(text: string): Version | null {
  const [, major, minor, patch] = VERSION.exec(text) ?? [];
  if (major === undefined || minor === undefined || patch === undefined) {
    return null;
  }
  const version = { major: Number(major), minor: Number(minor), patch: Number(patch) };
  return hasVersionCode(version) ? version : null;
}

export function formatVersion(version: Version): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

/** Negative when `a` is the earlier version, zero when they are the same, positive when it is later. */
export function compareVersions(a: Version, b: Version): number {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

export function isBump(text: string): text is Bump {
  return Object.hasOwn(RAISE, text);
}

/** The version a bump makes of `version`, or null when its number would pass what a versionCode holds. */
export function bumpVersion(version: Version, bump: Bump): Version | null {
  const raised = RAISE[bump](version);
  return hasVersionCode(raised) ? raised : null;
}

/** What a release asked for by `argument` means: a bump of the current version, or a version itself. */
export function resolveTarget(current: Version, argument: string): Target {
  if (isBump(argument)) {
    const raised = bumpVersion(current, argument);
    return raised === null
      ? {
          ok: false,
          reason: `${argument} on ${formatVersion(current)} would take a number past what a versionCode holds. Raise a bigger place, or give the version itself.`,
        }
      : { ok: true, version: raised };
  }
  const version = parseVersion(argument);
  return version === null
    ? {
        ok: false,
        reason: `"${argument}" is not a version. Write MAJOR.MINOR.PATCH, such as 1.2.3 (no "v"; minor and patch go up to ${MAX_MINOR_OR_PATCH}), or patch, minor or major.`,
      }
    : { ok: true, version };
}

/** The version a package.json states, or null when it states none that a release can use. */
export function readPackageVersion(packageJson: string): Version | null {
  const { version } = JSON.parse(packageJson) as { version?: unknown };
  return typeof version === "string" ? parseVersion(version) : null;
}

/**
 * The package.json with its top-level "version" changed and every other byte as it was, line endings
 * included, or null when it has no such line. Rewriting the whole file through JSON would reflow it.
 */
export function setPackageVersion(packageJson: string, version: Version): string | null {
  return VERSION_LINE.test(packageJson)
    ? packageJson.replace(
        VERSION_LINE,
        (_line, open: string, close: string) => `${open}${formatVersion(version)}${close}`,
      )
    : null;
}

/** The git tag of a release; pushing it is what starts the Release workflow. */
export function releaseTag(version: Version): string {
  return `v${formatVersion(version)}`;
}

/** The commit that raises the version, in the form commitlint.config.js asks for. */
export function releaseCommitMessage(version: Version): string {
  return `chore(release): ${formatVersion(version)}`;
}

/** The release's title on GitHub, and the message of its annotated tag. */
export function releaseTitle(version: Version): string {
  return `A Better Taiko Hiroba ${formatVersion(version)}`;
}
