import { draftCostumeChange } from "@abth/core";
import type { Translator } from "@abth/i18n";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";

import { FAILURE_MESSAGE } from "../read-failure-message";
import type {
  CostumeEditorView,
  CostumeSet,
  HirobaSessionPort,
  ReadFailure,
  WriteOutcomeView,
} from "../session-port";
import {
  COLOUR_PARTS,
  type ColourPart,
  changedParts,
  PART_LABEL,
  partValue,
  SLOT_PARTS,
  type SlotPart,
} from "./costume-parts";
import { WriteOutcomeNotice } from "./write-outcome";

type Step =
  | { readonly name: "loading" }
  | { readonly name: "loadFailed"; readonly failure: ReadFailure }
  | { readonly name: "editing"; readonly editor: CostumeEditorView; readonly draft: CostumeSet }
  | {
      readonly name: "confirming";
      readonly editor: CostumeEditorView;
      readonly draft: CostumeSet;
      readonly acknowledged: boolean;
    }
  | { readonly name: "saving"; readonly editor: CostumeEditorView; readonly draft: CostumeSet }
  | {
      readonly name: "done";
      readonly editor: CostumeEditorView;
      readonly outcome: WriteOutcomeView;
    };

export interface CostumeDialogProps {
  readonly port: HirobaSessionPort;
  readonly i18n: Translator;
  /**
   * Whether costume writes are verified. Until they are, saving needs an extra confirmation, and
   * the write reads the title before and after.
   */
  readonly verified: boolean;
  readonly onClose: () => void;
  /** A write ended: the page refreshes its undo, and goes back to signing in if the session did. */
  readonly onOutcome: (outcome: WriteOutcomeView) => void;
}

/**
 * The costume editor: the three colours and the five slots, by number, with the palette's own
 * colours and no pictures. Mounted only while open. Opening reads the editor once; a pick makes a
 * draft by the site's own rule, so a きぐるみ empties the pieces and a piece takes the きぐるみ
 * off; saving lists every change first and sends exactly the draft.
 */
