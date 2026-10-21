import { Skeleton } from "@mui/material";
import { useRef } from "react";

import type { PictureWant } from "../session-port";
import { type PictureLane, viewOf } from "./picture-lane";
import { IN_THE_WINDOW, usePicture } from "./use-picture";

/** One of Hiroba's icons, a grey block of its size until it comes; named when it has a label. */
export function HirobaIcon({
  want,
  width,
  height,
  label,
  className,
  lane,
  order,
}: {
  readonly want: PictureWant;
  readonly width: number;
  readonly height: number;
  /** What it shows, for screen readers and on hover; without one it is decoration. */
  readonly label?: string | undefined;
  readonly className?: string | undefined;
  readonly lane: PictureLane;
  readonly order: number;
}) {
  const box = useRef<HTMLSpanElement>(null);
  const picture = viewOf(usePicture(lane, want, box, { ...IN_THE_WINDOW, order }));
  const named =
    label === undefined
      ? { "aria-hidden": true }
      : { role: "img", "aria-label": label, title: label };
  return (
    <span
      ref={box}
      className={className}
      {...named}
      style={{ display: "inline-flex", flexShrink: 0, width, height }}
    >
      {picture === null ? (
        <Skeleton variant="rounded" animation={false} width={width} height={height} />
      ) : (
        <img
          src={picture.src}
          alt=""
          width={width}
          height={height}
          style={{ objectFit: "contain" }}
        />
      )}
    </span>
  );
}
