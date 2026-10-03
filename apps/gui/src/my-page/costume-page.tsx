import type { Translator } from "@abth/i18n";
import { Box, Button, Paper, Stack } from "@mui/material";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { BOTTOM_BAR, BOTTOM_BAR_PAGE } from "../navigation/app-frame";
import { useWideWindow } from "../navigation/use-wide-window";
import { useWiderFrame } from "../navigation/wider-frame";
import type { PictureLane } from "../pictures/picture-lane";
import type { EditorStep } from "./costume-editor-state";
import { CostumeHistoryDialog } from "./costume-history-dialog";
import { NarrowBody } from "./costume-narrow-body";
import { COLOUR_PARTS, type CostumePart, changedParts } from "./costume-parts";
import { WideBody } from "./costume-wide-body";
import { LoadFailed, useFocusKept, Waiting } from "./editor-parts";
import type { CostumeEditor } from "./use-costume-editor";

// MUI's sm width: a narrow window's column need not stretch across it.
export const COLUMN_MAX_WIDTH_PX = 600;
const BAR_PADDING_PX = 12;

export interface CostumePageProps {
  readonly editor: CostumeEditor;
  readonly lane: PictureLane;
  readonly i18n: Translator;
}

export function CostumePage({ editor, lane, i18n }: CostumePageProps) {
  const { step } = editor;
  const wide = useWideWindow();
  useWiderFrame();
  const [part, setPart] = useState<CostumePart>(COLOUR_PARTS[0]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const page = useRef<HTMLDivElement>(null);
  useFocusKept(page, step.name);
  // Shown again, the page asks once more for the thumbnails that did not come.
  useEffect(() => {
    lane.forgetFailures("costumeItem");
  }, [lane]);

  // The dialog is over the editor and goes with it: a read or a save closes it.
  useEffect(() => {
    if (step.name !== "editing") {
      setHistoryOpen(false);
    }
  }, [step.name]);

  const actions = actionsOf(editor, i18n, () => setHistoryOpen(true), wide);
  const body = { editor, lane, i18n, part, onPart: setPart, progress: progressOf(step, i18n) };
  return (
    <Box
      ref={page}
      id="costume-page"
      data-step={step.name}
      tabIndex={-1}
      sx={{
        display: "flex",
        flexDirection: "column",
        width: 1,
        ...(!wide && {
          ...BOTTOM_BAR_PAGE,
          maxWidth: COLUMN_MAX_WIDTH_PX,
          // Centred by alignment: the Stack holding the page keeps its children's margins at 0.
          alignSelf: "center",
        }),
        outline: "none",
      }}
    >
      {wide ? (
        <WideBody {...body} actions={actions} />
      ) : (
        <>
          <NarrowBody {...body} />
          {actions !== null && <ActionBar>{actions}</ActionBar>}
        </>
      )}
      {step.name === "editing" && (
        <CostumeHistoryDialog
          open={historyOpen}
          entries={editor.history}
          worn={step.editor.state}
          i18n={i18n}
          onPick={(entry) => {
            editor.pickHistory(entry);
            setHistoryOpen(false);
          }}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </Box>
  );
}

function progressOf(step: EditorStep, i18n: Translator): ReactNode {
  const { t } = i18n;
  switch (step.name) {
    case "unread":
    case "loading":
      return <Waiting>{t("costume.reading")}</Waiting>;
    case "loadFailed":
      return <LoadFailed id="costume-load-failed" failure={step.failure} i18n={i18n} />;
    case "saving":
      return <Waiting id="costume-saving">{t("costume.saving")}</Waiting>;
    case "editing":
      return null;
  }
}

function actionsOf(
  editor: CostumeEditor,
  i18n: Translator,
  onHistory: () => void,
  wide: boolean,
): ReactNode {
  const { t } = i18n;
  const { step } = editor;
  if (step.name !== "editing") {
    return null;
  }

  const unchanged = changedParts(step.editor.state, step.draft).length === 0;
  const history = (
    <Button
      id="costume-history"
      disabled={editor.history.length === 0}
      onClick={onHistory}
      sx={wide ? { flex: 1 } : { mr: "auto" }}
    >
      {t("costume.history")}
    </Button>
  );
  const reset = (
    <Button
      id="costume-reset"
      disabled={unchanged}
      onClick={editor.reset}
      sx={wide ? { flex: 1 } : undefined}
    >
      {t("costume.reset")}
    </Button>
  );
  const save = (
    <Button
      id="costume-save"
      variant="contained"
      fullWidth={wide}
      disabled={unchanged}
      onClick={() => void editor.save()}
    >
      {t("costume.save")}
    </Button>
  );
  return wide ? (
    <Stack id="costume-actions" spacing={1}>
      {save}
      <Box sx={{ display: "flex", gap: 1 }}>
        {history}
        {reset}
      </Box>
    </Stack>
  ) : (
    <>
      {history}
      {reset}
      {save}
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
