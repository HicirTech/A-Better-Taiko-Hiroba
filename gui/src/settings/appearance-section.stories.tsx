import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { action } from "storybook/actions";

import { i18nOf } from "../story-kit/env";
import {
  DEFAULT_THEME_MODE,
  DEFAULT_THEME_NAME,
  type ThemeMode,
  type ThemeName,
} from "../theme/appearance";
import { AppearanceSection } from "./appearance-section";

const themeAction = action("choose a theme");
const modeAction = action("choose light or dark");

interface Args {
  readonly theme: ThemeName;
  readonly mode: ThemeMode;
}

// The section as Settings holds it: its choices change as they are made, the window's theme not.
function Appearance({ theme, mode, i18n }: Args & { readonly i18n: Translator }) {
  const [chosenTheme, setTheme] = useState(theme);
  const [chosenMode, setMode] = useState(mode);
  return (
    <AppearanceSection
      theme={chosenTheme}
      mode={chosenMode}
      i18n={i18n}
      onTheme={(next) => {
        setTheme(next);
        themeAction(next);
      }}
      onMode={(next) => {
        setMode(next);
        modeAction(next);
      }}
    />
  );
}

const meta = {
  title: "Cards and sections/AppearanceSection",
  tags: ["settings"],
  args: { theme: DEFAULT_THEME_NAME, mode: DEFAULT_THEME_MODE },
  render: (args, { globals }) => (
    <Box sx={{ maxWidth: 600 }}>
      <Appearance {...args} i18n={i18nOf(globals)} />
    </Box>
  ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As a fresh install has it: the default theme, light or dark as the system is. */
export const AsInstalled: Story = {};

/** Hiroba's colours, always dark. */
export const HirobasColoursInDark: Story = { args: { theme: "hiroba", mode: "dark" } };
