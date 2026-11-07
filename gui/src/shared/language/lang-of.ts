import type { Locale } from "@abth/i18n";

/** The mark for words in a language: the app's Traditional Chinese reads as Hong Kong's. */
export const langOf = (locale: Locale): string => (locale === "zh-Hant" ? "zh-Hant-HK" : locale);
