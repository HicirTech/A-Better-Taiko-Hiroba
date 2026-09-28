/**
 * The translation catalog and the function that reads it.
 *
 * Every user-facing string lives here and nowhere else: code names a key, and the interface turns
 * it into words. Failure kinds from the core map to keys one to one, so a new kind that nobody
 * worded is a type error in the app that maps it.
 */
export { detectLocale, isLocale, localeOfTag, matchLocale } from "./locale";
export { createTranslator, type TranslateParams, type Translator } from "./translator";
export {
  DEFAULT_LOCALE,
  LOCALE_NAMES,
  LOCALES,
  type Locale,
  type MessageKey,
  type Messages,
} from "./types";
