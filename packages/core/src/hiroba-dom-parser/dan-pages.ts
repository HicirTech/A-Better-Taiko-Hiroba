import type { HTMLElement } from "node-html-parser";

import type {
  DanCondition,
  DanConditionStep,
  DanRecord,
  DanSongCounts,
  DanSongResult,
  Level,
} from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { readCountText } from "./element-readers";
import { parsePage } from "./parser";
import type { DanBoardPanel, DanBoardReading, ParseFailure } from "./types";

const BOARD_PAGE = "dan_top.php";
const DETAIL_PAGE = "dan_detail.php";

const RENDERED_PLATE = /imgsrc_dani\.php\?[^"']*\bdan=(\d+)/;
const STATIC_PLATE = /dani_plate_(\d+)_no_640/;

/** The panels print their names in romaji, in capitals, and nothing else on the board is. */
const PANEL_NAME = /^[A-Z][A-Z ]+$/;

/** Parses `dan_top.php`. Panels have no classes, so they are found by their plate image. */
export function parseDanBoardPage(html: string): Result<DanBoardReading, ParseFailure> {
  const page = parsePage(html, BOARD_PAGE);
  if (isErr(page)) {
    return page;
  }

  const panels: DanBoardPanel[] = [];
  for (const image of page.value.querySelectorAll("img")) {
    const source = image.getAttribute("src") ?? "";
    const rendered = source.match(RENDERED_PLATE);
    const staticArt = rendered === null ? source.match(STATIC_PLATE) : null;
    const danText = rendered?.[1] ?? staticArt?.[1];
    if (danText === undefined) {
      continue;
    }

    // A linked panel nests its image in an anchor, an unlinked one does not; a fixed number of
    // levels up would take the whole board for the named ranks and name each after the first.
    const anchor = image.parentNode?.rawTagName?.toLowerCase() === "a" ? image.parentNode : null;
    const box = anchor?.parentNode ?? image.parentNode ?? null;
    const name =
      box
        ?.querySelectorAll("div")
        .map((div) => div.text.trim())
        .find((text) => PANEL_NAME.test(text)) ?? "";
    const href = anchor?.getAttribute("href") ?? null;

    panels.push({
      dan: Number(danText),
      name,
      plateImageUrl: source,
      plateIsRendered: rendered !== null,
      detailUrl: href?.includes(DETAIL_PAGE) ? href : null,
    });
  }

  if (panels.length === 0) {
    return err({ kind: "missingMarker", page: BOARD_PAGE, marker: 'img[src*="imgsrc_dani.php"]' });
  }
  return ok({ panels: panels.sort((left, right) => left.dan - right.dan) });
}

const CONDITION_BESTS_MARKER = "条件毎の成績";

const TOTAL_COUNT_KEYS: Readonly<Record<string, keyof DanSongCounts>> = {
  "001": "good",
  "002": "ok",
  "003": "bad",
  "004": "maxCombo",
  "005": "drumroll",
  "006": "hits",
};

const SONG_COUNT_KEYS: Readonly<Record<string, keyof DanSongCounts>> = {
  good: "good",
  ok: "ok",
  ng: "bad",
  combo: "maxCombo",
  pound: "drumroll",
  hit: "hits",
};

/** How the page writes a figure it has no value for, in every field on the page. */
const NO_VALUE = "-";

/** Parses `dan_detail.php`; the page names no dan, player or `clearState` (that is the plate's). */
export function parseDanDetailPage(
  html: string,
  dan: number,
  taikoNo: string,
  fetchedAt: string,
  clearState: DanRecord["clearState"],
): Result<DanRecord, ParseFailure> {
  const page = parsePage(html, DETAIL_PAGE);
  if (isErr(page)) {
    return page;
  }
  const root = page.value;

  // The two condition blocks share a parent, told apart only by the sentence between them.
  const order = preOrder(root);
  const markerIndex = order.findIndex(
    (element) =>
      element.querySelectorAll("*").length === 0 && element.text.includes(CONDITION_BESTS_MARKER),
  );
  const isBest = (element: HTMLElement) =>
    markerIndex !== -1 && order.indexOf(element) > markerIndex;

  const conditions: DanCondition[] = [];
  const conditionBests: DanCondition[] = [];
  for (const element of order) {
    const condition = readCondition(element);
    if (condition === null) {
      continue;
    }
    (isBest(element) ? conditionBests : conditions).push(condition);
  }

  const totalScore = readCountText(root.querySelector(".total_score_score")?.text ?? null);

  // The page states it: `p.head_error` has text only when there is no record.
  const hasRecord = (root.querySelector(".head_error")?.text.trim() ?? "") === "";

  return ok({
    taikoNo,
    dan,
    clearState,
    hasRecord,
    totalScore,
    totalCounts: readTotalCounts(root),
    conditions,
    conditionBests,
    songs: readSongs(root),
    updatedAt: readUpdatedAt(root),
    fetchedAt,
  });
}

function preOrder(root: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  const visit = (element: HTMLElement) => {
    out.push(element);
    for (const child of element.querySelectorAll(":scope > *")) {
      visit(child);
    }
  };
  visit(root);
  return out;
}

function readCondition(element: HTMLElement): DanCondition | null {
  const classes = element.getAttribute("class") ?? "";

  if (classes.split(/\s+/).includes("odai_total_song")) {
    // The border row holds three spans: name, a spacer, requirement.
    const spans = element.querySelectorAll(".odai_total_song_border span");
    const name = spans[0]?.text.trim() ?? "";
    const requirement = spans[2]?.text.trim() ?? "";
    const achieved = element.querySelector(".odai_total_song_result span")?.text.trim() ?? "";
    return name === "" ? null : { kind: "course", name, requirement, achieved };
  }

  if (classes.split(/\s+/).includes("odai_song")) {
    const name = element.querySelector(".odai_song_border_name span")?.text.trim() ?? "";
    const songs: DanConditionStep[] = element
      .querySelectorAll(".odai_song_border_border")
      .map((step) => {
        const spans = step.querySelectorAll("span");
        return {
          requirement: spans[0]?.text.trim() ?? "",
          achieved: spans[1]?.text.trim() ?? "",
        };
      });
    return name === "" ? null : { kind: "perSong", name, songs };
  }

  return null;
}

function readTotalCounts(root: HTMLElement): DanSongCounts | null {
  const counts: Partial<Record<keyof DanSongCounts, number>> = {};
  for (const cell of root.querySelectorAll(".total_status")) {
    const key = (cell.querySelector("img")?.getAttribute("src") ?? "").match(
      /txt_score_(\d+)/,
    )?.[1];
    const field = key === undefined ? undefined : TOTAL_COUNT_KEYS[key];
    if (field === undefined) {
      continue;
    }
    const value = readCountText(cell.text);
    if (value !== null) {
      counts[field] = value;
    }
  }
  return completeCounts(counts);
}

function readSongs(root: HTMLElement): readonly DanSongResult[] {
  const songs: DanSongResult[] = [];
  for (const block of root.querySelectorAll('[class*="songLisrArea"]')) {
    const title = block.querySelector(".songName")?.text.trim() ?? "";
    const levelText = (
      block.querySelector('img[src*="level_icon_"]')?.getAttribute("src") ?? ""
    ).match(/level_icon_(\d)_640/)?.[1];
    const level = levelText === undefined ? null : (Number(levelText) as Level);

    const table = block.querySelector(".scoreDetailTable");
    const counts: Partial<Record<keyof DanSongCounts, number>> = {};
    for (const cell of table?.querySelectorAll("div") ?? []) {
      const key = (cell.querySelector("img")?.getAttribute("src") ?? "").match(
        /score_name_(\w+)_640/,
      )?.[1];
      const field = key === undefined ? undefined : SONG_COUNT_KEYS[key];
      if (field === undefined) {
        continue;
      }
      const value = readCountText(cell.text);
      if (value !== null) {
        counts[field] = value;
      }
    }

    songs.push({
      // `？？？` is the page masking the song, not a title anyone can look up.
      title: title === "" || title === "？？？" ? null : title,
      level,
      record: completeCounts(counts),
    });
  }
  return songs;
}

/** A count set is kept only when the page gave every one of the six; a partial set is no record. */
function completeCounts(
  counts: Partial<Record<keyof DanSongCounts, number>>,
): DanSongCounts | null {
  const { good, ok: okCount, bad, drumroll, maxCombo, hits } = counts;
  if (
    good === undefined ||
    okCount === undefined ||
    bad === undefined ||
    drumroll === undefined ||
    maxCombo === undefined ||
    hits === undefined
  ) {
    return null;
  }
  return { good, ok: okCount, bad, drumroll, maxCombo, hits };
}

/** The printed timestamp, or null for the all-dashes form an unattempted dan shows. */
function readUpdatedAt(root: HTMLElement): string | null {
  const text = root.querySelector(".head_update_day")?.text ?? "";
  const value = text.slice(text.indexOf("：") + 1).trim();
  return value === "" ||
    value
      .replaceAll(NO_VALUE, "")
      .trim()
      .replace(/[/:\s]/g, "") === ""
    ? null
    : value;
}
