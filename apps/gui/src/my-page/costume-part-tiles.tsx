import type { Translator } from "@abth/i18n";
import { Box, Tab, type TabProps, Tabs, Tooltip, Typography } from "@mui/material";
import { useRef } from "react";

import type { PictureLane } from "../pictures/picture-lane";
import { IN_THE_WINDOW, usePicture } from "../pictures/use-picture";
import type { CostumeEditorView, CostumeSet } from "../session-port";
import { ItemPicture } from "./costume-item-grid";
import {
  COLOUR_PARTS,
  type CostumePart,
  isSlotPart,
  PART_LABEL,
  SLOT_PARTS,
  type SlotPart,
  slotOf,
  tileName,
} from "./costume-parts";
import { pickRing } from "./pick-ring";

export const PARTS_PANEL_ID = "costume-grid";
export const partTabId = (part: CostumePart) => `costume-part-${part}`;

const TILE_GAP_PX = 6;
const GROUP_GAP_PX = 12;
// pickRing draws a 3px line 2px off the tile, and the tab list clips whatever lies outside it.
const RING_ROOM_PX = 5;
const TILE = {
  width: 1,
  minWidth: 0,
  maxWidth: "none",
  minHeight: 0,
  aspectRatio: "1",
  p: 0,
  borderRadius: 0.5,
} as const;
const TAB_LIST = {
  display: "grid",
  gridTemplateColumns: `repeat(${SLOT_PARTS.length}, minmax(0, 1fr))`,
  gap: `${TILE_GAP_PX}px`,
  p: `${RING_ROOM_PX}px`,
} as const;

export interface PartTilesProps {
  readonly view: CostumeEditorView;
  readonly draft: CostumeSet;
  readonly lane: PictureLane;
  readonly i18n: Translator;
  /** The part whose grid is on show. */
  readonly shown: CostumePart;
  readonly onPick: (part: CostumePart) => void;
}

/** The eight parts as tiles that hold the draft's pick, the colours and the costume apart. */
export function PartTiles(props: PartTilesProps) {
  const { t } = props.i18n;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: `${GROUP_GAP_PX}px` }}>
      <TileGroup id="colours" caption={t("costume.tab.colours")} parts={COLOUR_PARTS} {...props} />
      <TileGroup id="items" caption={t("costume.tab.items")} parts={SLOT_PARTS} {...props} />
    </Box>
  );
}

// A tab list of its own for each caption: a caption inside one would break its tab semantics.
function TileGroup({
  id,
  caption,
  parts,
  view,
  draft,
  lane,
  i18n,
  shown,
  onPick,
}: PartTilesProps & { id: string; caption: string; parts: readonly CostumePart[] }) {
  const captionId = `costume-group-${id}`;
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        id={captionId}
        component="h2"
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mb: 0.5 }}
      >
        {caption}
      </Typography>
      <Tabs
        aria-labelledby={captionId}
        value={parts.includes(shown) ? shown : false}
        onChange={(_event, part: CostumePart) => onPick(part)}
        slotProps={{ indicator: { sx: { display: "none" } }, list: { sx: TAB_LIST } }}
        sx={{ minHeight: 0, m: `-${RING_ROOM_PX}px` }}
      >
        {parts.map((part) => (
          <PartTile
            key={part}
            value={part}
            part={part}
            pick={draft[part]}
            view={view}
            lane={lane}
            i18n={i18n}
            shown={shown}
          />
        ))}
      </Tabs>
    </Box>
  );
}

// Tabs hands each child the props of a Tab, so this passes the rest on to the one it wraps.
function PartTile({
  part,
  pick,
  view,
  lane,
  i18n,
  shown,
  ...tab
}: TabProps & {
  part: CostumePart;
  pick: number;
  view: CostumeEditorView;
  lane: PictureLane;
  i18n: Translator;
  shown: CostumePart;
}) {
  return (
    <Tooltip title={i18n.t(PART_LABEL[part])}>
      <Tab
        {...tab}
        id={partTabId(part)}
        aria-label={tileName(part, pick, i18n)}
        aria-controls={part === shown ? PARTS_PANEL_ID : undefined}
        label={
          isSlotPart(part) && pick !== 0 ? (
            <SlotPicture part={part} item={pick} lane={lane} />
          ) : undefined
        }
        sx={{ ...TILE, ...lookOf(part, pick, view), ...pickRing(part === shown, "text.primary") }}
      />
    </Tooltip>
  );
}

/** A colour is its swatch; an item is Hiroba's art on the white ground it was drawn for. */
function lookOf(part: CostumePart, pick: number, view: CostumeEditorView) {
  if (isSlotPart(part)) {
    return { bgcolor: pick === 0 ? "action.hover" : "#fff" };
  }

  const swatch = view.palette.find((one) => one.id === pick);
  return {
    bgcolor: swatch?.hex ?? "action.hover",
    border: "1px solid",
    borderColor: "common.black",
  };
}

function SlotPicture({ part, item, lane }: { part: SlotPart; item: number; lane: PictureLane }) {
  const tile = useRef<HTMLDivElement>(null);
  const slot = slotOf(part);
  const answer = usePicture(lane, { kind: "costumeItem", slot, id: item }, tile, {
    ...IN_THE_WINDOW,
    order: slot,
  });
  return (
    <Box ref={tile} sx={{ position: "relative", width: 1, height: 1, display: "flex" }}>
      <ItemPicture answer={answer} size="100%" />
    </Box>
  );
}
