import type { HTMLElement } from "node-html-parser";

import {
  type CrownState,
  type Genre,
  type Level,
  type PlayOptions,
  playedOrNone,
  type Score,
  type ScoreRank,
  type ScoreRecord,
} from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { findImageBySrc, readCountText } from "./element-readers";
import { parsePage, requireMarker } from "./parser";
import { decodePlayOptions } from "./play-options";
import type { ParseFailure, RecentPlay } from "./types";

const PAGE = "history_recent_score.php";

/** The rows live in this container, so an empty one is a quiet account, not a broken page. */
const LIST_MARKER = "#recentScoreList";
const ROW_MARKER = ".scoreUser";

/**
 * This page's crown numbering, which is **not** the detail page's: here `crown_02` is gold and
 * `crown_03` is silver, while `crown_large_1` is silver and `crown_large_2` is gold. Reusing the
 * detail numbering here would report every clear as a full combo and back.
 */
const ROW_CROWNS: Readonly<Record<string, CrownState>> = {
  "1": "none",
  "2": "gold",
  "3": "silver",
  "4": "donderful",
};

/**
 * The page's only genre signal is the suffix of the title's font class, `songNameFont<name>`,
 * which these names map onto the genre numbers `score_list.php?genre=N` uses. A name outside this
 * table reads as no genre rather than failing: the site may add a genre, and a row whose genre is
 * merely unknown is still a complete play.
 */
const ROW_GENRES: Readonly<Record<string, Genre>> = {
  jpop: 1,
  anime: 2,
  kids: 3,
  vocaloid: 4,
  game: 5,
  namco: 6,
  variety: 7,
  classic: 8,
};

/** Each count cell is named by its label image, `score_name_<key>_640.png`. */
const COUNT_KEYS: Readonly<Record<string, keyof ScoreRecord>> = {
  good: "good",
  ok: "ok",
  ng: "bad",
  pound: "drumroll",
  combo: "maxCombo",
  stage: "stageCount",
  clear: "clearCount",
  full_combo: "fullComboCount",
  dondaful_combo: "donderfulComboCount",
};

/** サポート譜面 / ランダム / あべこべ / ドロン / 速度 — a row that has more or fewer has changed. */
const OPTION_CELL_COUNT = 5;

/**
 * Parses `history_recent_score.php` — the last five charts played, newest first.
 *
 * Each row carries what that chart's detail page carries, field for field, plus the サポート譜面
 * slot no other page exposes. What it does not carry is a song number: nothing on the page names
 * one, so a row stays a `RecentPlay` until a caller resolves its title and can call
 * `scoreFromRecentPlay`. The row's genre travels with it for that resolver's sake: it is the only
 * signal on the page that can separate two songs sharing a title. Recency is the array's order and
 * nothing more — the rows have no timestamps, and none are invented.
 */
export function parseRecentPlaysPage(html: string): Result<readonly RecentPlay[], ParseFailure> {
  const page = parsePage(html, PAGE);
  if (isErr(page)) {
    return page;
  }
  const list = requireMarker(page.value, LIST_MARKER, PAGE);
  if (isErr(list)) {
    return list;
  }

  const plays: RecentPlay[] = [];
  for (const row of list.value.querySelectorAll(ROW_MARKER)) {
    const play = readRow(row);
    if (isErr(play)) {
      return play;
    }
    plays.push(play.value);
  }
  return ok(plays);
}

/**
 * Completes a recent row into a Score, once its song number is known from somewhere that has one
 * — the catalogue or a score list. The row itself is one chart's full record; only the key is
 * missing.
 */
export function scoreFromRecentPlay(
  play: RecentPlay,
  taikoNo: string,
  songNo: string,
  fetchedAt: string,
): Score {
  return {
    taikoNo,
    songNo,
    level: play.level,
    crown: play.crown,
    scoreRank: play.scoreRank,
    fidelity: "recent",
    record: play.record,
    fetchedAt,
  };
}

