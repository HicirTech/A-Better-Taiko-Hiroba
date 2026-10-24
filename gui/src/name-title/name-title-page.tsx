import type { Translator } from "@abth/i18n";
import { Box, Stack } from "@mui/material";
import { useRef, useState } from "react";

import { COLUMN_MAX_WIDTH_PX } from "../my-page/costume-page";
import { TitlePlate } from "../my-page/title-plate";
import type { PictureLane } from "../pictures/picture-lane";
import { IN_THE_WINDOW, usePicture } from "../pictures/use-picture";
import type { PictureWant, ProfileView } from "../shared/session-port";
import { SYNC_BAR_PAGE, SyncBar } from "../ui/sync-bar";
import { judgeName } from "./name-editor-state";
import { NameSection } from "./name-section";
import { canSaveTitle } from "./title-editor-state";
import { TitleSection } from "./title-section";
import type { NameEditor } from "./use-name-editor";
import type { TitleEditor } from "./use-title-editor";

const PLATE: PictureWant = { kind: "titlePlate" };

export interface NameTitlePageProps {
  readonly profile: ProfileView;
  readonly lane: PictureLane;
  readonly i18n: Translator;
  readonly title: TitleEditor;
  readonly name: NameEditor;
  /** Any write, the costume's too, is on its way: nothing is pressed meanwhile. */
  readonly busy: boolean;
}

export function NameTitlePage({ profile, lane, i18n, title, name, busy }: NameTitlePageProps) {
  const [composing, setComposing] = useState(false);
  const page = useRef<HTMLDivElement>(null);
  const { typed } = name.step;
  const titleReady = canSaveTitle(title.step, profile.title);
  const verdict = judgeName(typed, { nickname: profile.nickname, rename: profile.rename });
  const nameReady = name.step.name === "idle" && verdict.kind === "ok";
  // A nickname that cannot be sent holds the bar back, as its field says why.
  const nameHeld = typed !== null && (verdict.kind === "empty" || verdict.kind === "refused");
  const canSync = !busy && !composing && !nameHeld && (titleReady || nameReady);
  // The title goes first; one Hiroba did not take keeps the nickname back, to be sent again.
  const sync = async () => {
    page.current?.focus({ preventScroll: true });
    if (titleReady && !(await title.save())) {
      return;
    }
    if (nameReady) {
      await name.save();
    }
  };
  return (
    <Box
      ref={page}
      id="name-title-page"
      tabIndex={-1}
      sx={{
        ...SYNC_BAR_PAGE,
        width: 1,
        maxWidth: COLUMN_MAX_WIDTH_PX,
        alignSelf: "center",
        outline: "none",
      }}
    >
      <Stack spacing={3} sx={{ pb: 3 }}>
        <Plate profile={profile} lane={lane} i18n={i18n} />
        <TitleSection title={title} worn={profile.title} i18n={i18n} busy={busy} />
        <NameSection
          name={name}
          profile={profile}
          i18n={i18n}
          busy={busy}
          composing={composing}
          onComposing={setComposing}
          onSync={canSync ? () => void sync() : undefined}
        />
      </Stack>
      <SyncBar
        id="name-title"
        canSync={canSync}
        onSync={() => void sync()}
        onReset={() => {
          title.dropEdits();
          name.dropEdits();
        }}
        canReset={!busy && (title.step.picked !== null || typed !== null)}
        saving={title.step.name === "saving" || name.step.name === "saving"}
        i18n={i18n}
      />
    </Box>
  );
}

function Plate({
  profile,
  lane,
  i18n,
}: {
  profile: ProfileView;
  lane: PictureLane;
  i18n: Translator;
}) {
  const box = useRef<HTMLDivElement>(null);
  const answer = usePicture(lane, PLATE, box, { ...IN_THE_WINDOW, order: 0 });
  return (
    <Box sx={{ display: "flex", justifyContent: "center" }}>
      <TitlePlate ref={box} profile={profile} answer={answer} i18n={i18n} />
    </Box>
  );
}
