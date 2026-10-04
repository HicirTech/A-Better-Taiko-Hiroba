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
