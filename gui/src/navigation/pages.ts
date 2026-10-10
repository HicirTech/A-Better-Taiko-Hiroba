import { keepSetting, keptSetting, pageStorage } from "../kept-settings";

/** The window's pages, in the order the navigation lists them. */
export const PAGES = [
  "overview",
  "history",
  "scores",
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

export function keptPage(storage: Storage | undefined = pageStorage()): Page {
  return keptSetting(PAGE_KEY, isPage, storage) ?? "overview";
}

export function keepPage(page: Page, storage: Storage | undefined = pageStorage()): void {
  keepSetting(PAGE_KEY, page, storage);
}
