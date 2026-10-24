import type { Translator } from "@abth/i18n";
import { Box, Button } from "@mui/material";

import { ReadFailureAlert } from "./read-failure-alert";
import { WORDS_MAX_PX } from "./status-note";

/** The whole window's note when the app could not be drawn: the one error with a button. */
export function WindowCrash({
  code,
  onReload,
  i18n,
}: {
  readonly code: string;
  readonly onReload: () => void;
  readonly i18n: Translator;
}) {
  const { t } = i18n;
  return (
    <Box
      id="window-crash"
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        p: 2,
      }}
    >
      <Box sx={{ width: "100%", maxWidth: WORDS_MAX_PX }}>
        <ReadFailureAlert
          message={t("crash.window")}
          code={code}
          codeId="window-crash-code"
          mayClear={false}
          i18n={i18n}
        />
      </Box>
      <Button id="window-crash-reload" onClick={onReload}>
        {t("crash.reload")}
      </Button>
    </Box>
  );
}
