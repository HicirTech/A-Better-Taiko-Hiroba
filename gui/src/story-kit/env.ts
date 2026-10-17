import {
  createTranslator,
  DEFAULT_LOCALE,
  isLocale,
  type Locale,
  type Translator,
} from "@abth/i18n";
import { action } from "storybook/actions";

import type { SystemBack, SystemLink, SystemToast } from "../platform";

/** The globals a story's render is given, as far as the story kit reads them. */
export interface StoryGlobals {
  readonly locale?: unknown;
  readonly viewport?: unknown;
}

/** The language the toolbar shows the stories in. */
export const localeOf = ({ locale }: StoryGlobals): Locale =>
  typeof locale === "string" && isLocale(locale) ? locale : DEFAULT_LOCALE;

const translators = new Map<Locale, Translator>();

/** The translator of the toolbar's language, one for each language, as the app keeps one. */
export function i18nOf(globals: StoryGlobals): Translator {
  const locale = localeOf(globals);
  const kept = translators.get(locale);
  if (kept !== undefined) {
    return kept;
  }
  const made = createTranslator(locale);
  translators.set(locale, made);
  return made;
}

/** Android's Toast, which shows its text in the Actions panel. */
export const STORY_TOAST: SystemToast = { show: action("toast") };

export const STORY_LINK: SystemLink = { open: action("open in the browser") };

/** Android's Back, which no story presses. */
export const STORY_BACK: SystemBack = { listen: () => () => {}, leave: action("leave the app") };
