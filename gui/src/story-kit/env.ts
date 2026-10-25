import {
  createTranslator,
  DEFAULT_LOCALE,
  isLocale,
  type Locale,
  type Translator,
} from "@abth/i18n";
import { action } from "storybook/actions";

import type { SystemBack, SystemLink, SystemToast } from "../platform";
import {
  type AppearanceChoice,
  DEFAULT_THEME_MODE,
  DEFAULT_THEME_NAME,
  THEME_MODES,
  THEME_NAMES,
} from "../theme/appearance";

/** The globals a story's render is given, as far as the story kit reads them. */
export interface StoryGlobals {
  readonly locale?: unknown;
  readonly viewport?: unknown;
  readonly theme?: unknown;
  readonly mode?: unknown;
}

/** The theme and the mode the toolbar shows the stories in; Settings' choices go to Actions. */
export const appearanceOf = ({ theme, mode }: StoryGlobals): AppearanceChoice => ({
  theme: THEME_NAMES.find((name) => name === theme) ?? DEFAULT_THEME_NAME,
  mode: THEME_MODES.find((one) => one === mode) ?? DEFAULT_THEME_MODE,
  onTheme: action("choose a theme"),
  onMode: action("choose light or dark"),
});

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
