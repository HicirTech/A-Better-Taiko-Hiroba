import type { Translator } from "@abth/i18n";
import { Box, Button, Skeleton } from "@mui/material";
import type { ReactNode } from "react";

const ROW = { display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 2 } as const;
const CONTROL = { flex: "1 1 14rem", minWidth: 0 } as const;
const SAVE_HEIGHT_PX = 56;

/** A control with its Save on one row, the button under the control when the row is too narrow. */
export function ControlWithSave({
  id,
  disabled,
  onSave,
  i18n,
  children,
}: {
  id: string;
  disabled: boolean;
  onSave: () => void;
  i18n: Translator;
  children: ReactNode;
}) {
  return (
    <Box sx={ROW}>
      <Box sx={CONTROL}>{children}</Box>
      <Button
        id={id}
        variant="contained"
        disabled={disabled}
        onClick={onSave}
        sx={{ height: SAVE_HEIGHT_PX, ml: "auto", flexShrink: 0, whiteSpace: "nowrap" }}
      >
        {i18n.t("write.sync")}
      </Button>
    </Box>
  );
}

/** The row's shape while the page's first read runs: a field and its button. */
export function ControlWithSaveSkeleton() {
  return (
    <Box aria-hidden sx={ROW}>
      <Skeleton variant="rounded" height={SAVE_HEIGHT_PX} sx={CONTROL} />
      <Skeleton variant="rounded" width={132} height={SAVE_HEIGHT_PX} sx={{ ml: "auto" }} />
    </Box>
  );
}
