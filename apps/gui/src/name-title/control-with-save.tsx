import type { Translator } from "@abth/i18n";
import { Box, Button } from "@mui/material";
import type { ReactNode } from "react";

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
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 2 }}>
      <Box sx={{ flex: "1 1 14rem", minWidth: 0 }}>{children}</Box>
      <Button
        id={id}
        variant="contained"
        disabled={disabled}
        onClick={onSave}
        sx={{ height: 56, ml: "auto", flexShrink: 0, whiteSpace: "nowrap" }}
      >
        {i18n.t("costume.save")}
      </Button>
    </Box>
  );
}
