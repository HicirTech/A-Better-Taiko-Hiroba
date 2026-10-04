import { HTMLElement } from "node-html-parser";

import type { Genre } from "../hiroba-models";
import { err, ok, type Result } from "../operation-results";
import type { ParseFailure } from "./types";

/** Genre by the `songNameFont<name>` suffix; an unknown name is no genre, not a failure. */
const SONG_NAME_GENRES: ReadonlyMap<string, Genre> = new Map<string, Genre>([
  ["jpop", 1],
  ["anime", 2],
  ["kids", 3],
  ["vocaloid", 4],
  ["game", 5],
  ["namco", 6],
  ["variety", 7],
  ["classic", 8],
]);

/** The genre a song title's font class names; null for a bare class, an unknown name or no title. */
export function readSongNameGenre(title: HTMLElement | null): Genre | null {
  const name = title?.getAttribute("class")?.match(/songNameFont(\w+)/)?.[1] ?? "";
  return SONG_NAME_GENRES.get(name) ?? null;
}

/** Reads `933,050点`, `3回`, `1位` or a bare number; null when the text is not a count at all. */
export function readCountText(raw: string | null | undefined): number | null {
  const digits = raw
    ?.trim()
    .match(/^([\d,]+)[点回位]?$/)?.[1]
    ?.replaceAll(",", "");
  return digits === undefined || digits === "" ? null : Number(digits);
}

export function readCount(
  element: HTMLElement,
  marker: string,
  page: string,
): Result<number, ParseFailure> {
  const raw = element.text.trim();
  const count = readCountText(raw);
  if (count === null) {
    return err({ kind: "unreadableValue", page, marker, raw });
  }
  return ok(count);
}

export function elementChildren(element: HTMLElement): HTMLElement[] {
  return element.childNodes.filter((node): node is HTMLElement => node instanceof HTMLElement);
}

export function findImageBySrc(root: HTMLElement, srcFragment: string): HTMLElement | null {
  for (const img of root.querySelectorAll("img")) {
    if ((img.getAttribute("src") ?? "").includes(srcFragment)) {
      return img;
    }
  }
  return null;
}
