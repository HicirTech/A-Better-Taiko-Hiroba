import { type OurTaikoV1Data, rateOurTaikoV1 } from "./ourtaiko-v1";
import { parseOurTaikoV1Data } from "./ourtaiko-v1-data";
import { type OurTaikoV2Data, rateOurTaikoV2 } from "./ourtaiko-v2";
import { parseOurTaikoV2Data } from "./ourtaiko-v2-data";
import type { PlayerRating, RatedScore, RatingSystem } from "./types";

/** A rating system's data, by song number. */
export type RatingData =
  | { readonly system: "ourtaikoV1"; readonly songs: OurTaikoV1Data }
  | { readonly system: "ourtaikoV2"; readonly songs: OurTaikoV2Data };

const READ: Readonly<Record<RatingSystem, (answer: unknown) => RatingData | null>> = {
  ourtaikoV1: (answer) => {
    const songs = parseOurTaikoV1Data(answer);
    return songs === null ? null : { system: "ourtaikoV1", songs };
  },
  ourtaikoV2: (answer) => {
    const songs = parseOurTaikoV2Data(answer);
    return songs === null ? null : { system: "ourtaikoV2", songs };
  },
};

/** The system's feed as its data, or null when the feed is not of its shape. */
export const parseRatingData = (system: RatingSystem, answer: unknown): RatingData | null =>
  READ[system](answer);

/** The player's rating by the system whose data this is. */
export const ratePlayer = (scores: readonly RatedScore[], data: RatingData): PlayerRating =>
  data.system === "ourtaikoV1"
    ? rateOurTaikoV1(scores, data.songs)
    : rateOurTaikoV2(scores, data.songs);
