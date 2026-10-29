/** Gifts: one made on Favourites and saved as a picture, read by the scan, then accepted. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

import { giftCode, scannedCodeOf } from "../../src/shared/gifts/gift-code";
import { qrCodePath, qrTextIn } from "../../src/shared/gifts/qr-codes";
import { SNAPSHOT_WIDTH_PX } from "../../src/snapshots/snapshot-picture";
import { type FavoritesState, LOCKED_SONG } from "../mock-favorites";
import { en, HIROBA, LANE, PICTURES, userDataOf } from "./config";
import type { Ctx } from "./context";
import { type Page, pageHelpers, same, waitFor } from "./harness";
import { savedPicture, savedWhole } from "./snapshots";

const GIFT_SONGS = ["1001", "1003", "1005", "1008"];
/** A fifth song, past what a gift holds: the picker leaves it unticked. */
const PAST_THE_LIMIT = "1012";
const GIFT_TITLE = "Happy birthday!";
const PICKER = "#song-picker-list";
const PICKER_BODY = "#song-picker-content";
/** Where the pictures the scan is given are written; the saved gift stays where it was saved. */
const SCANNED = userDataOf(LANE, "e2e-scanned");
// A picture with every picture in it takes a few seconds, and a write as long again.
const SAID_MS = 60_000;

export const giftsKeys = [
  "giftStartsWithItsShareShut",
  "giftPickerListsEverySong",
  "giftHoldsFourSongsAtMost",
  "giftSavedAsAPicture",
  "giftPictureHoldsTheGift",
  "scanButtonBesideTheAppName",
  "giftOfferedAsAMystery",
  "giftAcceptedIntoTheFolder",
  "giftAcceptedWhereItWasScanned",
  "scanWithoutACodeSaysSo",
  "scanOfAnotherCodeSaysSo",
  "giftOfASongNotOfferedIsRefused",
] as const;

const favoritesNow = async () =>
  (await (await fetch(`${HIROBA}/__favorites`)).json()) as FavoritesState;
const folderNow = async () =>
  (await favoritesNow()).folder.filter((songNo): songNo is string => songNo !== null);

/** The text of the QR code in a saved picture. */
async function codeIn(picture: Buffer): Promise<string | null> {
  const { data, info } = await sharp(picture)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return qrTextIn(new Uint8ClampedArray(data), info.width, info.height);
}

