import { sameCostume } from "@abth/core";

import { myDonPng } from "../../scripts/mock-pictures";
import type { PreviewState } from "../my-page/costume-preview";
import type { CostumeEditorView, CostumeHistoryEntry, CostumeSet } from "../session-port";
import { packData, packKeys, packView } from "./pack";
import { pictureOf } from "./picture-of";
import { STORY_SET } from "./profile";

const SWATCHES = 63;

/** `#RRGGBB` for a hue and lightness at full saturation. */
function hexOf(hue: number, lightness: number): string {
  const chroma = 1 - Math.abs(2 * lightness - 1);
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    const value = lightness - (chroma / 2) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

const moreItems = (from: number, count: number) =>
  Array.from({ length: count }, (_, at) => from + at);

const MADE_UP_ITEMS = [
  [4, 14, 7, 36, 56],
  [59, 21, 60, 61, ...moreItems(200, 34)],
  [68, 21, 70, ...moreItems(300, 40)],
  [37, 21, 38, ...moreItems(400, 12)],
  [126, 140, 143, ...moreItems(500, 8)],
];

/** A slot's items in the resource pack, in number order; none without a pack. */
const packItems = (slot: number): number[] =>
  packKeys(`costumeItem/${slot}/`)
    .map((key) => Number(key.slice(key.lastIndexOf("/") + 1)))
    .sort((a, b) => a - b);

/** The costume editor as Hiroba shows it: the resource pack's, else a palette of 63 made-up
 * colours and each slot's items, the pack's own where it holds a slot's pictures. */
export const STORY_EDITOR: CostumeEditorView = packData("costumeEditor") ?? {
  state: STORY_SET,
  palette: Array.from({ length: SWATCHES }, (_, id) => ({
    id: id + 1,
    hex: hexOf((id * 360) / 21, [0.35, 0.55, 0.75][Math.floor(id / 21)] ?? 0.5),
  })),
  slots: MADE_UP_ITEMS.map((items, at) => {
    const real = packItems(at + 1);
    return real.length > 0 ? real : items;
  }),
};

/** Hiroba's picture of a set: the pack's My Don for the set worn, else as the stand-in draws it. */
export const portraitOf = (set: CostumeSet): string =>
  (sameCostume(set, STORY_EDITOR.state) ? packView("myDon")?.src : undefined) ??
  pictureOf(myDonPng(Object.values(set))).src;

const withParts = (changes: Partial<CostumeSet>): CostumeSet => ({
  ...STORY_EDITOR.state,
  ...changes,
});

/** Sets worn before, newest first; the oldest was kept without its picture. */
export const STORY_HISTORY: readonly CostumeHistoryEntry[] = [
  STORY_EDITOR.state,
  withParts({ colorBody: 30, costume2: 59 }),
  withParts({ colorFace: 44, costume3: 70, costume5: 126 }),
  withParts({ costume1: 14 }),
].map((set, at, sets) => ({ set, picture: at === sets.length - 1 ? null : portraitOf(set) }));

/** The preview of `set`: its picture, and whether a newer one is on its way or failed. */
export const previewOf = (set: CostumeSet, changes: Partial<PreviewState> = {}): PreviewState => ({
  image: portraitOf(set),
  loading: false,
  failure: null,
  ...changes,
});
