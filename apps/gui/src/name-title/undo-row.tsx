import type { Translator } from "@abth/i18n";
import { Box, Button, Typography } from "@mui/material";
import type { ReactNode } from "react";

export interface UndoRowProps {
  /** The button's id, and the stem of its lines' ids: `<id>-when`, `<id>-note`, `<id>-reason`. */
  readonly id: string;
  readonly label: string;
  /** ISO 8601, when the write the undo would reverse was made. */
  readonly at: string;
  readonly goesBack: ReactNode;
  /** Why the undo is shut, when it is: said in words, not found out by pressing. */
  readonly reason: string | null;
  readonly warning?: string;
  readonly busy: boolean;
  readonly onUndo: () => void;
  readonly i18n: Translator;
}

// Not a Stack, which keeps its children's margins at 0: the button's label lines up with the lines
// under it, not with its own padding.
export function UndoRow({
  id,
  label,
  at,
  goesBack,
  reason,
  warning,
  busy,
  onUndo,
  i18n,
}: UndoRowProps) {
  const { t } = i18n;
  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <Button
        id={id}
        variant="text"
        disabled={busy || reason !== null}
        onClick={onUndo}
        sx={{ alignSelf: "flex-start", ml: -1 }}
      >
        {label}
      </Button>
      <Typography id={`${id}-when`} variant="body2" color="text.secondary">
        {t("costume.undoWhen", { time: i18n.dateTime(at) })}
      </Typography>
      <Typography id={`${id}-note`} variant="body2" color="text.secondary">
        {goesBack}
      </Typography>
      {reason !== null && (
        <Typography id={`${id}-reason`} variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {reason}
        </Typography>
      )}
      {warning !== undefined && (
        <Typography id={`${id}-warning`} variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {warning}
        </Typography>
      )}
    </Box>
  );
}
