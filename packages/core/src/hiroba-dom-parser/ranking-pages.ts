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

/**
 * Parses `rank_detail.php` — one chart's ranking table, one page of it.
 *
 * Three answers are ordinary and only one of them is a failure:
 *
 * - rows, up to ten a page;
 * - **no rows at all**, which the page says with `ランキングデータがありません` in its in-page
 *   notice while keeping the banner, the song box and the pager — a chart nobody has ranked;
 * - the site's error page, for a chart that does not exist or an `area` outside 1–47, which
 *   `parsePage` refuses as `siteError` before this function sees it.
 *
 * The scope is required in the result because the three tables are byte-for-byte the same shape.
 */
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

/**
 * Parses `rank_list.php` — a genre's songs and the ranking link for each chart.
 *
 * Read this rather than building the URLs yourself only when you need to know **which songs are
 * ranked**: it leaves out 【双打】 songs that the score list carries. Everything else about the page
 * is already in the score list, and `rank_detail.php` serves 双打 charts anyway, so a client that
 * only wants tables can skip this page entirely.
 */
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

/**
 * The scope, and — on the list page only — the prefecture packed in beside it.
 *
 * **The two pages spell this differently and a straight lookup breaks on one of them.**
 * `rank_detail.php` writes `1`, `2` or `3`. `rank_list.php` writes `1` for Japan but **`226`** for
 * a prefecture reading: the scope digit with the area id run onto the end of it. So the first
 * character is the scope and whatever follows is the area.
 *
 * *One prefecture list capture supports the split*, so "the first character is the scope" is a
 * reading of one sample rather than a demonstrated rule; a one-digit area would produce `25`, which
 * this parses the same way but nobody has seen.
 */
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

/**
 * The prefecture the table is for, from the pager's own links.
 *
 * Read back rather than taken from the request because **the server rewrites `area=0` to the
 * caller's own prefecture** and answers with that, so what was asked for is not what was served.
 */
function readArea(root: HTMLElement): number | null {
  for (const anchor of root.querySelectorAll("a")) {
    const area = (anchor.getAttribute("href") ?? "").match(/[?&]area=(\d+)/)?.[1];
    if (area !== undefined && area !== "0") {
      return Number(area);
    }
  }
  return null;
}

/**
 * The page numbers the pager offers, taken from the arrows' own direction classes.
 *
 * **Both arrows are emitted on every page**; the `<a>` is dropped from whichever would lead
 * nowhere, so a missing anchor is the end signal in that direction. `li.arrow.left` is previous and
 * `li.arrow.right` is next — read them rather than inferring the current page from the numbers,
 * which cannot tell a lone previous-arrow from a lone next-arrow.
 *
 * Do not look for the end by overshooting either: an over-range `page` is silently clamped to page
 * 1 and comes back looking like an ordinary first page.
 */
function readPager(root: HTMLElement): { nextPage: number | null; previousPage: number | null } {
  const pageIn = (marker: string) => {
    const href = root.querySelector(`${marker} a`)?.getAttribute("href") ?? "";
    const page = href.match(/[?&]page=(\d+)/)?.[1];
    return page === undefined ? null : Number(page);
  };
  return { nextPage: pageIn("li.arrow.right"), previousPage: pageIn("li.arrow.left") };
}

/**
 * One row, or null when it holds none of the three fields a row is made of.
 *
 * The name and the score share `.rankingDetailScore`: the name is its `<span>` and the score is the
 * text after it. Reading the block whole would give `ひびの 1015360点`.
 */
function readEntry(row: HTMLElement): RankingEntry | null {
  const position = readCountText(row.querySelector(".rankingDetailRank span")?.text ?? null);
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
