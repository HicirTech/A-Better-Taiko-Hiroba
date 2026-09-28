import { en } from "./messages/en";
import { ja } from "./messages/ja";
import { zhHans } from "./messages/zh-Hans";
import { zhHant } from "./messages/zh-Hant";
import { DEFAULT_LOCALE, type Locale, type MessageKey, type Messages } from "./types";

const CATALOG: Readonly<Record<Locale, Messages>> = {
  en,
  ja,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
};

export type TranslateParams = Readonly<Record<string, string | number>>;

export interface Translator {
  readonly locale: Locale;
  t(key: MessageKey, params?: TranslateParams): string;
  /** A count as the locale writes it: 1,234 in English. */
  number(value: number): string;
  /**
   * A moment as the locale writes a date and a time of day, in the device's own time zone; a dash
   * for one that reads as no date.
   */
  dateTime(value: Date | number | string): string;
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

/** The fields Date's own toLocaleString shows: the whole date, and the time to the second. */
const DATE_TIME: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
};

/**
 * A moment that reads as no date, such as one from a damaged record on disk. Intl throws on it,
 * which would take the whole window down while it renders; a mark reads the same in every language.
 */
const UNKNOWN_TIME = "—";

export function createTranslator(locale: Locale = DEFAULT_LOCALE): Translator {
  const table = CATALOG[locale];
  const numbers = new Intl.NumberFormat(locale);
  const dates = new Intl.DateTimeFormat(locale, DATE_TIME);
  return {
    locale,
    t: (key, params) => interpolate(table[key], params),
    number: (value) => numbers.format(value),
    dateTime: (value) => {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? UNKNOWN_TIME : dates.format(date);
    },
  };
}
