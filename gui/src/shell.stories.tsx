import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { action } from "storybook/actions";

import { rememberLocale } from "./language/locale-choice";
import { Shell } from "./shell";
import { localeOf, STORY_LINK, type StoryGlobals } from "./story-kit/env";
import { createStoryPort } from "./story-kit/story-port";

/** The shell on the desktop's platform, with a story port in place of the window's bridge. */
function OnTheDesktop() {
  const [port] = useState(createStoryPort);
  return (
    <Shell
      platform={{ shell: "desktop", port, link: STORY_LINK }}
      onShown={action("shown in a language")}
    />
  );
}

/** The shell keeps its own language: it starts in the toolbar's, as one picked before. */
const inToolbarLanguage = ({ globals }: { globals: StoryGlobals }) => {
  rememberLocale(localeOf(globals));
};

const meta = {
  title: "Pages/Shell/Shell",
  tags: ["app"],
  parameters: { layout: "fullscreen" },
  beforeEach: inToolbarLanguage,
  render: () => <OnTheDesktop />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The window as the desktop app opens it: the language it keeps, the frame and the app. */
export const OnTheDesktopApp: Story = {};

/** A browser that is neither shell: Settings, and a notice that the app runs in its shells only. */
export const InABrowser: Story = {
  render: () => <Shell platform={null} onShown={action("shown in a language")} />,
};
