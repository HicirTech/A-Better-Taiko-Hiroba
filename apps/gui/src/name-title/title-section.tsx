import type { TitleOption } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { useRef } from "react";

import { HIROBA_LANG } from "../language/show-language";
import { LoadFailed, useFocusKept, Waiting } from "../my-page/editor-parts";
import { WriteOutcomeNotice } from "../my-page/write-outcome";
import { changesTitle, type TitleStep } from "./title-editor-state";
import { currentOptions } from "./title-options";
import { TitlePicker } from "./title-picker";
import type { TitleEditor } from "./use-title-editor";

export interface TitleSectionProps {
  readonly title: TitleEditor;
  readonly i18n: Translator;
  /** A write, this section's or the name's, is on its way: nothing is pressed meanwhile. */
  readonly busy: boolean;
}

export function TitleSection({ title, i18n, busy }: TitleSectionProps) {
  const { t } = i18n;
  const { step } = title;
  const card = useRef<HTMLDivElement>(null);
  useFocusKept(card, step.name);
  // The picker and button shut while the write runs, so focus would fall to the window's top.
  const save = () => {
    card.current?.focus({ preventScroll: true });
    void title.save();
  };
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
          <Actions title={title} i18n={i18n} busy={busy} onSave={save} />
        </Stack>
      </CardContent>
    </Card>
  );
}

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
    case "saving":
      return (
        <Stack spacing={2}>
          <WornTitle title={step.editor.state.title} i18n={i18n} />
          <TitlePicker
            options={step.editor.options}
            picked={step.picked}
            worn={step.editor.state}
            busy={busy}
            onPick={title.pick}
            i18n={i18n}
          />
          <Notes options={step.editor.options} worn={step.editor.state.title} i18n={i18n} />
          {step.name === "idle" && step.notice !== null && (
            <WriteOutcomeNotice id="title-outcome" kind="title" outcome={step.notice} i18n={i18n} />
          )}
        </Stack>
      );
  }
}

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

function Actions({
  title,
  i18n,
  busy,
  onSave,
}: TitleSectionProps & { readonly onSave: () => void }) {
  const buttons = actionsOf(title.step, title, i18n, busy, onSave);
  return buttons === null ? null : (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2 }}>
      {buttons}
    </Box>
  );
}

function actionsOf(
  step: TitleStep,
  title: TitleEditor,
  { t }: Translator,
  busy: boolean,
  onSave: () => void,
) {
  switch (step.name) {
    case "loadFailed":
      return (
        <Button id="title-reload" disabled={busy} onClick={() => void title.read()}>
          {t("title.reload")}
        </Button>
      );
    case "idle":
    case "saving":
      return (
        <>
          {step.name === "saving" && <Waiting id="title-saving">{t("costume.saving")}</Waiting>}
          <Button
            id="title-save"
            variant="contained"
            disabled={busy || step.picked === null || !changesTitle(step.editor, step.picked)}
            onClick={onSave}
          >
            {t("costume.save")}
          </Button>
        </>
      );
    default:
      return null;
  }
}
