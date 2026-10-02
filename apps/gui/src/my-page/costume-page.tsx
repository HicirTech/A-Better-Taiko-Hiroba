import type { Translator } from "@abth/i18n";
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { type ReactNode, type RefObject, useEffect, useRef, useState } from "react";

import { BOTTOM_BAR, BOTTOM_BAR_PAGE } from "../navigation/app-frame";
import type { PictureLane } from "../pictures/picture-lane";
import { FAILURE_MESSAGE } from "../read-failure-message";
import type { ReadFailure, UndoSummary } from "../session-port";
import { Changes } from "./costume-changes";
import { type EditorStep, previewSetOf } from "./costume-editor-state";
import { type EditingTabs, EditingView, FIRST_TABS } from "./costume-editing";
import { changedParts } from "./costume-parts";
import { CostumePreviewBox } from "./costume-preview-box";
import type { CostumeEditor } from "./use-costume-editor";
import { WriteOutcomeNotice } from "./write-outcome";

/**
 * The editor's column on a wide window, as wide as MUI's sm: its tiles are narrow, and a row of
 * them need not stretch across the window.
 */
export const COLUMN_MAX_WIDTH_PX = 600;
/** The room the bar keeps round its buttons, and under them where a phone draws its own bar. */
const BAR_PADDING_PX = 12;

export interface CostumePageProps {
  readonly editor: CostumeEditor;
  /** The window's lane for Hiroba's pictures: the items' thumbnails come through it. */
  readonly lane: PictureLane;
  readonly i18n: Translator;
}

/**
 * The costume editor as a page of its own: Hiroba's picture of the set as picked, the tabs of
 * colours and of items under it, then what the draft changes. Review, the confirmation and Save
 * to Hiroba, with Reset to put the draft back, sit in a bar kept at the bottom of the window. A
 * write's outcome and its undo show on this page, in place of the editor, until Back.
 *
 * The page is a column: as wide as the window on a phone, and one column's width on a wide one,
 * and tall enough to put the bar at the window's bottom edge however little a step shows. The
 * state is the window's, not the page's (use-costume-editor.ts): going to another page and back
 * finds the draft, a review or an outcome as it was.
 */
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
        // Centred by its alignment: the Stack that holds the page keeps its children's margins at 0.
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

/**
 * Keeps the keyboard on the page when the control it was on goes with a step: a pressed Review is
 * not there once the review is shown, and the focus would fall to the top of the window. Focus
 * that is anywhere else, such as the navigation, is left alone.
 */
function useFocusKept(page: RefObject<HTMLElement | null>, step: EditorStep["name"]) {
  const last = useRef(step);
  useEffect(() => {
    if (last.current === step) {
      return;
    }

    last.current = step;
    const focused = document.activeElement;
    if (focused === null || focused === document.body) {
      page.current?.focus({ preventScroll: true });
    }
  }, [page, step]);
}

/** What the page shows in place of the editor's tabs, or beside them. */
function StepView({
  editor,
  lane,
  i18n,
  tabs,
  onTabs,
}: CostumePageProps & { tabs: EditingTabs; onTabs: (tabs: EditingTabs) => void }) {
  const { t } = i18n;
  const { step, undoable } = editor;
  const undoOffer = undoable !== null && (
    <UndoOffer undoable={undoable} onUndo={() => void editor.undo()} i18n={i18n} />
  );
  switch (step.name) {
    case "unread":
    case "loading":
      return <Waiting>{t("costume.reading")}</Waiting>;
    case "loadFailed":
      return <LoadFailed failure={step.failure} i18n={i18n} />;
    case "editing":
      return (
        <>
          {undoOffer}
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
    case "confirming":
      return (
        <Stack spacing={2}>
          <Typography>{t("costume.confirmIntro")}</Typography>
          <Changes from={step.editor.state} to={step.draft} i18n={i18n} />
        </Stack>
      );
    case "saving":
      return <Waiting id="costume-saving">{t("costume.saving")}</Waiting>;
    case "undoing":
      return <Waiting id="costume-undoing">{t("costume.undoing")}</Waiting>;
    case "done":
      return (
        <>
          <WriteOutcomeNotice outcome={step.outcome} i18n={i18n} asUndo={step.asUndo} />
          {undoOffer}
        </>
      );
  }
}

/** The buttons of the step, or null where it has none: a read, a save and an undo end by themselves. */
function actionsOf(editor: CostumeEditor, i18n: Translator): ReactNode {
  const { t } = i18n;
  const { step } = editor;
  switch (step.name) {
    case "editing": {
      const unchanged = changedParts(step.editor.state, step.draft).length === 0;
      return (
        <>
          <Button id="costume-reset" disabled={unchanged} onClick={editor.reset}>
            {t("costume.reset")}
          </Button>
          <Button
            id="costume-review"
            variant="contained"
            disabled={unchanged}
            onClick={editor.review}
          >
            {t("costume.review")}
          </Button>
        </>
      );
    }
    case "confirming":
      return (
        <>
          <Button id="costume-back" onClick={editor.back}>
            {t("costume.back")}
          </Button>
          <Button id="costume-save" variant="contained" onClick={() => void editor.save()}>
            {t("costume.save")}
          </Button>
        </>
      );
    case "done":
      return (
        <Button id="costume-back" onClick={editor.back}>
          {t("costume.back")}
        </Button>
      );
    default:
      return null;
  }
}

/**
 * The step's buttons, kept at the bottom of the window as the page scrolls, and at the bottom of
 * the column once it has: sticky, not fixed, so it takes the column's width and clears the
 * navigation without a measure.
 */
function ActionBar({ children }: { children: ReactNode }) {
  return (
    <Paper
      id="costume-bar"
      elevation={3}
      sx={{
        ...BOTTOM_BAR,
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

/** The last costume change, and the way back from it while this device still offers one. */
function UndoOffer({
  undoable,
  onUndo,
  i18n,
}: {
  undoable: UndoSummary;
  onUndo: () => void;
  i18n: Translator;
}) {
  const { t } = i18n;
  return (
    // Not a Stack, which keeps its children's margins at 0: the button's label lines up with the
    // line under it, not with its own padding.
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <Button
        id="costume-undo"
        variant="text"
        onClick={onUndo}
        sx={{ alignSelf: "flex-start", ml: -1 }}
      >
        {t("costume.undoLast")}
      </Button>
      <Typography id="undo-when" variant="body2" color="text.secondary">
        {t("costume.undoWhen", { time: i18n.dateTime(undoable.at) })}
      </Typography>
    </Box>
  );
}

function Waiting({ id, children }: { id?: string; children: string }) {
  return (
    <Stack id={id} direction="row" spacing={2} sx={{ alignItems: "center" }}>
      <CircularProgress size={24} />
      <Typography>{children}</Typography>
    </Stack>
  );
}

function LoadFailed({ failure, i18n }: { failure: ReadFailure; i18n: Translator }) {
  const { t } = i18n;
  return (
    <Alert id="costume-load-failed" severity="warning">
      {t(FAILURE_MESSAGE[failure.kind])}
      {failure.detail !== undefined && (
        <Typography
          variant="body2"
          sx={{ mt: 1, fontFamily: "monospace", userSelect: "text", wordBreak: "break-all" }}
        >
          {t("failure.detail", { detail: failure.detail })}
        </Typography>
      )}
    </Alert>
  );
}
