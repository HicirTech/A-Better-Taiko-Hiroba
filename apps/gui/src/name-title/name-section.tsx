import { describeName, NAME_FIELDS, NAME_FORM_MAX_LENGTH } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import { useRef, useState } from "react";

import { HIROBA_LANG } from "../language/show-language";
import { useFocusKept, Waiting } from "../my-page/editor-parts";
import { invalidFieldText } from "../my-page/outcome-words";
import { WriteOutcomeNotice } from "../my-page/write-outcome";
import type { ProfileView } from "../session-port";
import { ChangeList } from "./change-list";
import { judgeName, type WornName } from "./name-editor-state";
import { UndoRow } from "./undo-row";
import type { NameEditor } from "./use-name-editor";

export interface NameSectionProps {
  readonly name: NameEditor;
  readonly profile: Pick<ProfileView, "nickname" | "rename">;
  readonly i18n: Translator;
  /** A write, this section's or the title's, is on its way: nothing is pressed meanwhile. */
  readonly busy: boolean;
}

export function NameSection({ name, profile, i18n, busy }: NameSectionProps) {
  const { t } = i18n;
  const { step } = name;
  const card = useRef<HTMLDivElement>(null);
  useFocusKept(card, step.name);
  return (
    <Card
      id="name-section"
      ref={card}
      data-step={step.name}
      tabIndex={-1}
      variant="outlined"
      sx={{ outline: "none" }}
    >
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6" component="h2">
            {t("name.heading")}
          </Typography>
          <StepView name={name} profile={profile} i18n={i18n} busy={busy} />
          <Actions name={name} i18n={i18n} busy={busy} />
        </Stack>
      </CardContent>
    </Card>
  );
}

function StepView({ name, profile, i18n, busy }: NameSectionProps) {
  const { t } = i18n;
  const { step } = name;
  switch (step.name) {
    case "idle":
      return <Fields name={name} profile={profile} i18n={i18n} busy={busy} />;
    case "confirming":
      return (
        <Stack spacing={2}>
          <Typography>{t("costume.confirmIntro")}</Typography>
          <ChangeList
            id="name-changes"
            part={t("name.heading")}
            from={step.expected.nickname}
            to={step.target.nickname}
            i18n={i18n}
          />
          <Alert id="name-may-not-revert" severity="warning">
            {t("name.mayNotRevert")}
          </Alert>
        </Stack>
      );
    case "saving":
      return <Waiting id="name-saving">{t("costume.saving")}</Waiting>;
    case "undoing":
      return <Waiting id="name-undoing">{t("costume.undoing")}</Waiting>;
    case "done":
      return (
        <Stack spacing={2}>
          <WriteOutcomeNotice
            id="name-outcome"
            kind="name"
            outcome={step.outcome}
            asUndo={step.asUndo}
            i18n={i18n}
          />
          <Undo name={name} i18n={i18n} busy={busy} />
        </Stack>
      );
  }
}

function Undo({ name, i18n, busy }: { name: NameEditor; i18n: Translator; busy: boolean }) {
  const { t } = i18n;
  const { undoable } = name;
  if (undoable === null) {
    return null;
  }

  return (
    <UndoRow
      id="name-undo"
      label={t("name.undoLast")}
      at={undoable.at}
      goesBack={t("name.undoBack", { name: undoable.before.nickname })}
      reason={null}
      warning={t("name.undoMayFail")}
      busy={busy}
      onUndo={() => void name.undo()}
      i18n={i18n}
    />
  );
}

// A composition, as an IME makes one, is not judged until committed: the counter, the advice, the
// "already the name worn" note and Review read the text as it stood before it.
function Fields({ name, profile, i18n, busy }: NameSectionProps) {
  const { t } = i18n;
  const { step } = name;
  const typed = step.name === "idle" ? step.typed : null;
  const value = typed ?? profile.nickname;
  const [composing, setComposing] = useState(false);
  const committed = useRef(value);
  if (!composing) {
    committed.current = value;
  }
  const counted = committed.current;
  const worn: WornName = { nickname: profile.nickname, rename: profile.rename };
  const verdict = judgeName(counted, worn);
  const closed = profile.rename === "closed";
  const advice = verdict.kind === "ok" ? describeName(verdict.target.nickname) : null;
  const refused = verdict.kind === "refused" && verdict.field !== NAME_FIELDS.closed;
  return (
    <Stack spacing={2}>
      <Undo name={name} i18n={i18n} busy={busy} />
      {closed && (
        <Alert id="name-closed" severity="warning">
          {t("name.closed")}
        </Alert>
      )}
      {profile.rename === "unknown" && (
        <Alert id="name-unknown" severity="info" variant="outlined">
          {t("name.unknownState")}
        </Alert>
      )}
      <Box>
        <TextField
          id="name-input"
          label={t("name.field")}
          value={value}
          disabled={busy || closed}
          error={refused}
          helperText={
            refused
              ? t("write.invalidTarget", { field: invalidFieldText(verdict.field, i18n) })
              : !composing && typed !== null && verdict.kind === "same"
                ? t("name.same")
                : undefined
          }
          onChange={(event) => name.type(event.target.value)}
          slotProps={{
            htmlInput: {
              maxLength: NAME_FORM_MAX_LENGTH,
              lang: HIROBA_LANG,
              autoComplete: "off",
              onCompositionStart: () => setComposing(true),
              onCompositionEnd: () => setComposing(false),
            },
          }}
          fullWidth
        />
        <Typography
          id="name-counter"
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "right", mt: 0.5 }}
        >
          {t("name.counter", { count: counted.length, max: NAME_FORM_MAX_LENGTH })}
        </Typography>
      </Box>
      <Typography id="name-site-warning" variant="body2" lang={HIROBA_LANG}>
        {t("name.siteWarning")}
      </Typography>
      <Typography id="name-faq-rule" variant="body2" color="text.secondary">
        {t("name.faqRule")}
      </Typography>
      {advice !== null && (advice.outsideHelpCharset || advice.overFiveCharacters) && (
        <Alert id="name-outside-faq" severity="info" variant="outlined">
          {t("name.outsideFaq")}
        </Alert>
      )}
      {advice?.overTenWide && (
        <Alert id="name-wide" severity="info" variant="outlined">
          {t("name.wide")}
        </Alert>
      )}
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          id="name-review"
          variant="contained"
          disabled={busy || composing || verdict.kind !== "ok"}
          onClick={name.review}
        >
          {t("costume.review")}
        </Button>
      </Box>
    </Stack>
  );
}

/** The step's buttons at the foot; idle's Review sits by its field instead. */
function Actions({ name, i18n, busy }: Omit<NameSectionProps, "profile">) {
  const { t } = i18n;
  const { step } = name;
  switch (step.name) {
    case "confirming":
      return (
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button id="name-back" disabled={busy} onClick={name.back}>
            {t("costume.back")}
          </Button>
          <Button
            id="name-save"
            variant="contained"
            disabled={busy}
            onClick={() => void name.save()}
          >
            {t("costume.save")}
          </Button>
        </Box>
      );
    case "done":
      return (
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button id="name-back" disabled={busy} onClick={name.back}>
            {t("costume.back")}
          </Button>
        </Box>
      );
    default:
      return null;
  }
}
