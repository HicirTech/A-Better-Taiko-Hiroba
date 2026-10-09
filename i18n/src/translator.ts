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
  /** A date and time of day as the locale writes them, in the device's zone; a dash for none. */
  dateTime(value: Date | number | string): string;
  /** A time of day to the second, as the locale writes it, in the device's zone; a dash for none. */
  time(value: Date | number | string): string;
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

/** Brief enough for a narrow column: the month as a short name and the day, and the time to the
 * minute, with no year and no seconds. */
const DATE_TIME: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

/** For things seconds apart: the time of day to the second, with no date. */
const TIME: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", second: "2-digit" };

/** Shown for a moment that reads as no date: Intl throws on it, taking the window down. */
const UNKNOWN_TIME = "—";

export function createTranslator(locale: Locale = DEFAULT_LOCALE): Translator {
  const table = CATALOG[locale];
  const numbers = new Intl.NumberFormat(locale);
  const dates = new Intl.DateTimeFormat(locale, DATE_TIME);
  const times = new Intl.DateTimeFormat(locale, TIME);
  const formatted = (format: Intl.DateTimeFormat) => (value: Date | number | string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? UNKNOWN_TIME : format.format(date);
  };
  return {
    locale,
    t: (key, params) => interpolate(table[key], params),
    number: (value) => numbers.format(value),
    dateTime: formatted(dates),
    time: formatted(times),
  };
}
