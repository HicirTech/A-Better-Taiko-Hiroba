import type { HTMLElement } from "node-html-parser";

import { FOLDER_SLOT_COUNT, type ShownSong } from "../hiroba-models";
import { isErr, ok, type Result } from "../operation-results";
import { readEditorToken, readShownSong, readSongNo, SONG_NAME } from "./favorite-fields";
import { parsePage, requireMarker } from "./parser";
import type { FolderEditorReading, ParseFailure } from "./types";

const PAGE = "favorite_song_select.php";
const HEADING = `h2.subtitleMypage:contains("「お気に入り」フォルダの設定")`;

/** Reads the お気に入り folder editor; every staging request is answered with this same page. */
export function parseFolderEditorPage(html: string): Result<FolderEditorReading, ParseFailure> {
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
  const slots: (string | null)[] = [];
  const songs: ShownSong[] = [];
  for (let slot = 1; slot <= FOLDER_SLOT_COUNT; slot++) {
    const song = readSlot(root, slot);
    if (isErr(song)) {
      return song;
    }
    slots.push(song.value?.songNo ?? null);
    if (song.value !== null) {
      songs.push(song.value);
    }
  }
  return ok({ state: { slots }, token: token.value, songs });
}

/** An empty slot keeps its input beside a 未設定 span, outside the one that holds a title. */
function readSlot(root: HTMLElement, slot: number): Result<ShownSong | null, ParseFailure> {
  const marker = `input#song_no_${slot}`;
  const input = requireMarker(root, marker, PAGE);
  if (isErr(input)) {
    return input;
  }
  const songNo = readSongNo(input.value, PAGE, marker);
  if (isErr(songNo)) {
    return songNo;
  }
  if (songNo.value === null) {
    return ok(null);
  }
  const span = input.value.closest(SONG_NAME);
  return readShownSong(span, songNo.value, PAGE, `${SONG_NAME} ${marker}`);
}
