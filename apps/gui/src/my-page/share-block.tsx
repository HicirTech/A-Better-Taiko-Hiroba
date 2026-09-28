import type { Translator } from "@abth/i18n";
import { Box, Typography } from "@mui/material";

import { VISUALLY_HIDDEN } from "./hiroba-px";
import { sharesOf } from "./shares";

/** One count of a block. */
export interface ShareItem {
  /** The id of its count, the text for screen readers: rank-8, crowns-silver. */
  readonly id: string;
  /** Its name as the legend writes it. */
  readonly name: string;
  readonly count: number;
  /** A CSS background for its dot and its part of the bar: a colour, or a gradient. */
  readonly colour: string;
}

/**
 * One block drawn as GitHub's "Languages" box draws one (the user's call, 2026-09-28): a heading,
 * one thin bar split by share, in the items' order with a hairline gap between the parts, and a
 * legend that wraps, each item a dot, its name and its percent. Every item is listed, 0% included;
 * only those above 0 take a part of the bar. A block that sums to 0 shows an empty track.
 *
 * The raw counts are secondary: the title of each item and each part of the bar, and text for
 * screen readers after the percent. The bar is hidden from them, since the legend says the same.
 */
export function ShareBlock({
  id,
  heading,
  items,
  i18n,
}: {
  id: string;
  heading: string;
  items: readonly ShareItem[];
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
        {/* The spaces between the parts are for screen readers; a flex row draws none. */}
        {rows.map((row) => (
          <Box
            component="li"
            key={row.id}
            title={titleOf(row)}
            sx={{ display: "flex", alignItems: "center", position: "relative" }}
          >
            <Box
              aria-hidden
              sx={{ width: 8, height: 8, borderRadius: "50%", background: row.colour, mr: 1 }}
            />
            <Typography component="span" variant="body2">
              {row.name}
            </Typography>{" "}
            <Typography
              id={`${row.id}-percent`}
              component="span"
              variant="body2"
              color="text.secondary"
              sx={{ ml: 0.5 }}
            >
              {row.percent}
            </Typography>{" "}
            <Box component="span" id={row.id} sx={VISUALLY_HIDDEN}>
              {t("panel.countOf", counted(row.count))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