export function CostumeDialog({ port, i18n, verified, onClose, onOutcome }: CostumeDialogProps) {
  const { t } = i18n;
  const fullScreen = useMediaQuery(useTheme().breakpoints.down("sm"));
  const [step, setStep] = useState<Step>({ name: "loading" });
  const [tab, setTab] = useState<"colours" | "items">("colours");
  const [colourPart, setColourPart] = useState<ColourPart>("colorFace");
  const [slotPart, setSlotPart] = useState<SlotPart>("costume1");

  // One read per opening. The ref keeps it one under StrictMode, which runs an effect twice in
  // development: a second run would be a second request to Hiroba.
  const started = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    if (!started.current) {
      started.current = true;
      void port.openCostumeEditor().then((read) => {
        if (mounted.current) {
          setStep(
            read.ok
              ? { name: "editing", editor: read.value, draft: read.value.state }
              : { name: "loadFailed", failure: read.error },
          );
        }
      });
    }
    return () => {
      mounted.current = false;
    };
  }, [port]);

  const save = async () => {
    if (step.name !== "confirming") {
      return;
    }
    const { editor, draft } = step;
    setStep({ name: "saving", editor, draft });
    let outcome: WriteOutcomeView;
    try {
      outcome = await port.changeCostume({ expected: editor.state, target: draft });
    } catch {
      // The call itself failed, as a bridge that refused it does: how the write ended is not
      // known, and the dialog must not stay on "Saving…" with Close shut.
      outcome = { kind: "interrupted" };
    }
    if (mounted.current) {
      setStep({ name: "done", editor: refreshed(editor, outcome), outcome });
    }
    onOutcome(outcome);
  };

  const pickColour = (part: ColourPart, id: number) => {
    if (step.name === "editing") {
      setStep({ ...step, draft: { ...step.draft, [part]: id } });
    }
  };
  const pickItem = (part: SlotPart, id: number) => {
    if (step.name === "editing") {
      const slot = (SLOT_PARTS.indexOf(part) + 1) as 1 | 2 | 3 | 4 | 5;
      setStep({ ...step, draft: draftCostumeChange(step.draft, slot, id) });
    }
  };

  const busy = step.name === "saving";
  return (
    <Dialog
      id="costume-dialog"
      open
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      onClose={busy ? undefined : onClose}
    >
      <DialogTitle>{t("costume.title")}</DialogTitle>
      <DialogContent dividers>
        {step.name === "loading" && (
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <CircularProgress size={24} />
            <Typography>{t("costume.reading")}</Typography>
          </Stack>
        )}

        {step.name === "loadFailed" && (
          <Alert id="costume-load-failed" severity="warning">
            {t(FAILURE_MESSAGE[step.failure.kind])}
            {step.failure.detail !== undefined && (
              <Typography
                variant="body2"
                sx={{ mt: 1, fontFamily: "monospace", userSelect: "text", wordBreak: "break-all" }}
              >
                {t("failure.detail", { detail: step.failure.detail })}
              </Typography>
            )}
          </Alert>
        )}

        {step.name === "editing" && (
          <Stack spacing={2}>
            <Tabs value={tab} onChange={(_event, value) => setTab(value)}>
              <Tab id="costume-tab-colours" value="colours" label={t("costume.tab.colours")} />
              <Tab id="costume-tab-items" value="items" label={t("costume.tab.items")} />
            </Tabs>
            {tab === "colours" ? (
              <>
                <Tabs
                  value={colourPart}
                  onChange={(_event, value) => setColourPart(value)}
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
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(32px, 1fr))",
                    gap: 0.75,
                  }}
                >
                  {step.editor.palette.map((swatch) => {
                    const chosen = step.draft[colourPart] === swatch.id;
                    return (
                      <ButtonBase
                        key={swatch.id}
                        id={`swatch-${colourPart}-${swatch.id}`}
                        aria-label={t("costume.id", { id: swatch.id })}
                        aria-pressed={chosen}
                        title={t("costume.id", { id: swatch.id })}
                        onClick={() => pickColour(colourPart, swatch.id)}
                        sx={{
                          height: 32,
                          borderRadius: 1,
                          bgcolor: swatch.hex,
                          border: 3,
                          borderColor: chosen ? "primary.main" : "divider",
                        }}
                      />
                    );
                  })}
                </Box>
              </>
            ) : (
              <>
                <Tabs
                  value={slotPart}
                  onChange={(_event, value) => setSlotPart(value)}
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
                <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: "wrap" }}>
                  {itemsOf(step.editor, slotPart).map((id) => {
                    const chosen = step.draft[slotPart] === id;
                    return (
                      <Chip
                        key={id}
                        id={`item-${slotPart}-${id}`}
                        label={partValue(slotPart, id, i18n)}
                        color={chosen ? "primary" : "default"}
                        variant={chosen ? "filled" : "outlined"}
                        onClick={() => pickItem(slotPart, id)}
                      />
                    );
                  })}
                </Stack>
              </>
            )}
            {step.draft.costume1 !== 0 &&
              SLOT_PARTS.slice(1).some((part) => step.editor.state[part] !== 0) && (
                <Alert id="kigurumi-warning" severity="info">
                  {t("costume.kigurumiWarning")}
                </Alert>
              )}
            <Changes from={step.editor.state} to={step.draft} i18n={i18n} />
          </Stack>
        )}

        {step.name === "confirming" && (
          <Stack spacing={2}>
            <Typography>{t("costume.confirmIntro")}</Typography>
            <Changes from={step.editor.state} to={step.draft} i18n={i18n} />
            {!verified && (
              <FormControlLabel
                control={
                  <Checkbox
                    id="costume-first-write"
                    checked={step.acknowledged}
                    onChange={(event) => setStep({ ...step, acknowledged: event.target.checked })}
                  />
                }
                label={
                  <Stack>
                    <Typography variant="body2">{t("costume.firstWrite")}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t("costume.crossCheck")}
                    </Typography>
                  </Stack>
                }
              />
            )}
          </Stack>
        )}

        {step.name === "saving" && (
          <Stack id="costume-saving" direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <CircularProgress size={24} />
            <Typography>{t("costume.saving")}</Typography>
          </Stack>
        )}

        {step.name === "done" && <WriteOutcomeNotice outcome={step.outcome} i18n={i18n} />}
      </DialogContent>
      <DialogActions>
        {step.name === "editing" && (
          <Button
            id="costume-review"
            variant="contained"
            disabled={changedParts(step.editor.state, step.draft).length === 0}
            onClick={() => setStep({ ...step, name: "confirming", acknowledged: false })}
          >
            {t("costume.review")}
          </Button>
        )}
        {step.name === "confirming" && (
          <>
            <Button
              id="costume-back"
              onClick={() => setStep({ name: "editing", editor: step.editor, draft: step.draft })}
            >
              {t("costume.back")}
            </Button>
            <Button
              id="costume-save"
              variant="contained"
              disabled={!verified && !step.acknowledged}
              onClick={() => void save()}
            >
              {t("costume.save")}
            </Button>
          </>
        )}
        {step.name === "done" && (
          <Button
            id="costume-back"
            onClick={() =>
              setStep({ name: "editing", editor: step.editor, draft: step.editor.state })
            }
          >
            {t("costume.back")}
          </Button>
        )}
        <Button id="costume-close" disabled={busy} onClick={onClose}>
          {t("costume.close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Every change a draft makes, part by part, or a line saying there is none. */
function Changes({ from, to, i18n }: { from: CostumeSet; to: CostumeSet; i18n: Translator }) {
  const { t } = i18n;
  const parts = changedParts(from, to);
  return (
    <Stack>
      <Typography variant="subtitle2" component="h3">
        {t("costume.changesHeading")}
      </Typography>
      {parts.length === 0 ? (
        <Typography id="costume-no-changes" variant="body2" color="text.secondary">
          {t("costume.noChanges")}
        </Typography>
      ) : (
        <Box component="ul" id="costume-changes" sx={{ m: 0, pl: 2.5 }}>
          {parts.map((part) => (
            <Typography component="li" variant="body2" key={part}>
              {t("costume.change", {
                part: t(PART_LABEL[part]),
                from: partValue(part, from[part], i18n),
                to: partValue(part, to[part], i18n),
              })}
            </Typography>
          ))}
        </Box>
      )}
    </Stack>
  );
}

/** A slot's choices: はずす, then the owned items, and the item worn now if the list lacks it. */
function itemsOf(editor: CostumeEditorView, part: SlotPart): number[] {
  const owned = editor.slots[SLOT_PARTS.indexOf(part)] ?? [];
  const worn = editor.state[part];
  return [0, ...owned, ...(worn !== 0 && !owned.includes(worn) ? [worn] : [])];
}

/** The editor after a write, with the set as the write last saw it. */
function refreshed(editor: CostumeEditorView, outcome: WriteOutcomeView): CostumeEditorView {
  switch (outcome.kind) {
    case "applied":
    case "appliedNotSynced":
    case "notApplied":
    case "diverged":
      return { ...editor, state: outcome.after };
    case "changedSincePreview":
      return { ...editor, state: outcome.current };
    default:
      return editor;
  }
}
