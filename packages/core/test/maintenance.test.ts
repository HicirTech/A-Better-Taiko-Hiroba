/** Hiroba's daily break, 05:00 to 07:00 JST, at its edges. */
import { describe, expect, test } from "bun:test";

import { inMaintenance } from "../src/index";

/** A moment given in JST, as UTC. */
const jst = (time: string) => new Date(`2026-09-27T${time}+09:00`);

describe("inMaintenance", () => {
  test("starts at 05:00 JST and ends before 07:00 JST", () => {
    expect(inMaintenance(jst("04:59:59"))).toBe(false);
    expect(inMaintenance(jst("05:00:00"))).toBe(true);
    expect(inMaintenance(jst("06:59:59"))).toBe(true);
    expect(inMaintenance(jst("07:00:00"))).toBe(false);
  });

  test("goes by JST whatever day it is in UTC", () => {
    expect(inMaintenance(new Date("2026-09-26T20:30:00Z"))).toBe(true);
    expect(inMaintenance(new Date("2026-09-26T19:59:59Z"))).toBe(false);
    expect(inMaintenance(new Date("2026-09-27T12:00:00Z"))).toBe(false);
  });
});
