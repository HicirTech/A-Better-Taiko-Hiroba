import { useRef } from "react";

import { type PictureLane, viewOf } from "../pictures/picture-lane";
import { IN_THE_WINDOW, usePicture } from "../pictures/use-picture";
import type { Difficulty } from "../song-catalogue/types";

const ICON_PX = 24;

/** A chart's difficulty as Hiroba draws it, in a space of its own size until the picture comes. */
export function CourseIcon({
  difficulty,
  lane,
  order,
}: {
  difficulty: Difficulty;
  lane: PictureLane;
  order: number;
}) {
  const box = useRef<HTMLSpanElement>(null);
  const picture = viewOf(
    usePicture(lane, { kind: "courseIcon", difficulty }, box, { ...IN_THE_WINDOW, order }),
  );
  return (
    <span
      ref={box}
      className="course-icon"
      data-difficulty={difficulty}
      aria-hidden
      style={{ display: "inline-flex", flexShrink: 0, width: ICON_PX, height: ICON_PX }}
    >
      {picture !== null && (
        <img
          src={picture.src}
          alt=""
          width={ICON_PX}
          height={ICON_PX}
          style={{ objectFit: "contain" }}
        />
      )}
    </span>
  );
}
