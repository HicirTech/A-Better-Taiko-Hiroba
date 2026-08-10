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

/** The account's own plate, and the shared art the board falls back to. */
const RENDERED_PLATE = /imgsrc_dani\.php\?[^"']*\bdan=(\d+)/;
const STATIC_PLATE = /dani_plate_(\d+)_no_640/;

/** The panels print their names in romaji, in capitals, and nothing else on the board is. */
const PANEL_NAME = /^[A-Z][A-Z ]+$/;

/**
 * Parses `dan_top.php` — the board of nineteen dan.
 *
 * **Nothing here says whether a dan is passed.** The board has no class, text or flag for it: the
 * fifteen numbered panels are server-rendered images keyed to the account and the pass state is
 * baked into the pixels, which is `readDanPlate`'s job. This parser reports which dan exist, what
 * the board calls them, where each plate is, and which have a detail page — and stops there.
 *
 * The panels carry no classes at all, only inline styles, so they are found by their plate image.
 */
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

    // A linked panel nests the image in an anchor and an unlinked one does not, so the panel box is
    // one level up in the first case and the image's own parent in the second. Walking a fixed
    // number of levels finds the whole board for the named ranks and names every one of them after
    // the first panel on it.
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

/** The sentence that separates the best attempt from the per-condition bests. */
const CONDITION_BESTS_MARKER = "条件毎の成績";

/** `txt_score_00N` on the whole-run counts, `score_name_<key>` on a song's. */
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

/**
 * Parses `dan_detail.php?dan=N` into a `DanRecord`.
 *
 * `dan`, `taikoNo` and `fetchedAt` come from the caller: the page names none of the three, and its
 * `clearState` is not here either — it lives in the plate image, so the caller pairs this with
 * `readDanPlate`. What the page does carry is the best attempt, its conditions, the three 課題曲,
 * and a second block giving the best result for **each condition separately**, which need not come
 * from one attempt.
 *
 * An unattempted dan is an ordinary reading, not a failure: it prints `-` everywhere, `0` for the
 * total and `----/--/--` for the timestamp, and renders no per-song tables at all.
 */
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

  // The two condition blocks share a parent and are told apart only by a sentence between them,
  // so position in the document is the only thing that separates them.
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

  // The page states this itself rather than leaving it to be inferred from a zero total or an
  // all-dashes timestamp: `p.head_error` is emitted either way and carries text only when there is
  // no record. Note what it actually says — no score registered, not "not passed".
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

/** Every element in document order, so two siblings deep in the tree can be compared. */
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

/**
 * One condition, in whichever of the two shapes the page used, or null for anything else.
 *
 * The whole-run shape's border row holds **three** spans, not two: name, a spacer, requirement.
 * Reading the second as the requirement yields a blank on every condition on the site.
 */
function readCondition(element: HTMLElement): DanCondition | null {
  const classes = element.getAttribute("class") ?? "";

  if (classes.split(/\s+/).includes("odai_total_song")) {
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

/** The six whole-run counts, or null when the page shows `-` for all of them. */
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

/**
 * The three 課題曲.
 *
 * A song is found by its list block rather than by position, and every part of it is optional: the
 * title is `？？？` when the dan masks it, the level icon is absent on a masked song, and the
 * counts table is absent whenever there is no per-song record.
 */
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
