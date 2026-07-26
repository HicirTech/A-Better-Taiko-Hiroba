/**
 * The `status_10_<code>` option vocabulary. Two pages show play options and both encode them the
 * same way, so the codes live here rather than in either parser. Internal to this domain — not in
 * the index.
 */
import type { PlayOptions, RandomMode } from "../hiroba-models";
import { err, ok, type Result } from "../operation-results";
import type { ParseFailure } from "./types";

/** The speed codes, in the site's own order: 1× through 1.9×, then the four fast ones. */
const SPEED_CODES: Readonly<Record<string, number>> = {
  a10: 1,
  a11: 1.1,
  a12: 1.2,
  a13: 1.3,
  a14: 1.4,
  a15: 1.5,
  a16: 1.6,
  a17: 1.7,
  a18: 1.8,
  a19: 1.9,
  a3: 2,
  a25: 2.5,
  a4: 3,
  a35: 3.5,
  a5: 4,
};

/**
 * Decodes one chart's option images. Sources that carry no `status_10` code are the blanks the
 * pages pad their slots with, and are skipped; a code outside the vocabulary is new knowledge, so
 * it fails carrying the src that produced it.
 *
 * `supportChart` is the caller's to supply: only the recent-plays page has a cell for サポート譜面,
 * and null is the model's way of saying this source could not know.
 */
export function decodePlayOptions(
  sources: readonly string[],
  supportChart: boolean | null,
  page: string,
  marker: string,
): Result<PlayOptions, ParseFailure> {
  let speed = 1;
  let doron = false;
  let abekobe = false;
  let random: RandomMode = "none";

  for (const src of sources) {
    const code = src.match(/status_10_([a-z0-9]+)_/)?.[1];
    if (code === undefined) {
      continue;
    }
    const asSpeed = SPEED_CODES[code];
    if (asSpeed !== undefined) {
      speed = asSpeed;
    } else if (code === "a1") {
      doron = true;
    } else if (code === "a2") {
      abekobe = true;
    } else if (code === "a6") {
      random = "kimagure";
    } else if (code === "a7") {
      random = "detarame";
    } else {
      return err({ kind: "unreadableValue", page, marker, raw: src });
    }
  }

  return ok({ speed, doron, abekobe, random, supportChart });
}
