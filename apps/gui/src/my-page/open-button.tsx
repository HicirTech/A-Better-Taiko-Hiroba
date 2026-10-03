import { Box, ButtonBase, type ButtonBaseProps, Tooltip } from "@mui/material";
import { type MouseEvent, type ReactNode, type TouchEvent, useRef, useState } from "react";

import { movedPastSlop, pointOf, type TouchPoint } from "../read-again/pull-gesture";
import { VISUALLY_HIDDEN } from "./hiroba-px";
import { useLongPress } from "./use-long-press";

/** What a press on a button that opens a page does: `open` it, on a click or key, or on touch-first
 * screens (`pointer: coarse`) a long-press. */
export interface OpenAction {
  readonly open: () => void;
  readonly byLongPress: boolean;
}

export const FOCUS_RING = {
  "&.Mui-focusVisible": {
    outline: "3px solid",
    outlineColor: "primary.main",
    outlineOffset: "2px",
  },
} as const;

export interface OpenButtonProps {
  readonly id: string;
  /** Its accessible name, and its tooltip. */
  readonly label: string;
  /** Read out with the button where a long-press opens it. */
  readonly hint: string;
  readonly action: OpenAction;
  readonly sx?: ButtonBaseProps["sx"];
  readonly children?: ReactNode;
}

export function OpenButton({ id, label, hint, action, sx, children }: OpenButtonProps) {
  const { tooltip, trigger } = useStillPressTooltip();
  const { open, byLongPress } = action;
  const longPress = useLongPress(byLongPress, open);
  const hintId = `${id}-hint`;
  // A finger's tap does nothing where it long-presses, so a scroll or pull begun on the button
  // never leaves the page; the mouse's click and the keyboard's press still go.
  const click = (event: MouseEvent) => {
    if (!byLongPress || !isTouchTap(event)) {
      open();
    }
  };
  return (
    <>
      <Tooltip title={label} disableTouchListener={byLongPress} {...tooltip}>
        <ButtonBase
          id={id}
          aria-label={label}
          aria-describedby={byLongPress ? hintId : undefined}
          onClick={click}
          {...(byLongPress ? longPress : trigger)}
          focusRipple
          sx={sx}
        >
          {children}
        </ButtonBase>
      </Tooltip>
      {byLongPress && (
        <Box component="span" id={hintId} sx={VISUALLY_HIDDEN}>
          {hint}
        </Box>
      )}
    </>
  );
}

function isTouchTap(event: MouseEvent): boolean {
  return event.nativeEvent instanceof PointerEvent && event.nativeEvent.pointerType === "touch";
}

// MUI's long press fires however the finger moves: a slow pull begun on the button would open
// the tooltip, so a finger past the slop shuts it instead.
function useStillPressTooltip() {
  const [open, setOpen] = useState(false);
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
