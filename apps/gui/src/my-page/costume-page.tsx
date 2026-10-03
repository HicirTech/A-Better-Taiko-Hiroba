import type { Translator } from "@abth/i18n";
import { Box, Button, Paper, Stack } from "@mui/material";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { BOTTOM_BAR, BOTTOM_BAR_PAGE } from "../navigation/app-frame";
import type { PictureLane } from "../pictures/picture-lane";
import { type EditingTabs, EditingView, FIRST_TABS } from "./costume-editing";
import { previewSetOf } from "./costume-editor-state";
import { changedParts } from "./costume-parts";
import { CostumePreviewBox } from "./costume-preview-box";
import { LoadFailed, useFocusKept, Waiting } from "./editor-parts";
import type { CostumeEditor } from "./use-costume-editor";
import { WriteOutcomeNotice } from "./write-outcome";

// MUI's sm width: the item tiles are narrow, so their row need not stretch across the window.
export const COLUMN_MAX_WIDTH_PX = 600;
const BAR_PADDING_PX = 12;

export interface CostumePageProps {
  readonly editor: CostumeEditor;
  readonly lane: PictureLane;
  readonly i18n: Translator;
}

export function CostumePage({ editor, lane, i18n }: CostumePageProps) {
  const { step } = editor;
  const [tabs, setTabs] = useState(FIRST_TABS);
  const page = useRef<HTMLDivElement>(null);
  useFocusKept(page, step.name);
  // Shown again, the page asks once more for the thumbnails that did not come.
  useEffect(() => {
    lane.forgetFailures("costumeItem");
  }, [lane]);

  const actions = actionsOf(editor, i18n);
  return (
    <Box
      ref={page}
      id="costume-page"
      data-step={step.name}
      tabIndex={-1}
      sx={{
        ...BOTTOM_BAR_PAGE,
        display: "flex",
        flexDirection: "column",
        width: 1,
        maxWidth: COLUMN_MAX_WIDTH_PX,
        // Centred by alignment: the Stack holding the page keeps its children's margins at 0.
        alignSelf: "center",
        outline: "none",
      }}
    >
      <Stack spacing={2} sx={{ flexGrow: 1, pb: 2 }}>
        {previewSetOf(step) !== null && <CostumePreviewBox preview={editor.preview} i18n={i18n} />}
        <StepView editor={editor} lane={lane} i18n={i18n} tabs={tabs} onTabs={setTabs} />
      </Stack>
      {actions !== null && <ActionBar>{actions}</ActionBar>}
    </Box>
  );
}

function StepView({
  editor,
  lane,
  i18n,
  tabs,
  onTabs,
}: CostumePageProps & { tabs: EditingTabs; onTabs: (tabs: EditingTabs) => void }) {
  const { t } = i18n;
  const { step } = editor;
  switch (step.name) {
    case "unread":
    case "loading":
      return <Waiting>{t("costume.reading")}</Waiting>;
    case "loadFailed":
      return <LoadFailed id="costume-load-failed" failure={step.failure} i18n={i18n} />;
    case "editing":
      return (
        <>
          {step.notice !== null && (
            <WriteOutcomeNotice outcome={step.notice} kind="costume" i18n={i18n} />
          )}
          <EditingView
            editor={step.editor}
            draft={step.draft}
            lane={lane}
            i18n={i18n}
            tabs={tabs}
            onTabs={onTabs}
            onPickColour={editor.pickColour}
            onPickItem={editor.pickItem}
          />
        </>
      );
    case "saving":
      return <Waiting id="costume-saving">{t("costume.saving")}</Waiting>;
  }
}

function actionsOf(editor: CostumeEditor, i18n: Translator): ReactNode {
  const { t } = i18n;
  const { step } = editor;
  if (step.name !== "editing") {
    return null;
  }

  const unchanged = changedParts(step.editor.state, step.draft).length === 0;
  return (
    <>
      <Button id="costume-reset" disabled={unchanged} onClick={editor.reset}>
        {t("costume.reset")}
      </Button>
      <Button
        id="costume-save"
        variant="contained"
        disabled={unchanged}
        onClick={() => void editor.save()}
      >
        {t("costume.save")}
      </Button>
    </>
  );
}

function ActionBar({ children }: { children: ReactNode }) {
  return (
    <Paper
      id="costume-bar"
      elevation={3}
      sx={{
        ...BOTTOM_BAR,
        // Sticky, not fixed: it takes the column's width and clears the navigation unmeasured.
        position: "sticky",
        bottom: 0,
        zIndex: 1,
        display: "flex",
        justifyContent: "flex-end",
        gap: 1,
        p: `${BAR_PADDING_PX}px`,
        pb: `calc(${BAR_PADDING_PX}px + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      {children}
    </Paper>
  );
}
