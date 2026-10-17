import { Snackbar } from "@mui/material";
import type { ReactNode } from "react";

import { ABOVE_STUCK_BAR } from "../my-page/stuck-clearance";

// Long enough to read a sentence twice; a click elsewhere does not cut it short.
const SHOWN_MS = 6000;

/** A failed operation, said at the window's foot for a few seconds; the user does it again. */
export function OperationSnackbar({
  id,
  open,
  message,
  outcome,
  onClose,
  onExited,
}: {
  readonly id: string;
  readonly open: boolean;
  /** What failed and that it can be tried again. */
  readonly message: ReactNode;
  /** How the operation ended, for the checks that read it. */
  readonly outcome?: string | undefined;
  readonly onClose: () => void;
  /** Called once the snackbar has left the window. */
  readonly onExited?: (() => void) | undefined;
}) {
  return (
    <Snackbar
      id={id}
      data-outcome={outcome}
      open={open}
      message={message}
      autoHideDuration={SHOWN_MS}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      sx={ABOVE_STUCK_BAR}
      onClose={(_event, reason) => {
        if (reason !== "clickaway") {
          onClose();
        }
      }}
      slotProps={{ transition: { onExited } }}
    />
  );
}
