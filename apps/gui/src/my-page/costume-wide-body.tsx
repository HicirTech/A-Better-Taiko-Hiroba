import type { Translator } from "@abth/i18n";
import { Box, Stack } from "@mui/material";
import type { ReactNode } from "react";

import { STAYS_IN_VIEW } from "../navigation/app-frame";
import type { PictureLane } from "../pictures/picture-lane";
import { previewSetOf, showsEditor } from "./costume-editor-state";
import { CostumeNotes } from "./costume-notes";
import { PartPanel } from "./costume-part-panel";
import { PartTiles } from "./costume-part-tiles";
import type { CostumePart } from "./costume-parts";
import { CostumePreviewBox } from "./costume-preview-box";
import type { CostumeEditor } from "./use-costume-editor";

// From the width of a row of five tiles up to a roomier picture.
const SIDE_COLUMN_WIDTH = "clamp(232px, 25%, 280px)";

export interface WideBodyProps {
  readonly editor: CostumeEditor;
  readonly lane: PictureLane;
  readonly i18n: Translator;
  /** The part on show. */
  readonly part: CostumePart;
  readonly onPart: (part: CostumePart) => void;
  /** The buttons under the tiles, or a save's progress; null while there is no editor to act on. */
  readonly actions: ReactNode;
  /** What stands in place of the part on show while the editor is not at hand. */
  readonly progress: ReactNode;
}

export function WideBody({ editor, lane, i18n, part, onPart, actions, progress }: WideBodyProps) {
  const { step } = editor;
  const saving = step.name === "saving";
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 3, flexGrow: 1 }}>
      {previewSetOf(step) !== null && (
        <Stack
          id="costume-aside"
          spacing={2}
          sx={{ flex: `0 0 ${SIDE_COLUMN_WIDTH}`, ...STAYS_IN_VIEW }}
        >
          <CostumePreviewBox preview={editor.preview} i18n={i18n} />
          {showsEditor(step) && (
            <PartTiles
              view={step.editor}
              draft={step.draft}
              lane={lane}
              i18n={i18n}
              shown={part}
              wide
              held={saving}
              onPick={onPart}
            />
          )}
          {actions}
        </Stack>
      )}
      <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
        {showsEditor(step) ? (
          <>
            <CostumeNotes step={step} preview={editor.preview} i18n={i18n} />
            <PartPanel
              view={step.editor}
              draft={step.draft}
              lane={lane}
              i18n={i18n}
              part={part}
              wide
              held={saving}
              onPickColour={editor.pickColour}
              onPickItem={editor.pickItem}
            />
          </>
        ) : (
          progress
        )}
      </Stack>
    </Box>
  );
}
