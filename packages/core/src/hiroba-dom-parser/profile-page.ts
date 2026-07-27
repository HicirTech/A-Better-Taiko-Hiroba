import type { HTMLElement } from "node-html-parser";

import type { FavoriteSong, Medal, Profile, ScoreRank } from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { parsePage, requireMarker } from "./parser";
import { elementChildren, findImageBySrc, readCount } from "./element-readers";
import type { ParseFailure } from "./types";

const PAGE = "mypage_top.php";

const RANKS: readonly ScoreRank[] = [2, 3, 4, 5, 6, 7, 8];

/**
 * Both favourite sections are `div.favoriteSong`, and both wrap their songs in a list carrying the
 * same `songList` id, so neither the class nor the id can tell them apart. The heading is the only
 * thing that does — hence a lookup by heading text rather than by selector or position.
 */
const FAVORITE_BLOCK_MARKER = "div.favoriteSong";
const FAVORITE_SONG_HEADING = "大好きな曲";
const FAVORITE_FOLDER_HEADING = "お気に入りの曲";

/** How the page writes a slot that holds no song, in both blocks and in the folder editor. */
const UNSET_LABEL = "未設定";

/**
 * Parses `mypage_top.php` into a Profile.
 *
 * `fetchedAt` comes from the caller: parsing is pure, and the fetch time belongs to whoever did
 * the fetch. The taiko number, by contrast, is read off the page itself — the page is the
 * evidence of whose profile this is.
 */
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

  // Title and nickname carry no class or id; their position is the only contract the page
  // offers. The first div child of #mydon_area is the title line, the second is the name row,
  // whose own first div is the nickname.
  const divs = elementChildren(area.value).filter((el) => el.rawTagName.toLowerCase() === "div");
  const titleDiv = divs[0];
  const nameRow = divs[1];
  if (titleDiv === undefined || nameRow === undefined) {
    return err({
      kind: "missingMarker",
      page: PAGE,
      marker: "#mydon_area > div (title, name row)",
    });
  }
  const title = titleDiv.text.trim();
  if (title === "") {
    return err({ kind: "unreadableValue", page: PAGE, marker: "#mydon_area title line", raw: "" });
  }
  const nickDiv = elementChildren(nameRow).find((el) => el.rawTagName.toLowerCase() === "div");
  const nickname = nickDiv?.text.trim() ?? "";
  if (nickname === "") {
    return err({ kind: "unreadableValue", page: PAGE, marker: "#mydon_area name row", raw: "" });
  }

  // 国・地域 and 太鼓番 are printed as "label：value" paragraphs.
  const details = root.querySelectorAll(".detail p");
  const regionLine = details[0]?.text ?? "";
  const taikoLine = details[1]?.text ?? "";
  if (details.length < 2) {
    return err({ kind: "missingMarker", page: PAGE, marker: ".detail p" });
  }
  const region = afterColon(regionLine) || null;
  const taikoNo = afterColon(taikoLine);
  if (!/^\d{12}$/.test(taikoNo)) {
    return err({
      kind: "unreadableValue",
      page: PAGE,
      marker: ".detail p (太鼓番)",
      raw: taikoLine.trim(),
    });
  }

  // The dan exists on this page only as a server-rendered image; absence is a normal state.
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
  if (medal !== null && isErr(medal)) {
    return medal;
  }

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
    region,
    danLabelImageUrl,
    medal: medal === null ? null : medal.value,
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

/** The value part of a "label：value" line; empty string when the colon is missing. */
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

/** The medal block is optional; when the name is present the count must be readable. */
function readMedal(root: Parameters<typeof requireMarker>[0]): Result<Medal, ParseFailure> | null {
  const nameEl = root.querySelector(".token_name");
  if (nameEl === null) {
    return null;
  }
  const name = nameEl.text.trim();
  if (name === "") {
    return err({ kind: "unreadableValue", page: PAGE, marker: ".token_name", raw: "" });
  }
  const countEl = requireMarker(root, ".token_count", PAGE);
  if (isErr(countEl)) {
    return countEl;
  }
  const count = readCount(countEl.value, ".token_count", PAGE);
  if (isErr(count)) {
    return count;
  }
  return ok({ name, count: count.value });
}

/** The favourite block under the given heading, or a failure naming which of the two is absent. */
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

/**
 * The song titles a favourite block lists, in page order. Empty slots are dropped rather than
 * carried: `未設定` is the page's word for "no song here", not a title anyone can look up.
 */
function songTitlesIn(block: HTMLElement): string[] {
  return block
    .querySelectorAll("li .songName")
    .map((name) => name.text.trim())
    .filter((title) => title !== "" && title !== UNSET_LABEL);
}

/**
 * Reads the 大好きな曲 block, which holds at most one song.
 *
 * The block always renders its one list entry, and writes 未設定 in it when the profile has no
 * favourite — so an unset favourite is an entry to skip, never a missing block.
 */
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

/**
 * Reads the お気に入りの曲 folder, up to 30 songs in page order.
 *
 * Titles only: the block gives each song a name and nothing else — no number, link or data
 * attribute — so this cannot be turned back into song numbers without the catalogue. An empty
 * folder is a normal state and reads as an empty list.
 */
function readFavoriteFolderTitles(root: HTMLElement): Result<readonly string[], ParseFailure> {
  const block = findFavoriteBlock(root, FAVORITE_FOLDER_HEADING);
  if (isErr(block)) {
    return block;
  }
  return ok(songTitlesIn(block.value));
}
