import type { Translator } from "@abth/i18n";
import { Box, Stack } from "@mui/material";
import type { ReactNode } from "react";

import { STAYS_IN_VIEW } from "../navigation/app-frame";
import type { PictureLane } from "../pictures/picture-lane";
import { previewSetOf } from "./costume-editor-state";
import { PartPanel } from "./costume-part-panel";
import { PartTiles } from "./costume-part-tiles";
import type { CostumePart } from "./costume-parts";
import { CostumePreviewBox } from "./costume-preview-box";
import { KigurumiInfo } from "./kigurumi-info";
import { RING_ROOM_PX } from "./pick-ring";
import type { CostumeEditor } from "./use-costume-editor";
import { WriteOutcomeNotice } from "./write-outcome";

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
  return (
    // Not a Stack: it would take the margins from the block below.
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, flexGrow: 1, pb: 2 }}>
      {previewSetOf(step) !== null && (
        <Stack
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
          {step.name === "editing" && (
            <PartTiles
              view={step.editor}
              draft={step.draft}
              lane={lane}
              i18n={i18n}
              shown={part}
              wide={false}
              onPick={onPart}
            />
          )}
        </Stack>
      )}
      {step.name === "editing" ? (
        <>
          {step.notice !== null && (
            <WriteOutcomeNotice outcome={step.notice} kind="costume" i18n={i18n} />
          )}
          <KigurumiInfo editor={step.editor} draft={step.draft} i18n={i18n} />
          <PartPanel
            view={step.editor}
            draft={step.draft}
            lane={lane}
            i18n={i18n}
            part={part}
            wide={false}
            onPickColour={editor.pickColour}
            onPickItem={editor.pickItem}
          />
        </>
      ) : (
        progress
      )}
    </Box>
  );
}
