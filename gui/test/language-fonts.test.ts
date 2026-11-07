import { describe, expect, test } from "bun:test";
import { LOCALES } from "@abth/i18n";

import { langOf } from "../src/shared/language/lang-of";
import { appTheme, SNAPSHOT_THEME } from "../src/theme/app-theme";
import { DEFAULT_TOKENS, SYSTEM_FONTS } from "../src/theme/tokens";

const rulesOf = (selector: string): Record<string, string> | undefined => {
  const rules = appTheme.components?.MuiCssBaseline?.styleOverrides;
  return (rules as Record<string, Record<string, string>> | undefined)?.[selector];
};
const HELD = `var(${SYSTEM_FONTS})`;

describe("a language's mark", () => {
  test("is its locale, but Traditional Chinese is Hong Kong's", () => {
    expect(LOCALES.map(langOf)).toEqual(["en", "ja", "zh-Hans", "zh-Hant-HK"]);
  });
});

describe("a language's system fonts", () => {
  test("come with its mark, and the mark the app gives is caught", () => {
    for (const locale of LOCALES) {
      expect(rulesOf(`[lang|="${locale}"]`)?.[SYSTEM_FONTS]).toBe(
        DEFAULT_TOKENS.systemFonts[locale],
      );
      expect(`${langOf(locale)}-`.startsWith(`${locale}-`)).toBe(true);
    }
  });

  test("reach words marked alone and an input's own font", () => {
    expect(rulesOf(":where([lang]), input[lang]")?.fontFamily).toBe(DEFAULT_TOKENS.fontFamily);
  });

  test("stand after the Latin fonts in words and in a shared picture", () => {
    expect(appTheme.typography.body2.fontFamily).toStartWith('"Roboto", ');
    expect(appTheme.typography.body2.fontFamily).toEndWith(`, ${HELD}, sans-serif`);
    expect(SNAPSHOT_THEME.typography.fontFamily).toBe(appTheme.typography.fontFamily);
  });
});
