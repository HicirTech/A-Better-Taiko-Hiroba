import type { HTMLElement } from "node-html-parser";

import { danClearStateFromRowTier, danNumberFromName } from "../hiroba-models";
import { isErr, ok, type Result } from "../operation-results";
import { parsePage } from "./parser";
import type { ParseFailure, PlayerListReading, PlayerRow, PlayerRowDan } from "./types";

/**
 * Rows are `<div class="friendArea">` placed **directly inside a `<ul>`, with no `<li>`**, on every
 * one of the four pages. A selector assuming `ul > li` finds nothing.
 */
const ROW_MARKER = ".friendArea";

/**
 * The My Don image, and the reason this is not `.friendArea img`.
 *
 * A list row holds three images — the My Don and two button PNGs — while a search row holds only
 * the My Don, because it has no buttons. So `.friendArea img` happens to work on the search and
 * silently returns a button on the lists, which is the worst way for a selector to be wrong. The
 * `<img>` itself carries no class; `customd_mydon` is the portrait on profile-style pages only.
 */
const MYDON_IMAGE_MARKER = ".friendMydonImgArea img";

/** `if (current.page >= N)` in the page's own pager script — see `PlayerListReading.pageCount`. */
const PAGE_COUNT_PATTERN = /current\.page\s*>=\s*(\d+)/;

const NEXT_PAGE_PATTERN = /[?&]page=(\d+)/;

/**
 * Parses the three relationship lists and the player search — they are one shape and must not grow
 * three readers.
 *
 * `page` is the URL that was requested (`friend_list.php`, `user_search.php`, …); it travels into
 * every failure. **Zero rows is a reading, never a failure**: an empty list, a search matching
 * nobody, and a search that never ran are all ordinary answers, told apart by `notice`.
 *
 * `mypage_block_list.php` is **not** this shape — its rows are `.friendblocklist` — so it reads here
 * as an empty list with its own notice rather than being silently mis-parsed.
 */
export function parsePlayerRowsPage(
  html: string,
  page: string,
): Result<PlayerListReading, ParseFailure> {
  const parsed = parsePage(html, page);
  if (isErr(parsed)) {
    return parsed;
  }
  const root = parsed.value;

  const rows: PlayerRow[] = [];
  for (const element of root.querySelectorAll(ROW_MARKER)) {
    const row = readRow(element);
    if (row !== null) {
      rows.push(row);
    }
  }

  const nextHref = root
    .querySelectorAll("a")
    .map((anchor) => anchor.getAttribute("href") ?? "")
    .find((href) => NEXT_PAGE_PATTERN.test(href));
  const nextMatch = nextHref?.match(NEXT_PAGE_PATTERN);

  const pageCountMatch = html.match(PAGE_COUNT_PATTERN);

  return ok({
    rows,
    nextPage: nextMatch?.[1] === undefined ? null : Number(nextMatch[1]),
    pageCount: pageCountMatch?.[1] === undefined ? null : Number(pageCountMatch[1]),
    notice: root.querySelector("#error")?.text.trim().replace(/\s+/g, " ") || null,
  });
}

/**
 * One row, or null when the element carries none of the three text fields.
 *
 * Dropping such an element rather than failing is deliberate: the page's own markup is the only
 * contract here, and a wrapper that holds no player is not evidence that the page changed.
 */
function readRow(element: HTMLElement): PlayerRow | null {
  const title = labelledText(element, ".friendTitleArea");
  const nickname = labelledText(element, ".friendMydonNameArea");
  const taikoNo = taikoNumberIn(element);
  if (title === null && nickname === null && taikoNo === null) {
    return null;
  }

  return {
    taikoNo: taikoNo ?? "",
    nickname: nickname ?? "",
    title: title ?? "",
    dan: readDan(element),
    myDonImageUrl: element.querySelector(MYDON_IMAGE_MARKER)?.getAttribute("src") ?? null,
  };
}

/**
 * The value of a `ラベル：値` field, normalised.
 *
 * List rows print these inline; search rows wrap them in tabs and newlines, and some titles carry a
 * raw `&nbsp;`. Both are collapsed here so a title compares equal whichever page it came from.
 */
function labelledText(row: HTMLElement, marker: string): string | null {
  const element = row.querySelector(marker);
  if (element === null) {
    return null;
  }
  const text = element.text.replace(/ /g, " ").replace(/\s+/g, " ").trim();
  const index = text.indexOf("：");
  return index === -1 ? text : text.slice(index + 1).trim();
}

/**
 * The row's taiko number, taken from the profile link rather than the hidden input.
 *
 * **The hidden `input[name=taiko_no]` exists on list rows and on no search row at all** — a real
 * search page counts 20 rows and zero of them. The profile anchor is on both. The My Don image
 * repeats the same number as `fn=mydon_<T>`, which is a free cross-check for anyone who wants one.
 */
function taikoNumberIn(row: HTMLElement): string | null {
  for (const anchor of row.querySelectorAll("a")) {
    const match = (anchor.getAttribute("href") ?? "").match(/user_profile\.php\?taiko_no=(\d{12})/);
    if (match?.[1] !== undefined) {
      return match[1];
    }
  }
  return null;
}

/**
 * The row's dan, as one of three states.
 *
 * `段位なし` breaks the `<name>(<tier>)` pattern the other values follow — no parentheses at all —
 * so a regex requiring the brackets fails on it. A name or tier outside the fifteen and the six
 * reads as `notShown` rather than being guessed at: this row is the cross-check for the plate
 * reader, and a cross-check that invents values is worth nothing.
 */
function readDan(row: HTMLElement): PlayerRowDan {
  const text = labelledText(row, ".friendDanArea");
  if (text === null) {
    return { kind: "notShown" };
  }
  if (text === "段位なし") {
    return { kind: "none" };
  }
  const match = text.match(/^(.+?)\((.+?)\)$/);
  const dan = match?.[1] === undefined ? null : danNumberFromName(match[1]);
  const clearState = match?.[2] === undefined ? null : danClearStateFromRowTier(match[2]);
  if (dan === null || clearState === null) {
    return { kind: "notShown" };
  }
  return { kind: "dan", dan, clearState };
}
