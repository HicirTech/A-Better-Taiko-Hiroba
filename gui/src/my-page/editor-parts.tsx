import { CircularProgress, Stack, Typography } from "@mui/material";
import { type RefObject, useEffect, useRef } from "react";

/** How a save dims the pickers it holds still; they are also `inert`, so none can be picked. */
export const HELD_STILL = { opacity: 0.5 } as const;

export function Waiting({ id, children }: { id?: string; children: string }) {
  return (
    <Stack id={id} direction="row" spacing={2} sx={{ alignItems: "center" }}>
      <CircularProgress size={24} />
      <Typography>{children}</Typography>
    </Stack>
  );
}

// A pressed button that a step hides or shuts leaves focus at the window's top; the page takes it
// then, and focus anywhere else, such as the navigation, is left alone.
export function useFocusKept(page: RefObject<HTMLElement | null>, step: string) {
  const last = useRef(step);
  useEffect(() => {
    if (last.current === step) {
      return;
    }

    last.current = step;
    const focused = document.activeElement;
    if (focused === null || focused === document.body) {
      page.current?.focus({ preventScroll: true });
    }
  }, [page, step]);
}
