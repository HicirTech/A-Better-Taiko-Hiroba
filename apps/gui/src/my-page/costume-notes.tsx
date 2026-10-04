import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";
import { type ReactNode, useEffect, useRef } from "react";

import type { ShownStep } from "./costume-editor-state";
import type { PreviewState } from "./costume-preview";
import { PreviewFailure } from "./costume-preview-box";
import { KigurumiInfo } from "./kigurumi-info";
import { CLEAR_OF_STUCK } from "./stuck-clearance";
import { WriteOutcomeNotice } from "./write-outcome";

export interface CostumeNotesProps {
  readonly step: ShownStep;
  readonly preview: PreviewState;
  readonly i18n: Translator;
}

/** What the page says about the set above the part on show: a write's ending, then the rest. */
export function CostumeNotes({ step, preview, i18n }: CostumeNotesProps) {
  return (
    <>
      {step.name === "editing" && step.notice !== null && (
        <ScrolledIntoView>
          <WriteOutcomeNotice outcome={step.notice} kind="costume" i18n={i18n} />
        </ScrolledIntoView>
      )}
      <PreviewFailure preview={preview} i18n={i18n} />
      <KigurumiInfo editor={step.editor} draft={step.draft} i18n={i18n} />
    </>
  );
}

/** Brings its content into view as it appears: the page may be scrolled far from it. */
function ScrolledIntoView({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.scrollIntoView({ block: "nearest" });
  }, []);
  return (
    <Box ref={box} sx={CLEAR_OF_STUCK}>
      {children}
    </Box>
  );
}
