import type { Translator } from "@abth/i18n";
import { Box, Typography } from "@mui/material";

import type { PictureLane } from "../pictures/picture-lane";
import type { SystemToast } from "../platform";
import type { IconWant } from "../session-port";
import { LegendItem } from "./legend-item";
import { sharesOf } from "./shares";

export interface ShareItem {
  /** The id of its count, the text for screen readers: rank-8, crowns-silver. */
  readonly id: string;
  readonly name: string;
  readonly count: number;
  /** A CSS background for its dot and its part of the bar: a colour, or a gradient. */
  readonly colour: string;
  /** Its icon in the legend; the dot stands in until it comes. */
  readonly icon: IconWant;
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
  const { t, locale, number } = i18n;
  const { total, rows } = sharesOf(items, locale);
  const counted = (count: number) => ({
    count: number(count),
    total: number(total),
  });
  const titleOf = (item: ShareItem) =>
    t("panel.countTitle", { name: item.name, ...counted(item.count) });
  return (
    <Box id={id} component="section">
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 500, mb: 1 }}>
        {heading}
      </Typography>
      <Box
        id={`${id}-bar`}
        aria-hidden
        sx={{
          display: "flex",
          gap: "2px",
          height: 8,
          borderRadius: 4,
          overflow: "hidden",
          bgcolor: total === 0 ? "action.hover" : undefined,
        }}
      >
        {rows
          .filter((row) => row.count > 0)
          .map((row) => (
            <Box
              key={row.id}
              title={titleOf(row)}
              sx={{ flex: `${row.count} 1 0`, minWidth: 0, background: row.colour }}
            />
          ))}
      </Box>
      <Box
        component="ul"
        sx={{
          display: "flex",
          flexWrap: "wrap",
          columnGap: 2,
          rowGap: 0.5,
          listStyle: "none",
          m: 0,
          mt: 1,
          p: 0,
        }}
      >
        {rows.map((row, order) => (
          <LegendItem
            key={row.id}
            id={row.id}
            name={row.name}
            percent={row.percent}
            colour={row.colour}
            icon={row.icon}
            count={t("panel.countOf", counted(row.count))}
            order={order}
            lane={lane}
            toast={toast}
          />
        ))}
      </Box>
    </Box>
  );
}
