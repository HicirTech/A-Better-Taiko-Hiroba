import type { Translator } from "@abth/i18n";
import { Alert, Typography } from "@mui/material";
import type { ReactNode } from "react";

import { FAILURE_MESSAGE } from "../read-failure-message";
import type { ReadFailure } from "../session-port";

/** What a read could not bring, where it would be drawn; it offers no retry. */
export function ReadFailureAlert({
  id,
  message,
  code,
  codeId,
  mayClear = true,
  i18n,
  children,
}: {
  readonly id?: string | undefined;
  /** What is missing here, and why when that is known. */
  readonly message: string;
  /** The code a user copies into a report, or null when there is none. */
  readonly code: string | null;
  readonly codeId?: string | undefined;
  /** Whether a refresh or another try may bring it: not for what this version cannot read. */
  readonly mayClear?: boolean | undefined;
  readonly i18n: Translator;
  /** More about what is missing, such as which page of a walk could not be read. */
  readonly children?: ReactNode;
}) {
  const { t } = i18n;
  return (
    <Alert id={id} severity="warning">
      {message}
      {mayClear ? ` ${t("failure.mayClear")}` : null}
      {children}
      {code !== null && (
        <Typography
          id={codeId}
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
          {t("failure.code", { code })}
        </Typography>
      )}
    </Alert>
  );
}

/** A read of Hiroba that failed, in the place of what it would have brought. */
export function LoadFailed({
  id,
  failure,
  codeId,
  i18n,
  children,
}: {
  readonly id: string;
  readonly failure: ReadFailure;
  readonly codeId?: string | undefined;
  readonly i18n: Translator;
  readonly children?: ReactNode;
}) {
  return (
    <ReadFailureAlert
      id={id}
      message={i18n.t(FAILURE_MESSAGE[failure.kind])}
      code={failure.detail ?? null}
      codeId={codeId}
      i18n={i18n}
    >
      {children}
    </ReadFailureAlert>
  );
}
