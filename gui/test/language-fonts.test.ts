import { describe, expect, test } from "bun:test";
import { LOCALES } from "@abth/i18n";

import { langOf } from "../src/shared/language/lang-of";

describe("a language's mark", () => {
  test("is its locale, but Traditional Chinese is Hong Kong's", () => {
    expect(LOCALES.map(langOf)).toEqual(["en", "ja", "zh-Hans", "zh-Hant-HK"]);
  });
});
