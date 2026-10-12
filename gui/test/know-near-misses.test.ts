import { describe, expect, test } from "bun:test";
import type { CrownState } from "@abth/core";

import { nearMisses } from "../src/know-yourself/near-misses";
import { known } from "./known-fixtures";

// 1000 notes: at most 8 Bad from a full combo, at most 15 OK from a donderful.
const played = (songNo: string, crown: CrownState, ok: number, bad: number) =>
  known({ songNo, crown, hits: { highScore: 900000, good: 1000 - ok - bad, ok, bad } });

describe("nearMisses", () => {
  test("lists cleared charts a few Bad from a full combo, the fewest first", () => {
    const { fullCombo } = nearMisses([
      played("1", "silver", 30, 8),
      played("2", "silver", 30, 2),
      played("3", "silver", 30, 9),
      played("4", "silver", 30, 0),
      played("5", "played", 30, 2),
    ]);

    expect(fullCombo.map(({ chart, left }) => `${chart.songNo}:${left}`)).toEqual(["2:2", "1:8"]);
  });

  test("lists full combos a few OK from a donderful, but not one whose kept play has a Bad", () => {
    const { donderful } = nearMisses([
      played("1", "gold", 15, 0),
      played("2", "gold", 16, 0),
      played("3", "gold", 3, 1),
      played("4", "donderful", 0, 0),
      played("5", "gold", 4, 0),
    ]);

    expect(donderful.map(({ chart, left }) => `${chart.songNo}:${left}`)).toEqual(["5:4", "1:15"]);
  });

  test("lets a short chart miss by one, and skips a chart with no hits read", () => {
    const short = known({ crown: "silver", hits: { highScore: 1, good: 100, ok: 5, bad: 1 } });

    expect(nearMisses([short, known({ hits: null })]).fullCombo).toHaveLength(1);
  });
});
