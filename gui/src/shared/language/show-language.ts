import type { Translator } from "@abth/i18n";
import { langOf } from "./lang-of";

export { langOf } from "./lang-of";

export function showLanguage(i18n: Translator): void {
  document.documentElement.lang = langOf(i18n.locale);
  document.title = i18n.t("app.title");
}
