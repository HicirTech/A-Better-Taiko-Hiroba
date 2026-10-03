import { describe, expect, test } from "bun:test";

import { sharesOf } from "../src/my-page/shares";

const counts = (...values: number[]) => values.map((count) => ({ count }));
const percents = (values: number[], locale = "en") =>
  sharesOf(counts(...values), locale).rows.map((row) => row.percent);

describe("sharesOf", () => {
  test("gives each count's share of the block with one decimal", () => {
    const block = sharesOf(counts(3, 12, 25, 31, 18, 9, 4), "en");
    expect(block.total).toBe(102);
    expect(block.rows.map((row) => row.percent)).toEqual([
      "2.9%",
      "11.8%",
      "24.5%",
      "30.4%",
      "17.6%",
      "8.8%",
      "3.9%",
    ]);
    expect(block.rows[0]?.share).toBeCloseTo(3 / 102);
  });

  test("keeps an item at 0 in its place", () => {
    expect(percents([5, 0, 15])).toEqual(["25.0%", "0.0%", "75.0%"]);
  });

  test("gives every item 0 when the block sums to 0", () => {
    const block = sharesOf(counts(0, 0, 0), "en");
    expect(block.total).toBe(0);
    expect(block.rows.map((row) => row.share)).toEqual([0, 0, 0]);
    expect(block.rows.map((row) => row.percent)).toEqual(["0.0%", "0.0%", "0.0%"]);
  });

  test("keeps what each item carries beside its share", () => {
    const [row] = sharesOf([{ id: "crowns-silver", count: 11 }], "en").rows;
    expect(row).toEqual({ id: "crowns-silver", count: 11, share: 1, percent: "100.0%" });
  });

  test("writes the percent as the locale does", () => {
    expect(percents([1, 1], "de")[0]).toMatch(/^50,0\s%$/);
  });
});
