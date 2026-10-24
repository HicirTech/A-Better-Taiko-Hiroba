import type { Translator } from "@abth/i18n";
import { Stack } from "@mui/material";
import { useRef } from "react";
import { useFocusKept } from "../ui/editor-parts";
import { LoadFailed } from "../ui/read-failure-alert";
import { WriteOutcomeSnackbar } from "../ui/write-outcome";
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
  const { step } = title;
  const section = useRef<HTMLDivElement>(null);
  useFocusKept(section, step.name);
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
      <TitlePicker
        worn={worn}
        picked={step.picked}
        list={step.list}
        busy={busy}
        onOpen={() => void title.readList()}
        onPick={title.pick}
        i18n={i18n}
      />
      {step.list.name === "failed" && (
        <LoadFailed id="title-list-failure" failure={step.list.failure} i18n={i18n} />
      )}
      {step.name === "idle" && step.notice !== null && (
        <WriteOutcomeSnackbar
          id="title-outcome"
          kind="title"
          outcome={step.notice}
          i18n={i18n}
          onClosed={title.closeNotice}
        />
      )}
    </Stack>
  );
}
