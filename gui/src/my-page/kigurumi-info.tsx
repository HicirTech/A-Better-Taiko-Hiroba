import type { Translator } from "@abth/i18n";
import { SLOT_PARTS } from "../shared/costume-parts";
import type { CostumeEditorView, CostumeSet } from "../shared/session-port";
import { NoteAlert } from "../ui/note-alert";

export function KigurumiInfo({
  editor,
  draft,
  i18n,
}: {
  editor: CostumeEditorView;
  draft: CostumeSet;
  i18n: Translator;
}) {
  if (draft.costume1 === 0 || !SLOT_PARTS.slice(1).some((part) => editor.state[part] !== 0)) {
    return null;
  }

  return <NoteAlert id="kigurumi-warning">{i18n.t("costume.kigurumiWarning")}</NoteAlert>;
}
