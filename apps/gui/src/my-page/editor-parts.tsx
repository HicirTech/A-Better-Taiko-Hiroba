import type { Translator } from "@abth/i18n";
import { Alert, CircularProgress, Stack, Typography } from "@mui/material";
import { type ReactNode, type RefObject, useEffect, useRef } from "react";

import { FAILURE_MESSAGE } from "../read-failure-message";
import type { ReadFailure } from "../session-port";

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

/** What went wrong, with the codes a user can copy into a report; inline, so it fits a helper. */
export function FailureText({ failure, i18n }: { failure: ReadFailure; i18n: Translator }) {
  const { t } = i18n;
  return (
    <>
      {t(FAILURE_MESSAGE[failure.kind])}
      {failure.detail !== undefined && (
        <Typography
          component="span"
          variant="body2"
          sx={{
            display: "block",
            mt: 1,
            fontFamily: "monospace",
            userSelect: "text",
            wordBreak: "break-all",
          }}
        >
          {t("failure.detail", { detail: failure.detail })}
        </Typography>
      )}
    </>
  );
}

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
  return (
    <Alert id={id} severity="warning">
      <FailureText failure={failure} i18n={i18n} />
      {children}
    </Alert>
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
