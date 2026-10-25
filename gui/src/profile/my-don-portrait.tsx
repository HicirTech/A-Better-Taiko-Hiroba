import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";
import type { Ref } from "react";

import { HirobaPicture } from "../pictures/hiroba-picture";
import { HIROBA_BLOCK, hirobaPx } from "../pictures/hiroba-px";
import { type PictureAnswer, viewOf } from "../pictures/picture-lane";
import type { PictureWant } from "../shared/session-port";
import { FOCUS_RING, type OpenAction, OpenButton } from "../ui/open-button";

export const MY_DON: PictureWant = { kind: "myDon" };

const HIROBA_TILE_SIDE_PX = 136;
const HIROBA_TILE_RADIUS_PX = 5;
const hp = hirobaPx(HIROBA_TILE_SIDE_PX);
// Hiroba's cos_icon02_bg blue stays pale in either theme, so the spinner on it is always dark.
const TILE_BACKGROUND = "#cfe8f7";
const ON_TILE = "#000";
const TILE = {
  display: "block",
  position: "relative",
  width: 1,
  aspectRatio: "1 / 1",
  borderRadius: hp(HIROBA_TILE_RADIUS_PX),
  bgcolor: TILE_BACKGROUND,
  overflow: "hidden",
} as const;

const PORTRAIT = {
  position: "absolute",
  top: "6%",
  left: "6%",
  width: "88%",
  height: "88%",
  objectFit: "contain",
  display: "block",
  // A long press is the tile's: never the picture's own menu.
  pointerEvents: "none",
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
        }}
      >
        <MyDonTile id="my-don" ref={ref} answer={answer} i18n={i18n} />
      </OpenButton>
    </Box>
  );
}

/** My Don on Hiroba's pale tile, a picture alone, as a snapshot draws it in a Hiroba block. */
export function MyDonTile({
  id,
  answer,
  i18n,
  ref,
}: Pick<MyDonPortraitProps, "answer" | "i18n" | "ref"> & { readonly id: string }) {
  return (
    <HirobaPicture
      ref={ref}
      component="span"
      id={id}
      src={viewOf(answer)?.src ?? null}
      onItsWay={answer === undefined}
      alt={i18n.t("profile.myDonAlt")}
      wordsColour={ON_TILE}
      sx={TILE}
      imageSx={PORTRAIT}
      i18n={i18n}
    />
  );
}
