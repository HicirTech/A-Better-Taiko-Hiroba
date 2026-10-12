import type { RecentPlay } from "@abth/core";

import type { PlayedChart, ScoresView, ScoreView } from "../session-port";
import { playedSong, type SongsByTitle } from "./played-song";

/** A recent play's chart: its kept details, its song with the chart not read yet, or no song. */
export type PlacedPlay =
  | { readonly kind: "scored"; readonly score: ScoreView }
  | { readonly kind: "unread"; readonly songNo: string }
  | { readonly kind: "unplaced"; readonly why: "shared" | "unknown" };

export function placePlay(play: RecentPlay, view: ScoresView, byTitle: SongsByTitle): PlacedPlay {
  const found = playedSong(byTitle, play, view.songs);
  if (found.outcome !== "resolved") {
    return { kind: "unplaced", why: found.outcome === "ambiguous" ? "shared" : "unknown" };
  }
  const score = view.scores.find(
    ({ songNo, level }) => songNo === found.songNo && level === play.level,
  );
  return score === undefined ? { kind: "unread", songNo: found.songNo } : { kind: "scored", score };
}

/** The chart a play names, as a read of its song takes it in. */
export const playedChart = ({ level, songTitle, genre }: RecentPlay): PlayedChart => ({
  level,
  title: songTitle,
  genre,
});
