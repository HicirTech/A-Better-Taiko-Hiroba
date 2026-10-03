import type { HTMLElement } from "node-html-parser";

import { err, isErr, ok, type Result } from "../operation-results";
import { readCountText } from "./element-readers";
import { parsePage } from "./parser";
import type {
  ParseFailure,
  RankingEntry,
  RankingReading,
  RankListReading,
  RankListSong,
  RankScope,
} from "./types";

const DETAIL_PAGE = "rank_detail.php";
const LIST_PAGE = "rank_list.php";

/** The hidden input that says which of the three tables this is — the only thing that does. */
const SCOPE_MARKER = "#rank";

const SCOPES: Readonly<Record<string, RankScope>> = {
  "1": "japan",
  "2": "prefecture",
  "3": "world",
};

/** `前日までのランキングです。…` — the site's own warning that none of this is current. */
const STALENESS_PATTERN = /前日までのランキング[^<>]*/;

/** Parses one page of `rank_detail.php`. No rows is an ordinary answer, not a failure. */
export function parseRankDetailPage(html: string): Result<RankingReading, ParseFailure> {
  const page = parsePage(html, DETAIL_PAGE);
  if (isErr(page)) {
    return page;
  }
  const root = page.value;

  const scope = readScope(root, DETAIL_PAGE);
  if (isErr(scope)) {
    return scope;
  }

  const entries: RankingEntry[] = [];
  for (const row of root.querySelectorAll("li.rankingDetailChild")) {
    const entry = readEntry(row);
    if (entry !== null) {
      entries.push(entry);
    }
  }

  const staleness = html.match(STALENESS_PATTERN);

  const header = root.querySelector('[class^="songNameBox"] h2');
  const levelIcon = html.match(/icon_course02_(\d)_640/)?.[1];

  return ok({
    scope: scope.value.scope,
    songTitle: header?.text.trim() ?? "",
    level: levelIcon === undefined ? null : Number(levelIcon),
    // The detail page keeps the area out of `#rank`, so it comes from the pager's links instead.
    area: scope.value.area ?? readArea(root),
    entries,
    ...readPager(root),
    stalenessNotice: staleness === null ? null : staleness[0].trim(),
    notice: root.querySelector("#error")?.text.trim().replace(/\s+/g, " ") || null,
  });
}

/** Parses `rank_list.php`, needed only to learn which songs are ranked (it omits 【双打】 songs). */
export function parseRankListPage(html: string): Result<RankListReading, ParseFailure> {
  const page = parsePage(html, LIST_PAGE);
  if (isErr(page)) {
    return page;
  }
  const root = page.value;

  const scope = readScope(root, LIST_PAGE);
  if (isErr(scope)) {
    return scope;
  }

  const songs: RankListSong[] = [];
  for (const block of root.querySelectorAll("li.contentBox")) {
    const title = block.querySelector(".songName")?.text.trim() ?? "";
    if (title === "") {
      continue;
    }
    const chartUrls: Record<number, string> = {};
    for (const anchor of block.querySelectorAll("a")) {
      const href = anchor.getAttribute("href") ?? "";
      const level = href.match(/[?&]level=(\d)/)?.[1];
      if (href.includes(DETAIL_PAGE) && level !== undefined) {
        chartUrls[Number(level)] = href;
      }
    }
    songs.push({ title, chartUrls });
  }

  return ok({ scope: scope.value.scope, songs });
}

/** The scope digit, and on the list page the area packed after it: `226` is scope 2, area 26. */
function readScope(
  root: HTMLElement,
  page: string,
): Result<{ scope: RankScope; area: number | null }, ParseFailure> {
  const element = root.querySelector(SCOPE_MARKER);
  if (element === null) {
    return err({ kind: "missingMarker", page, marker: SCOPE_MARKER });
  }
  const raw = (element.getAttribute("value") ?? element.text).trim();
  const scope = SCOPES[raw.slice(0, 1)];
  if (scope === undefined) {
    return err({ kind: "unreadableValue", page, marker: SCOPE_MARKER, raw });
  }
  const packed = raw.slice(1);
  return ok({ scope, area: packed === "" ? null : Number(packed) });
}

/** The prefecture from the pager's links: the server rewrites `area=0` to the caller's own. */
function readArea(root: HTMLElement): number | null {
  for (const anchor of root.querySelectorAll("a")) {
    const area = (anchor.getAttribute("href") ?? "").match(/[?&]area=(\d+)/)?.[1];
    if (area !== undefined && area !== "0") {
      return Number(area);
    }
  }
  return null;
}

/** Both arrows always render, minus the `<a>` where nothing follows; overshooting clamps to 1. */
function readPager(root: HTMLElement): { nextPage: number | null; previousPage: number | null } {
  const pageIn = (marker: string) => {
    const href = root.querySelector(`${marker} a`)?.getAttribute("href") ?? "";
    const page = href.match(/[?&]page=(\d+)/)?.[1];
    return page === undefined ? null : Number(page);
  };
  return { nextPage: pageIn("li.arrow.right"), previousPage: pageIn("li.arrow.left") };
}

function readEntry(row: HTMLElement): RankingEntry | null {
  const position = readCountText(row.querySelector(".rankingDetailRank span")?.text ?? null);
  // The block holds the name in a `<span>` and the score as the text after it.
  const scoreBlock = row.querySelector(".rankingDetailScore");
  const playerName = scoreBlock?.querySelector("span")?.text.trim() ?? "";
  const nameless = scoreBlock?.text.replace(playerName, "") ?? "";
  const score = readCountText(nameless);
  const profileHref = row.querySelector(".rankingDetailMydon a")?.getAttribute("href") ?? "";
  const taikoNo = profileHref.match(/taiko_no=(\d{12})/)?.[1] ?? "";

  if (position === null && playerName === "" && taikoNo === "") {
    return null;
  }

  return {
    position: position ?? 0,
    playerName,
    taikoNo,
    score: score ?? 0,
    myDonImageUrl: row.querySelector(".rankingDetailMydon img")?.getAttribute("src") ?? null,
    // The div is always emitted; the anchor inside it is what says the profile is open.
    detailUrl: row.querySelector(".rankingDetailMore a")?.getAttribute("href") ?? null,
  };
}
