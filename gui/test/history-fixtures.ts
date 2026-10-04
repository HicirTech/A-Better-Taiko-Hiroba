import type { CostumeHistoryEntry, CostumeSet } from "../src/session-port";

/** A set that is nobody's, with every value different from its neighbours'. */
export const SET: CostumeSet = {
  colorBody: 12,
  colorLimb: 13,
  colorFace: 5,
  costume1: 0,
  costume2: 21,
  costume3: 68,
  costume4: 37,
  costume5: 140,
};

/** `SET` with the face colour `face`: one of as many sets as a test needs. */
export const withFace = (face: number): CostumeSet => ({ ...SET, colorFace: face });

/** A picture a store accepts, different for each `tag`. */
export const pictureOf = (tag: string) => `data:image/png;base64,${btoa(tag)}`;

/** The picture a test gives a set: different for each face colour. */
export const pictureOfSet = (set: CostumeSet) => pictureOf(`face ${set.colorFace}`);

export const entryOf = (face: number, picture: string | null = null): CostumeHistoryEntry => ({
  set: withFace(face),
  picture,
});
