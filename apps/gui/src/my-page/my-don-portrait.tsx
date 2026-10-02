import type { Translator } from "@abth/i18n";
import { Box, ButtonBase, CircularProgress, SvgIcon, Tooltip } from "@mui/material";
import { type MouseEvent, type Ref, type TouchEvent, useRef, useState } from "react";

import type { PictureAnswer } from "../pictures/picture-lane";
import { movedPastSlop, pointOf, type TouchPoint } from "../read-again/pull-gesture";
import type { PictureWant } from "../session-port";
import { HIROBA_BLOCK, hirobaPx, VISUALLY_HIDDEN } from "./hiroba-px";
import { useLongPress } from "./use-long-press";

/** The player's portrait, as the picture lane names it. */
export const MY_DON: PictureWant = { kind: "myDon" };

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
/** The description that says to long-press the portrait, where a finger does. */
const LONG_PRESS_HINT_ID = "costume-open-hint";
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
 * not be changed (Android, packaged builds), which the portrait then says. `byLongPress`, on a
 * touch-first screen, a finger opens it by a long-press instead of a tap.
 */
export type PortraitAction =
  | {
      readonly kind: "opensEditor";
      readonly open: () => void;
      readonly busy: boolean;
      readonly byLongPress: boolean;
    }
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
 * or keyboard focus. On a touch-first screen a finger opens it by a long-press, and a tap does
 * nothing, so a scroll or a pull begun on it never opens it; the badge is always up there, and a
 * description says to long-press. A mouse still clicks, and the keyboard still presses it. Where
 * the costume may not be changed, it is no button: its tooltip, on hover or a long press, says
 * why, and so does a description screen readers read with it.
 */
export function MyDonPortrait({ answer, action, i18n, ref }: MyDonPortraitProps) {
  const { t } = i18n;
  const { tooltip, trigger } = useStillPressTooltip();
  const byLongPress = action.kind === "opensEditor" && action.byLongPress;
  const longPress = useLongPress(byLongPress && !action.busy, () => {
    if (action.kind === "opensEditor") {
      action.open();
    }
  });
  if (action.kind === "shut") {
    const why = t("costume.notOpen");
    return (
      <Box sx={{ ...HIROBA_BLOCK, width: 1 }}>
        {/* A node, not a string, so the tooltip adds no title of its own to repeat the description. */}
        <Tooltip title={<span>{why}</span>} describeChild {...tooltip}>
          <Box
            ref={ref}
            component="span"
            id="my-don"
            aria-busy={answer === undefined}
            sx={{ ...TILE, userSelect: "none", WebkitTouchCallout: "none" }}
            {...trigger}
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
  // A finger's tap does nothing where a finger long-presses: the mouse's click and the keyboard's
  // press still open it.
  const click = (event: MouseEvent) => {
    if (!byLongPress || !isTouchTap(event)) {
      action.open();
    }
  };
  return (
    <Box sx={{ ...HIROBA_BLOCK, width: 1 }}>
      {/* None while it is disabled: a disabled button sends no event to open or close it. None by a
          finger where the long-press opens the editor itself. */}
      <Tooltip title={action.busy ? "" : label} disableTouchListener={byLongPress} {...tooltip}>
        <ButtonBase
          id="costume-open"
          aria-label={label}
          aria-describedby={byLongPress ? LONG_PRESS_HINT_ID : undefined}
          disabled={action.busy}
          onClick={click}
          {...(byLongPress ? longPress : trigger)}
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
          <MyDonTile ref={ref} answer={answer} i18n={i18n} />
          <EditBadge alwaysUp={byLongPress} />
        </ButtonBase>
      </Tooltip>
      {byLongPress && (
        <Box component="span" id={LONG_PRESS_HINT_ID} sx={VISUALLY_HIDDEN}>
          {t("costume.openByLongPress")}
        </Box>
      )}
    </Box>
  );
}

/** Whether a click is a finger's tap, rather than a mouse's click or the keyboard's press. */
function isTouchTap(event: MouseEvent): boolean {
  return event.nativeEvent instanceof PointerEvent && event.nativeEvent.pointerType === "touch";
}

/**
 * The portrait's tooltip, which a long press opens on a touch screen only while the finger stays
 * put. MUI's long press runs out its time however the finger moves, so a slow pull to read again
 * begun on the portrait, the largest thing at the top of a phone's page, would open it on the way;
 * a finger past the slop is a pull or a scroll (pull-gesture.ts), and shuts it instead.
 */
function useStillPressTooltip() {
  const [open, setOpen] = useState(false);
  /** The finger on the portrait now: where it landed, and whether it has moved past the slop. */
  const press = useRef<{ readonly landed: TouchPoint; moved: boolean } | null>(null);
  const tooltip = {
    open,
    onOpen: () => {
      if (!press.current?.moved) {
        setOpen(true);
      }
    },
    onClose: () => setOpen(false),
  };
  const trigger = {
    onTouchStart: (event: TouchEvent) => {
      const finger = event.touches[0];
      press.current = finger === undefined ? null : { landed: pointOf(finger), moved: false };
    },
    onTouchMove: (event: TouchEvent) => {
      const finger = event.touches[0];
      if (press.current === null || finger === undefined) {
        return;
      }

      if (movedPastSlop(press.current.landed, pointOf(finger))) {
        press.current.moved = true;
        setOpen(false);
      }
    },
    onTouchEnd: () => {
      press.current = null;
    },
  };
  return { tooltip, trigger };
}

/**
 * The tile alone, Hiroba's picture of the Don on its pale blue: a button's face on the Overview,
 * and a picture and no more on the Costume page of a run that may not change the costume.
 */
export function MyDonTile({
  answer,
  i18n,
  ref,
}: Pick<MyDonPortraitProps, "answer" | "i18n" | "ref">) {
  return (
    <Box ref={ref} component="span" id="my-don" aria-busy={answer === undefined} sx={TILE}>
      <TileContent answer={answer} i18n={i18n} />
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

/**
 * The small badge that shows a click on the portrait edits the costume: faded in on demand, or
 * `alwaysUp` where a finger, which has no hover, long-presses the portrait.
 */
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
