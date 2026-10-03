import { Box, Tooltip, Typography } from "@mui/material";
import { useRef } from "react";

import { type PictureLane, viewOf } from "../pictures/picture-lane";
import { IN_THE_WINDOW, usePicture } from "../pictures/use-picture";
import type { IconWant } from "../session-port";
import { VISUALLY_HIDDEN } from "./hiroba-px";

const ICON_HEIGHT_PX = 24;
const DOT_PX = 8;
// The art's proportions, kept until the picture gives its own: a rank's icon is wider than tall.
const RESERVED_RATIO = { rankIcon: 128 / 96, crownIcon: 52 / 59 } as const;

export interface LegendItemProps {
  /** The id of its count, the text for screen readers: rank-8, crowns-silver. */
  readonly id: string;
  readonly name: string;
  readonly percent: string;
  /** The dot that stands in until the icon comes. */
  readonly colour: string;
  readonly icon: IconWant;
  /** The count as screen readers get it: "4 of 102". */
  readonly count: string;
  /** Among the legend's items, left to right: the lane asks for the earlier icons first. */
  readonly order: number;
  readonly lane: PictureLane;
}

/** An item of a share legend: its icon and its percent, named for screen readers and a tooltip. */
export function LegendItem({
  id,
  name,
  percent,
  colour,
  icon,
  count,
  order,
  lane,
}: LegendItemProps) {
  const iconBox = useRef<HTMLSpanElement>(null);
  const picture = viewOf(usePicture(lane, icon, iconBox, { ...IN_THE_WINDOW, order }));
  return (
    <Tooltip title={name}>
      <Box
        component="li"
        tabIndex={0}
        aria-label={`${name} ${percent}`}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          position: "relative",
          borderRadius: 1,
          "&:focus-visible": {
            outline: "2px solid",
            outlineColor: "primary.main",
            outlineOffset: "2px",
          },
        }}
      >
        <Box
          ref={iconBox}
          component="span"
          aria-hidden
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            height: ICON_HEIGHT_PX,
            aspectRatio:
              picture === null ? RESERVED_RATIO[icon.kind] : picture.width / picture.height,
          }}
        >
          {picture === null ? (
            <Box
              component="span"
              sx={{ width: DOT_PX, height: DOT_PX, borderRadius: "50%", background: colour }}
            />
          ) : (
            <Box
              component="img"
              src={picture.src}
              alt=""
              draggable={false}
              sx={{ display: "block", width: 1, height: 1, objectFit: "contain" }}
            />
          )}
        </Box>
        <Typography id={`${id}-percent`} component="span" variant="body2">
          {percent}
        </Typography>{" "}
        <Box component="span" id={id} sx={VISUALLY_HIDDEN}>
          {count}
        </Box>
      </Box>
    </Tooltip>
  );
}
