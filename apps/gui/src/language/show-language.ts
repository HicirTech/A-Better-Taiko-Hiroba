import type { Translator } from "@abth/i18n";

/**
 * The `lang` of an element that holds only Hiroba's own data (a title, a nickname, a medal's name,
 * the site's own warning), which every language shows as Hiroba writes it. Under the page's `lang`
 * it would take Chinese glyphs, or a Chinese or English voice. The game's terms are not such data:
 * each language words them in its catalog, with no mark. A sentence that only quotes Hiroba's words
 * keeps the page's `lang`.
 */
export const HIROBA_LANG = "ja";

/** Tells the page which language it is in: `lang` for screen readers and fonts, and the title. */
export function showLanguage(i18n: Translator): void {
  document.documentElement.lang = i18n.locale;
  document.title = i18n.t("app.title");
}
