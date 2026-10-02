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
  /** The profile as the window last read it: the plate shows its title and name. */
  readonly profile: ProfileView;
  /** The window's lane for Hiroba's pictures: the plate comes through it. */
  readonly lane: PictureLane;
  readonly i18n: Translator;
  readonly title: TitleEditor;
  readonly name: NameEditor;
}

/**
 * The page that changes the title and the Donder name: the plate they are printed on, as the
 * Overview draws it, so the result is seen, then the Title section and the Name section. One write
 * runs at a time, from either: while it does, nothing on the page is pressed. The sections' state
 * is the window's (use-title-editor.ts, use-name-editor.ts), so going to another page and back, or
 * reading my page again, finds a pick, a field, a review or an outcome as it was.
 */
export function NameTitlePage({ profile, lane, i18n, title, name }: NameTitlePageProps) {
  const busy = title.writing || name.writing;
  return (
    <Stack
      id="name-title-page"
      spacing={3}
      sx={{ width: 1, maxWidth: COLUMN_MAX_WIDTH_PX, alignSelf: "center" }}
    >
      <Plate profile={profile} lane={lane} i18n={i18n} />
      <TitleSection title={title} i18n={i18n} busy={busy} />
      <NameSection name={name} profile={profile} i18n={i18n} busy={busy} />
    </Stack>
  );
}

/** The title plate, asked for once it is on screen, with the plain stand-in until it comes. */
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
