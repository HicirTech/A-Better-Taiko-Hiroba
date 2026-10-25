import { keepSetting, keptSetting, pageStorage } from "../shared/kept-settings";

/** The window's pages, in the order the navigation lists them. */
export const PAGES = [
  "overview",
  "scores",
  "rating",
  "knowYourself",
  "costume",
  "nameTitle",
  "favorites",
  "settings",
] as const;
export type Page = (typeof PAGES)[number];

const PAGE_KEY = "abth.page";

export function isPage(value: unknown): value is Page {
  return typeof value === "string" && (PAGES as readonly string[]).includes(value);
}

// Recent plays went into Scores: a device that kept it opens on Scores.
const isKept = (value: unknown): value is Page | "history" => value === "history" || isPage(value);

export function keptPage(storage: Storage | undefined = pageStorage()): Page {
  const kept = keptSetting(PAGE_KEY, isKept, storage);
  return kept === "history" ? "scores" : (kept ?? "overview");
}

export function keepPage(page: Page, storage: Storage | undefined = pageStorage()): void {
  keepSetting(PAGE_KEY, page, storage);
}
