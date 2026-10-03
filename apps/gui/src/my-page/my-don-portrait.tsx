import type { Translator } from "@abth/i18n";
import { Box, CircularProgress, SvgIcon } from "@mui/material";
import type { Ref } from "react";

import { type PictureAnswer, viewOf } from "../pictures/picture-lane";
import type { PictureWant } from "../session-port";
import { HIROBA_BLOCK, hirobaPx } from "./hiroba-px";
import { FOCUS_RING, type OpenAction, OpenButton } from "./open-button";

export const MY_DON: PictureWant = { kind: "myDon" };

const HIROBA_TILE_SIDE_PX = 136;
const HIROBA_TILE_RADIUS_PX = 5;
const hp = hirobaPx(HIROBA_TILE_SIDE_PX);
// Hiroba's cos_icon02_bg blue stays pale in either theme, so the spinner on it is always dark.
const TILE_BACKGROUND = "#cfe8f7";
const ON_TILE = "#000";
const BADGE_SIDE_PX = 32;
const TILE = {
  display: "block",
  position: "relative",
  width: 1,
  aspectRatio: "1 / 1",
  borderRadius: hp(HIROBA_TILE_RADIUS_PX),
  bgcolor: TILE_BACKGROUND,
  overflow: "hidden",
} as const;

export interface MyDonPortraitProps {
  readonly answer: PictureAnswer | undefined;
  readonly action: OpenAction;
  readonly i18n: Translator;
  /** The tile; the portrait is asked for once it is on screen. */
  readonly ref: Ref<HTMLSpanElement>;
}

export function MyDonPortrait({ answer, action, i18n, ref }: MyDonPortraitProps) {
  const { t } = i18n;
  return (
    <Box sx={{ ...HIROBA_BLOCK, width: 1 }}>
      <OpenButton
        id="costume-open"
        label={t("costume.open")}
        hint={t("costume.openByLongPress")}
        action={action}
        sx={{
          ...FOCUS_RING,
          display: "block",
          width: 1,
          borderRadius: hp(HIROBA_TILE_RADIUS_PX),
          "&.Mui-focusVisible #costume-open-badge": { opacity: 1 },
          // Hover alone: on a touch screen, a tap would leave the badge up.
          "@media (hover: hover)": { "&:hover #costume-open-badge": { opacity: 1 } },
        }}
      >
        <MyDonTile ref={ref} answer={answer} i18n={i18n} />
        <EditBadge alwaysUp={action.byLongPress} />
      </OpenButton>
    </Box>
  );
}

function MyDonTile({ answer, i18n, ref }: Pick<MyDonPortraitProps, "answer" | "i18n" | "ref">) {
  return (
    <Box ref={ref} component="span" id="my-don" aria-busy={answer === undefined} sx={TILE}>
      <TileContent answer={answer} i18n={i18n} />
    </Box>
  );
}

function TileContent({ answer, i18n }: Pick<MyDonPortraitProps, "answer" | "i18n">) {
  const { t } = i18n;
  const picture = viewOf(answer);
  return (
    <>
      {picture !== null && (
        <Box
          component="img"
          id="my-don-image"
          src={picture.src}
          alt={t("profile.myDonAlt")}
          draggable={false}
          sx={{
            position: "absolute",
            top: "6%",
            left: "6%",
            width: "88%",
            height: "88%",
            objectFit: "contain",
            display: "block",
            // A long press is the tile's: never the picture's own menu.
            pointerEvents: "none",
          }}
        />
      )}
      {answer === undefined && (
        <CircularProgress
          id="my-don-loading"
          size={14}
          aria-label={t("pictures.loading")}
          sx={{ position: "absolute", top: 4, right: 4, color: ON_TILE }}
        />
      )}
    </>
  );
}

function EditBadge({ alwaysUp }: { alwaysUp: boolean }) {
  return (
    <Box
      id="costume-open-badge"
      component="span"
      aria-hidden
      sx={{
        position: "absolute",
        right: hp(6),
        bottom: hp(6),
        width: BADGE_SIDE_PX,
        height: BADGE_SIDE_PX,
        borderRadius: "50%",
        bgcolor: "primary.main",
        color: "primary.contrastText",
        boxShadow: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: alwaysUp ? 1 : 0,
        transition: (theme) =>
          theme.transitions.create("opacity", { duration: theme.transitions.duration.shortest }),
      }}
    >
      <EditIcon />
    </Box>
  );
}

// Material's "edit" icon (Apache 2.0), inline because the icons package is not a dependency.
function EditIcon() {
  return (
    <SvgIcon aria-hidden fontSize="small">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z" />
    </SvgIcon>
  );
}
