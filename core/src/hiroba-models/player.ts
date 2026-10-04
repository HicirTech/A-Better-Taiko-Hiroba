import type { RenameState, ScoreRank } from "./vocabulary";

/** One player, keyed by taiko number. One Bandai Namco session can hold up to three. */
export interface Player {
  readonly taikoNo: string;
}

export interface Profile {
  readonly taikoNo: string;
  readonly nickname: string;
  /** Whether Hiroba takes a rename now, read off the flag in the page's rename-dialog script. */
  readonly rename: RenameState;
  /** The title as text, not an id: a composed title has none to read back. `""` is no title. */
  readonly title: string;
  /** The value after the region line's colon; null when there is none or it reads 未設定. */
  readonly region: string | null;
  /** The title plate's `src` as the page writes it (bare, no query), never resolved. */
  readonly titlePlateImageUrl: string | null;
  /** The dan appears only as this server-rendered image; null (no dan) is a normal state. */
  readonly danLabelImageUrl: string | null;
  readonly medal: Medal | null;
  readonly myDonImageUrl: string | null;
  /** The single 大好きな曲 the profile shows, or null when it is 未設定 — a normal state. */
  readonly favoriteSong: FavoriteSong | null;
  /** The お気に入り folder (up to 30) in page order; titles only, as the page gives no song number. */
  readonly favoriteFolderTitles: readonly string[];
  /** Hiroba's own snapshot (おに and 裏おに, no 双打): never derived from or used to correct scores. */
  readonly summary: ProfileSummary;
  readonly fetchedAt: string;
}

/** The seasonal どんメダル: progress through the season's set, with the plate's own text as `name`. */
export interface Medal {
  /** The plate's own text (`どんメダル2026秋`), opaque; `""` only for the `emptyName` reason. */
  readonly name: string;
  readonly progress: MedalProgress;
  /** The plate `src` as written: its opaque id is identity data, so never resolve or show it. */
  readonly plateImageUrl: string | null;
}

/** COMPLETE prints no count, so a complete medal has none; any other shape is `unrecognised`. */
export type MedalProgress =
  | { readonly kind: "collecting"; readonly count: number }
  | { readonly kind: "complete" }
  | { readonly kind: "unrecognised"; readonly reason: MedalUnrecognisedReason };

export type MedalUnrecognisedReason =
  | "emptyName"
  | "noCountNoComplete"
  | "countNotNumber"
  | "completeLabelOther"
  /** Both a count and a complete line, where a page has only ever printed one. */
  | "countAndComplete";

export interface FavoriteSong {
  /** From the block's hidden `song_no` input; null if a reader found the title without it. */
  readonly songNo: string | null;
  readonly title: string;
}

export interface ProfileSummary {
  /** The panel's own level number, from `total_score_image_<N>.png`; the page shows one panel. */
  readonly countLevel: number;
  readonly crownCounts: CrownCounts;
  /** `best_rank_score_2` .. `_8`, keyed by the rank image number. */
  readonly rankCounts: Readonly<Record<ScoreRank, number>>;
}

export interface CrownCounts {
  readonly silver: number;
  readonly gold: number;
  readonly donderful: number;
}

/** What another player shows: `achievementsHidden` serves no score panel, `closed` no details. */
export type ProfileVisibility = "open" | "achievementsHidden" | "closed";

/** Another player's `user_profile.php`; not a `Profile`, which has fields this page never does. */
export interface PublicProfile {
  /** Supplied by the caller: a closed profile prints no taiko number; a printed one must match. */
  readonly taikoNo: string;
  readonly nickname: string;
  readonly title: string;
  /** The value after the colon, whatever its label (都道府県 or 国・地域); null on a closed profile. */
  readonly region: string | null;
  readonly danLabelImageUrl: string | null;
  readonly myDonImageUrl: string | null;
  /** Title only (this page has no `song_no`); null if closed, or open with 未設定 written. */
  readonly favoriteSong: FavoriteSong | null;
  /** Null unless `visibility` is `open`: the other two shapes serve no panel to read. */
  readonly summary: ProfileSummary | null;
  readonly visibility: ProfileVisibility;
  readonly fetchedAt: string;
}
