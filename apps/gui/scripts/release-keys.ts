/**
 * Where the Android signing keys live: one folder, outside the clone, so that losing the machine
 * does not lose them. It is the folder the environment variable ABTH_RELEASE_KEYS names when that
 * is set, and W:/TaikoElaboation/release keys when it is not. The Android project's Gradle script
 * (apps/gui/android/app/build.gradle) follows the same rule in Groovy, so a bare ./gradlew finds
 * the same keys. The tests read that script, so the two cannot drift unseen.
 */
import { isAbsolute } from "node:path";

/** The variable that names the keys folder, in place of the default one. */
export const KEYS_FOLDER_VARIABLE = "ABTH_RELEASE_KEYS";
/** The keys folder when the variable is not set. */
export const DEFAULT_KEYS_FOLDER = "W:/TaikoElaboation/release keys";

/**
 * The release key's settings: `storeFile`, which is read relative to the keys folder, the two
 * passwords and the alias. Gradle signs the release build when this file is in the folder.
 */
export const KEYSTORE_PROPERTIES = "keystore.properties";
/** The release key's store, as `android:keystore` makes it. */
export const RELEASE_KEYSTORE = "abth-local.jks";
/**
 * The shared debug key: Android's standard debug store, with its standard credentials. Debug APKs
 * built on any machine that has it update one another.
 */
export const DEBUG_KEYSTORE = "debug.keystore";

/** The keys folder, or why the variable cannot name one. */
export type KeysFolder =
  | { readonly ok: true; readonly folder: string }
  | { readonly ok: false; readonly reason: string };

/** The folder the keys live in, for a run started with `env`. */
export function resolveKeysFolder(env: Readonly<Record<string, string | undefined>>): KeysFolder {
  const given = env[KEYS_FOLDER_VARIABLE];
  // A variable set to nothing counts as not set: an empty path would be the folder the script runs in.
  if (given === undefined || given.trim() === "") {
    return { ok: true, folder: DEFAULT_KEYS_FOLDER };
  }
  // The scripts and Gradle run in different folders, so a relative path would name two places.
  if (!isAbsolute(given)) {
    return {
      ok: false,
      reason: `${KEYS_FOLDER_VARIABLE} must be an absolute path, and is "${given}".`,
    };
  }
  return { ok: true, folder: given };
}
