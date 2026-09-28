import type { Translator } from "@abth/i18n";

/** Tells the page which language it is in: `lang` for screen readers and fonts, and the title. */
export function showLanguage(i18n: Translator): void {
  document.documentElement.lang = i18n.locale;
  document.title = i18n.t("app.title");
}
