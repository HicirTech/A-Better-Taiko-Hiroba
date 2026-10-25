import { Alert } from "@mui/material";
import type { ReactNode } from "react";

/** A note about what is shown, informing or warning; a read that failed is `ReadFailureAlert`'s. */
export function NoteAlert({
  id,
  warns = false,
  children,
}: {
  readonly id?: string | undefined;
  /** A warning about something the player cannot do now; an informing note otherwise. */
  readonly warns?: boolean | undefined;
  readonly children: ReactNode;
}) {
  return (
    <Alert id={id} severity={warns ? "warning" : "info"}>
      {children}
    </Alert>
  );
}
