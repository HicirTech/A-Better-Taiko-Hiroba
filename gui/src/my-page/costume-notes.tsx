import type { Translator } from "@abth/i18n";

import type { ShownStep } from "./costume-editor-state";
import type { PreviewState } from "./costume-preview";
import { PreviewFailure } from "./costume-preview-box";
import { KigurumiInfo } from "./kigurumi-info";

export interface CostumeNotesProps {
  readonly step: ShownStep;
  readonly preview: PreviewState;
  readonly i18n: Translator;
}

/** What the page says about the set above the part on show. */
export function CostumeNotes({ step, preview, i18n }: CostumeNotesProps) {
  return (
    <>
      <PreviewFailure preview={preview} i18n={i18n} />
      <KigurumiInfo editor={step.editor} draft={step.draft} i18n={i18n} />
    </>
  );
}
