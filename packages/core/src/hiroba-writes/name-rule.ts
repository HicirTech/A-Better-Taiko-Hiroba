import type { RenameEditorReading } from "../hiroba-dom-parser";
import type { NameState } from "../hiroba-models";
import { err, ok, type Result } from "../operation-results";
import type { InvalidTarget } from "./types";

export interface NameBody {
  readonly oldName: string;
  readonly newName: string;
}

export const NAME_FIELDS = {
  empty: "name.empty",
  edge: "name.edge",
  tooLong: "name.tooLong",
  control: "name.control",
  closed: "name.closed",
} as const;

/** The form's `maxlength` on captured pages, for sizing a field; a write checks the form's own. */
export const NAME_FORM_MAX_LENGTH = 10;

/** Whether two names are one: exactly, as both come from the same page, trimmed. */
export function sameName(left: NameState, right: NameState): boolean {
  return left.nickname === right.nickname;
}

const EDGE_WHITE_SPACE = /^\s|\s$/u;
/** Control characters (U+0000 to U+001F, U+007F to U+009F), U+2028, U+2029 and a lone surrogate. */
const UNSENDABLE = /[\p{Cc}\p{Cs}\u{2028}\u{2029}]/u;

/** Refuses what the form would not take or cannot be typed; help-page rules are Hiroba's call. */
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
  // Not trimmed for the player: the interface trims before it builds the target.
  if (EDGE_WHITE_SPACE.test(name)) {
    return NAME_FIELDS.edge;
  }
  if (name.length > editor.maxLength) {
    return NAME_FIELDS.tooLong;
  }
  return UNSENDABLE.test(name) ? NAME_FIELDS.control : null;
}

/** For advice only: the help page's words are Hiroba's; names outside them exist on the site. */
export interface NameAdvice {
  /** The display width: a full-width character counts 2, any other 1. */
  readonly width: number;
  /** A character outside hiragana and ー ～ ！ ？, the characters the help page names. */
  readonly outsideHelpCharset: boolean;
  /** More than five characters, one of them not ASCII: past the help page's five. */
  readonly overFiveCharacters: boolean;
  readonly overTenWide: boolean;
}

/** The marks the help page lists with hiragana: ー, ～, ！ and ？ (full-width). */
const HELP_MARKS: readonly number[] = [0x30fc, 0xff5e, 0xff01, 0xff1f];

const isHelpCharacter = (codePoint: number): boolean =>
  (codePoint >= 0x3041 && codePoint <= 0x3096) ||
  codePoint === 0x309d ||
  codePoint === 0x309e ||
  HELP_MARKS.includes(codePoint);

/** East Asian wide and full-width blocks, approximately; half-width katakana are not among them. */
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
