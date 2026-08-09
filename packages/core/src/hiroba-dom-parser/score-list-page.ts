import type { CrownState, Genre, Level, Score, ScoreRank, Song } from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { parsePage } from "./parser";
import type { ParseFailure, ScoreListReading } from "./types";

const PAGE = "score_list.php";

/**
 * The site's crown names, which are not the model's. This page spells the top state
 * **`donderfull`**, with two l's — `crown_button_donderful_8_640.png` is a 404 on the site — while
 * the detail page classes the same idea `dondaful_combo_cnt` and the profile `donderful_crown_count`.
 * Every page gets its own spelling; the model keeps one and the parsers translate.
 */
const CROWN_NAMES: Readonly<Record<string, CrownState>> = {
  none: "none",
  played: "played",
  silver: "silver",
  gold: "gold",
  donderfull: "donderful",
};

/**
 * One image names both axes: `crown_button_<state>_<rank>_640.png`. `crown_button_none` is the one
 * image that names no rank at all, so the suffix is optional here and required by `readRank`
 * everywhere else.
 */
const CROWN_PATTERN = /crown_button_([a-z]+)(?:_(\d+))?_640\./;

/**
 * The suffix is the chart's score rank, and it is independent of the crown: `played_5` and
 * `gold_5` both occur, so neither axis may be inferred from the other. `0` is the site's way of
 * saying no rank — never rank zero, which does not exist. Any other number outside 2–8, or a
 * missing suffix on a state that always carries one, is new knowledge and is refused rather than
 * guessed; `undefined` is that refusal.
 *
 * `gold_0` is still accepted and still unseen: an earlier version of this comment cited it as
 * occurring live, and it does not appear once in the captured genre pages of two accounts. Keep
 * accepting it — refusing a legal-looking suffix would fail a whole genre over one row.
 */
function readRank(crown: CrownState, raw: string | undefined): ScoreRank | null | undefined {
  if (raw === undefined) {
    return crown === "none" ? null : undefined;
  }
  const rank = Number(raw);
  if (rank === 0) {
    return null;
  }
  return rank >= 2 && rank <= 8 ? (rank as ScoreRank) : undefined;
}

/**
 * Parses one genre's `score_list.php` page: every song at every level, with no pagination.
 *
 * Each song is an `li.contentBox` holding the title and one detail anchor per chart; an ura
 * difficulty arrives as its own block carrying the same `song_no` at `level=5`, so songs are
 * de-duplicated by number while every chart stays its own Score. The anchor's image name carries
 * both the crown state and the score rank, and every state is returned — `played` and `none`
 * included. One genre page therefore already knows the rank of every chart in it, and no detail
 * fetch is owed for the rank alone.
 */
export function parseScoreListPage(
  html: string,
  taikoNo: string,
  genre: Genre,
  fetchedAt: string,
): Result<ScoreListReading, ParseFailure> {
  const page = parsePage(html, PAGE);
  if (isErr(page)) {
    return page;
  }

  const anchors = page.value
    .querySelectorAll("a")
    .filter((a) => (a.getAttribute("href") ?? "").includes("score_detail.php"));
  if (anchors.length === 0) {
    return err({ kind: "missingMarker", page: PAGE, marker: 'a[href*="score_detail.php"]' });
  }

  const songs = new Map<string, Song>();
  const scores: Score[] = [];
  for (const anchor of anchors) {
    const href = anchor.getAttribute("href") ?? "";
    const params = new URLSearchParams(href.slice(href.indexOf("?") + 1));
    const songNo = params.get("song_no") ?? "";
    const levelRaw = Number(params.get("level"));
    const genreRaw = Number(params.get("genre"));
    if (!/^\d+$/.test(songNo) || levelRaw < 1 || levelRaw > 5 || !Number.isInteger(levelRaw)) {
      return err({
        kind: "unreadableValue",
        page: PAGE,
        marker: "a[href] (song_no, level)",
        raw: href,
      });
    }
    if (genreRaw !== genre) {
      // The caller fetched one genre; an anchor naming another means the page and the request
      // have come apart.
      return err({ kind: "unreadableValue", page: PAGE, marker: "a[href] (genre)", raw: href });
    }

    const crownSrc = anchor.querySelector("img")?.getAttribute("src") ?? "";
    const [, crownRaw, rankRaw] = crownSrc.match(CROWN_PATTERN) ?? [];
    const crown = crownRaw === undefined ? undefined : CROWN_NAMES[crownRaw];
    if (crown === undefined) {
      return err({
        kind: "unreadableValue",
        page: PAGE,
        marker: "img (crown_button)",
        raw: crownSrc,
      });
    }
    const scoreRank = readRank(crown, rankRaw);
    if (scoreRank === undefined) {
      return err({
        kind: "unreadableValue",
        page: PAGE,
        marker: "img (crown_button rank)",
        raw: crownSrc,
      });
    }

    // The title lives beside the anchors, inside the same song block.
    if (!songs.has(songNo)) {
      const block = anchor.closest("li.contentBox");
      const title = block?.querySelector(".songName")?.text.trim() ?? "";
      if (title === "") {
        return err({ kind: "missingMarker", page: PAGE, marker: ".songName" });
      }
      songs.set(songNo, { songNo, title, genres: [genre] });
    }

    scores.push({
      taikoNo,
      songNo,
      level: levelRaw as Level,
      crown,
      scoreRank,
      fidelity: "list",
      record: null,
      fetchedAt,
    });
  }

  return ok({ songs: [...songs.values()], scores });
}
