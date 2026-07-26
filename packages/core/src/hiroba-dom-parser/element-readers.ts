/** Readers that pull values out of parsed elements. Internal to this domain — not in the index. */
import { HTMLElement } from "node-html-parser";

import { err, ok, type Result } from "../operation-results";
import type { ParseFailure } from "./types";

/** Reads an element's text as a whole non-negative integer, or fails naming what it held. */
export function readCount(
  element: HTMLElement,
  marker: string,
  page: string,
): Result<number, ParseFailure> {
  const raw = element.text.trim();
  if (!/^\d+$/.test(raw)) {
    return err({ kind: "unreadableValue", page, marker, raw });
  }
  return ok(Number(raw));
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
