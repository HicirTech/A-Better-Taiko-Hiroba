import type { Translator } from "@abth/i18n";
import { Box, CircularProgress } from "@mui/material";
import type { Ref } from "react";

import type { PictureAnswer } from "../pictures/picture-lane";
import { hirobaPx } from "./hiroba-px";

/** Hiroba's header, #mydon_area, which the portrait sits in under the plate: 290 pixels wide. */
const AREA_WIDTH = 290;
/** Lengths in the header's pixels. */
const hp = hirobaPx(AREA_WIDTH);
/** Hiroba's portrait tile: 136 square, its corners 5 round. */
const TILE_SIDE = 136;
const TILE_RADIUS = 5;
/**
 * The pale blue Hiroba draws behind the Don (cos_icon02_bg), in CSS and the same in either theme,
 * so the tile looks like Hiroba's with the portrait on it or without.
 */
const TILE_BACKGROUND = "#cfe8f7";
/** The spinner over the pale blue, dark in either theme. */
const ON_TILE = "#000";

export interface MyDonPortraitProps {
  /** What the picture lane has of the portrait: the picture, why it did not come, or nothing yet. */
  readonly answer: PictureAnswer | undefined;
  readonly i18n: Translator;
  /** The tile, which the portrait is asked for only once it is on screen. */
  readonly ref: Ref<HTMLDivElement>;
}

/**
 * The player's マイどん as Hiroba's header shows it: Hiroba's own picture of the Don in the costume
 * it wears, as a data: URL, on a pale blue tile of Hiroba's shape. The tile is there at once, with a
 * small spinner until the picture comes; one that does not come leaves the tile empty, and the
 * card's line under it gives the code. Nothing else on the card depends on it.
 */
export function MyDonPortrait({ answer, i18n, ref }: MyDonPortraitProps) {
  const { t } = i18n;
  const picture = answer !== undefined && "view" in answer ? answer.view : null;
  return (
    <Box
      ref={ref}
      id="my-don"
      aria-busy={answer === undefined}
      sx={{
        position: "relative",
        width: hp(TILE_SIDE),
        aspectRatio: "1 / 1",
        mx: "auto",
        mt: hp(5),
        borderRadius: hp(TILE_RADIUS),
        bgcolor: TILE_BACKGROUND,
        overflow: "hidden",
      }}
    >
      {picture !== null && (
        <Box
          component="img"
          id="my-don-image"
          src={picture.src}
          alt={t("profile.myDonAlt")}
          sx={{
            position: "absolute",
            top: "6%",
            left: "6%",
            width: "88%",
            height: "88%",
            objectFit: "contain",
            display: "block",
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
    </Box>
  );
}
