import type { Medal, Profile, ScoreRank } from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { parsePage, requireMarker } from "./parser";
import { elementChildren, findImageBySrc, readCount } from "./element-readers";
import type { ParseFailure } from "./types";

const PAGE = "mypage_top.php";

const RANKS: readonly ScoreRank[] = [2, 3, 4, 5, 6, 7, 8];

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

  return ok({
    taikoNo,
    nickname,
    title,
    region,
    danLabelImageUrl,
    medal: medal === null ? null : medal.value,
    myDonImageUrl,
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
