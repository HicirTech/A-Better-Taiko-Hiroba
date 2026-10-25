import { keepSetting, keptSetting, pageStorage } from "../shared/kept-settings";

/** The themes a player may choose: MUI's own blue and white, or Hiroba's colours. */
export const THEME_NAMES = ["default", "hiroba"] as const;
export type ThemeName = (typeof THEME_NAMES)[number];
export const DEFAULT_THEME_NAME: ThemeName = "default";

/** Light, dark, or as the system is. */
export const THEME_MODES = ["system", "light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];
export const DEFAULT_THEME_MODE: ThemeMode = "system";

/** The theme and the mode chosen in Settings, and what changes them. */
export interface AppearanceChoice {
  readonly theme: ThemeName;
  readonly mode: ThemeMode;
  readonly onTheme: (next: ThemeName) => void;
  readonly onMode: (next: ThemeMode) => void;
}

const NAME_KEY = "abth.theme";
const MODE_KEY = "abth.themeMode";

const isThemeName = (value: unknown): value is ThemeName =>
  (THEME_NAMES as readonly unknown[]).includes(value);

const isThemeMode = (value: unknown): value is ThemeMode =>
  (THEME_MODES as readonly unknown[]).includes(value);

export function keptThemeName(storage: Storage | undefined = pageStorage()): ThemeName {
  return keptSetting(NAME_KEY, isThemeName, storage) ?? DEFAULT_THEME_NAME;
}

export function keepThemeName(name: ThemeName, storage: Storage | undefined = pageStorage()): void {
  keepSetting(NAME_KEY, name, storage);
}

export function keptThemeMode(storage: Storage | undefined = pageStorage()): ThemeMode {
  return keptSetting(MODE_KEY, isThemeMode, storage) ?? DEFAULT_THEME_MODE;
}

export function keepThemeMode(mode: ThemeMode, storage: Storage | undefined = pageStorage()): void {
  keepSetting(MODE_KEY, mode, storage);
}
