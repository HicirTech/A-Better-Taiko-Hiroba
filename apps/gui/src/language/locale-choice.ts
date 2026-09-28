import { detectLocale, isLocale, type Locale } from "@abth/i18n";

import { keepSetting, keptSetting, pageStorage } from "../kept-settings";

/** Where the language picked on this device is kept: the app page's localStorage. */
const LOCALE_KEY = "abth.locale";

/** The system's languages, most preferred first: in Electron, its locale, then the system's list. */
function systemLanguages(): readonly string[] {
  const system: Partial<Pick<Navigator, "language" | "languages">> = globalThis.navigator ?? {};
  if (system.languages !== undefined && system.languages.length > 0) {
    return system.languages;
  }
  return system.language === undefined ? [] : [system.language];
}

/** The language picked on this device, or null when none was, or it cannot be read. */
export function pickedLocale(storage: Storage | undefined = pageStorage()): Locale | null {
  return keptSetting(LOCALE_KEY, isLocale, storage);
}

/** Keeps a pick for the next launch. One that cannot be kept holds for this run alone. */
export function rememberLocale(locale: Locale, storage: Storage | undefined = pageStorage()): void {
  keepSetting(LOCALE_KEY, locale, storage);
}

/**
 * The language to open in: the one picked on this device, else the first of the system's that the
 * catalog carries, else English. Until a language is picked, the app follows the system's.
 */
export function startingLocale(
  storage: Storage | undefined = pageStorage(),
  languages: readonly string[] = systemLanguages(),
): Locale {
  return pickedLocale(storage) ?? detectLocale(languages);
}
