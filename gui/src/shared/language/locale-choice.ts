import { detectLocale, isLocale, type Locale } from "@abth/i18n";

import { forgetSetting, keepSetting, keptSetting, pageStorage } from "../kept-settings";

const LOCALE_KEY = "abth.locale";

/** System languages, most preferred first; in Electron, its locale, then the system's list. */
function systemLanguages(): readonly string[] {
  const system: Partial<Pick<Navigator, "language" | "languages">> = globalThis.navigator ?? {};
  if (system.languages !== undefined && system.languages.length > 0) {
    return system.languages;
  }
  return system.language === undefined ? [] : [system.language];
}

export function pickedLocale(storage: Storage | undefined = pageStorage()): Locale | null {
  return keptSetting(LOCALE_KEY, isLocale, storage);
}

export function rememberLocale(locale: Locale, storage: Storage | undefined = pageStorage()): void {
  keepSetting(LOCALE_KEY, locale, storage);
}

export function forgetLocale(storage: Storage | undefined = pageStorage()): void {
  forgetSetting(LOCALE_KEY, storage);
}

export function systemLocale(languages: readonly string[] = systemLanguages()): Locale {
  return detectLocale(languages);
}

export function startingLocale(
  storage: Storage | undefined = pageStorage(),
  languages: readonly string[] = systemLanguages(),
): Locale {
  return pickedLocale(storage) ?? systemLocale(languages);
}
