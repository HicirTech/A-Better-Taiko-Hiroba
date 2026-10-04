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

/** Not the detail page's numbering: here `crown_02` is gold and `crown_03` is silver. */
const ROW_CROWNS: Readonly<Record<string, CrownState>> = {
  "1": "none",
  "2": "gold",
  "3": "silver",
  "4": "donderful",
};

/** Genre by the `songNameFont<name>` suffix; an unknown name is no genre, not a failure. */
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

/** Parses one page (five charts) of `history_recent_score.php`; its row order is no clock. */
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

/** Completes a row into a Score once a catalogue or score list has supplied its song number. */
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

/** Every row prints all nine counts, so none is null here, unlike another player's detail page. */
type Counts = Readonly<Record<Exclude<keyof ScoreRecord, "highScore" | "options">, number>>;

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

/** The five option cells: サポート譜面 first (an image, blank when off), then four status codes. */
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

  // The support cell stays out of the decoder: its "on" image is not a code we know.
  const supportSrc = cells[0]?.querySelector("img")?.getAttribute("src") ?? "";
  const supportChart = supportSrc !== "" && !supportSrc.includes("blank_");
  const sources = cells
    .slice(1)
    .flatMap((cell) => cell.querySelectorAll("img").map((img) => img.getAttribute("src") ?? ""));

  return decodePlayOptions(sources, supportChart, PAGE, ".playDataArea.option img");
}
