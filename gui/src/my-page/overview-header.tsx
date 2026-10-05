import type { Translator } from "@abth/i18n";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { useRef } from "react";

import { type PictureAnswer, type PictureLane, viewOf } from "../pictures/picture-lane";
import { useDrawnTop } from "../pictures/use-drawn-top";
import { IN_THE_WINDOW, usePicture } from "../pictures/use-picture";
import type { PictureView, PictureWant, ProfileView } from "../session-port";
import { HIROBA_BLOCK, hirobaPx, MAX_BLOCK_SCALE } from "./hiroba-px";
import { MY_DON, MyDonPortrait } from "./my-don-portrait";
import type { OpenAction } from "./open-button";
import { panelHeightRatio, ScorePanel, scorePanelWant } from "./score-panel";
import { plateBandTop, plateHeightRatio, TitlePlate } from "./title-plate";

// Hiroba's header, #mydon_area: 290 pixels wide.
const AREA_WIDTH = 290;
const hp = hirobaPx(AREA_WIDTH);
const PANEL_MARGIN = 5;
const PORTRAIT_SIDE_ABOVE = 136;
// The plate's columns under the portrait, which stands above it on a phone.
const UNDER_PORTRAIT_FROM = (AREA_WIDTH - PORTRAIT_SIDE_ABOVE) / 2 / AREA_WIDTH;
const UNDER_PORTRAIT_TO = 1 - UNDER_PORTRAIT_FROM;
const COLUMN_GAP_PX = 16;
const PLATE: PictureWant = { kind: "titlePlate" };

const failureOf = (answer: PictureAnswer | undefined): string | null =>
  answer !== undefined && "failure" in answer ? answer.failure : null;

/** The tile's side over the column's width: the plate, the panel's margin and the panel. */
function tileSideRatio(plate: PictureView | null, art: PictureView | null): number {
  const panelWidth = (AREA_WIDTH - 2 * PANEL_MARGIN) / AREA_WIDTH;
  return plateHeightRatio(plate) + PANEL_MARGIN / AREA_WIDTH + panelWidth * panelHeightRatio(art);
}

/** The plate's top rows that draw nothing under the portrait, never its band: on a phone they tuck
 * under the portrait. In Hiroba pixels. */
function tuckedRows(plate: PictureView | null, drawnTop: number | null): number {
  const bandTop = plateBandTop(plate);
  return Math.min(drawnTop ?? bandTop, bandTop) * AREA_WIDTH * plateHeightRatio(plate);
}

export interface OverviewHeaderProps {
  readonly profile: ProfileView;
  readonly lane: PictureLane;
  readonly i18n: Translator;
  readonly portrait: OpenAction;
  readonly namePlate: OpenAction;
}

export function OverviewHeader({ profile, lane, i18n, portrait, namePlate }: OverviewHeaderProps) {
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
  const plateView = viewOf(plate);
  const tileSide = tileSideRatio(plateView, viewOf(panel));
  const drawnTop = useDrawnTop(plateView, UNDER_PORTRAIT_FROM, UNDER_PORTRAIT_TO);
  const tucked = tuckedRows(plateView, drawnTop);

  return (
    <Stack id="profile" spacing={1} sx={{ alignItems: "center" }}>
      <Box
        id="overview-header"
        sx={{
          display: "grid",
          width: 1,
          columnGap: `${COLUMN_GAP_PX}px`,
          alignItems: "start",
          justifyItems: "center",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: `minmax(0, ${tileSide}fr) minmax(0, 1fr)`,
          },
          maxWidth: {
            xs: AREA_WIDTH * MAX_BLOCK_SCALE,
            sm: (tileSide + 1) * AREA_WIDTH * MAX_BLOCK_SCALE + COLUMN_GAP_PX,
          },
        }}
      >
        {/* Over the plate's tucked top, so a tap there is the portrait's. */}
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            width: { xs: `${(PORTRAIT_SIDE_ABOVE / AREA_WIDTH) * 100}%`, sm: 1 },
          }}
        >
          <MyDonPortrait ref={portraitBox} answer={myDon} action={portrait} i18n={i18n} />
        </Box>
        <Box sx={{ ...HIROBA_BLOCK, width: 1 }}>
          {/* What the plate draws under the portrait on a phone sits as close to it as the panel
              sits to the plate. */}
          <Box sx={{ mt: { xs: hp(PANEL_MARGIN - tucked), sm: 0 } }}>
            <TitlePlate
              ref={plateBox}
              profile={profile}
              answer={plate}
              i18n={i18n}
              action={namePlate}
            />
          </Box>
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
