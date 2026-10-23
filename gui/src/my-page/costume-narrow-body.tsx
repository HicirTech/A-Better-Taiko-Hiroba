import type { Translator } from "@abth/i18n";
import { Box, Skeleton, Stack } from "@mui/material";
import type { ReactNode } from "react";

import { BELOW_TOP_BAND, STAYS_IN_VIEW, WHEN_TALL } from "../navigation/app-frame";
import type { PictureLane } from "../pictures/picture-lane";
import { SectionTitleSkeleton } from "../ui/section-title";
import { previewSetOf, shownEditorOf, showsEditor } from "./costume-editor-state";
import { CostumeNotes } from "./costume-notes";
import { PaletteSkeleton } from "./costume-palette";
import { PartHead, PartPanel } from "./costume-part-panel";
import { PartTiles, PartTilesSkeleton } from "./costume-part-tiles";
import type { CostumePart } from "./costume-parts";
import { CostumePreviewBox } from "./costume-preview-box";
import { RING_ROOM_PX } from "./pick-ring";
import { BLOCK_REF } from "./stuck-clearance";
import type { CostumeEditor } from "./use-costume-editor";

const PREVIEW_PX = 160;
// The ring's room and a pixel for its soft edge.
const RING_BLEED_PX = RING_ROOM_PX + 1;
// Page-coloured, so cells scroll out of sight at the window's top edge, not below the band.
const COVERS_THE_TOP_BAND = {
  [WHEN_TALL]: {
    "&::before": {
      content: '""',
      position: "absolute",
      bottom: "100%",
      left: 0,
      right: 0,
      height: BELOW_TOP_BAND,
      bgcolor: "background.default",
    },
  },
} as const;

// Not a Stack: it would take the margins from the block below.
const BODY = { display: "flex", flexDirection: "column", flexGrow: 1, pb: 2 } as const;

export interface NarrowBodyProps {
  readonly editor: CostumeEditor;
  readonly lane: PictureLane;
  readonly i18n: Translator;
  /** The part on show. */
  readonly part: CostumePart;
  readonly onPart: (part: CostumePart) => void;
  /** What stands in place of the part on show while the editor is not at hand. */
  readonly failure: ReactNode;
}

export function NarrowBody({ editor, lane, i18n, part, onPart, failure }: NarrowBodyProps) {
  const { step } = editor;
  const shown = shownEditorOf(step);
  return (
    <Box sx={BODY}>
      {previewSetOf(step) !== null && (
        <Stack
          ref={BLOCK_REF}
          id="costume-aside"
          spacing={1.5}
          // It covers the cells that scroll beneath it and the rings drawn outside them. Its
          // bottom padding is the gap to the part, so the cells go that far below the tiles.
          sx={[
            STAYS_IN_VIEW,
            COVERS_THE_TOP_BAND,
            {
              zIndex: 1,
              bgcolor: "background.default",
              mx: `-${RING_BLEED_PX}px`,
              px: `${RING_BLEED_PX}px`,
              pb: 3,
            },
          ]}
        >
          <CostumePreviewBox preview={editor.preview} i18n={i18n} size={PREVIEW_PX} />
          {shown !== null && (
            <PartTiles
              view={shown.editor}
              draft={shown.draft}
              lane={lane}
              i18n={i18n}
              shown={part}
              wide={false}
              held={shown.shut}
              onPick={onPart}
            />
          )}
        </Stack>
      )}
      {shown !== null ? (
        <Stack spacing={2}>
          {failure}
          {showsEditor(step) && <CostumeNotes step={step} preview={editor.preview} i18n={i18n} />}
          <Box>
            <PartHead view={shown.editor} lane={lane} i18n={i18n} part={part} />
            <PartPanel
              view={shown.editor}
              draft={shown.draft}
              lane={lane}
              i18n={i18n}
              part={part}
              wide={false}
              held={shown.shut}
              onPickColour={editor.pickColour}
              onPickItem={editor.pickItem}
            />
          </Box>
        </Stack>
      ) : (
        failure
      )}
    </Box>
  );
}

/** The column's shape while the page's first read runs: the preview, the tiles and a palette. */
export function NarrowBodySkeleton() {
  return (
    <Box aria-hidden sx={BODY}>
      <Stack spacing={1.5} sx={{ pb: 3 }}>
        <Skeleton
          variant="rounded"
          width={PREVIEW_PX}
          height={PREVIEW_PX}
          sx={{ maxWidth: 1, alignSelf: "center" }}
        />
        <PartTilesSkeleton wide={false} />
      </Stack>
      <SectionTitleSkeleton width={72} />
      <PaletteSkeleton wide={false} />
    </Box>
  );
}
