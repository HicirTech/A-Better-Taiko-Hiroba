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

/** 区間毎詳細成績 blocks repeat most of these after the main record: take the first match. */
const RECORD_MARKERS = {
  highScore: ".high_score",
  good: ".good_cnt",
  ok: ".ok_cnt",
  bad: ".ng_cnt",
  drumroll: ".pound_cnt",
  maxCombo: ".combo_cnt",
} as const;

const PLAY_COUNT_MARKERS = {
  stageCount: ".stage_cnt",
  clearCount: ".clear_cnt",
  fullComboCount: ".full_combo_cnt",
  donderfulComboCount: ".dondaful_combo_cnt",
} as const;

type PlayCounts = Readonly<Record<keyof typeof PLAY_COUNT_MARKERS, number>>;

/** What a record says where the page prints no play counts: unknown, never 0. */
const PLAY_COUNTS_NOT_PRINTED = {
  stageCount: null,
  clearCount: null,
  fullComboCount: null,
  donderfulComboCount: null,
} as const;

const OPTION_MARKER = ".optionImage img";
const SUPPORT_CHART_NOT_SHOWN = null;

/** The My Don's profile link, which names whose chart this is. */
const SUBJECT_MARKER = ".scoreDetailMydonImage a";

/** `crown_large_<N>` above 0. What 0 means is each reader's own question. */
const CLEARED_CROWNS: Readonly<Record<number, CrownState>> = {
  1: "silver",
  2: "gold",
  3: "donderful",
};

/** Parses my own `score_detail.php`; an untouched chart (未プレイまたは同期中) has `record: null`. */
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

/** Parses another player's `score_detail.php`, where the four play counts may be absent. */
export function parsePublicScoreDetailPage(
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

  const subject = requireMarker(root, SUBJECT_MARKER, PAGE);
  if (isErr(subject)) {
    return subject;
  }
  const subjectHref = subject.value.getAttribute("href") ?? "";
  const shown = subjectHref.match(/[?&]taiko_no=([^&]*)/)?.[1];
  if (shown !== taikoNo) {
    return err({
      kind: "unreadableValue",
      page: PAGE,
      marker: `${SUBJECT_MARKER} (taiko_no)`,
      raw: shown ?? subjectHref,
    });
  }

  const head = readCrownAndRank(root);
  if (isErr(head)) {
    return head;
  }
  const counts = readCounts(root, RECORD_MARKERS);
  if (isErr(counts)) {
    return counts;
  }
  const playCounts = readPlayCountsIfPrinted(root);
  if (isErr(playCounts)) {
    return playCounts;
  }
  const options = readOptions(root);
  if (isErr(options)) {
    return options;
  }

  // No play counts: read crown_large_0 as played, as a never-played chart has no crown image.
  const zeroCrown: CrownState =
    playCounts.value === null ? "played" : playedOrNone(playCounts.value.stageCount);
  return ok({
    taikoNo,
    songNo,
    level,
    crown: CLEARED_CROWNS[head.value.crownStatus] ?? zeroCrown,
    scoreRank: head.value.scoreRank,
    fidelity: "detail",
    record: {
      ...counts.value,
      ...(playCounts.value ?? PLAY_COUNTS_NOT_PRINTED),
      options: options.value,
    },
    fetchedAt,
  });
}

/** Null when the page prints none of the four play counts; a partial set fails. */
function readPlayCountsIfPrinted(root: HTMLElement): Result<PlayCounts | null, ParseFailure> {
  const printed = Object.values(PLAY_COUNT_MARKERS).some(
    (marker) => root.querySelector(marker) !== null,
  );
  return printed ? readCounts(root, PLAY_COUNT_MARKERS) : ok(null);
}

/** Both are the first match: the section crowns share the image family and come later. */
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

function readOptions(root: HTMLElement): Result<PlayOptions, ParseFailure> {
  return decodePlayOptions(
    root.querySelectorAll(OPTION_MARKER).map((img) => img.getAttribute("src") ?? ""),
    SUPPORT_CHART_NOT_SHOWN,
    PAGE,
    OPTION_MARKER,
  );
}
