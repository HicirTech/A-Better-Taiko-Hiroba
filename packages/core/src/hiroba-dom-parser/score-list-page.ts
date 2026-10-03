import type { CrownState, Genre, Level, Score, ScoreRank, Song } from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { parsePage } from "./parser";
import type { ParseFailure, ScoreListReading } from "./types";

const PAGE = "score_list.php";

/** This page spells the top crown `donderfull`, with two l's; the model keeps one spelling. */
const CROWN_NAMES: Readonly<Record<string, CrownState>> = {
  none: "none",
  played: "played",
  silver: "silver",
  gold: "gold",
  donderfull: "donderful",
};

/** `crown_button_<state>_<rank>_640.png` names both axes; `crown_button_none` has no rank. */
const CROWN_PATTERN = /crown_button_([a-z]+)(?:_(\d+))?_640\./;

/** `0` is no rank; any other value outside 2–8, or a missing suffix, is refused as `undefined`. */
function readRank(crown: CrownState, raw: string | undefined): ScoreRank | null | undefined {
  if (raw === undefined) {
    return crown === "none" ? null : undefined;
  }
  const rank = Number(raw);
  // `gold_0` is unseen yet legal-looking: accept it, or one row fails a whole genre.
  if (rank === 0) {
    return null;
  }
  return rank >= 2 && rank <= 8 ? (rank as ScoreRank) : undefined;
}

/** Parses a genre's `score_list.php`; an ura chart is a block with the same `song_no`, level 5. */
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
      // An anchor naming another genre means the page and the request have come apart.
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
