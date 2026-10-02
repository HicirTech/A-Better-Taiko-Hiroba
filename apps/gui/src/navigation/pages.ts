import { keepSetting, keptSetting, pageStorage } from "../kept-settings";

/** The window's pages, in the order the navigation lists them. */
export const PAGES = ["overview", "costume", "favorites", "settings"] as const;
export type Page = (typeof PAGES)[number];

/** Where the page last shown on this device is kept. */
const PAGE_KEY = "abth.page";

/** Whether a value names one of the pages: a page read back from storage is checked. */
export function isPage(value: unknown): value is Page {
  return typeof value === "string" && (PAGES as readonly string[]).includes(value);
}

/** The page to open on: the one shown last on this device, else the Overview. */
export function keptPage(storage: Storage | undefined = pageStorage()): Page {
  return keptSetting(PAGE_KEY, isPage, storage) ?? "overview";
}

/** Keeps the page shown for the next launch. */
export function keepPage(page: Page, storage: Storage | undefined = pageStorage()): void {
  keepSetting(PAGE_KEY, page, storage);
}
