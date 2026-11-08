import type { DeviceChoices } from "../pages/page";
import { keepStartingRating, keptStartingRating } from "../shared/rating-data/starting-rating";
import { keepStartingSort, keptStartingSort } from "../shared/scores/starting-sort";
import { keepChartSource, keptChartSource } from "../shared/song-catalogue/chart-source";
import {
  keepShownDifficulty,
  keptShownDifficulty,
} from "../shared/song-catalogue/shown-difficulty";
import { useKeptChoice } from "./use-kept-choice";

/** Settings' choices, read as the window opens and kept again as each one changes. */
export function useDeviceChoices(): DeviceChoices {
  const [shownDifficulty, onShownDifficulty] = useKeptChoice(
    keptShownDifficulty,
    keepShownDifficulty,
  );
  const [startingSort, onStartingSort] = useKeptChoice(keptStartingSort, keepStartingSort);
  const [startingRating, onStartingRating] = useKeptChoice(keptStartingRating, keepStartingRating);
  const [chartSource, onChartSource] = useKeptChoice(keptChartSource, keepChartSource);
  return {
    shownDifficulty,
    onShownDifficulty,
    startingSort,
    onStartingSort,
    startingRating,
    onStartingRating,
    chartSource,
    onChartSource,
  };
}
