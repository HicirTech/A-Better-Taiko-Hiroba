/** What each verb of the port accepts from the interface, as it arrives over IPC. */
import { describe, expect, test } from "bun:test";

import { PORT_ARGUMENTS } from "../src/session-port";

describe("PORT_ARGUMENTS", () => {
  test("a verb that takes nothing accepts no arguments, and refuses any", () => {
    for (const check of Object.values(PORT_ARGUMENTS)) {
      expect(check([])).toBe(true);
      expect(check([undefined])).toBe(false);
      expect(check([{ url: "https://example.test/" }])).toBe(false);
    }
  });
});
