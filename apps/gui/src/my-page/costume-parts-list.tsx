import type { Translator } from "@abth/i18n";
import { Box, Stack, Tab, Tabs, Typography } from "@mui/material";
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
  partValue,
  SLOT_PARTS,
  type SlotPart,
  slotOf,
} from "./costume-parts";
import { type EditingTabs, selectedPart } from "./costume-tabs";

export const PARTS_PANEL_ID = "costume-grid";
export const partTabId = (part: CostumePart) => `costume-part-${part}`;
const TILE_PX = 40;
const TILE = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: TILE_PX,
  height: TILE_PX,
  borderRadius: 0.5,
} as const;
const ROW = {
  minHeight: 56,
  px: 1.5,
  gap: 1.5,
  maxWidth: "none",
  flexDirection: "row",
  justifyContent: "flex-start",
  textAlign: "left",
  textTransform: "none",
  "&.Mui-selected": { bgcolor: "action.selected" },
} as const;

export interface PartsListProps {
  readonly view: CostumeEditorView;
  readonly draft: CostumeSet;
  readonly lane: PictureLane;
  readonly i18n: Translator;
  readonly tabs: EditingTabs;
  readonly onPick: (part: CostumePart) => void;
}

export function PartsList({ view, draft, lane, i18n, tabs, onPick }: PartsListProps) {
  const { t } = i18n;
  const group = { view, draft, lane, i18n, shown: selectedPart(tabs), onPick };
  return (
    <Stack spacing={2}>
      <PartGroup id="colours" heading={t("costume.tab.colours")} parts={COLOUR_PARTS} {...group} />
      <PartGroup id="items" heading={t("costume.tab.items")} parts={SLOT_PARTS} {...group} />
    </Stack>
  );
}

// A tab list of its own for each heading: a heading inside one would break its tab semantics.
function PartGroup({
  id,
  heading,
  parts,
  shown,
  view,
  draft,
  lane,
  i18n,
  onPick,
}: {
  id: string;
  heading: string;
  parts: readonly CostumePart[];
  shown: CostumePart;
  view: CostumeEditorView;
  draft: CostumeSet;
  lane: PictureLane;
  i18n: Translator;
  onPick: (part: CostumePart) => void;
}) {
  const { t } = i18n;
  const headingId = `costume-group-${id}`;
  return (
    <Box>
      <Typography
        id={headingId}
        component="h2"
        variant="overline"
        color="text.secondary"
        sx={{ px: 1.5 }}
      >
        {heading}
      </Typography>
      <Tabs
        orientation="vertical"
        value={parts.includes(shown) ? shown : false}
        aria-labelledby={headingId}
        onChange={(_event, part: CostumePart) => onPick(part)}
      >
        {parts.map((part) => (
          <Tab
            key={part}
            id={partTabId(part)}
            value={part}
            aria-controls={part === shown ? PARTS_PANEL_ID : undefined}
            label={
              <>
                <Pick part={part} view={view} value={draft[part]} lane={lane} i18n={i18n} />
                <Box component="span">{t(PART_LABEL[part])}</Box>
              </>
            }
            sx={ROW}
          />
        ))}
      </Tabs>
    </Box>
  );
}

function Pick({
  part,
  view,
  value,
  lane,
  i18n,
}: {
  part: CostumePart;
  view: CostumeEditorView;
  value: number;
  lane: PictureLane;
  i18n: Translator;
}) {
  const id = `costume-pick-${part}`;
  if (isSlotPart(part)) {
    return value === 0 ? (
      <Box id={id} aria-hidden sx={{ ...TILE, bgcolor: "action.hover" }} />
    ) : (
      <SlotPick id={id} part={part} item={value} lane={lane} label={partValue(part, value, i18n)} />
    );
  }

  const swatch = view.palette.find((one) => one.id === value);
  return (
    <Box
      id={id}
      role="img"
      aria-label={partValue(part, value, i18n)}
      sx={{
        ...TILE,
        bgcolor: swatch?.hex ?? "action.hover",
        border: "1px solid",
        borderColor: "common.black",
      }}
    />
  );
}

function SlotPick({
  id,
  part,
  item,
  lane,
  label,
}: {
  id: string;
  part: SlotPart;
  item: number;
  lane: PictureLane;
  label: string;
}) {
  const tile = useRef<HTMLDivElement>(null);
  const slot = slotOf(part);
  const answer = usePicture(lane, { kind: "costumeItem", slot, id: item }, tile, {
    ...IN_THE_WINDOW,
    order: slot,
  });
  // Hiroba's art on the white ground it was drawn for, in either theme.
  return (
    <Box ref={tile} id={id} role="img" aria-label={label} sx={{ ...TILE, bgcolor: "#fff" }}>
      <ItemPicture answer={answer} size={TILE_PX} />
    </Box>
  );
}
