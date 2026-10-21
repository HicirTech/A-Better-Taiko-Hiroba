import type { Translator } from "@abth/i18n";
import { Box, Skeleton, Stack } from "@mui/material";
import type { ReactNode } from "react";

import { STAYS_IN_VIEW } from "../navigation/app-frame";
import type { PictureLane } from "../pictures/picture-lane";
import { SectionTitleSkeleton } from "../ui/section-title";
import { previewSetOf, shownEditorOf, showsEditor } from "./costume-editor-state";
import { CostumeNotes } from "./costume-notes";
import { PaletteSkeleton } from "./costume-palette";
import { PartHead, PartPanel } from "./costume-part-panel";
import { PartTiles, PartTilesSkeleton } from "./costume-part-tiles";
import type { CostumePart } from "./costume-parts";
import { CostumePreviewBox } from "./costume-preview-box";
import type { CostumeEditor } from "./use-costume-editor";

// From the width of a row of five tiles up to a roomier picture.
const SIDE_COLUMN_WIDTH = "clamp(232px, 25%, 280px)";
// Whatever stands above the part's cells, the side column starts in the cells' row.
const AREAS_WITH_ASIDE = '". above" "aside part"';
const AREAS_WITHOUT_ASIDE = '"above" "part"';
const bodyGrid = (withAside: boolean) =>
  ({
    display: "grid",
    gridTemplateColumns: withAside ? `${SIDE_COLUMN_WIDTH} minmax(0, 1fr)` : "minmax(0, 1fr)",
    gridTemplateAreas: withAside ? AREAS_WITH_ASIDE : AREAS_WITHOUT_ASIDE,
    alignItems: "start",
    // Rows as tall as what they hold: a page taller than the grid keeps the room under it.
    alignContent: "start",
    columnGap: 3,
    flexGrow: 1,
  }) as const;
const ASIDE = { gridArea: "aside", ...STAYS_IN_VIEW } as const;
const ABOVE = { gridArea: "above", minWidth: 0 } as const;
const PART = { gridArea: "part", minWidth: 0 } as const;

export interface WideBodyProps {
  readonly editor: CostumeEditor;
  readonly lane: PictureLane;
  readonly i18n: Translator;
  /** The part on show. */
  readonly part: CostumePart;
  readonly onPart: (part: CostumePart) => void;
  /** What stands in place of the part on show while the editor is not at hand. */
  readonly progress: ReactNode;
}

export function WideBody({ editor, lane, i18n, part, onPart, progress }: WideBodyProps) {
  const { step } = editor;
  const shown = shownEditorOf(step);
  const withAside = previewSetOf(step) !== null;
  return (
    <Box sx={bodyGrid(withAside)}>
      {withAside && (
        <Stack id="costume-aside" spacing={2} sx={ASIDE}>
          <CostumePreviewBox preview={editor.preview} i18n={i18n} />
          {shown !== null && (
            <PartTiles
              view={shown.editor}
              draft={shown.draft}
              lane={lane}
              i18n={i18n}
              shown={part}
              wide
              held={shown.shut}
              onPick={onPart}
            />
          )}
        </Stack>
      )}
      {shown !== null && (
        <Stack spacing={2} sx={ABOVE}>
          {showsEditor(step) && <CostumeNotes step={step} preview={editor.preview} i18n={i18n} />}
          <PartHead view={shown.editor} lane={lane} i18n={i18n} part={part} />
        </Stack>
      )}
      <Box sx={PART}>
        {shown !== null ? (
          <PartPanel
            view={shown.editor}
            draft={shown.draft}
            lane={lane}
            i18n={i18n}
            part={part}
            wide
            held={shown.shut}
            onPickColour={editor.pickColour}
            onPickItem={editor.pickItem}
          />
        ) : (
          progress
        )}
      </Box>
    </Box>
  );
}

const ART = { width: 1, height: "auto", aspectRatio: "1" } as const;

/** The two columns' shape while the page's first read runs. */
export function WideBodySkeleton() {
  return (
    <Box aria-hidden sx={bodyGrid(true)}>
      <Stack spacing={2} sx={ASIDE}>
        <Skeleton variant="rounded" sx={ART} />
        <PartTilesSkeleton wide />
      </Stack>
      <Box sx={ABOVE}>
        <SectionTitleSkeleton width={72} />
      </Box>
      <Box sx={PART}>
        <PaletteSkeleton wide />
      </Box>
    </Box>
  );
}
