import { type ChineseNamesPage, type ChineseNamesRead, isObject } from "@abth/core";
import { keepJson, keptJson, pageStorage } from "../kept-settings";

const KEY = "abth.chineseNames";
const VERSION = 1;
/** Official names rarely change, so a month passes before they are read again. */
export const CHINESE_NAMES_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const isNamesPage = (page: unknown): page is ChineseNamesPage =>
  isObject(page) &&
  typeof page.title === "string" &&
  Array.isArray(page.names) &&
  page.names.every((name) => typeof name === "string");

function namesIn({ sentAt, pages }: Record<string, unknown>): ChineseNamesRead | null {
  return typeof sentAt === "number" && Array.isArray(pages) && pages.every(isNamesPage)
    ? { sentAt, pages }
    : null;
}

export function loadChineseNames(
  storage: Storage | undefined = pageStorage(),
): ChineseNamesRead | null {
  return keptJson(KEY, VERSION, namesIn, storage);
}

export function keepChineseNames(
  read: ChineseNamesRead,
  storage: Storage | undefined = pageStorage(),
): void {
  keepJson(KEY, VERSION, read, storage);
}
