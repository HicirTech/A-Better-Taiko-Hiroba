import { describe, expect, test } from "bun:test";

import { type Chart, sameChartKey } from "../src/index";

describe("sameChartKey", () => {
  type PairCase = [chart: Chart, key: string];

  test.each<PairCase>([
    [{ songNo: "1257", level: 4 }, "450/4"],
    [{ songNo: "450", level: 4 }, "450/4"],
    [{ songNo: "1265", level: 5 }, "433/5"],
    [{ songNo: "1257", level: 5 }, "1257/5"],
    [{ songNo: "1", level: 4 }, "1/4"],
  ])("names %p by %p", (chart, key) => {
    expect(sameChartKey(chart)).toBe(key);
  });
});
