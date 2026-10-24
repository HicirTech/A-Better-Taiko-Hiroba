import type { Translator } from "@abth/i18n";
import { Box, Button } from "@mui/material";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { PictureLane } from "../pictures/picture-lane";
import { COLOUR_PARTS, type CostumePart, changedParts } from "../shared/costume-parts";
import { useFocusKept } from "../ui/editor-parts";
import { COLUMN_MAX_WIDTH_PX } from "../ui/frame-top";
import type { ModalLook } from "../ui/large-modal";
import { LoadFailed } from "../ui/read-failure-alert";
import { BAR_TEXT_BUTTON, SYNC_BAR_PAGE, SyncBar, SyncBarSkeleton } from "../ui/sync-bar";
import { WriteOutcomeSnackbar } from "../ui/write-outcome";
import { shownEditorOf } from "./costume-editor-state";
import { CostumeHistoryDialog } from "./costume-history-dialog";
import { NarrowBody, NarrowBodySkeleton } from "./costume-narrow-body";
import { WideBody, WideBodySkeleton } from "./costume-wide-body";
import type { CostumeEditor } from "./use-costume-editor";

const pageOf = (wide: boolean) =>
  ({
    ...SYNC_BAR_PAGE,
    width: 1,
    ...(!wide && {
      maxWidth: COLUMN_MAX_WIDTH_PX,
      // Centred by alignment in the page's Stack, which keeps its children's margins at 0, and
      // by margins in the skeleton's box.
      alignSelf: "center",
      mx: "auto",
    }),
    outline: "none",
  }) as const;

export interface CostumePageProps {
  readonly editor: CostumeEditor;
  readonly lane: PictureLane;
  readonly touchFirst: boolean;
  /** The window is wide enough for the picture and the tiles beside each other. */
  readonly wide: boolean;
  readonly modalLook: ModalLook;
  readonly i18n: Translator;
}

export function CostumePage({ editor, lane, touchFirst, wide, modalLook, i18n }: CostumePageProps) {
  const { step } = editor;
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

  // Focus leaves the button the save hides, so it is not dropped to the window's top.
  const save = () => {
    page.current?.focus({ preventScroll: true });
    void editor.save();
  };
  const body = { editor, lane, i18n, part, onPart: setPart, failure: failureOf(editor, i18n) };
  return (
    <Box ref={page} id="costume-page" data-step={step.name} tabIndex={-1} sx={pageOf(wide)}>
      {wide ? <WideBody {...body} /> : <NarrowBody {...body} />}
      <CostumeBar
        editor={editor}
        i18n={i18n}
        onHistory={() => setHistoryOpen(true)}
        onSave={save}
      />
      {step.name === "editing" && step.notice !== null && (
        <WriteOutcomeSnackbar
          kind="costume"
          outcome={step.notice}
          i18n={i18n}
          onClosed={editor.closeNotice}
        />
      )}
      {step.name === "editing" && (
        <CostumeHistoryDialog
          open={historyOpen}
          entries={editor.history}
          worn={step.editor.state}
          touchFirst={touchFirst}
          modalLook={modalLook}
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

// Any read waits under the page's skeleton; one that failed says so here, over what it held.
function failureOf(editor: CostumeEditor, i18n: Translator): ReactNode {
  const { failure } = editor.status;
  return failure === null ? null : (
    <LoadFailed id="costume-load-failed" failure={failure} i18n={i18n} />
  );
}

/** The page's sync bar, its History first; none while there is no editor to act on. */
function CostumeBar({
  editor,
  i18n,
  onHistory,
  onSave,
}: {
  readonly editor: CostumeEditor;
  readonly i18n: Translator;
  readonly onHistory: () => void;
  readonly onSave: () => void;
}) {
  const { step } = editor;
  const shown = shownEditorOf(step);
  if (shown === null) {
    return null;
  }

  const changed = changedParts(shown.editor.state, shown.draft).length > 0;
  const editable = step.name === "editing";
  return (
    <SyncBar
      id="costume"
      canSync={editable && changed}
      onSync={onSave}
      onReset={editor.reset}
      canReset={editable && changed}
      saving={step.name === "saving"}
      start={
        <Button
          id="costume-history"
          disabled={!editable || editor.history.length === 0}
          onClick={onHistory}
          sx={BAR_TEXT_BUTTON}
        >
          {i18n.t("costume.history")}
        </Button>
      }
      i18n={i18n}
    />
  );
}

/** The Costume page's shape while its first read runs, as wide or narrow as the window. */
export function CostumePageSkeleton({ wide }: { readonly wide: boolean }) {
  return (
    <Box sx={pageOf(wide)}>
      {wide ? <WideBodySkeleton /> : <NarrowBodySkeleton />}
      <SyncBarSkeleton />
    </Box>
  );
}
