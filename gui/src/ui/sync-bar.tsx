import type { Translator } from "@abth/i18n";
import { Box, Button, Paper, Skeleton } from "@mui/material";
import type { ReactNode } from "react";

import { PAGE_BOTTOM_PX, PAGE_HEIGHT } from "../navigation/app-frame";
import { ProgressBar } from "./progress-bar";
import { publishHeightOf } from "./publish-height";

const BAR_PADDING_PX = 12;
// Below this width the bar gives up padding and gaps before a label would wrap.
const WHEN_SNUG = "@media (max-width: 389px)";
const TOUCH_TARGET_PX = 48;
const ONE_LINE_LABEL = { whiteSpace: "nowrap" } as const;
const SNUG_CONTAINED_BUTTON = { ...ONE_LINE_LABEL, [WHEN_SNUG]: { px: 1 } } as const;
const BAR_HEIGHT = "--sync-bar-height";
const BAR_REF = publishHeightOf(BAR_HEIGHT);

/** The bar's height while a page shows one, else 0: for what must stay clear of it. */
export const SYNC_BAR_HEIGHT = `var(${BAR_HEIGHT}, 0px)`;

/** Keeps a snackbar's gap at the window's foot, as Material sets it, above the bar. */
export const ABOVE_SYNC_BAR = {
  bottom: { xs: `calc(${SYNC_BAR_HEIGHT} + 8px)`, sm: `calc(${SYNC_BAR_HEIGHT} + 24px)` },
} as const;

/** A text button in the bar, such as the costume's History: one line, snug on a narrow phone. */
export const BAR_TEXT_BUTTON = {
  ...ONE_LINE_LABEL,
  [WHEN_SNUG]: { minWidth: TOUCH_TARGET_PX, px: 0.25 },
} as const;

/** A page with the bar: as tall as the window at least, so the bar stands at the window's foot. */
export const SYNC_BAR_PAGE = {
  minHeight: PAGE_HEIGHT,
  display: "flex",
  flexDirection: "column",
} as const;

const BAR = {
  // Flush with the window's foot: the bar, the page's last child, takes back the frame's bottom
  // room by a negative margin (a Stack's child may not have one).
  mb: `-${PAGE_BOTTOM_PX}px`,
  // Sticky, not fixed: it takes the column's width and clears the navigation unmeasured.
  position: "sticky",
  bottom: 0,
  // Over the page's own layers, such as stacked level badges, as the top band is.
  zIndex: "appBar",
  mt: "auto",
  p: `${BAR_PADDING_PX}px`,
  pb: `calc(${BAR_PADDING_PX}px + env(safe-area-inset-bottom, 0px))`,
  [WHEN_SNUG]: { px: 1 },
} as const;
const BUTTONS = {
  display: "flex",
  alignItems: "center",
  gap: 1,
  [WHEN_SNUG]: { gap: 0.5 },
} as const;

export interface SyncBarProps {
  /** The page's name for the bar's parts: `<id>-bar`, `-reset`, `-save` and `-saving`. */
  readonly id: string;
  readonly canSync: boolean;
  readonly onSync: () => void;
  /** Drops the page's changes; none where there is nothing to drop, such as a set to sync. */
  readonly onReset?: (() => void) | undefined;
  readonly canReset?: boolean | undefined;
  /** A write is on its way: its words over a moving bar stand in for the buttons. */
  readonly saving: boolean;
  /** Before the bar's own buttons, such as the costume's History. */
  readonly start?: ReactNode;
  readonly i18n: Translator;
}

/** The bar at a page's foot that sends the page's changes to Hiroba; it is always there. */
export function SyncBar({
  id,
  canSync,
  onSync,
  onReset,
  canReset = false,
  saving,
  start,
  i18n,
}: SyncBarProps) {
  const { t } = i18n;
  return (
    <Paper ref={BAR_REF} id={`${id}-bar`} elevation={3} sx={BAR}>
      <Box sx={{ display: "grid" }}>
        <Box sx={{ ...BUTTONS, gridArea: "1 / 1", visibility: saving ? "hidden" : "visible" }}>
          {start}
          <Box sx={{ flexGrow: 1 }} />
          {onReset !== undefined && (
            <Button id={`${id}-reset`} disabled={!canReset} onClick={onReset} sx={BAR_TEXT_BUTTON}>
              {t("edit.reset")}
            </Button>
          )}
          <Button
            id={`${id}-save`}
            variant="contained"
            disabled={!canSync}
            onClick={onSync}
            sx={SNUG_CONTAINED_BUTTON}
          >
            {t("write.sync")}
          </Button>
        </Box>
        {saving && (
          <Box sx={{ gridArea: "1 / 1", alignSelf: "center" }}>
            <ProgressBar id={`${id}-saving`} label={t("write.saving")} />
          </Box>
        )}
      </Box>
    </Paper>
  );
}

/** The bar's shape while its page's first read runs: its Sync to Hiroba in grey. */
export function SyncBarSkeleton() {
  return (
    <Paper aria-hidden elevation={3} sx={BAR}>
      <Box sx={{ ...BUTTONS, justifyContent: "flex-end" }}>
        <Skeleton variant="rounded" width={140} height={36} />
      </Box>
    </Paper>
  );
}
