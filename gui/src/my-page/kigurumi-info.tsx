import type { Translator } from "@abth/i18n";
import { Alert } from "@mui/material";

import type { CostumeEditorView, CostumeSet } from "../session-port";
import { SLOT_PARTS } from "./costume-parts";

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

  return (
    <Alert id="kigurumi-warning" severity="info">
      {i18n.t("costume.kigurumiWarning")}
    </Alert>
  );
}
