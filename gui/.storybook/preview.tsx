import "../src/theme/fonts";

import { LOCALE_NAMES, LOCALES } from "@abth/i18n";
import { CssBaseline, type Theme, ThemeProvider, useColorScheme } from "@mui/material";
import type { Preview } from "@storybook/react-vite";
import { type ReactNode, useEffect, useMemo } from "react";
import { forgetSetting, pageStorage } from "../src/shared/kept-settings";
import { systemLocale } from "../src/shared/language/locale-choice";
import { DEVICES, deviceOf, isTouchScreen } from "../src/story-kit/devices";
import { appTheme } from "../src/theme/app-theme";

const MODES = ["system", "light", "dark"] as const;
type Mode = (typeof MODES)[number];
const modeOf = (value: unknown): Mode => MODES.find((mode) => mode === value) ?? "system";

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
const themeFor = (touch: boolean): Theme => ({
  ...appTheme,
  components: {
    ...appTheme.components,
    MuiUseMediaQuery: {
      defaultProps: {
        matchMedia: (query) =>
          query === POINTER_QUERY ? fixedAnswer(query, touch) : window.matchMedia(query),
      },
    },
  },
});

function FollowMode({ mode }: { readonly mode: Mode }) {
  const { setMode } = useColorScheme();
  useEffect(() => setMode(mode), [mode, setMode]);
  return null;
}

function StoryFrame({
  globals,
  children,
}: {
  readonly globals: Record<string, unknown>;
  readonly children: ReactNode;
}) {
  const touch = isTouchScreen(deviceOf(globals));
  const theme = useMemo(() => themeFor(touch), [touch]);
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
