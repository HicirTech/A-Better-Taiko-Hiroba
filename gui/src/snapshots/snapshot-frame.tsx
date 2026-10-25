import type { Translator } from "@abth/i18n";
import { AppBar, Box, Stack, ThemeProvider, Toolbar, Typography } from "@mui/material";
import type { ReactNode } from "react";

import { SNAPSHOT_THEME } from "../theme/app-theme";
import { SNAPSHOT_WIDTH_PX } from "./snapshot-png";

const FRAME = {
  width: SNAPSHOT_WIDTH_PX,
  bgcolor: "background.default",
  color: "text.primary",
  // Colours that follow the scheme, such as Hard's, take their light ones in either mode.
  colorScheme: "light",
} as const;
const BAR = { justifyContent: "space-between", gap: 2 } as const;

/** A page as a picture to share: a bar with the app's name and when, over what it shows. */
export function SnapshotFrame({
  id,
  readAt,
  i18n,
  children,
}: {
  readonly id: string;
  /** When what it shows was read. */
  readonly readAt: Date | number | string;
  readonly i18n: Translator;
  readonly children: ReactNode;
}) {
  const { t, dateTime } = i18n;
  return (
    <ThemeProvider theme={SNAPSHOT_THEME}>
      <Box id={id} sx={FRAME}>
        <AppBar component="header" position="static" elevation={0}>
          {/* Dense: the regular bar's height follows the window, and a snapshot never does. */}
          <Toolbar variant="dense" sx={BAR}>
            <Typography component="p" variant="h6">
              {t("app.title")}
            </Typography>
            <Typography component="p" variant="body2">
              {t("profile.fetchedAt", { time: dateTime(readAt) })}
            </Typography>
          </Toolbar>
        </AppBar>
        <Stack spacing={4} sx={{ p: 3 }}>
          {children}
        </Stack>
      </Box>
    </ThemeProvider>
  );
}
