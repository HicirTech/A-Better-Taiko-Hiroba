import { useState } from "react";
import { action } from "storybook/actions";

import { App } from "../App";
import { AppFrame } from "../navigation/app-frame";
import type { Page } from "../navigation/pages";
import { useShownPage } from "../navigation/use-shown-page";
import { PAGE_REGISTRY } from "../pages/registry";
import { PipelinesPage } from "../pipelines-page/pipelines-page";
import { AppearanceSection } from "../settings/appearance-section";
import { LanguageSetting } from "../settings/language-setting";
import type { HirobaSessionPort } from "../shared/session-port";
import { touchOf, wideOf } from "./devices";
import {
  appearanceOf,
  i18nOf,
  localeOf,
  STORY_BACK,
  STORY_LINK,
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

/** The whole window as the shell draws it, on a story port; Android gets Back and Toast. */
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
  return (
    <AppFrame
      page={page}
      onNavigate={navigate}
      i18n={i18n}
      wide={wideOf(globals)}
      touchFirst={touchOf(globals)}
      pages={PAGE_REGISTRY}
      {...(android ? { back: STORY_BACK } : {})}
      pipelines={<PipelinesPage port={port} i18n={i18n} />}
    >
      <App
        port={port}
        link={STORY_LINK}
        i18n={i18n}
        page={page}
        onNavigate={navigate}
        language={
          <LanguageSetting
            picked={null}
            system={localeOf(globals)}
            onPick={action("pick a language")}
            i18n={i18n}
          />
        }
        appearance={<AppearanceSection {...appearanceOf(globals)} i18n={i18n} />}
        {...(android ? { toast: STORY_TOAST } : {})}
      />
    </AppFrame>
  );
}
