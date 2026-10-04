import { HTMLElement } from "node-html-parser";

import { err, ok, type Result } from "../operation-results";
import type { ParseFailure } from "./types";

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
