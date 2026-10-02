import { isAbsolute } from "node:path";

/** Names the folder that holds the signing keys. build.gradle reads the same variable. */
export const KEYS_FOLDER_VARIABLE = "ABTH_RELEASE_KEYS";
export const KEYSTORE_PROPERTIES = "keystore.properties";
export const RELEASE_KEYSTORE = "abth-local.jks";

export type KeysFolder =
  | { readonly kind: "set"; readonly folder: string }
  | { readonly kind: "unset" }
  | { readonly kind: "invalid"; readonly reason: string };

/**
 * The keys folder `env` names. A relative path is refused, because the scripts and Gradle run in
 * different folders and would read it as two places.
 */
export function resolveKeysFolder(env: Readonly<Record<string, string | undefined>>): KeysFolder {
  const given = env[KEYS_FOLDER_VARIABLE];
  if (given === undefined || given.trim() === "") {
    return { kind: "unset" };
  }
  if (!isAbsolute(given)) {
    return {
      kind: "invalid",
      reason: `${KEYS_FOLDER_VARIABLE} must be an absolute path, and is "${given}".`,
    };
  }
  return { kind: "set", folder: given };
}
