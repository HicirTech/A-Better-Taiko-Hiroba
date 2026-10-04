import type { ScoreRank } from "@abth/core";

/** 虹極's colours, and the donderful crown's: both are rainbows on Hiroba's icons. */
const RAINBOW = "linear-gradient(90deg, #ff5f6d, #ffc371, #47e891, #4facfe, #a86cf5)";

// From each rank's icon; white is drawn grey so it shows on a light background.
export const RANK_COLOUR: Readonly<Record<ScoreRank, string>> = {
  2: "#bdbdbd",
  3: "#b87333",
  4: "#8fa9bd",
  5: "#d4a017",
  6: "#f48fb1",
  7: "#9c6ade",
  8: RAINBOW,
};

export const CROWN_COLOUR = { silver: "#abcdcd", gold: "#e3c63a", donderful: RAINBOW } as const;
