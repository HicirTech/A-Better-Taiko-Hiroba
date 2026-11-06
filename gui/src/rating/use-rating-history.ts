import { type RatingData, type RatingSystem, ratePlayer, snapshotOf } from "@abth/core";
import { useEffect, useState } from "react";
import { RATING_SYSTEMS } from "../shared/rating-data/rating-systems";
import type { HirobaSessionPort, ScoresView } from "../shared/session-port";

type HistoryPort = Pick<HirobaSessionPort, "ratingHistory" | "keepRating">;
type RatingHistoryView = Readonly<
  Record<RatingSystem, Awaited<ReturnType<HistoryPort["ratingHistory"]>>>
>;

const NONE_KEPT: RatingHistoryView = { ourtaikoV1: [], ourtaikoV2: [] };

/** When a rating stood: its scores' newest read, or now where only the rating's data moved. */
function timeOf(view: ScoresView, last: string | undefined): string {
  // ISO times, so the newest is the greatest.
  const read = view.scores.reduce(
    (newest, { fetchedAt }) => (fetchedAt > newest ? fetchedAt : newest),
    "",
  );
  return last === undefined || read > last ? read : new Date().toISOString();
}

async function keptAfter(
  port: HistoryPort,
  system: RatingSystem,
  view: ScoresView,
  data: RatingData | null,
) {
  const kept = await port.ratingHistory(system);
  const rating = data === null ? null : ratePlayer(view.scores, data);
  return rating === null || rating.charts.length === 0
    ? kept
    : port.keepRating(system, snapshotOf(rating, timeOf(view, kept.at(-1)?.at)));
}

/** Each system's kept ratings for the player signed in, keeping the rating as the scores stand. */
export function useRatingHistory(
  port: HistoryPort,
  /** The kept scores; none for no player. */
  view: ScoresView | null,
  /** A read of scores runs: the rating is kept as it ends. */
  reading: boolean,
  data: Readonly<Record<RatingSystem, RatingData | null>>,
): RatingHistoryView {
  const [history, setHistory] = useState(NONE_KEPT);
  const { ourtaikoV1, ourtaikoV2 } = data;
  useEffect(() => {
    if (view === null) {
      setHistory(NONE_KEPT);
      return;
    }
    if (reading) {
      return;
    }
    let stale = false;
    const ofSystem = { ourtaikoV1, ourtaikoV2 };
    // After the page is drawn: working out a rating takes the window a moment.
    const later = setTimeout(() => {
      for (const system of RATING_SYSTEMS) {
        void keptAfter(port, system, view, ofSystem[system]).then((kept) => {
          if (!stale) {
            setHistory((now) => ({ ...now, [system]: kept }));
          }
        });
      }
    });
    return () => {
      stale = true;
      clearTimeout(later);
    };
  }, [port, view, reading, ourtaikoV1, ourtaikoV2]);
  return history;
}
