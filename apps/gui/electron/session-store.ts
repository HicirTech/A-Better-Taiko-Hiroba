import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * The session cookie on disk, so a signed-in user stays signed in across launches until they sign
 * out or Hiroba ends the session. That is the user's call (2026-09-27): this is a personal app, and
 * a Bandai Namco ID sign-in on every launch cost more than a local cookie does.
 *
 * Stored as it is, in the app's own profile folder. Encrypting it with safeStorage was tried and
 * dropped: its key reaches the disk only when Chromium next saves Local State, so an app killed
 * soon after a sign-in left a session no later launch could decrypt. A file that cannot be read
 * reads as no session, and the user signs in again.
 */
export interface SessionStore {
  load(): string | null;
  /** Writes the session, or removes the file for null. */
  save(value: string | null): void;
}

interface StoredSession {
  readonly version: 1;
  readonly value: string;
}

export function createSessionStore(path: string): SessionStore {
  return {
    load() {
      try {
        const stored = JSON.parse(readFileSync(path, "utf8")) as StoredSession;
        return stored.version === 1 && typeof stored.value === "string" && stored.value !== ""
          ? stored.value
          : null;
      } catch {
        return null;
      }
    },
    save(value) {
      if (value === null) {
        rmSync(path, { force: true });
        return;
      }
      const stored: StoredSession = { version: 1, value };
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify(stored));
    },
  };
}
