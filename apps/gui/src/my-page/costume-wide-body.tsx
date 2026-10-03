import type { Translator } from "@abth/i18n";
import { Box, Stack } from "@mui/material";
import type { ReactNode } from "react";

import { STAYS_IN_VIEW } from "../navigation/app-frame";
import type { PictureLane } from "../pictures/picture-lane";
import type { CostumeEditorView, CostumeSet } from "../session-port";
import { KigurumiInfo } from "./costume-editing";
import { previewSetOf } from "./costume-editor-state";
import { CostumeItemGrid } from "./costume-item-grid";
import { Palette } from "./costume-palette";
import {
  type ColourPart,
  type CostumePart,
  isSlotPart,
  itemsOf,
  type SlotPart,
} from "./costume-parts";
import { PARTS_PANEL_ID, PartsList, partTabId } from "./costume-parts-list";
import { CostumePreviewBox } from "./costume-preview-box";
import { type EditingTabs, selectedPart, tabsWithPart } from "./costume-tabs";
import type { CostumeEditor } from "./use-costume-editor";
import { WriteOutcomeNotice } from "./write-outcome";

// The side panel leaves a window just past md about 600 px: the picture and the parts shrink first.
const PICTURE_COLUMN_PX = 320;
const MIN_PICTURE_COLUMN_PX = 180;
const PICTURE_HEIGHT_PX = 300;
const PARTS_COLUMN_PX = 200;
const MIN_PARTS_COLUMN_PX = 150;
const GRID_COLUMN_PX = 360;

export interface WideBodyProps {
  readonly editor: CostumeEditor;
  readonly lane: PictureLane;
  readonly i18n: Translator;
  readonly tabs: EditingTabs;
  readonly onTabs: (tabs: EditingTabs) => void;
  /** The buttons under the picture; null while there is no editor to act on. */
  readonly actions: ReactNode;
  /** What stands in place of the parts and their grid while the editor is not at hand. */
  readonly progress: ReactNode;
}

export function WideBody({ editor, lane, i18n, tabs, onTabs, actions, progress }: WideBodyProps) {
  const { step } = editor;
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 3, flexGrow: 1 }}>
      {previewSetOf(step) !== null && (
        <Stack
          id="costume-picture-column"
          spacing={2}
          sx={{
            flex: `0 1 ${PICTURE_COLUMN_PX}px`,
            minWidth: MIN_PICTURE_COLUMN_PX,
            ...STAYS_IN_VIEW,
          }}
        >
          <CostumePreviewBox preview={editor.preview} i18n={i18n} height={PICTURE_HEIGHT_PX} />
          {actions !== null && (
            <Box
              id="costume-actions"
              sx={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 1 }}
            >
              {actions}
            </Box>
          )}
          {step.name === "editing" && (
            <>
              {step.notice !== null && (
                <WriteOutcomeNotice outcome={step.notice} kind="costume" i18n={i18n} />
              )}
              <KigurumiInfo editor={step.editor} draft={step.draft} i18n={i18n} />
            </>
          )}
        </Stack>
      )}
      {step.name === "editing" ? (
        <>
          <Box
            id="costume-parts"
            sx={{ flex: `0 1 ${PARTS_COLUMN_PX}px`, minWidth: MIN_PARTS_COLUMN_PX }}
          >
            <PartsList
              view={step.editor}
              draft={step.draft}
              lane={lane}
              i18n={i18n}
              tabs={tabs}
              onPick={(part) => onTabs(tabsWithPart(tabs, part))}
            />
          </Box>
          <Box
            id={PARTS_PANEL_ID}
            role="tabpanel"
            aria-labelledby={partTabId(selectedPart(tabs))}
            sx={{
              flex: `1 1 ${GRID_COLUMN_PX}px`,
              minWidth: 0,
              alignSelf: "stretch",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <PartGrid
              view={step.editor}
              draft={step.draft}
              lane={lane}
              i18n={i18n}
              part={selectedPart(tabs)}
              onPickColour={editor.pickColour}
              onPickItem={editor.pickItem}
            />
          </Box>
        </>
      ) : (
        <Box sx={{ flex: 1, minWidth: 0 }}>{progress}</Box>
      )}
    </Box>
  );
}

function PartGrid({
  view,
  draft,
  lane,
  i18n,
  part,
  onPickColour,
  onPickItem,
}: {
  view: CostumeEditorView;
  draft: CostumeSet;
  lane: PictureLane;
  i18n: Translator;
  part: CostumePart;
  onPickColour: (part: ColourPart, id: number) => void;
  onPickItem: (part: SlotPart, id: number) => void;
}) {
  if (isSlotPart(part)) {
    return (
      <CostumeItemGrid
        key={part}
        lane={lane}
        i18n={i18n}
        part={part}
        items={itemsOf(view, part)}
        chosen={draft[part]}
        wide
        onPick={(id) => onPickItem(part, id)}
      />
    );
  }

  return (
    <Palette
      editor={view}
      part={part}
      chosen={draft[part]}
      wide
      i18n={i18n}
      onPick={(id) => onPickColour(part, id)}
    />
  );
}
