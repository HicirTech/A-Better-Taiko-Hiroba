/** Every user-facing string lives here: code names a key, the translator turns it into words. */
export { detectLocale, isLocale, localeOfTag, matchLocale } from "./locale";
export { createTranslator, type TranslateParams, type Translator } from "./translator";
export {
  DEFAULT_LOCALE,
  LOCALE_NAMES,
  LOCALES,
  type Locale,
  type Message,
  type MessageArgs,
  type MessageKey,
  type MessageParams,
  type Messages,
  type PlainMessageKey,
} from "./types";
