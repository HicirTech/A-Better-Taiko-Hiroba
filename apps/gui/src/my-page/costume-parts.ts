import type { MessageKey, Translator } from "@abth/i18n";

import type { CostumeSet, CostumeSlot } from "../session-port";

/** The three colours, in the order the site's tabs give them: かお, どう, てあし. */
export const COLOUR_PARTS = ["colorFace", "colorBody", "colorLimb"] as const;
/** The five slots, きぐるみ first: slot N is SLOT_PARTS[N - 1]. */
export const SLOT_PARTS = ["costume1", "costume2", "costume3", "costume4", "costume5"] as const;
/** Every value of the set, in the order the editor shows and lists them. */
export const COSTUME_PARTS = [...COLOUR_PARTS, ...SLOT_PARTS] as const;

export type ColourPart = (typeof COLOUR_PARTS)[number];
export type SlotPart = (typeof SLOT_PARTS)[number];
export type CostumePart = keyof CostumeSet;

/** Each value's name, the site's own tab label. */
export const PART_LABEL = {
  colorFace: "costume.part.colorFace",
  colorBody: "costume.part.colorBody",
  colorLimb: "costume.part.colorLimb",
  costume1: "costume.part.costume1",
  costume2: "costume.part.costume2",
  costume3: "costume.part.costume3",
  costume4: "costume.part.costume4",
  costume5: "costume.part.costume5",
} as const satisfies Record<CostumePart, MessageKey>;

export function isCostumePart(field: string): field is CostumePart {
  return Object.hasOwn(PART_LABEL, field);
}

/** The slot a piece is in, as Hiroba numbers it: 1 for the きぐるみ to 5 for the ぷちキャラ. */
export function slotOf(part: SlotPart): CostumeSlot {
  return (SLOT_PARTS.indexOf(part) + 1) as CostumeSlot;
}

/** A value as the editor names it: its number, or はずす for an empty slot. */
export function partValue(part: CostumePart, value: number, { t }: Translator): string {
  return (SLOT_PARTS as readonly string[]).includes(part) && value === 0
    ? t("costume.remove")
    : t("costume.id", { id: value });
}

/** The values two sets hold differently, in the editor's order. */
export function changedParts(from: CostumeSet, to: CostumeSet): CostumePart[] {
  return COSTUME_PARTS.filter((part) => from[part] !== to[part]);
}
