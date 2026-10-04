import type { HTMLElement } from "node-html-parser";

import { danClearStateFromRowTier, danNumberFromName } from "../hiroba-models";
import { isErr, ok, type Result } from "../operation-results";
import { parsePage } from "./parser";
import type { ParseFailure, PlayerListReading, PlayerRow, PlayerRowDan } from "./types";

/** Rows are `div.friendArea` directly inside a `<ul>`, with no `<li>`, on all four pages. */
const ROW_MARKER = ".friendArea";

/** Not `.friendArea img`: list rows also hold two button images, which that selector can return. */
const MYDON_IMAGE_MARKER = ".friendMydonImgArea img";

/** `if (current.page >= N)` in the page's own pager script. */
const PAGE_COUNT_PATTERN = /current\.page\s*>=\s*(\d+)/;

const NEXT_PAGE_PATTERN = /[?&]page=(\d+)/;

/** Parses the three relationship lists and the player search, which are one shape. */
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

function readRow(element: HTMLElement): PlayerRow | null {
  const title = labelledText(element, ".friendTitleArea");
  const nickname = labelledText(element, ".friendMydonNameArea");
  const taikoNo = taikoNumberIn(element);
  // A wrapper holding no player is not evidence that the page changed, so it is dropped.
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

/** The value of a `ラベル：値` field with whitespace and `&nbsp;` collapsed, so pages compare equal. */
function labelledText(row: HTMLElement, marker: string): string | null {
  const element = row.querySelector(marker);
  if (element === null) {
    return null;
  }
  const text = element.text.replace(/ /g, " ").replace(/\s+/g, " ").trim();
  const index = text.indexOf("：");
  return index === -1 ? text : text.slice(index + 1).trim();
}

/** From the profile link; the hidden `taiko_no` input is on list rows but on no search row. */
function taikoNumberIn(row: HTMLElement): string | null {
  for (const anchor of row.querySelectorAll("a")) {
    const match = (anchor.getAttribute("href") ?? "").match(/user_profile\.php\?taiko_no=(\d{12})/);
    if (match?.[1] !== undefined) {
      return match[1];
    }
  }
  return null;
}

/** `段位なし` carries no parentheses; an unknown name or tier is `notShown`, never guessed at. */
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
