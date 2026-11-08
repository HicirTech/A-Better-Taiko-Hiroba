import { useState } from "react";
import { action } from "storybook/actions";

import { AppWindow } from "../app-window";
import type { Page } from "../navigation/pages";
import { useShownPage } from "../navigation/use-shown-page";
import type { Platform } from "../platform";
import { AppearanceSection } from "../settings/appearance-section";
import { LanguageSetting } from "../settings/language-setting";
import type { HirobaSessionPort } from "../shared/session-port";
import { STORY_CAMERA } from "./camera";
import { touchOf, wideOf } from "./devices";
import {
  appearanceOf,
  i18nOf,
  localeOf,
  STORY_BACK,
  STORY_COPY_OR_SAVE,
  STORY_LINK,
  STORY_SHARE_OR_SAVE,
  STORY_TOAST,
  type StoryGlobals,
} from "./env";
import { press } from "./steps";
import { createStoryPort } from "./story-port";

/** A story's play: Read again, pressed once it can be, where the window has the button (a PC). */
export async function readAgain({ globals }: { readonly globals: StoryGlobals }) {
  if (!touchOf(globals)) {
    await press("#read-again");
  }
}

/** A story's render: the whole window opened on `first`, on a story port with `changes`. */
export const appOn =
  (first: Page, changes: Partial<HirobaSessionPort> = {}) =>
  (_args: unknown, { globals }: { readonly globals: StoryGlobals }) => (
    <StoryApp changes={changes} first={first} globals={globals} />
  );

/** The whole window as the shell draws it, on a story port; Android gets Back, Toast and camera. */
export function StoryApp({
  changes,
  first,
  globals,
}: {
  readonly changes?: Partial<HirobaSessionPort>;
  /** The page the window opens on. */
  readonly first: Page;
  readonly globals: StoryGlobals;
}) {
  // One port for as long as the window is open: the app keeps what it read by its port.
  const [port] = useState(() => createStoryPort(changes));
  const i18n = i18nOf(globals);
  const android = touchOf(globals);
  const [page, navigate] = useShownPage(() => first);
  const platform: Platform = android
    ? {
        port,
        link: STORY_LINK,
        share: STORY_SHARE_OR_SAVE,
        back: STORY_BACK,
        toast: STORY_TOAST,
        camera: STORY_CAMERA,
      }
    : { port, link: STORY_LINK, share: STORY_COPY_OR_SAVE };
  return (
    <AppWindow
      platform={platform}
      i18n={i18n}
      page={page}
      onNavigate={navigate}
      wide={wideOf(globals)}
      touchFirst={android}
      language={
        <LanguageSetting
          picked={null}
          system={localeOf(globals)}
          onPick={action("pick a language")}
          i18n={i18n}
        />
      }
      appearance={<AppearanceSection {...appearanceOf(globals)} i18n={i18n} />}
    />
  );
}
