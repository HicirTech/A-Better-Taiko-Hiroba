import { NAME_FIELDS, NAME_FORM_MAX_LENGTH } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import { type KeyboardEvent, useRef, useState } from "react";

import { HIROBA_LANG } from "../language/show-language";
import { useFocusKept, Waiting } from "../my-page/editor-parts";
import { invalidFieldText } from "../my-page/outcome-words";
import { WriteOutcomeNotice } from "../my-page/write-outcome";
import type { ProfileView } from "../session-port";
import { judgeName, type WornName } from "./name-editor-state";
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
  // Both shut while the write runs, and focus would fall to the window's top.
  const save = () => {
    card.current?.focus({ preventScroll: true });
    void name.save();
  };
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
          <Fields name={name} profile={profile} i18n={i18n} busy={busy} onSave={save} />
        </Stack>
      </CardContent>
    </Card>
  );
}

// A composition, as an IME makes one, is not judged until committed: the counter, the "already the
// name worn" note and Save read the text as it stood before it.
function Fields({
  name,
  profile,
  i18n,
  busy,
  onSave,
}: NameSectionProps & { readonly onSave: () => void }) {
  const { t } = i18n;
  const { step } = name;
  const { typed } = step;
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
  const refused = verdict.kind === "refused" && verdict.field !== NAME_FIELDS.closed;
  const savable = !busy && !composing && verdict.kind === "ok";
  return (
    <Stack spacing={2}>
      {closed && (
        <Alert id="name-closed" severity="warning">
          {t("name.closed")}
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
              onKeyDown: (event: KeyboardEvent) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing && savable) {
                  onSave();
                }
              },
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
      {step.name === "idle" && step.notice !== null && (
        <WriteOutcomeNotice id="name-outcome" kind="name" outcome={step.notice} i18n={i18n} />
      )}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2 }}>
        {step.name === "saving" && <Waiting id="name-saving">{t("costume.saving")}</Waiting>}
        <Button id="name-save" variant="contained" disabled={!savable} onClick={onSave}>
          {t("costume.save")}
        </Button>
      </Box>
    </Stack>
  );
}
