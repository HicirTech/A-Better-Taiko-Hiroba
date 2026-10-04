import { err, ok, type Result } from "@abth/core";

import type { ChineseNamesPage } from "./types";

/** One answer of the Chinese wiki's API: the names on its pages, and where the next batch starts. */
export interface ChineseNamesBatch {
  readonly pages: readonly ChineseNamesPage[];
  /** The query fields that ask for the next batch; null after the last. */
  readonly next: Readonly<Record<string, string>> | null;
}

// The field runs until the next line that starts another field, or closes the box.
const OFFICIAL_FIELD = /^\|\s*official\s*=([\s\S]*?)(?=^\||^\}\})/m;
const CONTINUE_KEY = /^[a-z]+$/;

/** The names a Songbox's `official` field gives, one per line break, with no footnote or markup. */
export function officialNames(wikitext: string): string[] {
  const field = wikitext.match(OFFICIAL_FIELD)?.[1];
  if (field === undefined) {
    return [];
  }
  const names = field
    .replace(/<ref[^>]*\/>/gi, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
    .split(/<br\s*\/?>/i)
    .map((part) =>
      part
        .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1")
        .replace(/\{\{[^}]*\}\}/g, "")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .trim(),
    );
  return [...new Set(names.filter((name) => name !== ""))];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A batch as MediaWiki answers `generator=categorymembers` with each page's wikitext. */
export function parseChineseNamesBatch(
  text: string,
): Result<ChineseNamesBatch, { readonly code: "badAnswer" }> {
  let answer: unknown;
  try {
    answer = JSON.parse(text);
  } catch {
    return err({ code: "badAnswer" });
  }
  if (!isRecord(answer) || "error" in answer) {
    return err({ code: "badAnswer" });
  }
  const query = answer.query;
  const pages = isRecord(query) && Array.isArray(query.pages) ? query.pages : [];
  const continued = answer.continue;
  if (continued !== undefined && !isRecord(continued)) {
    return err({ code: "badAnswer" });
  }
  const next = continued === undefined ? null : Object.entries(continued);
  if (next?.some(([key, value]) => !CONTINUE_KEY.test(key) || typeof value !== "string")) {
    return err({ code: "badAnswer" });
  }
  return ok({
    pages: pages.flatMap((page): ChineseNamesPage[] => {
      const title = isRecord(page) ? page.title : undefined;
      const content = isRecord(page) ? wikitextOf(page.revisions) : undefined;
      return typeof title === "string" && content !== undefined
        ? [{ title, names: officialNames(content) }]
        : [];
    }),
    next: next === null ? null : Object.fromEntries(next as [string, string][]),
  });
}

function wikitextOf(revisions: unknown): string | undefined {
  const first = Array.isArray(revisions) ? revisions[0] : undefined;
  const slots = isRecord(first) ? first.slots : undefined;
  const main = isRecord(slots) ? slots.main : undefined;
  const content = isRecord(main) ? main.content : undefined;
  return typeof content === "string" ? content : undefined;
}
