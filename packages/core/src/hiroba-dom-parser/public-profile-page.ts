import type { HTMLElement } from "node-html-parser";

import type { ProfileSummary, ProfileVisibility, PublicProfile, ScoreRank } from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { elementChildren, findImageBySrc, readCount } from "./element-readers";
import { parsePage, requireMarker } from "./parser";
import type { ParseFailure } from "./types";

const PAGE = "user_profile.php";

const RANKS: readonly ScoreRank[] = [2, 3, 4, 5, 6, 7, 8];

/**
 * The site spells the silver count **`silver_crown_coun`** on this page — no final `t` — while
 * `gold_crown_count` and `donderful_crown_count` sit beside it spelled in full, and my page spells
 * all three in full. Verified on the **three** captured profiles that serve a panel at all
 * (2026-08-09); the correct spelling occurs on none of them. The other four of seven carry no crown
 * counts to spell — three are closed and one hides its achievements.
 *
 * This is invisible from a single account, because your own page is spelled correctly. It is the
 * same class of trap as the score list's two-l `crown_button_donderfull`, and it is why
 * `parseProfilePage`'s `.${kind}_crown_count` refuses a block that is plainly there.
 */
const CROWN_COUNT_CLASSES = {
  silver: "silver_crown_coun",
  gold: "gold_crown_count",
  donderful: "donderful_crown_count",
} as const;

/**
 * My page's favourite blocks, and the marker that tells the two pages apart.
 *
 * `user_profile.php` with your **own** taiko number redirects to my page, and my page would
 * otherwise read here as a stranger with an unusually rich profile. My page wraps each favourite
 * section in `div.favoriteSong`; this page has none — it renders one bare `ul#songList`.
 */
const MY_PAGE_MARKER = "div.favoriteSong";

/** How the details block reads when the owner has closed their profile. */
const CLOSED_TEXT = "プロフィール非公開";

/**
 * The page's word for "no song here", written into the block rather than omitting it.
 *
 * An open profile with no 大好きな曲 **keeps the section** and fills its one row with this, exactly
 * as my page does. Observed on three profiles, 2026-08-09. The set rows carry a genre suffix on
 * their classes (`songLisrAreanamco`, `songNameFontnamco`) and the unset row does not, but the text
 * is the reliable signal and the one my page's reader already uses.
 */
const UNSET_LABEL = "未設定";

/**
 * Parses `user_profile.php?taiko_no=T` — another player's public profile.
 *
 * `taikoNo` is what was requested, not what was read: a closed profile prints no taiko number at
 * all, so the page cannot always say whose it is. Where the page does print one this checks it and
 * refuses a mismatch.
 *
 * Three shapes are handled, and the middle one is the reason this cannot be a two-way branch on
 * "is it private": a profile can be open, name its owner and show their favourite song while
 * serving **no score panel** (`disp_achievement` off). A reader that treats "not private" as
 * "has a panel" fails on it.
 */
