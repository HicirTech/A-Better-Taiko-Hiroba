/** The player and their profile: identity plus the account-wide summary from `mypage_top.php`. */
import type { ScoreRank } from "./vocabulary";

/** One player, keyed by taiko number. One Bandai Namco session can hold up to three. */
export interface Player {
  readonly taikoNo: string;
}

/**
 * Identity and the account-wide summary.
 *
 * The summary counts are Hiroba's own, and they cover **おに and 裏おに only, with 双打 charts
 * excluded** — levels 4 and 5 together, not the whole account, and minus the double-play charts the
 * site keeps out of this panel by design. Measured against the same day's genre lists,
 * de-duplicated by chart: on that scope all ten figures match exactly — three crown counts and
 * seven rank buckets, no residual. Level-4-only and all-levels are both wrong by hundreds.
 * Dropping the 双打 clause leaves a three-chart excess, which is what an earlier version of this
 * comment recorded as unexplained. Settled 2026-08-09.
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

/**
 * How much of themselves another player has chosen to show, read off the page rather than guessed.
 *
 * Three shapes have been captured, and a reader that expects two will break on the middle one:
 * `open` shows everything below; `achievementsHidden` still names the player, their prefecture and
 * their 大好きな曲 but serves **no score panel at all**; `closed` renders `※プロフィール非公開`
 * where the details go, keeping only the title, the nickname and the My Don. Measured over seven
 * captured profiles on 2026-08-09 — three open, one achievements-hidden, three closed.
 */
export type ProfileVisibility = "open" | "achievementsHidden" | "closed";

/**
 * Another player's profile, as `user_profile.php?taiko_no=T` serves it.
 *
 * Deliberately **not** a `Profile`. That type is my page's, and my page always carries things this
 * page never does: the お気に入り folder, the medal block, and a song number beside the favourite.
 * Widening `Profile` to fit both would hand every my-page caller a null it can never receive. This
 * follows `RecentPlay`, which is its own type for the same reason.
 *
 * The fields that *are* the same are the same types — `ProfileSummary`, `FavoriteSong` — so a
 * reading of either page can be compared field for field without a translation layer.
 */
export interface PublicProfile {
  /**
   * Whose profile this is. Supplied by the caller, because a **closed profile does not print a
   * taiko number** — `※プロフィール非公開` replaces the whole details block, so on that shape the
   * page is not evidence of whose it is. Where the page does print one, the parser checks it
   * against this and refuses a mismatch: fetching one player and being served another is a fault
   * worth failing on, not a value to record.
   */
  readonly taikoNo: string;
  readonly nickname: string;
  readonly title: string;
  /**
   * Where the player says they are, whichever of the two things the page decided to print. The
   * **label itself varies with the player**: 都道府県 above a Japanese prefecture, 国・地域 above a
   * country — three of four open captures gave a prefecture, the fourth オーストラリア. So this is
   * the value after the colon and nothing is inferred from which label carried it. Null on a closed
   * profile, which prints neither.
   */
  readonly region: string | null;
  readonly danLabelImageUrl: string | null;
  readonly myDonImageUrl: string | null;
  /**
   * The one 大好きな曲, **title only**: this page's block carries no `song_no` input and no
   * `score_detail` link, unlike my page's. Turning the title back into a number is the catalogue's
   * job. Null covers both ways the page can say "none": a closed profile drops the block entirely,
   * and an open profile with no favourite **keeps it and writes `未設定` in it** — the same word my
   * page uses, observed on three profiles 2026-08-09. An earlier version of this comment called the
   * second case unobserved, and the reader duly handed back `未設定` as if it were a song title.
   */
  readonly favoriteSong: FavoriteSong | null;
  /** Null unless `visibility` is `open`: the other two shapes serve no panel to read. */
  readonly summary: ProfileSummary | null;
  readonly visibility: ProfileVisibility;
  readonly fetchedAt: string;
}
