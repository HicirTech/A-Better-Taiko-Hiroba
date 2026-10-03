import type { HTMLElement } from "node-html-parser";

import type { ProfileSummary, ProfileVisibility, PublicProfile, ScoreRank } from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { elementChildren, findImageBySrc, readCount } from "./element-readers";
import { parsePage, requireMarker } from "./parser";
import type { ParseFailure } from "./types";

const PAGE = "user_profile.php";

const RANKS: readonly ScoreRank[] = [2, 3, 4, 5, 6, 7, 8];

/** The site misspells the silver class here, `silver_crown_coun`; my page spells it in full. */
const CROWN_COUNT_CLASSES = {
  silver: "silver_crown_coun",
  gold: "gold_crown_count",
  donderful: "donderful_crown_count",
} as const;

/** Only my page has these; your own taiko number on `user_profile.php` would serve it here. */
const MY_PAGE_MARKER = "div.favoriteSong";

const CLOSED_TEXT = "プロフィール非公開";

/** The page's word for "no song here", written into the section rather than omitting it. */
const UNSET_LABEL = "未設定";

/** Parses `user_profile.php`; `taikoNo` is what was requested, as a closed profile prints none. */
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

  // Position is the only contract: title, nickname, details and panel carry no class or id.
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
  // With a dan label the block is a two-child flex row, without one the text sits directly in it;
  // taking the text whole reads either.
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
    // The first label varies (都道府県 or 国・地域): read the value, not the label.
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
    favoriteSong: favoriteIsSet ? { songNo: null, title: favoriteTitle } : null,
    summary: summary.value,
    visibility,
    fetchedAt,
  });
}

function afterColon(line: string): string {
  const index = line.indexOf("：");
  return index === -1 ? "" : line.slice(index + 1).trim();
}

/** Null when the profile serves no score panel; with one, every count beside it is required. */
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
    // A rank count of 0 is data, not absence.
    rankEntries[rank] = count.value;
  }

  return ok({
    countLevel: Number(panelMatch[1]),
    // Complete by construction: both loops above cover every key or have already returned.
    crownCounts: crownCounts as ProfileSummary["crownCounts"],
    rankCounts: rankEntries as ProfileSummary["rankCounts"],
  });
}
