import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";
import { useState } from "react";

import { LabelChip } from "../ui/label-chip";
import { OperationSnackbar } from "../ui/operation-snackbar";

// The mark rides in a line of text, its middle set to the words'.
const IN_THE_LINE = { display: "inline-flex", verticalAlign: "middle", mr: 0.5 } as const;

/** The mark on a row of a song Hiroba took off its lists. */
export function RemovedMark({ i18n }: { readonly i18n: Translator }) {
  return (
    <Box component="span" className="removed-mark" lang={i18n.locale} sx={IN_THE_LINE}>
      <LabelChip label={i18n.t("scores.removed")} />
    </Box>
  );
}

/** What a press on such a row says, at the window's foot, as the row opens nothing. */
export function useRemovedNote(id: string, i18n: Translator) {
  const [open, setOpen] = useState(false);
  return {
    tell: () => setOpen(true),
    note: (
      <OperationSnackbar
        id={id}
        open={open}
        message={i18n.t("scores.removedNote")}
        onClose={() => setOpen(false)}
      />
    ),
  };
}
