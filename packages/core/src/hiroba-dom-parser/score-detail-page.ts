import type { Level, PlayOptions, RandomMode, Score, ScoreRank } from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { findImageBySrc } from "./element-readers";
import { parsePage, requireMarker } from "./parser";
import type { ParseFailure } from "./types";

const PAGE = "score_detail.php";

/**
 * The count blocks, exactly as the page classes them — including the site's own spelling of
 * `dondaful_combo_cnt`. Each holds a `<span>` like `933050点` or `3回`.
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

/** The speed codes of the `status_10_<code>` option vocabulary. */
const SPEED_CODES: Readonly<Record<string, number>> = {
  a10: 1,
  a11: 1.1,
  a12: 1.2,
  a13: 1.3,
  a14: 1.4,
  a15: 1.5,
  a16: 1.6,
  a17: 1.7,
  a18: 1.8,
  a19: 1.9,
  a3: 2,
  a25: 2.5,
  a4: 3,
  a35: 3.5,
  a5: 4,
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
    const digits = raw.match(/^([\d,]+)[点回]?$/)?.[1]?.replaceAll(",", "");
    if (digits === undefined) {
      return err({ kind: "unreadableValue", page: PAGE, marker, raw });
    }
    counts[field] = Number(digits);
  }

  const options = readOptions(root);
  if (isErr(options)) {
    return options;
  }

  const stageCount = counts.stageCount as number;
  return ok({
    taikoNo,
    songNo,
    level,
    // The one place `played` can be told apart from `none` on this page.
    crown:
      crownStatus === 0
        ? stageCount > 0
          ? "played"
          : "none"
        : crownStatus === 1
          ? "silver"
          : crownStatus === 2
            ? "gold"
            : "donderful",
    fidelity: "detail",
    record: {
      scoreRank: scoreRank as ScoreRank | null,
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

/** Decodes the `status_10_<code>` images inside `.optionImage`; blanks carry no code. */
function readOptions(root: Parameters<typeof requireMarker>[0]): Result<PlayOptions, ParseFailure> {
  let speed = 1;
  let doron = false;
  let abekobe = false;
  let random: RandomMode = "none";
  for (const img of root.querySelectorAll(".optionImage img")) {
    const src = img.getAttribute("src") ?? "";
    const code = src.match(/status_10_([a-z0-9]+)_/)?.[1];
    if (code === undefined) {
      continue; // blank_640.gif fills the unused slots
    }
    const asSpeed = SPEED_CODES[code];
    if (asSpeed !== undefined) {
      speed = asSpeed;
    } else if (code === "a1") {
      doron = true;
    } else if (code === "a2") {
      abekobe = true;
    } else if (code === "a6") {
      random = "kimagure";
    } else if (code === "a7") {
      random = "detarame";
    } else {
      // A code outside the known vocabulary is new knowledge, not something to shrug past.
      return err({ kind: "unreadableValue", page: PAGE, marker: ".optionImage img", raw: src });
    }
  }
  // The detail page never shows サポート譜面; only the recent-plays page can know it.
  return ok({ speed, doron, abekobe, random, supportChart: null });
}