export function parsePublicProfilePage(
  html: string,
  taikoNo: string,
  fetchedAt: string,
): Result<PublicProfile, ParseFailure> {
  const page = parsePage(html, PAGE);
  if (isErr(page)) {
    return page;
  }
  const root = page.value;

  if (root.querySelector(MY_PAGE_MARKER) !== null) {
    return err({
      kind: "wrongPage",
      page: PAGE,
      looksLike: "mypage_top.php",
      marker: MY_PAGE_MARKER,
    });
  }

  const area = requireMarker(root, "#mydon_area", PAGE);
  if (isErr(area)) {
    return area;
  }

  // Title, then the nickname, then the details block, then the panel when there is one. Position
  // is the only contract: none of the four carries a class or id of its own.
  const blocks = elementChildren(area.value).filter((el) => el.rawTagName.toLowerCase() === "div");
  const titleBlock = blocks[0];
  const nicknameBlock = blocks[1];
  if (titleBlock === undefined || nicknameBlock === undefined) {
    return err({
      kind: "missingMarker",
      page: PAGE,
      marker: "#mydon_area > div (title, nickname)",
    });
  }
  const title = titleBlock.text.trim();
  // The nickname block's own contents are decided by whether the player has a dan: with a dan
  // label it is a two-child flex row, without one the text sits directly in the block. 19 of 19
  // captured profiles agree. That is why a reader lifted from my page fails here — my page always
  // has a label, so the flat form never appears there — and why this takes the text whole rather
  // than descending to a child at a fixed position.
  const nickname = nicknameBlock.text.trim();
  if (nickname === "") {
    return err({
      kind: "unreadableValue",
      page: PAGE,
      marker: "#mydon_area > div (nickname)",
      raw: "",
    });
  }

  const details = requireMarker(root, ".detail", PAGE);
  if (isErr(details)) {
    return details;
  }
  const closed = details.value.text.includes(CLOSED_TEXT);

  let region: string | null = null;
  if (!closed) {
    const lines = details.value.querySelectorAll("p").map((p) => p.text.trim());
    // Both lines are "label：value", and the first line's label is the player's, not the page's:
    // 都道府県 above a prefecture, 国・地域 above a country. Read the value, not the label.
    region = afterColon(lines[0] ?? "") || null;
    const shown = afterColon(lines[1] ?? "");
    if (!/^\d{12}$/.test(shown)) {
      return err({
        kind: "unreadableValue",
        page: PAGE,
        marker: ".detail p (太鼓番)",
        raw: lines[1] ?? "",
      });
    }
    if (shown !== taikoNo) {
      return err({ kind: "unreadableValue", page: PAGE, marker: ".detail p (太鼓番)", raw: shown });
    }
  }

  const summary = readSummary(root);
  if (isErr(summary)) {
    return summary;
  }

  const visibility: ProfileVisibility = closed
    ? "closed"
    : summary.value === null
      ? "achievementsHidden"
      : "open";

  const favoriteTitle = root.querySelector("#songList .songName")?.text.trim() ?? "";
  const favoriteIsSet = favoriteTitle !== "" && favoriteTitle !== UNSET_LABEL;

  return ok({
    taikoNo,
    nickname,
    title,
    region,
    danLabelImageUrl: findImageBySrc(root, "imgsrc_danlabel")?.getAttribute("src") ?? null,
    myDonImageUrl: root.querySelector("img.customd_mydon")?.getAttribute("src") ?? null,
    // Title only: this page's block carries no song_no input and no score_detail link.
    favoriteSong: favoriteIsSet ? { songNo: null, title: favoriteTitle } : null,
    summary: summary.value,
    visibility,
    fetchedAt,
  });
}

/** The value part of a "label：value" line; empty string when the colon is missing. */
function afterColon(line: string): string {
  const index = line.indexOf("：");
  return index === -1 ? "" : line.slice(index + 1).trim();
}

/**
 * The score panel, or null when the profile does not serve one.
 *
 * Absence is the signal, and it is whole: a profile with `disp_achievement` off carries no panel
 * image, no crown counts and no rank buckets. So the panel image decides, and once it is there the
 * counts beside it are required — a panel missing half its numbers is a page that changed.
 */
function readSummary(root: HTMLElement): Result<ProfileSummary | null, ParseFailure> {
  const panelImage = findImageBySrc(root, "total_score_image_");
  const panelMatch = (panelImage?.getAttribute("src") ?? "").match(/total_score_image_(\d+)/);
  if (panelMatch?.[1] === undefined) {
    return ok(null);
  }

  const crownCounts: { silver?: number; gold?: number; donderful?: number } = {};
  for (const [kind, className] of Object.entries(CROWN_COUNT_CLASSES)) {
    const marker = `.${className}`;
    const el = requireMarker(root, marker, PAGE);
    if (isErr(el)) {
      return el;
    }
    const count = readCount(el.value, marker, PAGE);
    if (isErr(count)) {
      return count;
    }
    crownCounts[kind as keyof typeof CROWN_COUNT_CLASSES] = count.value;
  }

  const rankEntries: { [K in ScoreRank]?: number } = {};
  for (const rank of RANKS) {
    const marker = `.best_rank_score_${rank}`;
    const el = requireMarker(root, marker, PAGE);
    if (isErr(el)) {
      return el;
    }
    const count = readCount(el.value, marker, PAGE);
    if (isErr(count)) {
      return count;
    }
    // A rank of 0 is data, not absence: sampled profiles read 0 at several ranks while holding
    // thousands at another.
    rankEntries[rank] = count.value;
  }

  return ok({
    countLevel: Number(panelMatch[1]),
    // Complete by construction: both loops above cover every key or have already returned.
    crownCounts: crownCounts as ProfileSummary["crownCounts"],
    rankCounts: rankEntries as ProfileSummary["rankCounts"],
  });
}
