import type { Translator } from "@abth/i18n";
import { Stack } from "@mui/material";
import { useRef } from "react";

import { useFocusKept, Waiting } from "../my-page/editor-parts";
import { WriteOutcomeNotice } from "../my-page/write-outcome";
import { ControlWithSave } from "./control-with-save";
import { canSaveTitle } from "./title-editor-state";
import { TitlePicker } from "./title-picker";
import type { TitleEditor } from "./use-title-editor";

export interface TitleSectionProps {
  readonly title: TitleEditor;
  /** The title worn, as my page shows it: "" when none. */
  readonly worn: string;
  readonly i18n: Translator;
  /** Any write, the costume's too, is on its way: nothing is pressed meanwhile. */
  readonly busy: boolean;
}

export function TitleSection({ title, worn, i18n, busy }: TitleSectionProps) {
  const { t } = i18n;
  const { step } = title;
  const section = useRef<HTMLDivElement>(null);
  useFocusKept(section, step.name);
  // The picker and button shut while the write runs, so focus would fall to the window's top.
  const save = () => {
    section.current?.focus({ preventScroll: true });
    void title.save();
  };
  return (
    <Stack
      id="title-section"
      ref={section}
      data-step={step.name}
      data-list={step.list.name}
      tabIndex={-1}
      spacing={1}
      sx={{ outline: "none" }}
    >
      <ControlWithSave
        id="title-save"
        disabled={busy || !canSaveTitle(step, worn)}
        onSave={save}
        i18n={i18n}
      >
        <TitlePicker
          worn={worn}
          picked={step.picked}
          list={step.list}
          busy={busy}
          onOpen={() => void title.readList()}
          onPick={title.pick}
          i18n={i18n}
        />
      </ControlWithSave>
      {step.name === "saving" && <Waiting id="title-saving">{t("costume.saving")}</Waiting>}
      {step.name === "idle" && step.notice !== null && (
        <WriteOutcomeNotice id="title-outcome" kind="title" outcome={step.notice} i18n={i18n} />
      )}
    </Stack>
  );
}
