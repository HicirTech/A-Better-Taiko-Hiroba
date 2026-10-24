import { HirobaIcon } from "../pictures/hiroba-icon";
import type { PictureLane } from "../pictures/picture-lane";
import type { Difficulty } from "../shared/song-catalogue/types";

export const COURSE_ICON_PX = 24;

/** A chart's difficulty as Hiroba draws it, in a space of its own size until the picture comes. */
export function CourseIcon({
  difficulty,
  lane,
  order,
  label,
  px = COURSE_ICON_PX,
}: {
  difficulty: Difficulty;
  lane: PictureLane;
  order: number;
  /** The difficulty's name, where no words beside the icon give it. */
  label?: string;
  /** Its side: smaller among a row's marks. */
  px?: number;
}) {
  return (
    <HirobaIcon
      want={{ kind: "courseIcon", difficulty }}
      width={px}
      height={px}
      label={label}
      className="course-icon"
      lane={lane}
      order={order}
    />
  );
}
