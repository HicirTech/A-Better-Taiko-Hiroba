import { isSongNo, NAME_FORM_MAX_LENGTH } from "@abth/core";

/** The most songs a gift holds: a play's songs. */
export const GIFT_SONG_LIMIT = 4;
/** A gift's title at its longest, which keeps its code coarse enough to read once compressed. */
export const GIFT_TITLE_MAX_LENGTH = 20;

/** Songs one player gives another, as a gift's QR code carries them. */
export interface Gift {
  /** One to four song numbers, none twice. */
  readonly songs: readonly string[];
  /** The giver's nickname. */
  readonly giver: string;
  readonly title: string;
  /** When it was made, in milliseconds since the epoch, to the second. */
  readonly madeAt: number;
  /** Whether the receiver sees the songs before accepting; a mystery gift hides them. */
  readonly shown: boolean;
}

/** What a scanned code holds: a gift, or something this app does not know. */
export type ScannedCode =
  | { readonly kind: "gift"; readonly gift: Gift }
  | { readonly kind: "unknown" };

const GIFT = "gift";
const VERSION = 1;
const UNKNOWN: ScannedCode = { kind: "unknown" };

/** The text a gift's QR code holds: no taiko number, only what the receiver is shown. */
export function giftCode(gift: Gift): string {
  return JSON.stringify({
    abth: GIFT,
    v: VERSION,
    s: gift.songs.map(Number),
    g: gift.giver,
    n: gift.title,
    t: Math.floor(gift.madeAt / 1000),
    h: gift.shown,
  });
}

/** What a scanned code's text holds. */
export function scannedCodeOf(text: string): ScannedCode {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return UNKNOWN;
  }
  const gift = giftOf(value);
  return gift === null ? UNKNOWN : { kind: "gift", gift };
}

function giftOf(value: unknown): Gift | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const { abth, v, s, g, n, t, h } = value as Record<string, unknown>;
  if (abth !== GIFT || v !== VERSION || !Array.isArray(s) || !s.every(Number.isSafeInteger)) {
    return null;
  }
  const songs = s.map(String);
  return songs.length > 0 &&
    songs.length <= GIFT_SONG_LIMIT &&
    songs.every(isSongNo) &&
    new Set(songs).size === songs.length &&
    typeof g === "string" &&
    g.trim() !== "" &&
    g.length <= NAME_FORM_MAX_LENGTH &&
    typeof n === "string" &&
    n.length <= GIFT_TITLE_MAX_LENGTH &&
    Number.isSafeInteger(t) &&
    (t as number) > 0 &&
    typeof h === "boolean"
    ? { songs, giver: g, title: n, madeAt: (t as number) * 1000, shown: h }
    : null;
}
