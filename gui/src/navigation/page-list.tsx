import {
  Box,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  type Theme,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useLayoutEffect, useRef, useState } from "react";

import { QrCodeScannerIcon } from "../ui/icons";
import { MOVE_TIMING } from "../ui/window-move";
import type { NavigationProps, PipelinesToggle } from "./frame-parts";
import { PAGES } from "./pages";

/** A page row's shape: flush with the panel's left edge, round at the right. */
const ROW_SHAPE = { mr: 1.5, borderRadius: "0 999px 999px 0" } as const;

/** A row's hover fades as MUI's does; its words change colour as the highlight travels to it. */
const rowChange = (theme: Theme) => {
  const hover = theme.transitions.create("background-color", {
    duration: theme.transitions.duration.shortest,
  });
  return `${hover}, color ${MOVE_TIMING}`;
};

/** Where the current page's row lies in the list. */
interface RowPlace {
  readonly top: number;
  readonly height: number;
}

export function PageList({
  page,
  onNavigate,
  i18n,
  pages,
  onScan,
  toggle,
}: NavigationProps & { readonly toggle: PipelinesToggle | undefined }) {
  const scanLabel = i18n.t("scan.button");
  const list = useRef<HTMLUListElement>(null);
  const [place, setPlace] = useState<RowPlace | null>(null);
  // Measured after every render: a label in another language can take two lines.
  useLayoutEffect(() => {
    const row = list.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const next = row == null ? null : { top: row.offsetTop, height: row.offsetHeight };
    setPlace((now) => (now?.top === next?.top && now?.height === next?.height ? now : next));
  });
  return (
    <>
      <Box
        sx={{
          pl: 3,
          pr: onScan === undefined ? 3 : 1.5,
          pt: 2.5,
          pb: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Typography
          component="p"
          variant="subtitle2"
          color="textSecondary"
          noWrap
          sx={{ flexGrow: 1, minWidth: 0 }}
        >
          {i18n.t("app.title")}
        </Typography>
        {onScan !== undefined && (
          // Its own row's height: the button reaches into the room over and under the words.
          <IconButton
            id="scan"
            aria-label={scanLabel}
            title={scanLabel}
            onClick={onScan}
            sx={{ my: -1 }}
          >
            <QrCodeScannerIcon />
          </IconButton>
        )}
      </Box>
      <List ref={list} disablePadding>
        {place !== null && (
          // The highlight travels to the new page's row as the page moves.
          <Box
            aria-hidden
            sx={(theme) => ({
              ...ROW_SHAPE,
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: place.height,
              transform: `translateY(${place.top}px)`,
              bgcolor: alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity),
              transition: `transform ${MOVE_TIMING}, height ${MOVE_TIMING}`,
              "@media (prefers-reduced-motion: reduce)": { transition: "none" },
              pointerEvents: "none",
            })}
          />
        )}
        {PAGES.map((each) => {
          const current = toggle?.shown !== true && each === page;
          return (
            <ListItemButton
              key={each}
              id={`nav-${each}`}
              selected={current}
              aria-current={current ? "page" : undefined}
              onClick={() => onNavigate(each)}
              sx={{
                ...ROW_SHAPE,
                transition: rowChange,
                "@media (prefers-reduced-motion: reduce)": { transition: "none" },
                "&.Mui-selected, &.Mui-selected:hover": { bgcolor: "transparent" },
              }}
            >
              <ListItemIcon>{pages[each].icon}</ListItemIcon>
              <ListItemText
                primary={i18n.t(pages[each].label)}
                slotProps={{
                  primary: { sx: { fontWeight: current ? "fontWeightBold" : undefined } },
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </>
  );
}
