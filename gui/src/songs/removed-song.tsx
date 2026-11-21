import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";
import { type ReactNode, useState } from "react";

import { LabelChip } from "../ui/label-chip";
import { OperationSnackbar } from "../ui/operation-snackbar";

// The chip is taller than a name's line: `middle` would set it two pixels below the letters'.
const IN_THE_LINE = { display: "inline-flex", verticalAlign: "top", mr: 0.5 } as const;

function RemovedMark({ i18n }: { readonly i18n: Translator }) {
  return (
    <Box component="span" className="removed-mark" lang={i18n.locale} sx={IN_THE_LINE}>
      <LabelChip label={i18n.t("scores.removed")} />
    </Box>
  );
}

/** A song's name in its row, after a mark where Hiroba took the song off its lists. */
export function withRemovedMark(name: string, removed: boolean, i18n: Translator): ReactNode {
  return removed ? (
    <>
      <RemovedMark i18n={i18n} />
      {name}
    </>
  ) : (
    name
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
