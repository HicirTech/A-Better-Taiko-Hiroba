import { DEFAULT_LOCALE, LOCALES, type Locale } from "./types";

/** Whether a value names a locale the catalog carries: a choice read back from storage is checked. */
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** The regions whose Chinese is written in Traditional characters by default. */
const TRADITIONAL_REGIONS: ReadonlySet<string> = new Set(["hk", "mo", "tw"]);

/**
 * The locale one BCP 47 tag asks for, in the catalog's spelling: Chinese by its script, Traditional
 * when the tag says Hant or names Hong Kong, Macao or Taiwan, Simplified otherwise; every other
 * language by its language alone, so en-NZ asks for en.
 */
export function localeOfTag(tag: string): string {
  const [language = "", ...rest] = tag.trim().toLowerCase().replaceAll("_", "-").split("-");
  if (language !== "zh") {
    return language;
  }
  if (rest.includes("hant")) {
    return "zh-Hant";
  }
  if (rest.includes("hans")) {
    return "zh-Hans";
  }
  return rest.some((subtag) => TRADITIONAL_REGIONS.has(subtag)) ? "zh-Hant" : "zh-Hans";
}

/**
 * The first of `tags`, in their order, whose locale is one of `supported`, or `fallback` when none
 * is. The tags are the system's languages, most preferred first.
 */
export function matchLocale<L extends string>(
  tags: readonly string[],
  supported: readonly L[],
  fallback: L,
): L {
  for (const tag of tags) {
    const wanted = localeOfTag(tag);
    const found = supported.find((locale) => locale === wanted);
    if (found !== undefined) {
      return found;
    }
  }
  return fallback;
}

/** The catalog's locale for the system's languages, most preferred first; English when none fits. */
export function detectLocale(tags: readonly string[]): Locale {
  return matchLocale(tags, LOCALES, DEFAULT_LOCALE);
}