/** A picture of a QR code of `text`, as a chat might send one. */
async function codePicture(text: string): Promise<Buffer> {
  const { size, path } = qrCodePath(text);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="white"/><path d="${path}" fill="black" shape-rendering="crispEdges"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** A file given to a picture chooser as if the player had picked it; no system window opens. */
async function pictureInto(page: Page, selector: string, file: string) {
  const found = await page.call<{ result?: { objectId?: string } }>("Runtime.evaluate", {
    expression: `document.querySelector(${JSON.stringify(selector)})`,
  });
  await page.call("DOM.setFileInputFiles", { files: [file], objectId: found.result?.objectId });
}

export async function gifts(ctx: Ctx) {
  const { results } = ctx;
  const { click, currentPage, goTo, page, textOf } = ctx.app;
  const { attribute, exists, rowInView } = pageHelpers(page);
  const shown = (selector: string) =>
    waitFor(`${selector} shown`, async () => (await exists(selector)) || undefined);
  const gone = (selector: string) =>
    waitFor(`${selector} gone`, async () => ((await exists(selector)) ? undefined : true));
  const shut = (selector: string) =>
    page.evaluate<boolean>(
      `document.querySelector(${JSON.stringify(selector)})?.disabled === true`,
    );
  const typeInto = (selector: string, text: string) =>
    page.evaluate(
      `(() => { const input = document.querySelector(${JSON.stringify(selector)}); input.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, ${JSON.stringify(text)}); input.dispatchEvent(new Event("input", { bubbles: true })); })()`,
    );
  const said = (outcome: string) =>
    waitFor(
      `the scan's note ${outcome}`,
      async () => (await attribute("#scan-outcome", "data-outcome")) === outcome || undefined,
      SAID_MS,
    );

  // Leaving the page drops whatever set the last section left shown.
  await goTo("overview");
  await goTo("favorites");
  await shown("#favorites-gift");
  await click("#favorites-gift");
  await shown("#gift-maker");
  results.giftStartsWithItsShareShut =
    (await textOf("#favorites-name")) === en.t("gift.new") &&
    (await shut("#gift-share")) &&
    (await exists("#gift-empty"));

  await click("#gift-add");
  await shown(`${PICKER} > li`);
  // A song Hiroba has not opened to this player: the other pickers leave it out.
  results.giftPickerListsEverySong = await rowInView(
    PICKER,
    `(row) => row.id === "song-picker-row-${LOCKED_SONG}"`,
    PICKER_BODY,
  ).then(
    () => true,
    () => false,
  );
  for (const songNo of [...GIFT_SONGS, PAST_THE_LIMIT]) {
    await rowInView(PICKER, `(row) => row.id === "song-picker-row-${songNo}"`, PICKER_BODY);
    await page.evaluate(
      `document.querySelector(${JSON.stringify(`#song-picker-row-${songNo} input`)}).click()`,
    );
  }
  await click("#song-picker-close");
  await gone("#song-picker");
  const listed = await page.evaluate<string[]>(
    `[...document.querySelectorAll('[id^="gift-song-"]')].map((row) => row.id.slice("gift-song-".length))`,
  );
  results.giftHoldsFourSongsAtMost = same(listed, GIFT_SONGS) && !(await shut("#gift-share"));

  await typeInto("#gift-title", GIFT_TITLE);
  await click("#gift-shows-mystery");
  const picture = await savedPicture(ctx, "gift-share", "abth-gift");
  results.giftSavedAsAPicture =
    savedWhole(picture, SNAPSHOT_WIDTH_PX) && picture.height <= picture.width * 1.5;
  const saved = picture.name === null ? null : join(PICTURES, picture.name);
  const code = saved === null ? null : await codeIn(readFileSync(saved));
  const read = code === null ? null : scannedCodeOf(code);
  const gift = read?.kind === "gift" ? read.gift : null;
  results.giftPictureHoldsTheGift =
    gift !== null &&
    same(gift.songs, GIFT_SONGS) &&
    gift.title === GIFT_TITLE &&
    !gift.shown &&
    gift.giver !== "";

  await goTo("overview");
  results.scanButtonBesideTheAppName = await exists("nav #scan");
  const before = await folderNow();
  if (saved !== null) {
    await pictureInto(page, "#scan-picture", saved);
  }
  await shown("#gift-dialog [role='dialog']");
  results.giftOfferedAsAMystery =
    (await textOf("#gift-dialog-title")) === GIFT_TITLE &&
    !(await exists("#gift-dialog-songs")) &&
    (await textOf("#gift-dialog-message"))?.startsWith(gift?.giver ?? "?") === true;
  await click("#gift-dialog-accept");
  await said("accepted");
  await gone("#gift-dialog [role='dialog']");
  const kept = await page.evaluate<{ songs: string[]; setName: string | null }[]>(
    "window.abth.folderHistory()",
  );
  results.giftAcceptedIntoTheFolder =
    same(await folderNow(), GIFT_SONGS) &&
    same(kept[0]?.songs ?? [], GIFT_SONGS) &&
    kept[0]?.setName === GIFT_TITLE &&
    kept.some((entry) => same(entry.songs, before));
  results.giftAcceptedWhereItWasScanned = (await currentPage()) === "overview";

  mkdirSync(SCANNED, { recursive: true });
  const blank = join(SCANNED, "no-code.png");
  writeFileSync(
    blank,
    await sharp({ create: { width: 400, height: 300, channels: 3, background: "#ffffff" } })
      .png()
      .toBuffer(),
  );
  await pictureInto(page, "#scan-picture", blank);
  results.scanWithoutACodeSaysSo =
    (await said("noCode")) && !(await exists("#gift-dialog [role='dialog']"));

  const other = join(SCANNED, "another-code.png");
  writeFileSync(other, await codePicture("https://example.test/not-a-gift"));
  await pictureInto(page, "#scan-picture", other);
  results.scanOfAnotherCodeSaysSo = await said("unknown");

  const folderBefore = await folderNow();
  const notOffered = join(SCANNED, "not-offered.png");
  const lockedGift = {
    songs: [LOCKED_SONG, "1001"],
    giver: "ドン子ちゃん",
    title: "",
    shown: true,
  };
  writeFileSync(notOffered, await codePicture(giftCode({ ...lockedGift, madeAt: Date.now() })));
  await pictureInto(page, "#scan-picture", notOffered);
  await shown("#gift-dialog [role='dialog']");
  await click("#gift-dialog-accept");
  const refused = await said("notOffered");
  await gone("#gift-dialog [role='dialog']");
  results.giftOfASongNotOfferedIsRefused =
    refused &&
    (await textOf("#scan-outcome"))?.startsWith("Not accepted: Hiroba does not let you pick") ===
      true &&
    same(await folderNow(), folderBefore);
}
