import { describe, expect, test } from "bun:test";
import { createTranslator, LOCALES } from "@abth/i18n";

import { FAILURE_MESSAGE, failureMessageOf } from "../src/read-failure-message";
import type { ReadFailureKind } from "../src/session-port";

const jst = (time: string) => new Date(`2026-10-23T${time}+09:00`);

describe("failureMessageOf", () => {
  test("says Hiroba's error is its daily maintenance from 05:00 to 07:00 JST", () => {
    expect(failureMessageOf("siteError", jst("05:00:00"))).toBe("failure.siteErrorInMaintenance");
    expect(failureMessageOf("siteError", jst("06:59:59"))).toBe("failure.siteErrorInMaintenance");
  });

  test("says Hiroba answered with an error at any other time", () => {
    expect(failureMessageOf("siteError", jst("04:59:59"))).toBe("failure.siteError");
    expect(failureMessageOf("siteError", jst("07:00:00"))).toBe("failure.siteError");
  });

  test("words every other failure the same in the maintenance hours", () => {
    const others = (Object.keys(FAILURE_MESSAGE) as ReadFailureKind[]).filter(
      (kind) => kind !== "siteError",
    );
    for (const kind of others) {
      expect(failureMessageOf(kind, jst("06:00:00"))).toBe(FAILURE_MESSAGE[kind]);
    }
  });

  test.each([...LOCALES])("names the maintenance hours in %s only in maintenance", (locale) => {
    const { t } = createTranslator(locale);
    expect(t("failure.siteErrorInMaintenance")).toContain("05:00");
    expect(t("failure.siteError")).not.toContain("05:00");
  });
});
