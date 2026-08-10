/** Readers that pull values out of parsed elements. Internal to this domain — not in the index. */
import { HTMLElement } from "node-html-parser";

import { err, ok, type Result } from "../operation-results";
import type { ParseFailure } from "./types";

/**
 * Reads a count the way Hiroba writes one: `933,050点`, `3回`, `1位`, or a bare number. The
 * separator and the unit are the page's decoration; the number is the value. Null when the text is
 * not a count at all, so the caller decides whether that is a failure or a legitimate absence.
 */
export function readCountText(raw: string | null | undefined): number | null {
  const digits = raw
    ?.trim()
    .match(/^([\d,]+)[点回位]?$/)?.[1]
    ?.replaceAll(",", "");
  return digits === undefined || digits === "" ? null : Number(digits);
}

/** Reads an element's text as a count, or fails naming what it held instead. */
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

/** The element children of a node, in document order. */
export function elementChildren(element: HTMLElement): HTMLElement[] {
  return element.childNodes.filter((node): node is HTMLElement => node instanceof HTMLElement);
}

/** The first image on the page whose src contains the fragment, or null. */
export function findImageBySrc(root: HTMLElement, srcFragment: string): HTMLElement | null {
  for (const img of root.querySelectorAll("img")) {
    if ((img.getAttribute("src") ?? "").includes(srcFragment)) {
      return img;
    }
  }
  return null;
}
