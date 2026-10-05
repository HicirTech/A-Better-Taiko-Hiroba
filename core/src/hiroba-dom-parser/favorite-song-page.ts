import { isErr, ok, type Result } from "../operation-results";
import { readEditorToken, readShownSong, readSongNo, SONG_NAME } from "./favorite-fields";
import { parsePage, requireMarker } from "./parser";
import type { FavoriteSongEditorReading, ParseFailure } from "./types";

const PAGE = "portal_favorite_song_select.php";
const HEADING = `h2.subtitleMypage:contains("「大好きな曲」の設定")`;
const SONG_NO = "input#song_no";
const BSF = "input#bsf";

/** `bsf` as the picker's links set it: 1 for a song's 裏 entry. */
const URA_BSF = "1";

/** Reads the 大好きな曲 editor; its `bsf` says whether the song set is the 裏 entry. */
export function parseFavoriteSongEditorPage(
  html: string,
): Result<FavoriteSongEditorReading, ParseFailure> {
  const page = parsePage(html, PAGE);
  if (isErr(page)) {
    return page;
  }
  const root = page.value;
  const heading = requireMarker(root, HEADING, PAGE);
  if (isErr(heading)) {
    return heading;
  }
  const token = readEditorToken(root, PAGE);
  if (isErr(token)) {
    return token;
  }
  const input = requireMarker(root, SONG_NO, PAGE);
  if (isErr(input)) {
    return input;
  }
  const songNo = readSongNo(input.value, PAGE, SONG_NO);
  if (isErr(songNo)) {
    return songNo;
  }
  const bsf = requireMarker(root, BSF, PAGE);
  if (isErr(bsf)) {
    return bsf;
  }
  const song =
    songNo.value === null
      ? ok(null)
      : readShownSong(root.querySelector(SONG_NAME), songNo.value, PAGE, SONG_NAME);
  if (isErr(song)) {
    return song;
  }
  const ura = songNo.value !== null && bsf.value.getAttribute("value") === URA_BSF;
  return ok({ state: { songNo: songNo.value, ura }, token: token.value, song: song.value });
}
