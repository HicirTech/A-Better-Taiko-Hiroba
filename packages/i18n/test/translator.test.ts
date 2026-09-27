import { describe, expect, test } from "bun:test";

import { createTranslator, LOCALES } from "../src/index";
import { en } from "../src/messages/en";

describe("createTranslator", () => {
  test("fills a parameter the message names", () => {
    const { t } = createTranslator("en");
    expect(t("profile.fetchedAt", { time: "12:00" })).toStartWith("Read at 12:00.");
  });

  test("fills a number parameter, zero included", () => {
    const { t } = createTranslator("en");
    expect(t("medal.count", { count: 0 })).toBe("Medals: 0");
  });

  test("leaves a placeholder without a parameter as written", () => {
    const { t } = createTranslator("en");
    expect(t("profile.fetchedAt")).toContain("{time}");
  });

  test("defaults to English", () => {
    expect(createTranslator().locale).toBe("en");
  });
});

describe("the English catalog", () => {
  test("words every key with non-empty text", () => {
    for (const [key, text] of Object.entries(en)) {
      expect({ key, empty: text.trim() === "" }).toEqual({ key, empty: false });
    }
  });

  test("is the only locale so far", () => {
    expect([...LOCALES]).toEqual(["en"]);
  });
});
