import type { Translator } from "@abth/i18n";
import { Alert, CircularProgress, Stack, Typography } from "@mui/material";
import { type ReactNode, type RefObject, useEffect, useRef } from "react";

import { FAILURE_MESSAGE } from "../read-failure-message";
import type { ReadFailure } from "../session-port";

/*
 * What the pages that edit something share: a line with a spinner while something is read or sent,
 * the warning for a read that failed, and the keyboard staying on the page when a step takes the
 * control it was on.
 */

/** A spinner and a line, while something is read from Hiroba or sent to it. */
export function Waiting({ id, children }: { id?: string; children: string }) {
  return (
    <Stack id={id} direction="row" spacing={2} sx={{ alignItems: "center" }}>
      <CircularProgress size={24} />
      <Typography>{children}</Typography>
    </Stack>
  );
}

/**
 * A read that failed: its sentence, and the codes a user can copy into a report. `children` is what
 * the page offers to do about it, such as a button that reads again.
 */
export function LoadFailed({
  id,
  failure,
  i18n,
  children,
}: {
  id: string;
  failure: ReadFailure;
  i18n: Translator;
  children?: ReactNode;
}) {
  const { t } = i18n;
  return (
    <Alert id={id} severity="warning">
      {t(FAILURE_MESSAGE[failure.kind])}
      {failure.detail !== undefined && (
        <Typography
          variant="body2"
          sx={{ mt: 1, fontFamily: "monospace", userSelect: "text", wordBreak: "break-all" }}
        >
          {t("failure.detail", { detail: failure.detail })}
        </Typography>
      )}
      {children}
    </Alert>
  );
}

/**
 * Keeps the keyboard on the page when the control it was on goes with a step: a pressed Review is
 * not there once the review is shown, and the focus would fall to the top of the window. Focus
 * that is anywhere else, such as the navigation, is left alone.
 */
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
