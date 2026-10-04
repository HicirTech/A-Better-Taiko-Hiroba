import type { Translator } from "@abth/i18n";
import { Box, Stack } from "@mui/material";
import { useRef } from "react";

import { COLUMN_MAX_WIDTH_PX } from "../my-page/costume-page";
import { TitlePlate } from "../my-page/title-plate";
import type { PictureLane } from "../pictures/picture-lane";
import { IN_THE_WINDOW, usePicture } from "../pictures/use-picture";
import type { PictureWant, ProfileView } from "../session-port";
import { NameSection } from "./name-section";
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
  return (
    <Stack
      id="name-title-page"
      spacing={3}
      sx={{ width: 1, maxWidth: COLUMN_MAX_WIDTH_PX, alignSelf: "center" }}
    >
      <Plate profile={profile} lane={lane} i18n={i18n} />
      <TitleSection title={title} worn={profile.title} i18n={i18n} busy={busy} />
      <NameSection name={name} profile={profile} i18n={i18n} busy={busy} />
    </Stack>
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
