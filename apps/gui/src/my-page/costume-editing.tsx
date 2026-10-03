import type { Translator } from "@abth/i18n";
import { Alert, Stack, Tab, Tabs } from "@mui/material";

import type { PictureLane } from "../pictures/picture-lane";
import type { CostumeEditorView, CostumeSet } from "../session-port";
import { CostumeItemGrid } from "./costume-item-grid";
import { Palette } from "./costume-palette";
import {
  COLOUR_PARTS,
  type ColourPart,
  itemsOf,
  PART_LABEL,
  SLOT_PARTS,
  type SlotPart,
} from "./costume-parts";
import type { EditingTabs } from "./costume-tabs";

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
            wide={false}
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
            wide={false}
            onPick={(id) => onPickItem(tabs.slotPart, id)}
          />
        </>
      )}
      <KigurumiInfo editor={editor} draft={draft} i18n={i18n} />
    </Stack>
  );
}

export function KigurumiInfo({
  editor,
  draft,
  i18n,
}: {
  editor: CostumeEditorView;
  draft: CostumeSet;
  i18n: Translator;
}) {
  if (draft.costume1 === 0 || !SLOT_PARTS.slice(1).some((part) => editor.state[part] !== 0)) {
    return null;
  }

  return (
    <Alert id="kigurumi-warning" severity="info">
      {i18n.t("costume.kigurumiWarning")}
    </Alert>
  );
}
