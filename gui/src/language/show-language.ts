import type { Translator } from "@abth/i18n";

export { HIROBA_LANG } from "./hiroba-lang";

export function showLanguage(i18n: Translator): void {
  document.documentElement.lang = i18n.locale;
  document.title = i18n.t("app.title");
}
