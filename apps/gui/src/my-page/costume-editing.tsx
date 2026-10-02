import type { Translator } from "@abth/i18n";
import { Alert, Box, ButtonBase, Stack, Tab, Tabs } from "@mui/material";

import type { PictureLane } from "../pictures/picture-lane";
import type { CostumeEditorView, CostumeSet } from "../session-port";
import { Changes } from "./costume-changes";
import { CostumeItemGrid } from "./costume-item-grid";
import {
  COLOUR_PARTS,
  type ColourPart,
  PART_LABEL,
  SLOT_PARTS,
  type SlotPart,
} from "./costume-parts";
import { pickRing } from "./pick-ring";

/** Which of the editor's tabs is open: the top two, and the part each of them has open. */
export interface EditingTabs {
  readonly tab: "colours" | "items";
  readonly colourPart: ColourPart;
  readonly slotPart: SlotPart;
}

export const FIRST_TABS: EditingTabs = {
  tab: "colours",
  colourPart: "colorFace",
  slotPart: "costume1",
};

export interface EditingViewProps {
  readonly editor: CostumeEditorView;
  readonly draft: CostumeSet;
  readonly lane: PictureLane;
  readonly i18n: Translator;
  readonly tabs: EditingTabs;
  readonly onTabs: (tabs: EditingTabs) => void;
  readonly onPickColour: (part: ColourPart, id: number) => void;
  readonly onPickItem: (part: SlotPart, id: number) => void;
}

/**
 * The editor proper: the three colours by the palette's own colours and the five slots by Hiroba's
 * thumbnails of their items, a warning while a きぐるみ is picked, and every change the draft
 * makes over the set as read. A pick makes the draft by the site's own rule.
 */
export function EditingView({
  editor,
  draft,
  lane,
  i18n,
  tabs,
  onTabs,
  onPickColour,
  onPickItem,
}: EditingViewProps) {
  const { t } = i18n;
  return (
    <Stack spacing={2}>
      <Tabs value={tabs.tab} onChange={(_event, tab) => onTabs({ ...tabs, tab })}>
        <Tab id="costume-tab-colours" value="colours" label={t("costume.tab.colours")} />
        <Tab id="costume-tab-items" value="items" label={t("costume.tab.items")} />
      </Tabs>
      {tabs.tab === "colours" ? (
        <>
          <Tabs
            value={tabs.colourPart}
            onChange={(_event, colourPart) => onTabs({ ...tabs, colourPart })}
            variant="scrollable"
          >
            {COLOUR_PARTS.map((part) => (
              <Tab
                key={part}
                id={`costume-part-${part}`}
                value={part}
                label={t(PART_LABEL[part])}
              />
            ))}
          </Tabs>
          <Palette
            editor={editor}
            part={tabs.colourPart}
            chosen={draft[tabs.colourPart]}
            i18n={i18n}
            onPick={(id) => onPickColour(tabs.colourPart, id)}
          />
        </>
      ) : (
        <>
          <Tabs
            value={tabs.slotPart}
            onChange={(_event, slotPart) => onTabs({ ...tabs, slotPart })}
            variant="scrollable"
          >
            {SLOT_PARTS.map((part) => (
              <Tab
                key={part}
                id={`costume-part-${part}`}
                value={part}
                label={t(PART_LABEL[part])}
              />
            ))}
          </Tabs>
          {/* A slot of its own for each tab: a switch drops the thumbnails not yet sent. */}
          <CostumeItemGrid
            key={tabs.slotPart}
            lane={lane}
            i18n={i18n}
            part={tabs.slotPart}
            items={itemsOf(editor, tabs.slotPart)}
            chosen={draft[tabs.slotPart]}
            onPick={(id) => onPickItem(tabs.slotPart, id)}
          />
        </>
      )}
      {draft.costume1 !== 0 && SLOT_PARTS.slice(1).some((part) => editor.state[part] !== 0) && (
        <Alert id="kigurumi-warning" severity="info">
          {t("costume.kigurumiWarning")}
        </Alert>
      )}
      <Changes from={editor.state} to={draft} i18n={i18n} />
    </Stack>
  );
}

/**
 * Hiroba's own grid: nine to a row, seven rows, in id order, each swatch framed in one black pixel
 * (mydon.css #palette .color), so a colour sits where the site has it and looks as it does there.
 */
function Palette({
  editor,
  part,
  chosen,
  i18n,
  onPick,
}: {
  editor: CostumeEditorView;
  part: ColourPart;
  chosen: number;
  i18n: Translator;
  onPick: (id: number) => void;
}) {
  const { t } = i18n;
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(9, 32px)",
        gap: 0.75,
        p: 0.5,
      }}
    >
      {editor.palette.map((swatch) => {
        const picked = chosen === swatch.id;
        return (
          <ButtonBase
            key={swatch.id}
            id={`swatch-${part}-${swatch.id}`}
            aria-label={t("costume.id", { id: swatch.id })}
            aria-pressed={picked}
            title={t("costume.id", { id: swatch.id })}
            onClick={() => onPick(swatch.id)}
            sx={{
              width: 32,
              height: 32,
              bgcolor: swatch.hex,
              border: "1px solid",
              borderColor: "common.black",
              // Outside the swatch, never over its colour.
              ...pickRing(picked, "text.primary"),
            }}
          />
        );
      })}
    </Box>
  );
}

/** A slot's items: the owned ones in the page's order, and the one worn if the list lacks it. */
function itemsOf(editor: CostumeEditorView, part: SlotPart): number[] {
  const owned = editor.slots[SLOT_PARTS.indexOf(part)] ?? [];
  const worn = editor.state[part];
  return [...owned, ...(worn !== 0 && !owned.includes(worn) ? [worn] : [])];
}
