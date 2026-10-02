import type { TitleOption } from "@abth/core";
import type { MessageKey, Translator } from "@abth/i18n";
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { useRef } from "react";

import { HIROBA_LANG } from "../language/show-language";
import { LoadFailed, useFocusKept, Waiting } from "../my-page/editor-parts";
import { WriteOutcomeNotice } from "../my-page/write-outcome";
import { ChangeList } from "./change-list";
import { changesTitle, type TitleStep } from "./title-editor-state";
import { currentOptions, type UndoReadiness, undoReadiness } from "./title-options";
import { TitlePicker } from "./title-picker";
import { UndoRow } from "./undo-row";
import type { TitleEditor } from "./use-title-editor";

/** Why the undo of a title change cannot be pressed, by what the previous title is against the list. */
const UNDO_REASON = {
  ready: null,
  noTitle: "title.undoNoTitle",
  unresolved: "title.undoUnresolved",
  ambiguous: "title.undoAmbiguous",
} as const satisfies Record<UndoReadiness, MessageKey | null>;

export interface TitleSectionProps {
  readonly title: TitleEditor;
  readonly i18n: Translator;
  /** A write, this section's or the name's, is on its way: nothing is pressed meanwhile. */
  readonly busy: boolean;
}

/**
 * The Title section: the title worn, the owned titles to pick another from, a review of the change,
 * the outcome of the last write and the way back from it. Its state is the window's
 * (use-title-editor.ts), so a pick or an outcome is still here after a visit to another page.
 */
export function TitleSection({ title, i18n, busy }: TitleSectionProps) {
  const { t } = i18n;
  const { step } = title;
  const card = useRef<HTMLDivElement>(null);
  useFocusKept(card, step.name);
  return (
    <Card
      id="title-section"
      ref={card}
      data-step={step.name}
      tabIndex={-1}
      variant="outlined"
      sx={{ outline: "none" }}
    >
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6" component="h2">
            {t("title.heading")}
          </Typography>
          <StepView title={title} i18n={i18n} busy={busy} />
          <Actions title={title} i18n={i18n} busy={busy} />
        </Stack>
      </CardContent>
    </Card>
  );
}

/** The title as Hiroba writes it, or the words for no title. */
const shown = (title: string, { t }: Translator) => (title === "" ? t("profile.noTitle") : title);

function StepView({ title, i18n, busy }: TitleSectionProps) {
  const { t } = i18n;
  const { step } = title;
  switch (step.name) {
    case "unread":
    case "loading":
      return <Waiting id="title-reading">{t("title.reading")}</Waiting>;
    case "loadFailed":
      return <LoadFailed id="title-load-failed" failure={step.failure} i18n={i18n} />;
    case "idle":
      return (
        <Stack spacing={2}>
          <WornTitle title={step.editor.state.title} i18n={i18n} />
          <Undo title={title} options={step.editor.options} i18n={i18n} busy={busy} />
          <TitlePicker
            options={step.editor.options}
            picked={step.picked}
            worn={step.editor.state}
            busy={busy}
            onPick={title.pick}
            i18n={i18n}
          />
          <Notes options={step.editor.options} worn={step.editor.state.title} i18n={i18n} />
        </Stack>
      );
    case "confirming":
      return (
        <Stack spacing={2}>
          <Typography>{t("costume.confirmIntro")}</Typography>
          <ChangeList
            id="title-changes"
            part={t("title.heading")}
            from={shown(step.editor.state.title, i18n)}
            to={step.picked.label}
            i18n={i18n}
          />
        </Stack>
      );
    case "saving":
      return <Waiting id="title-saving">{t("costume.saving")}</Waiting>;
    case "undoing":
      return <Waiting id="title-undoing">{t("costume.undoing")}</Waiting>;
    case "done":
      return (
        <Stack spacing={2}>
          <WriteOutcomeNotice
            id="title-outcome"
            kind="title"
            outcome={step.outcome}
            asUndo={step.asUndo}
            i18n={i18n}
          />
          <Undo title={title} options={step.editor.options} i18n={i18n} busy={busy} />
        </Stack>
      );
  }
}

/** The title worn now, in Hiroba's words: what the plate above shows too. */
function WornTitle({ title, i18n }: { title: string; i18n: Translator }) {
  return title === "" ? (
    <Typography id="title-current" color="text.secondary">
      {i18n.t("profile.noTitle")}
    </Typography>
  ) : (
    <Typography id="title-current" lang={HIROBA_LANG} sx={{ fontWeight: 600 }}>
      {title}
    </Typography>
  );
}

/** What the list says of the title worn: titles that share its name, or no title of the list with it. */
function Notes({
  options,
  worn,
  i18n,
}: {
  options: readonly TitleOption[];
  worn: string;
  i18n: Translator;
}) {
  const { t } = i18n;
  const matches = currentOptions(options, { title: worn }).size;
  return (
    <Stack spacing={1}>
      <Typography id="title-count" variant="body2" color="text.secondary">
        {options.length === 0 ? t("title.none") : t("title.count", { count: options.length })}
      </Typography>
      {matches > 1 && (
        <Alert id="title-shared" severity="info" variant="outlined">
          {t("title.shared", { count: matches })}
        </Alert>
      )}
      {matches === 0 && worn.trim() !== "" && (
        <Alert id="title-not-listed" severity="info" variant="outlined">
          {t("title.notListed")}
        </Alert>
      )}
    </Stack>
  );
}

/** The undo of the last title change, while this device offers one, shut with a reason when it cannot be sent. */
function Undo({
  title,
  options,
  i18n,
  busy,
}: {
  title: TitleEditor;
  options: readonly TitleOption[];
  i18n: Translator;
  busy: boolean;
}) {
  const { t } = i18n;
  const { undoable } = title;
  if (undoable === null) {
    return null;
  }

  const reason = UNDO_REASON[undoReadiness(options, undoable.before)];
  return (
    <UndoRow
      id="title-undo"
      label={t("title.undoLast")}
      at={undoable.at}
      goesBack={t("title.undoBack", { title: shown(undoable.before.title, i18n) })}
      reason={reason === null ? null : t(reason)}
      busy={busy}
      onUndo={() => void title.undo()}
      i18n={i18n}
    />
  );
}

/** The step's buttons, at the section's foot, or nothing where a step has none. */
function Actions({ title, i18n, busy }: TitleSectionProps) {
  const buttons = actionsOf(title.step, title, i18n, busy);
  return buttons === null ? null : (
    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>{buttons}</Box>
  );
}

function actionsOf(step: TitleStep, title: TitleEditor, { t }: Translator, busy: boolean) {
  switch (step.name) {
    case "loadFailed":
      return (
        <Button id="title-reload" disabled={busy} onClick={() => void title.read()}>
          {t("title.reload")}
        </Button>
      );
    case "idle":
      return (
        <Button
          id="title-review"
          variant="contained"
          disabled={busy || step.picked === null || !changesTitle(step.editor, step.picked)}
          onClick={title.review}
        >
          {t("costume.review")}
        </Button>
      );
    case "confirming":
      return (
        <>
          <Button id="title-back" disabled={busy} onClick={title.back}>
            {t("costume.back")}
          </Button>
          <Button
            id="title-save"
            variant="contained"
            disabled={busy}
            onClick={() => void title.save()}
          >
            {t("costume.save")}
          </Button>
        </>
      );
    case "done":
      return (
        <Button id="title-back" disabled={busy} onClick={title.back}>
          {t("costume.back")}
        </Button>
      );
    default:
      return null;
  }
}
