import type { RenameEditorReading } from "../hiroba-dom-parser";
import type { NameState } from "../hiroba-models";
import { err, ok, type Result } from "../operation-results";
import type { InvalidTarget } from "./types";

/** What both posts carry for a rename: the name as it is now, and the name it is to become. */
export interface NameBody {
  readonly oldName: string;
  readonly newName: string;
}

/**
 * The `field` of a refused name, a code the interface words:
 *
 * - `empty`: no name;
 * - `edge`: it starts or ends with white space, of any kind;
 * - `tooLong`: longer than the `maxlength` the form carries;
 * - `control`: it holds a control character, a line or paragraph separator, or half of a
 *   surrogate pair, none of which can be typed into the form;
 * - `closed`: the page says Hiroba is not taking a rename (its flag), and the site then posts
 *   nothing.
 */
export const NAME_FIELDS = {
  empty: "name.empty",
  edge: "name.edge",
  tooLong: "name.tooLong",
  control: "name.control",
  closed: "name.closed",
} as const;

/**
 * The length of name the form took on every page captured, a browser's count of UTF-16 code units.
 * The window sizes its field by it; what refuses a name is the form's own, read when a write is
 * made.
 */
export const NAME_FORM_MAX_LENGTH = 10;

/** Whether two names are one: exactly, as both come from the same page, trimmed. */
export function sameName(left: NameState, right: NameState): boolean {
  return left.nickname === right.nickname;
}

const EDGE_WHITE_SPACE = /^\s|\s$/u;
/** Control characters (U+0000 to U+001F, U+007F to U+009F), U+2028, U+2029 and a lone surrogate. */
const UNSENDABLE = /[\p{Cc}\p{Cs}\u{2028}\u{2029}]/u;

/**
 * A name checked before anything is sent. Only what the form itself would not take, or a name
 * that cannot be typed, is refused here; what Hiroba's help page says of a name (hiragana and
 * ー ～ ！ ？, five characters) and what its filter makes of one are its to judge, and
 * `describeName` only advises of the first. Refused, naming the field, in this order: a closed
 * rename, an empty name, white space at either end, a name longer than the form takes, and a
 * character that cannot be sent.
 *
 * The app does not trim for the player: a name with white space at its ends is refused, and the
 * interface trims the field before it builds the target.
 */
export function checkNameTarget(
  editor: Pick<RenameEditorReading, "state" | "maxLength" | "rename">,
  target: NameState,
): Result<NameBody, InvalidTarget> {
  const name = target.nickname;
  const field = refusedField(name, editor);
  return field === null ? ok({ oldName: editor.state.nickname, newName: name }) : err({ field });
}

function refusedField(
  name: string,
  editor: Pick<RenameEditorReading, "maxLength" | "rename">,
): string | null {
  if (editor.rename === "closed") {
    return NAME_FIELDS.closed;
  }
  if (name === "") {
    return NAME_FIELDS.empty;
  }
  if (EDGE_WHITE_SPACE.test(name)) {
    return NAME_FIELDS.edge;
  }
  if (name.length > editor.maxLength) {
    return NAME_FIELDS.tooLong;
  }
  return UNSENDABLE.test(name) ? NAME_FIELDS.control : null;
}

/**
 * What the help page says a name may be, and how wide a name is, for the interface to advise with.
 * None of it refuses anything: the page's words are Hiroba's, and names outside them are on the
 * site (Latin and kanji names among those captured), so nothing here claims Hiroba will refuse one.
 */
export interface NameAdvice {
  /** The display width: a full-width character counts 2, any other 1. */
  readonly width: number;
  /** A character outside hiragana and ー ～ ！ ？, the characters the help page names. */
  readonly outsideHelpCharset: boolean;
  /** More than five characters, one of them not ASCII: past the help page's five. */
  readonly overFiveCharacters: boolean;
  /** Wider than ten: no name on the captured pages is, and many are exactly ten. */
  readonly overTenWide: boolean;
}

/** The marks the help page lists with hiragana: ー, ～, ！ and ？ (full-width). */
const HELP_MARKS: readonly number[] = [0x30fc, 0xff5e, 0xff01, 0xff1f];

const isHelpCharacter = (codePoint: number): boolean =>
  (codePoint >= 0x3041 && codePoint <= 0x3096) ||
  codePoint === 0x309d ||
  codePoint === 0x309e ||
  HELP_MARKS.includes(codePoint);

/**
 * East Asian wide and full-width characters, as the blocks that hold them: an approximation, enough
 * to advise by. The half-width katakana (U+FF61 to U+FF9F) are not among them.
 */
const WIDE_BLOCKS: readonly (readonly [first: number, last: number])[] = [
  [0x1100, 0x115f],
  [0x2e80, 0x303e],
  [0x3041, 0x33ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xa000, 0xa4cf],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe30, 0xfe6f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
  [0x1f300, 0x1f64f],
  [0x1f900, 0x1f9ff],
  [0x20000, 0x3fffd],
];

const widthOf = (codePoint: number): number =>
  WIDE_BLOCKS.some(([first, last]) => codePoint >= first && codePoint <= last) ? 2 : 1;

/** The help page's rules and the display width, read off a name, for advice and nothing else. */
export function describeName(name: string): NameAdvice {
  const codePoints = Array.from(name, (character) => character.codePointAt(0) ?? 0);
  const width = codePoints.reduce((sum, codePoint) => sum + widthOf(codePoint), 0);
  return {
    width,
    outsideHelpCharset: !codePoints.every(isHelpCharacter),
    overFiveCharacters: codePoints.length > 5 && codePoints.some((codePoint) => codePoint > 0x7f),
    overTenWide: width > 10,
  };
}
