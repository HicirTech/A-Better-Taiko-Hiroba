/** A page as a picture: its share at the band's right, saved where the run's folder stands. */
import { mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

import { sniffPicture } from "../../src/shared/song-catalogue/sniff-picture";
import { SNAPSHOT_PIXEL_RATIO } from "../../src/snapshots/snapshot-picture";
import { en, PICTURES } from "./config";
import type { Ctx } from "./context";
import { pageHelpers, waitFor } from "./harness";

// A picture with every picture in it takes a few seconds on a computer.
const SAVED_MS = 60_000;
/** The bar's words on one line: body2's, 14 px on a 20 px line, in the picture's pixels. */
const ONE_LINE_PX = 20 * SNAPSHOT_PIXEL_RATIO;
/** `abth-rating-2026-10-26-235930.webp`: what it shows, the day and the second. */
const NAMED_TO_THE_SECOND = /^abth-[a-z]+-\d{4}-\d{2}-\d{2}-\d{6}\.webp$/;

export interface SavedPicture {
  /** The share's menu, as the player reads it. */
  readonly ways: readonly string[];
  /** The file the app saved, or none. */
  readonly name: string | null;
  /** What its bytes say it is. */
  readonly format: string | null;
  readonly width: number;
  readonly height: number;
  readonly bytes: number;
  /** How tall the words at the bar's right stand: one line, or more where they wrapped. */
  readonly barWordsHeight: number;
  /** How the note at the window's foot said it ended. */
  readonly outcome: string | null;
}

/** The rows the bar's white words take in its right quarter, clear of a title in its middle. */
async function heightOfBarWords(picture: Buffer): Promise<number> {
  const { data, info } = await sharp(picture).raw().toBuffer({ resolveWithObject: true });
  const at = (x: number, y: number) => (y * info.width + x) * info.channels;
  const blue = (i: number) => (data[i + 2] ?? 0) - (data[i] ?? 0) > 60;
  const white = (i: number) => [0, 1, 2].every((channel) => (data[i + channel] ?? 0) > 200);
  let first = -1;
  let last = -1;
  for (let y = 0; y < info.height && blue(at(info.width - 1, y)); y++) {
    for (let x = (info.width * 3) / 4; x < info.width; x++) {
      if (white(at(x, y))) {
        first = first < 0 ? y : first;
        last = y;
        break;
      }
    }
  }
  return first < 0 ? 0 : last - first + 1;
}

/** Presses the page's share and its Save picture; what the app saved, once it has. */
export async function savedPicture(ctx: Ctx, button: string, shows: string): Promise<SavedPicture> {
  const { click, page } = ctx.app;
  const { allOf, attribute, exists, press } = pageHelpers(page);
  rmSync(PICTURES, { recursive: true, force: true });
  mkdirSync(PICTURES, { recursive: true });

  await click(`#${button}`);
  const ways = await waitFor("the share's menu", async () => {
    const shown = await allOf(`#${button}-menu [role="menuitem"]`, "textContent");
    return shown.length > 0 ? shown : undefined;
  });
  await click(`#${button}-save`);
  // The note comes once the file is written whole.
  const outcome = await waitFor(
    "the note at the foot",
    async () => (await attribute(`#${button}-outcome`, "data-outcome")) ?? undefined,
    SAVED_MS,
  );
  const name = readdirSync(PICTURES).find((file) => file.startsWith(`${shows}-`)) ?? null;
  await press("Escape");
  await waitFor("the note gone", async () =>
    (await exists(`#${button}-outcome`)) ? undefined : true,
  );
  const file = name === null ? null : readFileSync(join(PICTURES, name));
  const sniffed = file === null ? null : sniffPicture(file);
  return {
    ways,
    name,
    format: sniffed?.format ?? null,
    width: sniffed?.width ?? 0,
    height: sniffed?.height ?? 0,
    bytes: file?.byteLength ?? 0,
    barWordsHeight: file === null ? 0 : await heightOfBarWords(file),
    outcome,
  };
}

/** Saved whole by both desktop ways: a WebP `cardWidth` wide, named to the second, one-line bar. */
export const savedWhole = (picture: SavedPicture, cardWidth: number) => {
  const { ways, name, format, width, height, barWordsHeight, outcome } = picture;
  return (
    ways.join("|") === [en.t("snapshot.copy"), en.t("snapshot.save")].join("|") &&
    name !== null &&
    NAMED_TO_THE_SECOND.test(name) &&
    format === "webp" &&
    width === cardWidth * SNAPSHOT_PIXEL_RATIO &&
    // More than the bar, in a tall card or a wide one.
    height > width / 3 &&
    barWordsHeight > 0 &&
    barWordsHeight <= ONE_LINE_PX &&
    outcome === "save"
  );
};
