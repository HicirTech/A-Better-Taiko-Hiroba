import { en } from "./messages/en";
import { DEFAULT_LOCALE, type Locale, type MessageKey, type Messages } from "./types";

const CATALOG: Readonly<Record<Locale, Messages>> = { en };

export type TranslateParams = Readonly<Record<string, string | number>>;

export interface Translator {
  readonly locale: Locale;
  t(key: MessageKey, params?: TranslateParams): string;
}

/** Replaces each `{name}` with its parameter; a placeholder without one stays as written. */
function interpolate(template: string, params: TranslateParams | undefined): string {
  if (params === undefined) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(params, name) ? String(params[name]) : placeholder,
  );
}

export function createTranslator(locale: Locale = DEFAULT_LOCALE): Translator {
  const table = CATALOG[locale];
  return {
    locale,
    t: (key, params) => interpolate(table[key], params),
  };
}
