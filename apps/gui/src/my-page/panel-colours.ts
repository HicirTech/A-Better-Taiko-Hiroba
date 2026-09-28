import type { ScoreRank } from "@abth/core";

/** 虹極's colours, and the donderful crown's: both are rainbows on Hiroba's icons. */
const RAINBOW = "linear-gradient(90deg, #ff5f6d, #ffc371, #47e891, #4facfe, #a86cf5)";

/**
 * Each rank's colour, from its icon: the name is the only other thing that tells two ranks of one
 * tier apart. White is drawn grey so it shows on a light background. A CSS background: a colour, or
 * a gradient.
 */
export const RANK_COLOUR: Readonly<Record<ScoreRank, string>> = {
  2: "#bdbdbd",
  3: "#b87333",
  4: "#8fa9bd",
  5: "#d4a017",
  6: "#f48fb1",
  7: "#9c6ade",
  8: RAINBOW,
};

/**
 * Each crown's colour, the mean of its icon's coloured pixels (reference/crown-icons): silver
 * (171,205,205), gold (227,198,58), and donderful the rainbow it is drawn in.
 */
export const CROWN_COLOUR = { silver: "#abcdcd", gold: "#e3c63a", donderful: RAINBOW } as const;
