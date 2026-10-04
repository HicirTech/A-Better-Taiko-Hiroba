import type { HTMLElement } from "node-html-parser";

import type { FavoriteSong, Medal, MedalProgress, Profile, ScoreRank } from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { findImageBySrc, readCount, readCountText } from "./element-readers";
import { readIdentity } from "./identity-reader";
import { parsePage, requireMarker } from "./parser";
import { readRenameState } from "./rename-form";
import type { ParseFailure } from "./types";

const PAGE = "mypage_top.php";

const RANKS: readonly ScoreRank[] = [2, 3, 4, 5, 6, 7, 8];

/** Both favourite blocks share class and `songList` id; only the heading tells them apart. */
const FAVORITE_BLOCK_MARKER = "div.favoriteSong";
const FAVORITE_SONG_HEADING = "大好きな曲";
const FAVORITE_FOLDER_HEADING = "お気に入りの曲";

/** How the site writes a value nobody set: an empty song slot, or a region never chosen. */
const UNSET_LABEL = "未設定";

/** Parses `mypage_top.php`; `fetchedAt` comes from the caller, the taiko number from the page. */
export function parseProfilePage(html: string, fetchedAt: string): Result<Profile, ParseFailure> {
  const page = parsePage(html, PAGE);
  if (isErr(page)) {
    return page;
  }
  const root = page.value;

  const area = requireMarker(root, "#mydon_area", PAGE);
  if (isErr(area)) {
    return area;
  }

  const identity = readIdentity(area.value);
  if (isErr(identity)) {
    return identity;
  }
  const { title, nickname } = identity.value;

  // 国・地域 and 太鼓番 are printed as "label：value" paragraphs.
  const details = root.querySelectorAll(".detail p");
  const regionLine = details[0]?.text ?? "";
  const taikoLine = details[1]?.text ?? "";
  if (details.length < 2) {
    return err({ kind: "missingMarker", page: PAGE, marker: ".detail p" });
  }
  const regionValue = afterColon(regionLine);
  const region = regionValue === "" || regionValue === UNSET_LABEL ? null : regionValue;
  const taikoNo = afterColon(taikoLine);
  if (!/^\d{12}$/.test(taikoNo)) {
    return err({
      kind: "unreadableValue",
      page: PAGE,
      marker: ".detail p (太鼓番)",
      raw: taikoLine.trim(),
    });
  }

  // Found by its src inside the area, as position is no contract for an img.
  const titlePlateImageUrl =
    findImageBySrc(area.value, "imgsrc_titleplate")?.getAttribute("src") ?? null;

  const danImage = findImageBySrc(root, "imgsrc_danlabel");
  const danLabelImageUrl = danImage?.getAttribute("src") ?? null;

  const myDonImageUrl = root.querySelector("img.customd_mydon")?.getAttribute("src") ?? null;

  const panelImage = findImageBySrc(root, "total_score_image_");
  const panelMatch = (panelImage?.getAttribute("src") ?? "").match(/total_score_image_(\d+)/);
  if (panelMatch?.[1] === undefined) {
    return err({ kind: "missingMarker", page: PAGE, marker: 'img[src*="total_score_image_"]' });
  }
  const countLevel = Number(panelMatch[1]);

  const crowns = {
    silver: readCrown(root, "silver"),
    gold: readCrown(root, "gold"),
    donderful: readCrown(root, "donderful"),
  };
  if (isErr(crowns.silver)) return crowns.silver;
  if (isErr(crowns.gold)) return crowns.gold;
  if (isErr(crowns.donderful)) return crowns.donderful;

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
    rankEntries[rank] = count.value;
  }
  // Complete by construction: the loop above covers every ScoreRank or has already returned.
  const rankCounts = rankEntries as Record<ScoreRank, number>;

  const medal = readMedal(root);

  const favoriteSong = readFavoriteSong(root);
  if (isErr(favoriteSong)) {
    return favoriteSong;
  }

  const favoriteFolderTitles = readFavoriteFolderTitles(root);
  if (isErr(favoriteFolderTitles)) {
    return favoriteFolderTitles;
  }

  return ok({
    taikoNo,
    nickname,
    title,
    rename: readRenameState(html),
    region,
    titlePlateImageUrl,
    danLabelImageUrl,
    medal,
    myDonImageUrl,
    favoriteSong: favoriteSong.value,
    favoriteFolderTitles: favoriteFolderTitles.value,
    summary: {
      countLevel,
      crownCounts: {
        silver: crowns.silver.value,
        gold: crowns.gold.value,
        donderful: crowns.donderful.value,
      },
      rankCounts,
    },
    fetchedAt,
  });
}

