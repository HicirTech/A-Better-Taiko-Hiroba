import type { Translator } from "@abth/i18n";
import { Box, Skeleton, Typography } from "@mui/material";

import type { PictureLane } from "../pictures/picture-lane";
import type { SystemToast } from "../platform";
import type { IconWant } from "../session-port";
import { LegendItem } from "./legend-item";
import { sharesOf } from "./shares";

const HEADING = { fontWeight: 500, mb: 1 } as const;
const BAR = {
  display: "flex",
  gap: "2px",
  height: 8,
  borderRadius: 4,
  overflow: "hidden",
} as const;
const LEGEND = {
  display: "flex",
  flexWrap: "wrap",
  columnGap: 2,
  rowGap: 0.5,
  listStyle: "none",
  m: 0,
  mt: 1,
  p: 0,
} as const;

export interface ShareItem {
  /** The id of its count, the text for screen readers: rank-8, crowns-silver. */
  readonly id: string;
  readonly name: string;
  readonly count: number;
  /** A CSS background for its dot and its part of the bar: a colour, or a gradient. */
  readonly colour: string;
  /** Its icon in the legend, which the dot stands in for until it comes; none keeps the dot. */
  readonly icon?: IconWant;
}

const countsOf = (i18n: Translator, count: number, total: number) => ({
  count: i18n.number(count),
  total: i18n.number(total),
});

/** The items' shares as one bar; with a label it is a picture screen readers name. */
export function ShareBar({
  id,
  items,
  i18n,
  label,
}: {
  id: string;
  items: readonly ShareItem[];
  i18n: Translator;
  label?: string;
}) {
  const { total, rows } = sharesOf(items, i18n.locale);
  return (
    <Box
      id={id}
      {...(label === undefined ? { "aria-hidden": true } : { role: "img", "aria-label": label })}
      sx={{ ...BAR, bgcolor: total === 0 ? "action.hover" : undefined }}
    >
      {rows
        .filter((row) => row.count > 0)
        .map((row) => (
          <Box
            key={row.id}
            title={i18n.t("panel.countTitle", {
              name: row.name,
              ...countsOf(i18n, row.count, total),
            })}
            sx={{ flex: `${row.count} 1 0`, minWidth: 0, background: row.colour }}
          />
        ))}
    </Box>
  );
}

/** The items' icons and percents, each named by its tooltip, or by a long-press's Toast. */
export function ShareLegend({
  items,
  lane,
  toast,
  i18n,
}: {
  items: readonly ShareItem[];
  lane: PictureLane;
  toast: SystemToast | undefined;
  i18n: Translator;
}) {
  const { total, rows } = sharesOf(items, i18n.locale);
  return (
    <Box component="ul" sx={LEGEND}>
      {rows.map((row, order) => (
        <LegendItem
          key={row.id}
          id={row.id}
          name={row.name}
          percent={row.percent}
          colour={row.colour}
          icon={row.icon ?? null}
          count={i18n.t("panel.countOf", countsOf(i18n, row.count, total))}
          order={order}
          lane={lane}
          toast={toast}
        />
      ))}
    </Box>
  );
}

export function ShareBlock({
  id,
  heading,
  items,
  lane,
  toast,
  i18n,
}: {
  id: string;
  heading: string;
  items: readonly ShareItem[];
  lane: PictureLane;
  toast: SystemToast | undefined;
  i18n: Translator;
}) {
  return (
    <Box id={id} component="section">
      <Typography variant="subtitle1" component="h2" sx={HEADING}>
        {heading}
      </Typography>
      <ShareBar id={`${id}-bar`} items={items} i18n={i18n} />
      <ShareLegend items={items} lane={lane} toast={toast} i18n={i18n} />
    </Box>
  );
}

const LEGEND_KEYS = [...Array(8).keys()];

/** A block's shape while the page's first read runs: its heading, its bar and its legend. */
export function ShareBlockSkeleton({ items }: { readonly items: number }) {
  return (
    <Box aria-hidden>
      <Skeleton width={110} sx={{ ...HEADING, fontSize: "1rem", lineHeight: 1.75 }} />
      <Skeleton variant="rounded" sx={BAR} />
      <Box sx={LEGEND}>
        {LEGEND_KEYS.slice(0, items).map((key) => (
          <Skeleton key={key} width={64} />
        ))}
      </Box>
    </Box>
  );
}
