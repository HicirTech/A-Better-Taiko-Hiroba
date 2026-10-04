import { err, ok, type Result } from "@abth/core";
import { LOCALES, type Locale } from "@abth/i18n";

/** What changed in a release, in each language the feed carries. */
export type UpdateNotes = Readonly<Partial<Record<Locale, readonly string[]>>>;

/** What the feed says of the latest release. */
export interface UpdateFeed {
  readonly version: string;
  readonly notes: UpdateNotes;
}

/** Why the feed did not come: no address, no answer, none in time, or an answer that is no feed. */
export interface UpdateFeedFailure {
  readonly code: "notConfigured" | "unreachable" | "timedOut" | "badAnswer";
}

/** More than any feed needs: a version and a few lines of notes. */
export const MAX_FEED_LENGTH = 16_384;

const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/** MAJOR.MINOR.PATCH, as `gui/package.json` and the release tags write it. */
export function isVersion(value: unknown): value is string {
  return typeof value === "string" && VERSION.test(value);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isLine = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

/** The feed `text` holds, or why it is none. A field or language it does not know is ignored. */
export function parseUpdateFeed(text: string): Result<UpdateFeed, string> {
  if (text.length > MAX_FEED_LENGTH) {
    return err(`The feed is longer than ${MAX_FEED_LENGTH} characters.`);
  }
  let feed: unknown;
  try {
    feed = JSON.parse(text);
  } catch {
    return err("The feed is not JSON.");
  }
  if (!isRecord(feed)) {
    return err("The feed is not an object.");
  }
  const { version, notes } = feed;
  if (!isVersion(version)) {
    return err('"version" must be MAJOR.MINOR.PATCH, such as 1.2.3.');
  }
  if (!isRecord(notes)) {
    return err('"notes" must be an object with a list of lines for each language.');
  }
  const kept: Partial<Record<Locale, readonly string[]>> = {};
  for (const locale of LOCALES) {
    const lines = notes[locale];
    if (lines === undefined) {
      continue;
    }
    if (!Array.isArray(lines) || lines.length === 0 || !lines.every(isLine)) {
      return err(`"notes.${locale}" must be a list of lines, each with some text.`);
    }
    kept[locale] = lines;
  }
  if (Object.keys(kept).length === 0) {
    return err(`"notes" must have a list for at least one of ${LOCALES.join(", ")}.`);
  }
  return ok({ version, notes: kept });
}
