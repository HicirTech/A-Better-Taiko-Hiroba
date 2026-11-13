import { describe, expect, test } from "bun:test";

import {
  begunAgain,
  shownOf,
  skippedFrom,
  type TipStep,
  type Tour,
} from "../src/ui/tip-tour-state";

const tip = (id: string): TipStep => ({ id, at: [], words: id });
const A = tip("a");
const B = tip("b");
const C = tip("c");
const TOUR: Tour = { tips: [A, B, C], index: 0 };

describe("a tour of tips", () => {
  test("shows the first tip from where it stands", () => {
    expect(shownOf(TOUR, [A, B, C])).toEqual({ step: A, at: 0 });
    expect(shownOf({ ...TOUR, index: 1 }, [A, B, C])).toEqual({ step: B, at: 1 });
  });

  test("passes over a tip seen elsewhere since it began", () => {
    expect(shownOf(TOUR, [B, C])).toEqual({ step: B, at: 1 });
    expect(shownOf({ ...TOUR, index: 1 }, [A, C])).toEqual({ step: C, at: 2 });
  });

  test("shows nothing once every tip it holds is past", () => {
    expect(shownOf({ ...TOUR, index: 3 }, [A, B, C])).toBeNull();
    expect(shownOf({ ...TOUR, index: 2 }, [A, B])).toBeNull();
  });

  test("begins again for a tip it lacks, not for tips gone past", () => {
    expect(begunAgain(TOUR, [B, C])).toBe(false);
    expect(begunAgain(TOUR, [])).toBe(false);
    expect(begunAgain(TOUR, [A, tip("d")])).toBe(true);
  });

  test("skips the tip shown and every one after it", () => {
    expect(skippedFrom(TOUR, 1)).toEqual(["b", "c"]);
  });
});
