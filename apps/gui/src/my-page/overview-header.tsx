import type { Translator } from "@abth/i18n";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { useRef } from "react";

import type { PictureAnswer, PictureLane } from "../pictures/picture-lane";
import { IN_THE_WINDOW, usePicture } from "../pictures/use-picture";
import type { PictureWant, ProfileView } from "../session-port";
import { HIROBA_BLOCK, hirobaPx } from "./hiroba-px";
import { MY_DON, MyDonPortrait, type PortraitAction } from "./my-don-portrait";
import { ScorePanel, scorePanelWant } from "./score-panel";
import { TitlePlate } from "./title-plate";

/** Hiroba's header, #mydon_area: 290 pixels wide, the plate across it and the score panel under. */
const AREA_WIDTH = 290;
/** Lengths in the header's pixels. */
const hp = hirobaPx(AREA_WIDTH);
/** The score panel's margin within the header, as my page's .total_score has it, all round. */
const PANEL_MARGIN = 5;
/**
 * The portrait's side, in the header's pixels: beside the plate and the panel, about their height
 * together, so the two columns end level; above them, on a narrow window, Hiroba's own 136.
 */
const PORTRAIT_SIDE_BESIDE = 224;
const PORTRAIT_SIDE_ABOVE = 136;
/** At most half again Hiroba's own size, as each of its blocks. */
const MAX_SCALE = 1.5;
/** The space between the portrait and the plate. */
const GAP_PX = 16;
const PLATE: PictureWant = { kind: "titlePlate" };

/** Why a picture did not come, as the lane has it, or null while it has none or it came. */
const failureOf = (answer: PictureAnswer | undefined): string | null =>
  answer !== undefined && "failure" in answer ? answer.failure : null;

export interface OverviewHeaderProps {
  readonly profile: ProfileView;
  readonly lane: PictureLane;
  readonly i18n: Translator;
  /** What a press on the portrait does: jump to the Costume page. */
  readonly portrait: PortraitAction;
}

/**
 * The top of the Overview, shaped like the header of Hiroba's my page (the user's call,
 * 2026-09-29): the player's マイどん on the left; on the right, the title plate with the title, the
 * name and the dan over it, and under the plate, Hiroba's score panel with its ten counts written
 * over its art. On a narrow window they stack, the portrait first. No background art and none of
 * Hiroba's yellow: they sit on the app's own surface. The portrait jumps to the Costume page.
 *
 * Each picture is asked for once it is on screen, and each has a plain stand-in of its geometry
 * until it comes, or if it does not, so every word and number reads the same without it. A dan
 * label that did not read says so under the header, with its code; so does a picture that did not
 * come, with the first one's code.
 */
export function OverviewHeader({ profile, lane, i18n, portrait }: OverviewHeaderProps) {
  const { t } = i18n;
  const { dan } = profile;
  const plateBox = useRef<HTMLDivElement>(null);
  const portraitBox = useRef<HTMLSpanElement>(null);
  const panelBox = useRef<HTMLDivElement>(null);
  const plate = usePicture(lane, PLATE, plateBox, { ...IN_THE_WINDOW, order: 0 });
  const myDon = usePicture(lane, MY_DON, portraitBox, { ...IN_THE_WINDOW, order: 1 });
  const panel = usePicture(lane, scorePanelWant(profile.panel.countLevel), panelBox, {
    ...IN_THE_WINDOW,
    order: 2,
  });
  const failure = failureOf(plate) ?? failureOf(myDon) ?? failureOf(panel);

  return (
    <Stack spacing={1} sx={{ alignItems: "center" }}>
      <Box
        id="overview-header"
        sx={{
          display: "grid",
          width: 1,
          gap: `${GAP_PX}px`,
          alignItems: "start",
          justifyItems: "center",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: `minmax(0, ${PORTRAIT_SIDE_BESIDE}fr) minmax(0, ${AREA_WIDTH}fr)`,
          },
          maxWidth: {
            xs: AREA_WIDTH * MAX_SCALE,
            sm: (PORTRAIT_SIDE_BESIDE + AREA_WIDTH) * MAX_SCALE + GAP_PX,
          },
        }}
      >
        <Box sx={{ width: { xs: `${(PORTRAIT_SIDE_ABOVE / AREA_WIDTH) * 100}%`, sm: 1 } }}>
          <MyDonPortrait ref={portraitBox} answer={myDon} action={portrait} i18n={i18n} />
        </Box>
        <Box sx={{ ...HIROBA_BLOCK, width: 1 }}>
          <TitlePlate ref={plateBox} profile={profile} answer={plate} i18n={i18n} />
          <Box sx={{ m: hp(PANEL_MARGIN) }}>
            <ScorePanel
              ref={panelBox}
              panel={profile.panel}
              crowns={profile.crowns}
              answer={panel}
              i18n={i18n}
            />
          </Box>
        </Box>
      </Box>
      {dan !== null && "unreadable" in dan && (
        <Stack spacing={0.5} sx={{ alignItems: "center" }}>
          <Chip
            id="dan-unreadable"
            label={t("profile.danUnreadable")}
            size="small"
            variant="outlined"
          />
          <Typography
            id="dan-code"
            variant="body2"
            color="text.secondary"
            sx={{ fontFamily: "monospace", userSelect: "text", wordBreak: "break-all" }}
          >
            {t("profile.danCode", { code: dan.code })}
          </Typography>
        </Stack>
      )}
      {failure !== null && (
        <Stack id="pictures-unavailable" sx={{ alignItems: "center", textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            {t("pictures.unavailable")}
          </Typography>
          <Typography
            id="pictures-code"
            variant="body2"
            color="text.secondary"
            sx={{ fontFamily: "monospace", userSelect: "text", wordBreak: "break-all" }}
          >
            {t("pictures.code", { code: failure })}
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}
