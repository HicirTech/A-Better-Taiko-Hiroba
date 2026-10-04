import type { HTMLElement } from "node-html-parser";

import { type CostumeSet, FormToken } from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { parsePage, requireMarker } from "./parser";
import type { CostumeEditorReading, CostumeSwatch, ParseFailure } from "./types";

const PAGE = "mypage_kisekae.php";
const FORM = "form#kisekae";
const FORM_ACTION = "ajax/change_mydon.php";

/** A field and its saved twin share a `name` (`costume_1` twice), so both are found by id. */
const FIELDS: readonly (readonly [keyof CostumeSet, string, string])[] = [
  ["colorBody", "color_body", "def_body"],
  ["colorLimb", "color_limb", "def_limb"],
  ["colorFace", "color_face", "def_face"],
  ["costume1", "costume_1", "def_costume_1"],
  ["costume2", "costume_2", "def_costume_2"],
  ["costume3", "costume_3", "def_costume_3"],
  ["costume4", "costume_4", "def_costume_4"],
  ["costume5", "costume_5", "def_costume_5"],
];

/** The five slots' tabs, in slot order: きぐるみ, あたま, からだ, メイク, ぷちキャラ. */
const SLOT_TABS = ["kigu", "head", "body", "make", "acce"] as const;
/** The three colour tabs: かお, どう, てあし. Their palettes are the same one, three times. */
const COLOUR_TABS = ["face", "body", "limb"] as const;

export function parseCostumeEditorPage(html: string): Result<CostumeEditorReading, ParseFailure> {
  const page = parsePage(html, PAGE);
  if (isErr(page)) {
    return page;
  }
  const root = page.value;
  const form = requireMarker(root, FORM, PAGE);
  if (isErr(form)) {
    return form;
  }
  const action = form.value.getAttribute("action") ?? "";
  if (action !== FORM_ACTION) {
    return err({ kind: "unreadableValue", page: PAGE, marker: `${FORM}[action]`, raw: action });
  }

  const tokenInput = requireMarker(form.value, `[name="_tckt"]`, PAGE);
  if (isErr(tokenInput)) {
    return tokenInput;
  }
  const token = tokenInput.value.getAttribute("value") ?? "";
  if (token === "") {
    // Never the value itself, even an empty one: the marker says enough.
    return err({ kind: "unreadableValue", page: PAGE, marker: `${FORM} [name="_tckt"]`, raw: "" });
  }

  const state = {} as Record<keyof CostumeSet, number>;
  for (const [key, field, twin] of FIELDS) {
    const live = readNumber(form.value, `#${field}`);
    if (isErr(live)) {
      return live;
    }
    const saved = readNumber(root, `#${twin}`);
    if (isErr(saved)) {
      return saved;
    }
    // The page resets the form from the saved twins, so a differing form is an unsaved choice.
    if (live.value !== saved.value) {
      return err({
        kind: "unreadableValue",
        page: PAGE,
        marker: `#${twin}`,
        raw: `${saved.value}, but the form holds ${live.value}`,
      });
    }
    state[key] = live.value;
  }

  const slots: number[][] = [];
  for (const [index, tab] of SLOT_TABS.entries()) {
    const owned = readSlot(root, tab, index + 1);
    if (isErr(owned)) {
      return owned;
    }
    slots.push(owned.value);
  }

  let palette: CostumeSwatch[] | null = null;
  for (const tab of COLOUR_TABS) {
    const swatches = readPalette(root, tab);
    if (isErr(swatches)) {
      return swatches;
    }
    if (palette !== null && JSON.stringify(palette) !== JSON.stringify(swatches.value)) {
      return err({
        kind: "unreadableValue",
        page: PAGE,
        marker: `#tab-${tab} span.color`,
        raw: `a palette other than #tab-${COLOUR_TABS[0]}'s`,
      });
    }
    palette = swatches.value;
  }

  return ok({
    state,
    token: new FormToken(token),
    palette: palette ?? [],
    slots,
  });
}

function readNumber(scope: HTMLElement, marker: string): Result<number, ParseFailure> {
  const input = requireMarker(scope, marker, PAGE);
  if (isErr(input)) {
    return input;
  }
  const raw = input.value.getAttribute("value") ?? "";
  return /^\d+$/.test(raw)
    ? ok(Number(raw))
    : err({ kind: "unreadableValue", page: PAGE, marker, raw });
}

/** One slot's owned ids in page order, each checked against its slot: an id can sit in several. */
function readSlot(root: HTMLElement, tab: string, slot: number): Result<number[], ParseFailure> {
  const marker = `#tab-cos-${tab}`;
  const container = requireMarker(root, marker, PAGE);
  if (isErr(container)) {
    return container;
  }
  const ids: number[] = [];
  for (const anchor of container.value.querySelectorAll("a[name]")) {
    const name = anchor.getAttribute("name") ?? "";
    const source = anchor.querySelector("img")?.getAttribute("srctmp") ?? "";
    const cos = source.match(/[?&]cos=(\d+)/)?.[1];
    const type = source.match(/[?&]type=(\d+)/)?.[1];
    if (!/^\d+$/.test(name) || cos !== name || type !== String(slot)) {
      return err({
        kind: "unreadableValue",
        page: PAGE,
        marker: `${marker} a[name]`,
        raw: `${name} ${source}`,
      });
    }
    const id = Number(name);
    if (!ids.includes(id)) {
      ids.push(id);
    }
  }
  return ok(ids);
}

function readPalette(root: HTMLElement, tab: string): Result<CostumeSwatch[], ParseFailure> {
  const marker = `#tab-${tab}`;
  const container = requireMarker(root, marker, PAGE);
  if (isErr(container)) {
    return container;
  }
  const swatches: CostumeSwatch[] = [];
  for (const span of container.value.querySelectorAll("span.color")) {
    const title = span.getAttribute("title") ?? "";
    const hex = (span.getAttribute("style") ?? "").match(
      /background-color:\s*(#[0-9a-fA-F]{6})\b/,
    )?.[1];
    if (!/^\d+$/.test(title) || hex === undefined) {
      return err({
        kind: "unreadableValue",
        page: PAGE,
        marker: `${marker} span.color`,
        raw: `${title} ${span.getAttribute("style") ?? ""}`,
      });
    }
    swatches.push({ id: Number(title), hex: hex.toUpperCase() });
  }
  if (swatches.length === 0) {
    return err({ kind: "missingMarker", page: PAGE, marker: `${marker} span.color` });
  }
  return ok(swatches);
}