function readRow(row: HTMLElement): Result<RecentPlay, ParseFailure> {
  const titleNode = row.querySelector("li.songNameTitleScore h2");
  const songTitle = titleNode?.text.trim() ?? "";
  if (songTitle === "") {
    return err({ kind: "missingMarker", page: PAGE, marker: "li.songNameTitleScore h2" });
  }
  const genreName = titleNode?.getAttribute("class")?.match(/songNameFont(\w+)/)?.[1] ?? "";
  const genre = ROW_GENRES[genreName] ?? null;

  // The level icon already says 5 for an ura chart; the ura badge beside the title is decoration.
  const levelSrc = row.querySelector("img.levelIcon")?.getAttribute("src") ?? "";
  const levelRaw = levelSrc.match(/icon_course02_(\d+)_/)?.[1];
  if (levelRaw === undefined) {
    return err({ kind: "missingMarker", page: PAGE, marker: "img.levelIcon" });
  }
  const level = Number(levelRaw);
  if (level < 1 || level > 5) {
    return err({ kind: "unreadableValue", page: PAGE, marker: "img.levelIcon", raw: levelSrc });
  }

  const crownSrc = findImageBySrc(row, "crown_0")?.getAttribute("src") ?? "";
  const crownRaw = crownSrc.match(/crown_0(\d)_/)?.[1];
  if (crownRaw === undefined) {
    return err({ kind: "missingMarker", page: PAGE, marker: 'img.crownIcon[src*="crown_0"]' });
  }
  const crown = ROW_CROWNS[crownRaw];
  if (crown === undefined) {
    return err({ kind: "unreadableValue", page: PAGE, marker: "img.crownIcon", raw: crownSrc });
  }

  const rankSrc = findImageBySrc(row, "best_score_rank_")?.getAttribute("src") ?? "";
  const rankRaw = rankSrc.match(/best_score_rank_(\d)_/)?.[1];
  const scoreRank = rankRaw === undefined ? null : Number(rankRaw);
  if (scoreRank !== null && (scoreRank < 2 || scoreRank > 8)) {
    return err({ kind: "unreadableValue", page: PAGE, marker: "img.crownIcon", raw: rankSrc });
  }

  const highScore = readCountText(row.querySelector(".scoreScore")?.text ?? null);
  if (highScore === null) {
    return err({
      kind: "unreadableValue",
      page: PAGE,
      marker: ".scoreScore",
      raw: row.querySelector(".scoreScore")?.text.trim() ?? "",
    });
  }

  const counts = readCounts(row);
  if (isErr(counts)) {
    return counts;
  }

  const options = readOptions(row);
  if (isErr(options)) {
    return options;
  }

  return ok({
    songTitle,
    genre,
    level: level as Level,
    crown: crown === "none" ? playedOrNone(counts.value.stageCount) : crown,
    scoreRank: scoreRank as ScoreRank | null,
    record: {
      highScore,
      ...counts.value,
      options: options.value,
    },
  });
}

type Counts = Omit<ScoreRecord, "highScore" | "options">;

/** Reads the nine count cells by their label images; a cell the page does not name is skipped. */
function readCounts(row: HTMLElement): Result<Counts, ParseFailure> {
  const found = new Map<keyof ScoreRecord, number>();
  for (const label of row.querySelectorAll("img.score_name")) {
    const key = (label.getAttribute("src") ?? "").match(/score_name_([a-z_]+)_640/)?.[1];
    const field = key === undefined ? undefined : COUNT_KEYS[key];
    if (field === undefined) {
      continue; // the spacer cell carries blank_640.gif
    }
    const cell = label.closest(".playDataArea");
    const raw = cell?.querySelector(".playDataScore")?.text ?? null;
    const value = readCountText(raw);
    if (value === null) {
      return err({
        kind: "unreadableValue",
        page: PAGE,
        marker: `.playDataScore (${key})`,
        raw: raw?.trim() ?? "",
      });
    }
    found.set(field, value);
  }

  // Mutable and partial only while the nine are being collected; the result is neither.
  const counts: { -readonly [K in keyof Counts]?: number } = {};
  for (const [key, field] of Object.entries(COUNT_KEYS)) {
    const value = found.get(field);
    if (value === undefined) {
      return err({
        kind: "missingMarker",
        page: PAGE,
        marker: `img[src*="score_name_${key}"]`,
      });
    }
    counts[field as keyof Counts] = value;
  }
  return ok(counts as Counts);
}

/**
 * Reads the five option cells. The first is サポート譜面 — the one place on the site that shows it
 * — and it always ships an image, blank when the option was off. The other four hold the shared
 * `status_10_<code>` vocabulary. The support cell stays out of that decoder on purpose: its image
 * when the option is on is not a code we know, and it must not be refused as if it were one.
 */
function readOptions(row: HTMLElement): Result<PlayOptions, ParseFailure> {
  const cells = row.querySelectorAll(".playDataArea.option");
  if (cells.length !== OPTION_CELL_COUNT) {
    return err({
      kind: "unreadableValue",
      page: PAGE,
      marker: ".playDataArea.option",
      raw: `${cells.length} cells`,
    });
  }

  const supportSrc = cells[0]?.querySelector("img")?.getAttribute("src") ?? "";
  const supportChart = supportSrc !== "" && !supportSrc.includes("blank_");
  const sources = cells
    .slice(1)
    .flatMap((cell) => cell.querySelectorAll("img").map((img) => img.getAttribute("src") ?? ""));

  return decodePlayOptions(sources, supportChart, PAGE, ".playDataArea.option img");
}
