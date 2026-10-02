import type { Translator } from "@abth/i18n";

/**
 * The `lang` of an element that holds only Hiroba's own words (costume-part names, a title, a
 * nickname), which every language shows as Hiroba writes them. Under the page's `lang` they would
 * take Chinese glyphs, or a Chinese or English voice; a sentence that only quotes them keeps the
 * page's.
 */
export const HIROBA_LANG = "ja";

/** Tells the page which language it is in: `lang` for screen readers and fonts, and the title. */
export function showLanguage(i18n: Translator): void {
  document.documentElement.lang = i18n.locale;
  document.title = i18n.t("app.title");
}
