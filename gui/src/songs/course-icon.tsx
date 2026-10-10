import { HirobaIcon } from "../pictures/hiroba-icon";
import type { PictureLane } from "../pictures/picture-lane";
import type { Difficulty } from "../song-catalogue/types";

const ICON_PX = 24;

/** A chart's difficulty as Hiroba draws it, in a space of its own size until the picture comes. */
export function CourseIcon({
  difficulty,
  lane,
  order,
  label,
}: {
  difficulty: Difficulty;
  lane: PictureLane;
  order: number;
  /** The difficulty's name, where no words beside the icon give it. */
  label?: string;
}) {
  return (
    <HirobaIcon
      want={{ kind: "courseIcon", difficulty }}
      width={ICON_PX}
      height={ICON_PX}
      label={label}
      className="course-icon"
      lane={lane}
      order={order}
    />
  );
}
