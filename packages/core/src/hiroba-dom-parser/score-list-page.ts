import type { CrownState, Genre, Level, Score, Song } from "../hiroba-models";
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
 * Parses one genre's `score_list.php` page: every song at every level, with no pagination.
 *
 * Each song is an `li.contentBox` holding the title and one detail anchor per chart; an ura
 * difficulty arrives as its own block carrying the same `song_no` at `level=5`, so songs are
 * de-duplicated by number while every chart stays its own Score. The crown state rides in the
 * anchor's image name, and every state is returned — `played` and `none` included.
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
    const crownRaw = crownSrc.match(/crown_button_([a-z]+)_/)?.[1];
    const crown = crownRaw === undefined ? undefined : CROWN_NAMES[crownRaw];
    if (crown === undefined) {
      return err({
        kind: "unreadableValue",
        page: PAGE,
        marker: "img (crown_button)",
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
      fidelity: "list",
      record: null,
      fetchedAt,
    });
  }

  return ok({ songs: [...songs.values()], scores });
}
