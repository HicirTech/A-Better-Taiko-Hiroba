import { type Level, playedOrNone, type Score, type ScoreRank } from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { findImageBySrc, readCountText } from "./element-readers";
import { parsePage, requireMarker } from "./parser";
import { decodePlayOptions } from "./play-options";
import type { ParseFailure } from "./types";

const PAGE = "score_detail.php";

/**
 * The count blocks, exactly as the page classes them — including the site's own spelling of
 * `dondaful_combo_cnt`. Each holds a `<span>` like `933050点` or `3回`.
 *
 * None of these markers is unique in the document: the 区間毎詳細成績 blocks further down repeat
 * `.high_score`, `.good_cnt`, `.ng_cnt`, `.ok_cnt`, `.pound_cnt` and the `crown_large_*` images,
 * one set per section. The main record always precedes them, so every read here takes the first
 * match — collecting all matches, or taking the last, would mix the sections into the record.
 */
const COUNT_MARKERS = {
  highScore: ".high_score",
  good: ".good_cnt",
  ok: ".ok_cnt",
  bad: ".ng_cnt",
  drumroll: ".pound_cnt",
  maxCombo: ".combo_cnt",
  stageCount: ".stage_cnt",
  clearCount: ".clear_cnt",
  fullComboCount: ".full_combo_cnt",
  donderfulComboCount: ".dondaful_combo_cnt",
} as const;

const OPTION_MARKER = ".optionImage img";

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

  const counts: Record<string, number> = {};
  for (const [field, marker] of Object.entries(COUNT_MARKERS)) {
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

  // Blanks pad the unused slots, and this page never shows サポート譜面 — only the recent-plays
  // page can know it.
  const options = decodePlayOptions(
    root.querySelectorAll(OPTION_MARKER).map((img) => img.getAttribute("src") ?? ""),
    null,
    PAGE,
    OPTION_MARKER,
  );
  if (isErr(options)) {
    return options;
  }

  const stageCount = counts.stageCount as number;
  return ok({
    taikoNo,
    songNo,
    level,
    crown:
      crownStatus === 0
        ? playedOrNone(stageCount)
        : crownStatus === 1
          ? "silver"
          : crownStatus === 2
            ? "gold"
            : "donderful",
    scoreRank: scoreRank as ScoreRank | null,
    fidelity: "detail",
    record: {
      highScore: counts.highScore as number,
      good: counts.good as number,
      ok: counts.ok as number,
      bad: counts.bad as number,
      drumroll: counts.drumroll as number,
      maxCombo: counts.maxCombo as number,
      stageCount,
      clearCount: counts.clearCount as number,
      fullComboCount: counts.fullComboCount as number,
      donderfulComboCount: counts.donderfulComboCount as number,
      options: options.value,
    },
    fetchedAt,
  });
}
