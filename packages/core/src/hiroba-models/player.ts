/** The player and their profile: identity plus the account-wide summary from `mypage_top.php`. */
import type { ScoreRank } from "./vocabulary";

/** One player, keyed by taiko number. One Bandai Namco session can hold up to three. */
export interface Player {
  readonly taikoNo: string;
}

/**
 * Identity and the account-wide summary.
 *
 * The summary counts are Hiroba's own, and they cover **おに and 裏おに only** — levels 4 and 5
 * together, not the whole account. Measured against the same day's genre lists, de-duplicated by
 * chart: gold and donderful match exactly, five of the seven rank buckets match exactly, and a
 * small unexplained residual remains. Level-4-only and all-levels are both wrong by hundreds.
 *
 * So the summary is stored as the snapshot it is — never derived from cached scores, and never
 * used to correct them. It is also not a total you can recompute: the rank buckets count charts
 * that carry a rank, the crown counts count charts that carry a crown, and the difference is the
 * charts played but not cleared that still earned one.
 */
export interface Profile {
  readonly taikoNo: string;
  readonly nickname: string;
  /**
   * The displayed title, as a string rather than an id, because an id cannot hold every state.
   * A title picked from the list has one; a title **composed from parts** does not — the write
   * that sets one answers with an empty `value`, the composer page clears its slots on load, and
   * my page shows only the rendered text. So nothing on the site can turn a composed title back
   * into the three part ids, and a client that writes one has to keep them itself. Executed
   * 2026-08-09.
   */
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
  /** The single 大好きな曲 the profile shows, or null when it is 未設定 — a normal state. */
  readonly favoriteSong: FavoriteSong | null;
  /**
   * The お気に入り folder (up to 30 songs) in page order, empty being a normal state. The page
   * names these songs by title only — no song number, link or data attribute anywhere in the
   * block — so titles are all this can carry; resolving a title back to a song number is the
   * song catalogue's job, not this page's.
   */
  readonly favoriteFolderTitles: readonly string[];
  readonly summary: ProfileSummary;
  readonly fetchedAt: string;
}

/** The seasonal どんメダル and how many the account holds. */
export interface Medal {
  readonly name: string;
  readonly count: number;
}

/** The one song a profile shows as its 大好きな曲. */
export interface FavoriteSong {
  /**
   * Read from the block's hidden `song_no` input — the only place the block exposes a number.
   * My page fills it whenever a favourite is set, so a title normally arrives with its number.
   * Nullable because the title is the field the page is built around and a reader that has one
   * without the other should still hand back what it read.
   */
  readonly songNo: string | null;
  readonly title: string;
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
