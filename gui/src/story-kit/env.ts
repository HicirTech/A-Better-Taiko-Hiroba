import {
  createTranslator,
  DEFAULT_LOCALE,
  isLocale,
  type Locale,
  type Translator,
} from "@abth/i18n";
import { action } from "storybook/actions";

import type { PictureWay, SystemBack, SystemLink, SystemShare, SystemToast } from "../platform";
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

/** A picture handed out, named in the Actions panel; one to save downloads, to look at. */
function handed(way: PictureWay, png: Uint8Array, name: string): Promise<"done"> {
  action(`${way} the picture`)(name, `${png.byteLength} bytes`);
  if (way === "save") {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([new Uint8Array(png)], { type: "image/png" }));
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
  return Promise.resolve("done");
}

/** The desktop's ways out for a picture: the clipboard, or a file. */
export const STORY_COPY_OR_SAVE: SystemShare = { ways: ["copy", "save"], hand: handed };

/** Android's ways out for a picture: the system's share sheet, or a file in Documents. */
export const STORY_SHARE_OR_SAVE: SystemShare = { ways: ["share", "save"], hand: handed };

/** Android 10's and older: the system's share sheet alone. */
export const STORY_SHEET: SystemShare = { ways: ["share"], hand: handed };

/** Android's Back, which no story presses. */
export const STORY_BACK: SystemBack = { listen: () => () => {}, leave: action("leave the app") };
