import type { HTMLElement } from "node-html-parser";

import {
  type CrownState,
  type Level,
  type PlayOptions,
  playedOrNone,
  type Score,
  type ScoreRank,
} from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { findImageBySrc, readCountText } from "./element-readers";
import { parsePage, requireMarker } from "./parser";
import { decodePlayOptions } from "./play-options";
import type { ParseFailure } from "./types";

const PAGE = "score_detail.php";

/**
 * The record's count blocks, exactly as the page classes them. Each holds a `<span>` like
 * `933050点` or `3回`.
 *
 * All but `.combo_cnt` repeat further down: the 区間毎詳細成績 blocks repeat `.high_score`,
 * `.good_cnt`, `.ng_cnt`, `.ok_cnt`, `.pound_cnt` and the `crown_large_*` images, one set per
 * section. The main record always precedes them, so every read here takes the first match —
 * collecting all matches, or taking the last, would mix the sections into the record.
 * `.combo_cnt` appears exactly once on each of the six captures that render a detail page,
 * sections or not, so its first match is its only one.
 */
const RECORD_MARKERS = {
  highScore: ".high_score",
  good: ".good_cnt",
  ok: ".ok_cnt",
  bad: ".ng_cnt",
  drumroll: ".pound_cnt",
  maxCombo: ".combo_cnt",
} as const;

/**
 * The four play counts, in the same block shape — including the site's own spelling of
 * `dondaful_combo_cnt`. None of them repeats in the section blocks.
 */
const PLAY_COUNT_MARKERS = {
  stageCount: ".stage_cnt",
  clearCount: ".clear_cnt",
  fullComboCount: ".full_combo_cnt",
  donderfulComboCount: ".dondaful_combo_cnt",
} as const;

const OPTION_MARKER = ".optionImage img";

/** `crown_large_<N>` above 0. What 0 means is each reader's own question. */
const CLEARED_CROWNS: Readonly<Record<number, CrownState>> = {
  1: "silver",
  2: "gold",
  3: "donderful",
};

/**
 * Parses one chart's `score_detail.php` into a detail-fidelity Score.
 *
 * A chart the player never touched answers with 未プレイまたは同期中 — known emptiness, so the
 * Score says `record: null` rather than failing. On a played chart, `crown_large_0` with a
 * positive stage count is what `played` looks like: the detail page has no marker of its own for
 * played-but-not-cleared, which is exactly the asymmetry the model's CrownState preserves.
 */
export function parseScoreDetailPage(
  html: string,
  taikoNo: string,
  songNo: string,
  level: Level,
  fetchedAt: string,
): Result<Score, ParseFailure> {
  const page = parsePage(html, PAGE);
  if (isErr(page)) {
    return page;
  }
  const root = page.value;

  if (root.text.includes("未プレイまたは同期中")) {
    return ok({
      taikoNo,
      songNo,
      level,
      crown: "none",
      scoreRank: null,
      fidelity: "detail",
      record: null,
      fetchedAt,
    });
  }

  const head = readCrownAndRank(root);
  if (isErr(head)) {
    return head;
  }
  const counts = readCounts(root, { ...RECORD_MARKERS, ...PLAY_COUNT_MARKERS });
  if (isErr(counts)) {
    return counts;
  }
  const options = readOptions(root);
  if (isErr(options)) {
    return options;
  }

  return ok({
    taikoNo,
    songNo,
    level,
    crown: CLEARED_CROWNS[head.value.crownStatus] ?? playedOrNone(counts.value.stageCount),
    scoreRank: head.value.scoreRank,
    fidelity: "detail",
    record: { ...counts.value, options: options.value },
    fetchedAt,
  });
}

/**
 * The main crown's `crown_large_<N>` number and the rank image's. Both are the first match in the
 * page: the section crowns share the image family and come later.
 */
function readCrownAndRank(
  root: HTMLElement,
): Result<{ readonly crownStatus: number; readonly scoreRank: ScoreRank | null }, ParseFailure> {
  const crownImage = findImageBySrc(root, "crown_large_");
  const crownRaw = (crownImage?.getAttribute("src") ?? "").match(/crown_large_(\d)_/)?.[1];
  if (crownRaw === undefined) {
    return err({ kind: "missingMarker", page: PAGE, marker: 'img[src*="crown_large_"]' });
  }
  const crownStatus = Number(crownRaw);
  if (crownStatus < 0 || crownStatus > 3) {
    return err({
      kind: "unreadableValue",
      page: PAGE,
      marker: 'img[src*="crown_large_"]',
      raw: crownRaw,
    });
  }

  const rankRaw = (findImageBySrc(root, "best_score_rank_")?.getAttribute("src") ?? "").match(
    /best_score_rank_(\d)_/,
  )?.[1];
  const scoreRank = rankRaw === undefined ? null : Number(rankRaw);
  if (scoreRank !== null && (scoreRank < 2 || scoreRank > 8)) {
    return err({
      kind: "unreadableValue",
      page: PAGE,
      marker: 'img[src*="best_score_rank_"]',
      raw: rankRaw ?? "",
    });
  }
  return ok({ crownStatus, scoreRank: scoreRank as ScoreRank | null });
}

/** Reads each named block's first match, or fails naming the block that is missing or unreadable. */
function readCounts<Field extends string>(
  root: HTMLElement,
  markers: Readonly<Record<Field, string>>,
): Result<Readonly<Record<Field, number>>, ParseFailure> {
  const counts: Partial<Record<Field, number>> = {};
  for (const [field, marker] of Object.entries(markers) as [Field, string][]) {
    const block = requireMarker(root, marker, PAGE);
    if (isErr(block)) {
      return block;
    }
    const raw = block.value.querySelector("span")?.text.trim() ?? "";
    const value = readCountText(raw);
    if (value === null) {
      return err({ kind: "unreadableValue", page: PAGE, marker, raw });
    }
    counts[field] = value;
  }
  // Complete by construction: the loop covers every key or has already returned.
  return ok(counts as Record<Field, number>);
}

/**
 * Blanks pad the unused slots, and this page never shows サポート譜面 — only the recent-plays page
 * can know it.
 */
function readOptions(root: HTMLElement): Result<PlayOptions, ParseFailure> {
  return decodePlayOptions(
    root.querySelectorAll(OPTION_MARKER).map((img) => img.getAttribute("src") ?? ""),
    null,
    PAGE,
    OPTION_MARKER,
  );
}
