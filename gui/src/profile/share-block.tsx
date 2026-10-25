import type { Translator } from "@abth/i18n";
import { Box, Skeleton } from "@mui/material";

import type { PictureLane } from "../pictures/picture-lane";
import type { SystemToast } from "../platform";
import type { IconWant } from "../shared/session-port";
import { SectionTitle, SectionTitleSkeleton } from "../ui/section-title";
import { LegendItem } from "./legend-item";
import { sharesOf } from "./shares";

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
/** Room for the seven score ranks side by side, which take 620 px. */
const ONE_LINE_PX = 640;
const LINES_ROOM = { containerType: "inline-size" } as const;
/** The items in their lines, their icons in columns, where one line has no room for them. */
const linedLegend = (columns: number) =>
  ({
    ...LEGEND,
    display: "grid",
    gridTemplateColumns: `repeat(${columns}, max-content)`,
    [`@container (min-width: ${ONE_LINE_PX}px)`]: { display: "flex" },
  }) as const;

export interface ShareItem {
  /** The id of its count, the text for screen readers: rank-8, crowns-silver. */
  readonly id: string;
  readonly name: string;
  readonly count: number;
  /** A CSS background for its dot and its part of the bar: a colour, or a gradient. */
  readonly colour: string;
  /** Its icon in the legend, which the dot stands in for until it comes; none keeps the dot. */
  readonly icon?: IconWant;
  /** Its line, 1 the first, where the legend has no room for one line. */
  readonly line?: number;
}

/** Each item's place in its line, where the items name their lines. */
function placesOf(
  items: readonly ShareItem[],
): readonly ({ row: number; column: number } | null)[] {
  const taken = new Map<number, number>();
  return items.map((item) => {
    if (item.line === undefined) {
      return null;
    }
    const column = (taken.get(item.line) ?? 0) + 1;
    taken.set(item.line, column);
    return { row: item.line, column };
  });
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
  const places = placesOf(items);
  const columns = Math.max(0, ...places.map((place) => place?.column ?? 0));
  const legend = (
    <Box component="ul" sx={columns === 0 ? LEGEND : linedLegend(columns)}>
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
          place={places[order] ?? null}
          lane={lane}
          toast={toast}
        />
      ))}
    </Box>
  );
  return columns === 0 ? legend : <Box sx={LINES_ROOM}>{legend}</Box>;
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
      <SectionTitle>{heading}</SectionTitle>
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
      <SectionTitleSkeleton width={110} />
      <Skeleton variant="rounded" sx={BAR} />
      <Box sx={LEGEND}>
        {LEGEND_KEYS.slice(0, items).map((key) => (
          <Skeleton key={key} width={64} />
        ))}
      </Box>
    </Box>
  );
}
