import { DEFAULT_LOCALE, LOCALES, type Locale } from "./types";

/** Whether a value is a locale the catalog carries: a choice read back from storage is checked. */
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** The regions whose Chinese is written in Traditional characters by default. */
const TRADITIONAL_REGIONS: ReadonlySet<string> = new Set(["hk", "mo", "tw"]);

/** The locale a BCP 47 tag asks for: Chinese by script or region, any other language by itself. */
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

/** The first of `tags` (most preferred first) whose locale is in `supported`, else `fallback`. */
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

/** The catalog's locale for the system's languages, most preferred first, else English. */
export function detectLocale(tags: readonly string[]): Locale {
  return matchLocale(tags, LOCALES, DEFAULT_LOCALE);
}
