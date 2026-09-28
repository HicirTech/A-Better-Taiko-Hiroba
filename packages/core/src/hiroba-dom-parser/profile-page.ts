import type { HTMLElement } from "node-html-parser";

import type { FavoriteSong, Medal, MedalProgress, Profile, ScoreRank } from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { parsePage, requireMarker } from "./parser";
import { elementChildren, findImageBySrc, readCount, readCountText } from "./element-readers";
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

/**
 * How the site writes a value nobody set: a slot that holds no song, in both favourite blocks and in
 * the folder editor, and a region the player never chose. The region form is copied from another
 * player's profile (`都道府県 ：未設定`); my page shares that details markup.
 */
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
  // offers. The first div child of #mydon_area is the title line, the second is the name row.
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
  // Position is the only thing telling the title from the name, so check that it holds: on every
  // capture the div after the name row is the one holding .detail. A page that dropped its title
  // line would otherwise hand the name row in as the title and the details block as the name.
  const detailBlock = divs[2];
  if (detailBlock === undefined || detailBlock.querySelector(".detail") === null) {
    return err({
      kind: "missingMarker",
      page: PAGE,
      marker: "#mydon_area > div (.detail after the name row)",
    });
  }
  // An empty title line is a player wearing no title, not a page that failed to render one.
  const title = titleDiv.text.trim();
  // The name row takes one of two shapes, decided by the dan. With a dan label it is a flex row of
  // two divs, the nickname in the first and the label in the second. Without one, the nickname
  // sits directly in the row: that is how user_profile.php, whose name row is the same markup,
  // writes all eight dan-less players on disk. No dan-less my page has been captured, so the flat
  // form here is inferred from theirs.
  const nickDiv = elementChildren(nameRow).find((el) => el.rawTagName.toLowerCase() === "div");
  const nickname = (nickDiv ?? nameRow).text.trim();
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

  // The plate under the title and the name row, #mydon_area's first child on every capture. Found
  // by its src and inside the area, as position is no contract for an img.
  const titlePlateImageUrl =
    findImageBySrc(area.value, "imgsrc_titleplate")?.getAttribute("src") ?? null;

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

/** What `.token_complete` holds, copied from a live page (2026-09-27), whitespace aside. */
const MEDAL_COMPLETE_LABEL = "COMPLETE";

/**
 * The medal block is optional. When the name is present, exactly one of two things follows it:
 * `.token_count` while the set is being collected, or `.token_complete` reading COMPLETE once it is
 * done, with no count anywhere.
 *
 * A plate of any other shape reads as `unrecognised`, with a code saying which, and never fails the
 * page: a new plate once took the whole read down with it, crowns and all, on the first real sign-in
 * (2026-09-27). The page's own text in that spot is not kept, only the code.
 *
 * The plate's picture is found by its src, as position is no contract for an img. A page with no
 * name has no medal, whatever picture it shows.
 */
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
