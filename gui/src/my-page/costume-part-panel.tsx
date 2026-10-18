import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";

import type { PictureLane } from "../pictures/picture-lane";
import type { CostumeEditorView, CostumeSet } from "../session-port";
import { HELD_STILL } from "../ui/editor-parts";
import { SectionTitle } from "../ui/section-title";
import { CostumeItemGrid, ThumbnailsUnavailable } from "./costume-item-grid";
import { Palette } from "./costume-palette";
import { PARTS_PANEL_ID, partTabId } from "./costume-part-tiles";
import {
  type ColourPart,
  type CostumePart,
  isSlotPart,
  itemsOf,
  PART_LABEL,
  type SlotPart,
} from "./costume-parts";

export interface PartHeadProps {
  readonly view: CostumeEditorView;
  readonly lane: PictureLane;
  readonly i18n: Translator;
  readonly part: CostumePart;
}

// A notice under the part's name keeps the titles' gap to the cells.
const NOTICE_UNDER_THE_TITLE = { "& > .MuiAlert-root": { mb: 1 } } as const;

/** What stands over the part's cells: its name, and the words for thumbnails that did not come. */
export function PartHead({ view, lane, i18n, part }: PartHeadProps) {
  return (
    <Box sx={NOTICE_UNDER_THE_TITLE}>
      <SectionTitle>{i18n.t(PART_LABEL[part])}</SectionTitle>
      {isSlotPart(part) && (
        <ThumbnailsUnavailable lane={lane} i18n={i18n} part={part} items={itemsOf(view, part)} />
      )}
    </Box>
  );
}

export interface PartPanelProps {
  readonly view: CostumeEditorView;
  readonly draft: CostumeSet;
  readonly lane: PictureLane;
  readonly i18n: Translator;
  readonly part: CostumePart;
  /** A wide window: larger cells. */
  readonly wide: boolean;
  /** A save is running: nothing here can be picked. */
  readonly held: boolean;
  readonly onPickColour: (part: ColourPart, id: number) => void;
  readonly onPickItem: (part: SlotPart, id: number) => void;
}

/** The part on show: its palette or items, the panel of the tile that picked it. */
export function PartPanel({
  view,
  draft,
  lane,
  i18n,
  part,
  wide,
  held,
  onPickColour,
  onPickItem,
}: PartPanelProps) {
  return (
    <Box
      id={PARTS_PANEL_ID}
      role="tabpanel"
      aria-labelledby={partTabId(part)}
      inert={held}
      sx={held ? HELD_STILL : undefined}
    >
      {isSlotPart(part) ? (
        <CostumeItemGrid
          key={part}
          lane={lane}
          i18n={i18n}
          part={part}
          items={itemsOf(view, part)}
          chosen={draft[part]}
          wide={wide}
          onPick={(id) => onPickItem(part, id)}
        />
      ) : (
        <Palette
          editor={view}
          part={part}
          chosen={draft[part]}
          wide={wide}
          i18n={i18n}
          onPick={(id) => onPickColour(part, id)}
        />
      )}
    </Box>
  );
}
