import type { Translator } from "@abth/i18n";

import type { ChosenSong } from "../shared/scores/use-scores";
import type { ScoresProgress } from "../shared/session-port";
import type { SkeletonProgress } from "../ui/page-skeleton";
import { ProgressBar } from "../ui/progress-bar";

/** What a read of scores is doing: the walk's page, the lists or charts so far, or one song. */
export function scoresReadingText(
  i18n: Translator,
  progress: ScoresProgress | null,
  song: ChosenSong | null,
): string {
  if (song !== null) {
    return i18n.t("scores.readingSong", { song: song.songTitle });
  }
  if (progress === null || progress.step === "recentPlays") {
    return i18n.t("scores.readingPlays", { page: progress?.page ?? 1 });
  }
  const key = progress.step === "lists" ? "scores.readingLists" : "scores.readingCharts";
  return i18n.t(key, { done: i18n.number(progress.done), total: i18n.number(progress.total) });
}

/** A read of scores as a bar says it: its words, counted once it knows its lists or charts. */
export function scoresReadingProgress(
  i18n: Translator,
  progress: ScoresProgress | null,
  song: ChosenSong | null,
): SkeletonProgress {
  const counted = song === null && progress !== null && progress.step !== "recentPlays";
  return { words: scoresReadingText(i18n, progress, song), done: counted ? progress : null };
}

/** A read of scores as a progress bar: it fills once the read knows its lists or charts. */
export function ScoresReading({
  id,
  i18n,
  progress,
  song,
}: {
  readonly id?: string | undefined;
  readonly i18n: Translator;
  readonly progress: ScoresProgress | null;
  readonly song: ChosenSong | null;
}) {
  const { words, done } = scoresReadingProgress(i18n, progress, song);
  return <ProgressBar id={id} label={words} progress={done} />;
}
