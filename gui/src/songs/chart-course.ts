import { courseLevel } from "@abth/core";

import { LEVEL_DIFFICULTY } from "../favorites/genre-look";
import type { Difficulty } from "../song-catalogue/types";
import { type CourseSpecifier, getChartInfo } from "../vendor/tja-renderer";

const difficultyOf = (course: string): Difficulty | undefined => {
  const level = courseLevel(course);
  return level === undefined ? undefined : LEVEL_DIFFICULTY[level];
};

/** The single-player course `tja` holds for `difficulty`, as TJA Renderer names it, or null. */
export function courseOf(tja: string, difficulty: Difficulty): CourseSpecifier | null {
  const { courseSpecifiers } = getChartInfo(tja);
  return (
    courseSpecifiers.find(
      (course) => course.playerSide === undefined && difficultyOf(course.difficulty) === difficulty,
    ) ?? null
  );
}
