import { describe, expect, test } from "bun:test";

import { COSTUME_PARTS, type CostumePart } from "../src/my-page/costume-parts";
import {
  type EditingTabs,
  FIRST_TABS,
  selectedPart,
  tabsWithPart,
} from "../src/my-page/costume-tabs";

const ON_ITEMS: EditingTabs = { tab: "items", colourPart: "colorLimb", slotPart: "costume4" };
const STARTS: readonly EditingTabs[] = [FIRST_TABS, ON_ITEMS];

describe("the part the page shows", () => {
  test("is the colour part while the colours show, and the slot part while the items do", () => {
    expect(selectedPart(FIRST_TABS)).toBe("colorFace");
    expect(selectedPart(ON_ITEMS)).toBe("costume4");
  });

  test.each<[part: CostumePart]>(COSTUME_PARTS.map((part) => [part]))(
    "is %s once it is picked, from either group",
    (part) => {
      for (const start of STARTS) {
        expect(selectedPart(tabsWithPart(start, part))).toBe(part);
      }
    },
  );

  test("keeps the other group's part when a colour is picked", () => {
    expect(tabsWithPart(ON_ITEMS, "colorBody")).toEqual({
      tab: "colours",
      colourPart: "colorBody",
      slotPart: "costume4",
    });
  });

  test("keeps the other group's part when a slot is picked", () => {
    expect(tabsWithPart(FIRST_TABS, "costume3")).toEqual({
      tab: "items",
      colourPart: "colorFace",
      slotPart: "costume3",
    });
  });
});
