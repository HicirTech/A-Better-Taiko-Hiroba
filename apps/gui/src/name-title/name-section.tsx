import { NAME_FIELDS, NAME_FORM_MAX_LENGTH } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Alert, Box, Stack, TextField } from "@mui/material";
import { type KeyboardEvent, useRef, useState } from "react";

import { HIROBA_LANG } from "../language/show-language";
import { useFocusKept, Waiting } from "../my-page/editor-parts";
import { invalidFieldText } from "../my-page/outcome-words";
import { WriteOutcomeNotice } from "../my-page/write-outcome";
import type { ProfileView } from "../session-port";
import { ControlWithSave } from "./control-with-save";
import { judgeName, type WornName } from "./name-editor-state";
import type { NameEditor } from "./use-name-editor";

export interface NameSectionProps {
  readonly name: NameEditor;
  readonly profile: Pick<ProfileView, "nickname" | "rename">;
  readonly i18n: Translator;
  /** Any write, the costume's too, is on its way: nothing is pressed meanwhile. */
  readonly busy: boolean;
}

// A composition, as an IME makes one, is not judged until committed: the counter, the "already the
// name worn" note and Save read the text as it stood before it.
export function NameSection({ name, profile, i18n, busy }: NameSectionProps) {
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

  const section = useRef<HTMLDivElement>(null);
  useFocusKept(section, step.name);
  // The field and button shut while the write runs, so focus would fall to the window's top.
  const save = () => {
    section.current?.focus({ preventScroll: true });
    void name.save();
  };
  // Hiroba's notice stands under the field until there is something to say about the name typed.
  const hint = refused
    ? t("write.invalidTarget", { field: invalidFieldText(verdict.field, i18n) })
    : !composing && typed !== null && verdict.kind === "same"
      ? t("name.same")
      : null;
  return (
    <Stack
      id="name-section"
      ref={section}
      data-step={step.name}
      tabIndex={-1}
      spacing={1}
      sx={{ outline: "none" }}
    >
      {closed && (
        <Alert id="name-closed" severity="warning">
          {t("name.closed")}
        </Alert>
      )}
      <ControlWithSave id="name-save" disabled={!savable} onSave={save} i18n={i18n}>
        <TextField
          id="name-input"
          label={t("name.heading")}
          value={value}
          disabled={busy || closed}
          error={refused}
          helperText={
            <Box component="span" sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
              <span id="name-hint" lang={hint === null ? HIROBA_LANG : undefined}>
                {hint ?? t("name.siteWarning")}
              </span>
              <Box component="span" id="name-counter" sx={{ flexShrink: 0 }}>
                {t("name.counter", { count: counted.length, max: NAME_FORM_MAX_LENGTH })}
              </Box>
            </Box>
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
                  save();
                }
              },
            },
          }}
          fullWidth
        />
      </ControlWithSave>
      {step.name === "saving" && <Waiting id="name-saving">{t("costume.saving")}</Waiting>}
      {step.name === "idle" && step.notice !== null && (
        <WriteOutcomeNotice id="name-outcome" kind="name" outcome={step.notice} i18n={i18n} />
      )}
    </Stack>
  );
}
