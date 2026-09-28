import type { Translator } from "@abth/i18n";
import { Box, ButtonBase, CircularProgress, SvgIcon, Tooltip } from "@mui/material";
import type { Ref } from "react";

import type { PictureAnswer } from "../pictures/picture-lane";
import { HIROBA_BLOCK, hirobaPx, VISUALLY_HIDDEN } from "./hiroba-px";

/** Hiroba's portrait tile: 136 square, its corners 5 round. */
const TILE_SIDE = 136;
const TILE_RADIUS = 5;
/** Lengths in the tile's pixels, however large the header draws it. */
const hp = hirobaPx(TILE_SIDE);
/**
 * The pale blue Hiroba draws behind the Don (cos_icon02_bg), in CSS and the same in either theme,
 * so the tile looks like Hiroba's with the portrait on it or without.
 */
const TILE_BACKGROUND = "#cfe8f7";
/** The spinner over the pale blue, dark in either theme. */
const ON_TILE = "#000";
/** The edit badge's side: small, in the tile's corner, the same at any size of tile. */
const BADGE_SIDE_PX = 32;
/** The tile, drawn the same whether a click on it opens the editor or not. */
const TILE = {
  display: "block",
  position: "relative",
  width: 1,
  aspectRatio: "1 / 1",
  borderRadius: hp(TILE_RADIUS),
  bgcolor: TILE_BACKGROUND,
  overflow: "hidden",
} as const;

/**
 * What a click on the portrait does: opens the costume editor, when this run may change the
 * costume, and nothing while `busy`, as while an undo runs; or nothing at all where the costume may
 * not be changed (Android, packaged builds), which the portrait then says.
 */
export type PortraitAction =
  | { readonly kind: "opensEditor"; readonly open: () => void; readonly busy: boolean }
  | { readonly kind: "shut" };

export interface MyDonPortraitProps {
  /** What the picture lane has of the portrait: the picture, why it did not come, or nothing yet. */
  readonly answer: PictureAnswer | undefined;
  readonly action: PortraitAction;
  readonly i18n: Translator;
  /** The tile, which the portrait is asked for only once it is on screen. */
  readonly ref: Ref<HTMLSpanElement>;
}

/**
 * The player's マイどん as Hiroba's header shows it: Hiroba's own picture of the Don in the costume
 * it wears, as a data: URL, on a pale blue tile of Hiroba's shape, as wide as the header makes
 * room for. The tile is there at once, with a small spinner until the picture comes; one that does
 * not come leaves the tile empty, and the line under the header gives the code. Nothing else in the
 * header depends on it.
 *
 * There is no button to change the costume: the portrait itself opens the editor (the user's call,
 * 2026-09-29). Where a click can, it is a button named for that, with a small edit badge on hover
 * or keyboard focus. Where the costume may not be changed, it is no button: its tooltip, on hover
 * or a long press, says why, and so does a description screen readers read with it.
 */
export function MyDonPortrait({ answer, action, i18n, ref }: MyDonPortraitProps) {
  const { t } = i18n;
  if (action.kind === "shut") {
    const why = t("costume.notOpen");
    return (
      <Box sx={{ ...HIROBA_BLOCK, width: 1 }}>
        {/* A node, not a string, so the tooltip adds no title of its own to repeat the description. */}
        <Tooltip title={<span>{why}</span>} describeChild>
          <Box
            ref={ref}
            component="span"
            id="my-don"
            aria-busy={answer === undefined}
            sx={{ ...TILE, userSelect: "none", WebkitTouchCallout: "none" }}
          >
            <TileContent answer={answer} i18n={i18n} />
            <Box component="span" id="costume-not-open" sx={VISUALLY_HIDDEN}>
              {why}
            </Box>
          </Box>
        </Tooltip>
      </Box>
    );
  }
  const label = t("costume.open");
  return (
    <Box sx={{ ...HIROBA_BLOCK, width: 1 }}>
      {/* None while it is disabled: a disabled button sends no event to open or close it. */}
      <Tooltip title={action.busy ? "" : label}>
        <ButtonBase
          id="costume-open"
          aria-label={label}
          disabled={action.busy}
          onClick={action.open}
          focusRipple
          sx={{
            display: "block",
            width: 1,
            borderRadius: hp(TILE_RADIUS),
            "&.Mui-focusVisible": {
              outline: "3px solid",
              outlineColor: "primary.main",
              outlineOffset: "2px",
            },
            "&.Mui-focusVisible #costume-open-badge": { opacity: 1 },
            // Hover alone: on a touch screen, a tap would leave the badge up.
            "@media (hover: hover)": { "&:hover #costume-open-badge": { opacity: 1 } },
            "&.Mui-disabled": { opacity: 0.6 },
          }}
        >
          <Box ref={ref} component="span" id="my-don" aria-busy={answer === undefined} sx={TILE}>
            <TileContent answer={answer} i18n={i18n} />
          </Box>
          <EditBadge />
        </ButtonBase>
      </Tooltip>
    </Box>
  );
}

/** The portrait on the tile, once it came, and a small spinner until it has. */
function TileContent({ answer, i18n }: Pick<MyDonPortraitProps, "answer" | "i18n">) {
  const { t } = i18n;
  const picture = answer !== undefined && "view" in answer ? answer.view : null;
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

/** The small badge that shows a click on the portrait edits the costume, faded in on demand. */
function EditBadge() {
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
        opacity: 0,
        transition: (theme) =>
          theme.transitions.create("opacity", { duration: theme.transitions.duration.shortest }),
      }}
    >
      <EditIcon />
    </Box>
  );
}

/**
 * Material's "edit" icon (Apache 2.0), drawn inline: the icons package is not a dependency. The
 * button it is on carries the name.
 */
function EditIcon() {
  return (
    <SvgIcon aria-hidden fontSize="small">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z" />
    </SvgIcon>
  );
}
