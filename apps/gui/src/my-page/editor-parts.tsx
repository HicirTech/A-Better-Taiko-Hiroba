import type { Translator } from "@abth/i18n";
import { Alert, CircularProgress, Stack, Typography } from "@mui/material";
import { type ReactNode, type RefObject, useEffect, useRef } from "react";

import { FAILURE_MESSAGE } from "../read-failure-message";
import type { ReadFailure } from "../session-port";

export function Waiting({ id, children }: { id?: string; children: string }) {
  return (
    <Stack id={id} direction="row" spacing={2} sx={{ alignItems: "center" }}>
      <CircularProgress size={24} />
      <Typography>{children}</Typography>
    </Stack>
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

// A pressed Review is gone once the review shows, and focus would fall to the window's top; focus
// anywhere else, such as the navigation, is left alone.
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
