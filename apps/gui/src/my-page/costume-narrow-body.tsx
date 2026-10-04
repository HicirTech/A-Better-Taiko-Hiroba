import type { Translator } from "@abth/i18n";
import { Box, Stack } from "@mui/material";
import type { ReactNode } from "react";

import { STAYS_IN_VIEW } from "../navigation/app-frame";
import type { PictureLane } from "../pictures/picture-lane";
import { previewSetOf, showsEditor } from "./costume-editor-state";
import { CostumeNotes } from "./costume-notes";
import { PartHead, PartPanel } from "./costume-part-panel";
import { PartTiles } from "./costume-part-tiles";
import type { CostumePart } from "./costume-parts";
import { CostumePreviewBox } from "./costume-preview-box";
import { RING_ROOM_PX } from "./pick-ring";
import { BLOCK_REF } from "./stuck-clearance";
import type { CostumeEditor } from "./use-costume-editor";

const PREVIEW_PX = 160;
// The ring's room and a pixel for its soft edge.
const RING_BLEED_PX = RING_ROOM_PX + 1;

export interface NarrowBodyProps {
  readonly editor: CostumeEditor;
  readonly lane: PictureLane;
  readonly i18n: Translator;
  /** The part on show. */
  readonly part: CostumePart;
  readonly onPart: (part: CostumePart) => void;
  /** What stands in place of the part on show while the editor is not at hand. */
  readonly progress: ReactNode;
}

export function NarrowBody({ editor, lane, i18n, part, onPart, progress }: NarrowBodyProps) {
  const { step } = editor;
  const saving = step.name === "saving";
  return (
    // Not a Stack: it would take the margins from the block below.
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, flexGrow: 1, pb: 2 }}>
      {previewSetOf(step) !== null && (
        <Stack
          ref={BLOCK_REF}
          id="costume-aside"
          spacing={1.5}
          // It covers the cells that scroll beneath it, and the rings drawn outside them.
          sx={{
            ...STAYS_IN_VIEW,
            zIndex: 1,
            bgcolor: "background.default",
            mx: `-${RING_BLEED_PX}px`,
            px: `${RING_BLEED_PX}px`,
            pb: 1,
          }}
        >
          <CostumePreviewBox preview={editor.preview} i18n={i18n} size={PREVIEW_PX} />
          {showsEditor(step) && (
            <PartTiles
              view={step.editor}
              draft={step.draft}
              lane={lane}
              i18n={i18n}
              shown={part}
              wide={false}
              held={saving}
              onPick={onPart}
            />
          )}
        </Stack>
      )}
      {showsEditor(step) ? (
        <>
          <CostumeNotes step={step} preview={editor.preview} i18n={i18n} />
          <Box>
            <PartHead view={step.editor} lane={lane} i18n={i18n} part={part} />
            <PartPanel
              view={step.editor}
              draft={step.draft}
              lane={lane}
              i18n={i18n}
              part={part}
              wide={false}
              held={saving}
              onPickColour={editor.pickColour}
              onPickItem={editor.pickItem}
            />
          </Box>
        </>
      ) : (
        progress
      )}
    </Box>
  );
}
