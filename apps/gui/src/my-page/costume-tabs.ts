import { type ColourPart, type CostumePart, isSlotPart, type SlotPart } from "./costume-parts";

/** The part each group last showed, and the group on show; the one selection of the page. */
export interface EditingTabs {
  readonly tab: "colours" | "items";
  readonly colourPart: ColourPart;
  readonly slotPart: SlotPart;
}

export const FIRST_TABS: EditingTabs = {
  tab: "colours",
  colourPart: "colorFace",
  slotPart: "costume1",
};

export function selectedPart(tabs: EditingTabs): CostumePart {
  return tabs.tab === "colours" ? tabs.colourPart : tabs.slotPart;
}

/** `tabs` once `part` is picked: its group on show, and the other group's part kept. */
export function tabsWithPart(tabs: EditingTabs, part: CostumePart): EditingTabs {
  return isSlotPart(part)
    ? { ...tabs, tab: "items", slotPart: part }
    : { ...tabs, tab: "colours", colourPart: part };
}
