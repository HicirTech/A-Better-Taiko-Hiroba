import type { Translator } from "@abth/i18n";
import { Box, ButtonBase, Typography } from "@mui/material";
import { Fragment, type ReactNode } from "react";

import { ArrowDropDownIcon } from "../favorites/favorites-icons";
import { ShareBar, ShareLegend } from "../my-page/share-block";
import type { PictureLane } from "../pictures/picture-lane";
import type { SystemToast } from "../platform";
import type { Segment } from "./segments";

/** A row of share bars: a star level or a band, its count in each segment, and what it opens. */
export interface ShareRow {
  readonly id: string;
  readonly label: string;
  /** In the segments' order. */
  readonly counts: readonly number[];
  /** After the label, such as the mark of where the player's top scores are most common. */
  readonly badge?: ReactNode;
  /** The charts the row opens under it; none for a row that opens nothing. */
  readonly list: (() => ReactNode) | null;
}

// One grid for every row, so the labels share the width of the longest.
const GRID = {
  display: "grid",
  gridTemplateColumns: "max-content minmax(0, 1fr) max-content",
  columnGap: 1.5,
  rowGap: 0.5,
  alignItems: "center",
} as const;

const LABEL = {
  justifySelf: "start",
  display: "inline-flex",
  alignItems: "center",
  minHeight: 28,
  px: 0.5,
  borderRadius: 1,
  typography: "body2",
} as const;

const OPENER = {
  ...LABEL,
  "&:hover": { bgcolor: "action.hover" },
  "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main" },
  "&[aria-expanded='true'] .MuiSvgIcon-root": { transform: "rotate(180deg)" },
} as const;

/** Rows of share bars over the same segments, with one legend for them all. */
export function ShareRows({
  id,
  segments,
  rows,
  legend,
  opened,
  onToggle,
  lane,
  toast,
  i18n,
}: {
  readonly id: string;
  readonly segments: readonly Segment[];
  readonly rows: readonly ShareRow[];
  /** The legend's counts, in the segments' order. */
  readonly legend: readonly number[];
  /** The open row's id. */
  readonly opened: string | null;
  readonly onToggle: (row: string) => void;
  readonly lane: PictureLane;
  readonly toast: SystemToast | undefined;
  readonly i18n: Translator;
}) {
  const { t, number, locale } = i18n;
  const parts = new Intl.ListFormat(locale, { style: "narrow", type: "unit" });
  const itemsOf = (prefix: string, counts: readonly number[]) =>
    segments.map((segment, index) => ({
      ...segment,
      id: `${prefix}-${segment.id}`,
      count: counts[index] ?? 0,
    }));
  return (
    <Box id={id}>
      <Box sx={GRID}>
        {rows.map((row) => {
          const rowId = `${id}-${row.id}`;
          const open = opened === row.id;
          const items = itemsOf(rowId, row.counts);
          const total = row.counts.reduce((sum, count) => sum + count, 0);
          const named = items
            .filter((item) => item.count > 0)
            .map((item) =>
              t("panel.countTitle", {
                name: item.name,
                count: number(item.count),
                total: number(total),
              }),
            );
          return (
            <Fragment key={row.id}>
              {row.list === null ? (
                <Typography id={rowId} component="span" sx={LABEL}>
                  {row.label}
                  {row.badge}
                </Typography>
              ) : (
                <ButtonBase
                  id={rowId}
                  aria-expanded={open}
                  aria-controls={open ? `${rowId}-list` : undefined}
                  onClick={() => onToggle(row.id)}
                  sx={OPENER}
                >
                  {row.label}
                  {row.badge}
                  <ArrowDropDownIcon />
                </ButtonBase>
              )}
              <ShareBar
                id={`${rowId}-bar`}
                items={items}
                i18n={i18n}
                label={`${row.label}: ${parts.format(named)}`}
              />
              <Typography
                id={`${rowId}-total`}
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: "end" }}
              >
                {number(total)}
              </Typography>
              {open && row.list !== null && (
                <Box id={`${rowId}-list`} sx={{ gridColumn: "1 / -1", py: 1 }}>
                  {row.list()}
                </Box>
              )}
            </Fragment>
          );
        })}
      </Box>
      <ShareLegend items={itemsOf(`${id}-legend`, legend)} lane={lane} toast={toast} i18n={i18n} />
    </Box>
  );
}
