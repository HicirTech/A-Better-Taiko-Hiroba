import type { Translator } from "@abth/i18n";
import { Box, Stack } from "@mui/material";
import { useRef } from "react";

import { HIROBA_BLOCK } from "../pictures/hiroba-px";
import type { PictureLane } from "../pictures/picture-lane";
import { IN_THE_WINDOW, usePicture } from "../pictures/use-picture";
import { MY_DON, MyDonTile } from "../profile/my-don-portrait";
import { PLATE_MAX_PX, TitlePlate } from "../profile/title-plate";
import type { PictureWant, ProfileView } from "../shared/session-port";
import { SnapshotFrame } from "../snapshots/snapshot-frame";
import { PanelCard } from "./panel-card";
import { ScorePanel, scorePanelWant } from "./score-panel";

const PLATE: PictureWant = { kind: "titlePlate" };
/** About as tall as the plate and the panel beside it. */
const MY_DON_PX = 360;
// As the Overview on a computer, at its largest: My Don beside the plate and the panel.
const HEAD = {
  display: "grid",
  gridTemplateColumns: `${MY_DON_PX}px ${PLATE_MAX_PX}px`,
  columnGap: 4,
  alignItems: "center",
  justifyContent: "center",
} as const;

/** The Overview as a picture to share: My Don, the plate and the panel, then the shares. */
export function ProfileSnapshot({
  profile,
  lane,
  i18n,
}: {
  readonly profile: ProfileView;
  readonly lane: PictureLane;
  readonly i18n: Translator;
}) {
  const plateBox = useRef<HTMLDivElement>(null);
  const portraitBox = useRef<HTMLSpanElement>(null);
  const panelBox = useRef<HTMLDivElement>(null);
  const plate = usePicture(lane, PLATE, plateBox, { ...IN_THE_WINDOW, order: 0 });
  const myDon = usePicture(lane, MY_DON, portraitBox, { ...IN_THE_WINDOW, order: 1 });
  const panel = usePicture(lane, scorePanelWant(profile.panel.countLevel), panelBox, {
    ...IN_THE_WINDOW,
    order: 2,
  });
  return (
    <SnapshotFrame id="profile-snapshot" readAt={profile.fetchedAt} i18n={i18n}>
      <Box sx={HEAD}>
        <Box sx={HIROBA_BLOCK}>
          <MyDonTile id="profile-snapshot-my-don" ref={portraitBox} answer={myDon} i18n={i18n} />
        </Box>
        <Stack spacing={1} sx={{ alignItems: "center" }}>
          <TitlePlate
            id="profile-snapshot-title-plate"
            ref={plateBox}
            profile={profile}
            answer={plate}
            i18n={i18n}
          />
          <ScorePanel
            id="profile-snapshot-score-panel"
            ref={panelBox}
            panel={profile.panel}
            crowns={profile.crowns}
            answer={panel}
            i18n={i18n}
          />
        </Stack>
      </Box>
      <PanelCard
        crowns={profile.crowns}
        ranks={profile.panel.ranks}
        lane={lane}
        toast={undefined}
        i18n={i18n}
      />
    </SnapshotFrame>
  );
}
