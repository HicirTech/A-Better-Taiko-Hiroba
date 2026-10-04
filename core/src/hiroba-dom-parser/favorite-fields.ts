import type { HTMLElement } from "node-html-parser";

import { FormToken, isSongNo, type ShownSong } from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { readSongNameGenre } from "./element-readers";
import { requireMarker } from "./parser";
import type { ParseFailure } from "./types";

/** The span that holds a song's title; its font class names the genre. */
export const SONG_NAME = "span.songName";
const TOKEN = "#_tckt";

export function readEditorToken(root: HTMLElement, page: string): Result<FormToken, ParseFailure> {
  const input = requireMarker(root, TOKEN, page);
  if (isErr(input)) {
    return input;
  }
  const value = input.value.getAttribute("value") ?? "";
  // A failure never carries the value, an empty one included.
  return value === ""
    ? err({ kind: "unreadableValue", page, marker: TOKEN, raw: "" })
    : ok(new FormToken(value));
}

/** An empty value is no song; one to five digits is the song number. */
export function readSongNo(
  input: HTMLElement,
  page: string,
  marker: string,
): Result<string | null, ParseFailure> {
  const raw = input.getAttribute("value") ?? "";
  if (raw === "") {
    return ok(null);
  }
  return isSongNo(raw) ? ok(raw) : err({ kind: "unreadableValue", page, marker, raw });
}

/** The song a `songName` span shows; a song with no title to read is a page that changed. */
export function readShownSong(
  span: HTMLElement | null,
  songNo: string,
  page: string,
  marker: string,
): Result<ShownSong, ParseFailure> {
  const title = span?.text.trim() ?? "";
  return title === ""
    ? err({ kind: "missingMarker", page, marker })
    : ok({ songNo, title, genre: readSongNameGenre(span) });
}
