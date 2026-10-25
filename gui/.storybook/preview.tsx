import "../src/theme/fonts";

import { LOCALE_NAMES, LOCALES } from "@abth/i18n";
import { CssBaseline, type Theme, ThemeProvider } from "@mui/material";
import type { Preview } from "@storybook/react-vite";
import { type ReactNode, useMemo } from "react";
import { forgetSetting, pageStorage } from "../src/shared/kept-settings";
import { systemLocale } from "../src/shared/language/locale-choice";
import { DEVICES, deviceOf, isTouchScreen } from "../src/story-kit/devices";
import { APP_THEMES } from "../src/theme/app-theme";
import { THEME_MODES, THEME_NAMES, type ThemeMode, type ThemeName } from "../src/theme/appearance";
import { FollowMode } from "../src/theme/follow-mode";

const themeNameOf = (value: unknown): ThemeName =>
  THEME_NAMES.find((name) => name === value) ?? "default";
const modeOf = (value: unknown): ThemeMode =>
  THEME_MODES.find((mode) => mode === value) ?? "system";

const POINTER_QUERY = "(pointer: coarse)";
// Every key the app keeps in the page's storage starts so.
const KEPT_PREFIX = "abth.";

const fixedAnswer = (media: string, matches: boolean): MediaQueryList => ({
  media,
  matches,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
});

/** The app tells a touch screen by `(pointer: coarse)`: an Android device answers yes, a PC no. */
const themeFor = (base: Theme, touch: boolean): Theme => ({
  ...base,
  components: {
    ...base.components,
    MuiUseMediaQuery: {
      defaultProps: {
        matchMedia: (query) =>
          query === POINTER_QUERY ? fixedAnswer(query, touch) : window.matchMedia(query),
      },
    },
  },
});

function StoryFrame({
  globals,
  children,
}: {
  readonly globals: Record<string, unknown>;
  readonly children: ReactNode;
}) {
  const touch = isTouchScreen(deviceOf(globals));
  const name = themeNameOf(globals.theme);
  const theme = useMemo(() => themeFor(APP_THEMES[name], touch), [name, touch]);
  const mode = modeOf(globals.mode);
  return (
    <ThemeProvider theme={theme} defaultMode={mode} storageManager={null}>
      <FollowMode mode={mode} />
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
}

/** Forgets what earlier stories kept, so each starts as a fresh install does. */
function forgetKept() {
  const storage = pageStorage();
  for (const key of Object.keys(storage ?? {})) {
    if (key.startsWith(KEPT_PREFIX)) {
      forgetSetting(key, storage);
    }
  }
}

const preview: Preview = {
  beforeEach: forgetKept,
  decorators: [
    (Story, { globals }) => (
      <StoryFrame globals={globals}>
        <Story />
      </StoryFrame>
    ),
  ],
  globalTypes: {
    locale: {
      description: "The app's language",
      toolbar: {
        title: "Language",
        icon: "globe",
        items: LOCALES.map((locale) => ({ value: locale, title: LOCALE_NAMES[locale] })),
        dynamicTitle: true,
      },
    },
    theme: {
      description: "The theme chosen in Settings",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: [
          { value: "default", title: "Default" },
          { value: "hiroba", title: "Hiroba's colours" },
        ],
        dynamicTitle: true,
      },
    },
    mode: {
      description: "Light or dark, or as the system is",
      toolbar: {
        title: "Mode",
        icon: "contrast",
        items: [
          { value: "system", title: "As the system" },
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    locale: systemLocale(),
    theme: "default",
    mode: "system",
    viewport: { value: "pc", isRotated: false },
  },
  parameters: {
    viewport: { options: DEVICES },
    layout: "padded",
    controls: { expanded: true },
    options: {
      storySort: {
        method: "alphabetical",
        order: [
          "Foundations",
          ["Side by side", "*"],
          "Pictures",
          ["Side by side", "*"],
          "Buttons",
          ["Side by side", "*"],
          "Chips and filters",
          ["Side by side", "*"],
          "Menus",
          ["Side by side", "*"],
          "Dialogs",
          ["Side by side", "*"],
          "Navigation",
          ["Side by side", "*"],
          "Cards and sections",
          ["Side by side", "*"],
          "Rows and lists",
          ["Side by side", "*"],
          "Status",
          ["Side by side", "*"],
          "Stats",
          ["Side by side", "*"],
          "Fields",
          ["Side by side", "*"],
          "Pages",
        ],
      },
    },
  },
};

export default preview;
