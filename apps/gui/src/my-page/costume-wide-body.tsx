import type { Translator } from "@abth/i18n";
import { Box, Stack } from "@mui/material";
import type { ReactNode } from "react";

import { STAYS_IN_VIEW } from "../navigation/app-frame";
import type { PictureLane } from "../pictures/picture-lane";
import { KigurumiInfo } from "./costume-editing";
import { previewSetOf } from "./costume-editor-state";
import { PartPanel } from "./costume-part-panel";
import { PartTiles } from "./costume-part-tiles";
import { CostumePreviewBox } from "./costume-preview-box";
import { type EditingTabs, selectedPart, tabsWithPart } from "./costume-tabs";
import type { CostumeEditor } from "./use-costume-editor";
import { WriteOutcomeNotice } from "./write-outcome";

// From the width of a row of five tiles up to a roomier picture.
const SIDE_COLUMN_WIDTH = "clamp(232px, 25%, 280px)";

export interface WideBodyProps {
  readonly editor: CostumeEditor;
  readonly lane: PictureLane;
  readonly i18n: Translator;
  readonly tabs: EditingTabs;
  readonly onTabs: (tabs: EditingTabs) => void;
  /** The buttons under the tiles; null while there is no editor to act on. */
  readonly actions: ReactNode;
  /** What stands in place of the part on show while the editor is not at hand. */
  readonly progress: ReactNode;
}

export function WideBody({ editor, lane, i18n, tabs, onTabs, actions, progress }: WideBodyProps) {
  const { step } = editor;
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 3, flexGrow: 1 }}>
      {previewSetOf(step) !== null && (
        <Stack
          id="costume-aside"
          spacing={2}
          sx={{ flex: `0 0 ${SIDE_COLUMN_WIDTH}`, ...STAYS_IN_VIEW }}
        >
          <CostumePreviewBox preview={editor.preview} i18n={i18n} />
          {step.name === "editing" && (
            <PartTiles
              view={step.editor}
              draft={step.draft}
              lane={lane}
              i18n={i18n}
              shown={selectedPart(tabs)}
              onPick={(part) => onTabs(tabsWithPart(tabs, part))}
            />
          )}
          {actions}
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
        <PartPanel
          view={step.editor}
          draft={step.draft}
          lane={lane}
          i18n={i18n}
          part={selectedPart(tabs)}
          wide
          sx={{ flex: 1, minWidth: 0 }}
          onPickColour={editor.pickColour}
          onPickItem={editor.pickItem}
        />
      ) : (
        <Box sx={{ flex: 1, minWidth: 0 }}>{progress}</Box>
      )}
    </Box>
  );
}
