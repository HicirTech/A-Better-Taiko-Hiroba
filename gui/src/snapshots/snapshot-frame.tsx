import type { Translator } from "@abth/i18n";
import { AppBar, Box, Stack, ThemeProvider, Toolbar, Typography } from "@mui/material";
import type { ReactNode } from "react";

import { SNAPSHOT_THEME } from "../theme/app-theme";
import { SNAPSHOT_WIDTH_PX } from "./snapshot-picture";

const FRAME = {
  bgcolor: "background.default",
  color: "text.primary",
  // Colours that follow the scheme, such as Hard's, take their light ones in either mode.
  colorScheme: "light",
} as const;
// Two equal sides keep the title in the bar's middle, whatever the words beside it.
const BAR = { display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 2 } as const;

/** A page as a picture to share: a bar with the app's name, a title and when, over the page. */
export function SnapshotFrame({
  id,
  title,
  width = SNAPSHOT_WIDTH_PX,
  when,
  i18n,
  children,
}: {
  readonly id: string;
  /** What the picture shows, in the bar's middle; none leaves the middle empty. */
  readonly title?: string;
  /** In CSS pixels; a snapshot's own by default. */
  readonly width?: number;
  /** When what it shows was read or made, in words, at the bar's right. */
  readonly when: string;
  readonly i18n: Translator;
  readonly children: ReactNode;
}) {
  const { t } = i18n;
  return (
    <ThemeProvider theme={SNAPSHOT_THEME}>
      <Box id={id} sx={{ ...FRAME, width }}>
        <AppBar component="header" position="static" elevation={0}>
          {/* Dense: the regular bar's height follows the window, and a snapshot never does. */}
          <Toolbar variant="dense" sx={BAR}>
            <Typography component="p" variant="h6">
              {t("app.title")}
            </Typography>
            {title !== undefined && (
              <Typography id={`${id}-title`} component="p" variant="body2" sx={{ gridColumn: 2 }}>
                {title}
              </Typography>
            )}
            <Typography component="p" variant="body2" sx={{ gridColumn: 3, justifySelf: "end" }}>
              {when}
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
