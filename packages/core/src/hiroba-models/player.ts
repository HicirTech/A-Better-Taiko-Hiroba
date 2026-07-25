/** The player and their profile: identity plus the account-wide summary from `mypage_top.php`. */
import type { ScoreRank } from "./vocabulary";

/** One player, keyed by taiko number. One Bandai Namco session can hold up to three. */
export interface Player {
  readonly taikoNo: string;
}

/**
 * Identity and the account-wide summary.
 *
 * The summary counts are computed by Hiroba over the whole account, while the local cache may
 * legitimately cover less. So the summary is stored as the snapshot it is — never derived from
 * cached scores, and never used to correct them.
 */
export interface Profile {
  readonly taikoNo: string;
  readonly nickname: string;
  readonly title: string;
  readonly region: string | null;
  /**
   * The dan label image the page shows (`imgsrc_danlabel.php?taiko_no=…`), or null when absent.
   * The dan appears on this page only as a server-rendered image — there is no text to read —
   * and having no dan is a normal state: plenty of accounts hold none.
   */
  readonly danLabelImageUrl: string | null;
  readonly medal: Medal | null;
  readonly myDonImageUrl: string | null;
  readonly summary: ProfileSummary;
  readonly fetchedAt: string;
}

/** The seasonal どんメダル and how many the account holds. */
export interface Medal {
  readonly name: string;
  readonly count: number;
}

export interface ProfileSummary {
  /**
   * Which panel the counts belong to, read from `total_score_image_<N>.png`. The page shows one
   * panel; the counts are whatever Hiroba put on it, recorded with its own level number rather
   * than presumed to cover the whole account.
   */
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