function afterColon(line: string): string {
  const index = line.indexOf("：");
  return index === -1 ? "" : line.slice(index + 1).trim();
}

function readCrown(
  root: Parameters<typeof requireMarker>[0],
  kind: "silver" | "gold" | "donderful",
): Result<number, ParseFailure> {
  const marker = `.${kind}_crown_count`;
  const el = requireMarker(root, marker, PAGE);
  if (isErr(el)) {
    return el;
  }
  return readCount(el.value, marker, PAGE);
}

const MEDAL_COMPLETE_LABEL = "COMPLETE";

/** Optional block. A plate shape not recognised yields a code, never a page failure or its text. */
function readMedal(root: HTMLElement): Medal | null {
  const nameEl = root.querySelector(".token_name");
  if (nameEl === null) {
    return null;
  }
  const name = nameEl.text.trim();
  return {
    name,
    progress: readMedalProgress(
      name,
      root.querySelector(".token_count"),
      root.querySelector(".token_complete"),
    ),
    plateImageUrl: findImageBySrc(root, "imgsrc_tokenplate")?.getAttribute("src") ?? null,
  };
}

function readMedalProgress(
  name: string,
  countEl: HTMLElement | null,
  completeEl: HTMLElement | null,
): MedalProgress {
  if (name === "") {
    return { kind: "unrecognised", reason: "emptyName" };
  }
  if (countEl !== null && completeEl !== null) {
    return { kind: "unrecognised", reason: "countAndComplete" };
  }
  if (completeEl !== null) {
    return completeEl.text.trim() === MEDAL_COMPLETE_LABEL
      ? { kind: "complete" }
      : { kind: "unrecognised", reason: "completeLabelOther" };
  }
  if (countEl === null) {
    return { kind: "unrecognised", reason: "noCountNoComplete" };
  }
  const count = readCountText(countEl.text);
  return count === null
    ? { kind: "unrecognised", reason: "countNotNumber" }
    : { kind: "collecting", count };
}

function findFavoriteBlock(root: HTMLElement, heading: string): Result<HTMLElement, ParseFailure> {
  const block = root
    .querySelectorAll(FAVORITE_BLOCK_MARKER)
    .find((candidate) => candidate.querySelector("h2")?.text.trim() === heading);
  if (block === undefined) {
    return err({
      kind: "missingMarker",
      page: PAGE,
      marker: `${FAVORITE_BLOCK_MARKER} (${heading})`,
    });
  }
  return ok(block);
}

/** Song titles in page order; `未設定` is the page's word for an empty slot, so it is dropped. */
function songTitlesIn(block: HTMLElement): string[] {
  return block
    .querySelectorAll("li .songName")
    .map((name) => name.text.trim())
    .filter((title) => title !== "" && title !== UNSET_LABEL);
}

/** At most one song: the block always renders its entry, writing 未設定 in it when none is set. */
function readFavoriteSong(root: HTMLElement): Result<FavoriteSong | null, ParseFailure> {
  const block = findFavoriteBlock(root, FAVORITE_SONG_HEADING);
  if (isErr(block)) {
    return block;
  }
  const title = songTitlesIn(block.value)[0];
  if (title === undefined) {
    return ok(null);
  }
  const songNo = block.value.querySelector('input[name="song_no"]')?.getAttribute("value")?.trim();
  return ok({ songNo: songNo === undefined || songNo === "" ? null : songNo, title });
}

function readFavoriteFolderTitles(root: HTMLElement): Result<readonly string[], ParseFailure> {
  const block = findFavoriteBlock(root, FAVORITE_FOLDER_HEADING);
  if (isErr(block)) {
    return block;
  }
  return ok(songTitlesIn(block.value));
}
