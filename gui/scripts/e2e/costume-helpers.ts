import type { App } from "./app";
import { HIROBA } from "./config";
import { type Box, pageHelpers, SHIFT_MODIFIER, same, waitFor } from "./harness";
import { editorHits, LANE_PICTURES, PREVIEW, START, savedCostume, type Thumb } from "./stand-in";

export const PNG_URL = "data:image/png;base64,";
export type HistoryEntry = { set: Record<string, number>; picture: string | null };

type Tile = { tag: string; label: string | null; src: string | null; worn: boolean };

export const near = (value: number, expected: number, within = 1.5) =>
  Math.abs(value - expected) < within;

const PARTS = [
  "colorFace",
  "colorBody",
  "colorLimb",
  "costume2",
  "costume3",
  "costume4",
  "costume5",
  "costume1",
];
export const NO_BOX: Box = {
  left: NaN,
  top: NaN,
  right: NaN,
  bottom: NaN,
  width: NaN,
  height: NaN,
};
export const at = (boxes: Box[], index: number): Box => boxes[index] ?? NO_BOX;

export const gapsOf = (row: Box[]) =>
  row.slice(1).map((box, index) => box.left - at(row, index).right);

export function costumeHelpers(app: App) {
  const { click, goTo, page } = app;
  const { attribute, boxOf, exists, press } = pageHelpers(page);

  const stepOf = () =>
    page.evaluate<string | null>(`document.querySelector("#costume-page")?.dataset.step ?? null`);
  const inStep = (name: string) =>
    waitFor(async () => ((await stepOf()) === name ? true : undefined));
  const pressedOf = (selector: string) => attribute(selector, "aria-pressed");
  const previewSrc = () =>
    page.evaluate<string | null>(
      `document.querySelector("#costume-preview-image")?.getAttribute("src") ?? null`,
    );
  const previewOtherThan = (before: string | null) =>
    waitFor(async () => {
      const src = await previewSrc();
      const loading = await exists("#costume-preview-loading");
      return src !== null && src !== before && !loading ? src : undefined;
    });

  const savable = () =>
    page.evaluate<boolean>(`document.querySelector("#costume-save").disabled === false`);

  const readEditorAgain = async () => {
    const before = await editorHits();
    await click("#read-again");
    await waitFor(async () => ((await editorHits()) > before ? true : undefined));
    await inStep("editing");
  };

  const barFlush = () =>
    page.evaluate<boolean>(
      `Math.abs(document.querySelector("#costume-bar").getBoundingClientRect().bottom - window.innerHeight) < 1`,
    );

  const pageOutcome = () =>
    page.evaluate<string | null>(
      `document.querySelector("#costume-page #write-outcome")?.dataset.outcome ?? null`,
    );
  /** The page reads the editor once per session, so a change made elsewhere needs a read again. */
  const openFreshEditor = async () => {
    await goTo("costume");
    const step = await waitFor(async () => (await stepOf()) ?? undefined);
    if (step !== "unread" && step !== "loading") {
      await readEditorAgain();
    }
    await inStep("editing");
    await clearDraft();
    await onTheColours();
  };
  const openEditing = async () => {
    await goTo("costume");
    await inStep("editing");
    await clearDraft();
    await onTheColours();
  };
  const clearDraft = async () => {
    if (
      await page.evaluate<boolean>(`document.querySelector("#costume-reset")?.disabled === false`)
    ) {
      await click("#costume-reset");
    }
  };
  const showPartOn = (app: Pick<App, "click">, part: string) => app.click(`#costume-part-${part}`);
  const showPart = (part: string) => showPartOn({ click }, part);
  const onTheColours = () => showPart("colorFace");
  /** One press of Save: a notice names the outcome, and an applied one has none, so it is told
   * by the set Hiroba holds having moved once the page is editing again. */
  const savedFrom = async (before: Record<string, number>) => {
    await click("#costume-save");
    return waitFor(
      async () =>
        (await pageOutcome()) ??
        ((await stepOf()) === "editing" && !same(await savedCostume(), before)
          ? "applied"
          : undefined),
    );
  };
  /** `drawn` waits for the picture of the picked set, as a person who looks before saving does. */
  const changeInTheWindow = async (pick: () => Promise<unknown>, drawn = false) => {
    await openFreshEditor();
    const before = await savedCostume();
    const shown = await previewSrc();
    await pick();
    if (drawn) {
      await previewOtherThan(shown);
    }
    return savedFrom(before);
  };

  const historyNow = () => page.evaluate<HistoryEntry[]>("window.abth.costumeHistory()");

  const historyTiles = () =>
    page.evaluate<Tile[]>(
      `[...document.querySelectorAll('[id^="costume-history-entry-"]')].map((tile) => ({ tag: tile.tagName, label: tile.getAttribute("aria-label"), src: tile.querySelector("img")?.getAttribute("src") ?? null, worn: tile.querySelector("#costume-history-worn") !== null }))`,
    );
  /** From the keyboard, as a person without a pointer does: the button is focused, then Enter. */
  const openHistory = async () => {
    await waitFor(async () =>
      (await page.evaluate<boolean>(
        `document.querySelector("#costume-history")?.disabled === false`,
      ))
        ? true
        : undefined,
    );
    await page.evaluate(`document.querySelector("#costume-history").focus()`);
    await press("Enter");
    await waitFor(async () => (await exists("#costume-history-entry-0")) || undefined);
  };
  const historyClosed = () =>
    waitFor(async () => ((await exists("#costume-history-dialog")) ? undefined : true));
  const pickFromHistory = async (index: number) => {
    await openHistory();
    await click(`#costume-history-entry-${index}`);
    await historyClosed();
  };
  const notPictures = (log: string[]) =>
    log.filter((line) => line !== PREVIEW && !LANE_PICTURES.includes(line));
  const leaveTheCostumePage = () => goTo("overview");

  const aboveThePart = (selector: string) =>
    page.evaluate<boolean>(
      `(() => { const note = document.querySelector(${JSON.stringify(selector)}); const aside = document.querySelector("#costume-aside"); const panel = document.querySelector("#costume-grid"); if (note === null || aside === null || panel === null) return false; const box = note.getBoundingClientRect(); return !aside.contains(note) && box.left >= aside.getBoundingClientRect().right && box.bottom <= panel.getBoundingClientRect().top; })()`,
    );

  const bridgeChange = (target: Record<string, number>, expected = START) =>
    page.evaluate<{ kind: string; [key: string]: unknown }>(
      `window.abth.changeCostume(${JSON.stringify({ expected, target })})`,
    );

  /** Whether `asked` is the cells in the window and the row after; `lazy` wants some unasked. */
  const askedOnlyWhatIsOnShow = async (asked: Thumb[], items: readonly number[], lazy: boolean) => {
    const cells = await page.evaluate<{ whole: number[]; upToTheRowAhead: number[] }>(
      `(() => { const cells = [...document.querySelectorAll('#costume-items-costume1 [id^="item-costume1-"]')].map((cell) => ({ id: Number(cell.id.replace("item-costume1-", "")), rect: cell.getBoundingClientRect() })).filter(({ id }) => id !== 0); const rowAhead = Math.min(...cells.filter(({ rect }) => rect.top >= innerHeight).map(({ rect }) => rect.top)); return { whole: cells.filter(({ rect }) => rect.top >= 0 && rect.bottom <= innerHeight).map(({ id }) => id), upToTheRowAhead: cells.filter(({ rect }) => rect.top <= rowAhead + 1).map(({ id }) => id) }; })()`,
    );
    const ids = asked.map((thumb) => thumb.cos);
    return (
      asked.length > 0 &&
      (!lazy || asked.length < items.length) &&
      cells.whole.every((id) => ids.includes(id)) &&
      ids.every((id) => cells.upToTheRowAhead.includes(id)) &&
      new Set(ids).size === asked.length &&
      asked.every(
        (thumb) =>
          thumb.type === 1 &&
          items.includes(thumb.cos) &&
          thumb.referer === `${HIROBA}/mypage_kisekae.php`,
      )
    );
  };

  const buttonsIn = (container: string) =>
    page.evaluate<{ id: string; left: number; right: number }[]>(
      `[...document.querySelectorAll(${JSON.stringify(`${container} button`)})].map((button) => { const box = button.getBoundingClientRect(); return { id: button.id, left: box.left, right: box.right }; })`,
    );

  const tracksOf = (selector: string) =>
    page.evaluate<number>(
      `getComputedStyle(document.querySelector(${JSON.stringify(selector)})).gridTemplateColumns.split(" ").length`,
    );

  const tileBoxes = () => Promise.all(PARTS.map((part) => boxOf(`#costume-part-${part}`)));
  /** The boxes of the cells on the first row of a grid, left to right. */
  const firstRowOf = (selector: string) =>
    page.evaluate<Box[]>(
      `(() => { const boxes = [...document.querySelectorAll(${JSON.stringify(selector)})].map((cell) => cell.getBoundingClientRect()); return boxes.filter((box) => Math.abs(box.top - boxes[0].top) < 1).map((box) => ({ left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height })); })()`,
    );

  /** Boxes in the page that scroll on their own: none, only the page itself scrolls. */
  const scrollingBoxes = () =>
    page.evaluate<string[]>(
      `[...document.querySelectorAll("#costume-page *")].filter((node) => { const overflow = getComputedStyle(node).overflowY; return (overflow === "auto" || overflow === "scroll") && node.scrollHeight > node.clientHeight + 1; }).map((node) => node.id || node.tagName)`,
    );
  const documentScrolls = () =>
    page.evaluate<boolean>("document.documentElement.scrollHeight > innerHeight");
  const scrollToTheEnd = async () => {
    await page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)");
    return page.evaluate<number>("scrollY");
  };
  const positionOf = (selector: string) =>
    page.evaluate<string>(
      `getComputedStyle(document.querySelector(${JSON.stringify(selector)})).position`,
    );
  const backgroundOf = (selector: string) =>
    page.evaluate<string>(
      `getComputedStyle(document.querySelector(${JSON.stringify(selector)})).backgroundColor`,
    );
  const pictureAt = (selector: string) =>
    page.evaluate<string | null>(
      `document.querySelector(${JSON.stringify(selector)})?.getAttribute("src") ?? null`,
    );
  /** Whether the pick ring is drawn round it: a solid line, about the 3px that pickRing sets. */
  const ringedOf = (selector: string) =>
    page.evaluate<boolean>(
      `(() => { const style = getComputedStyle(document.querySelector(${JSON.stringify(selector)})); return style.outlineStyle === "solid" && parseFloat(style.outlineWidth) >= 2.5; })()`,
    );
  const firstCellOf = (grid: string) =>
    page.evaluate<string>(`document.querySelector(${JSON.stringify(grid)}).firstElementChild.id`);

  const noneCellInUse = async () => {
    await showPart("costume2");
    await waitFor(async () => (await exists("#item-costume2-59 img")) || undefined);
    const first = await firstCellOf("#costume-items-costume2");
    const before = await ringedOf("#item-costume2-0");
    await click("#item-costume2-0");
    const emptied = {
      pressed: await pressedOf("#item-costume2-0"),
      ringed: await ringedOf("#item-costume2-0"),
      wornRinged: await ringedOf("#item-costume2-21"),
      tileBlank:
        !(await exists("#costume-part-costume2 img")) &&
        (await attribute("#costume-part-costume2", "aria-label")) === "Head",
      savable: await savable(),
    };
    await click("#item-costume2-59");
    const refilled = {
      pressed: await pressedOf("#item-costume2-0"),
      ringed: await ringedOf("#item-costume2-0"),
      tileShowsIt:
        (await pictureAt("#costume-part-costume2 img")) ===
        (await pictureAt("#item-costume2-59 img")),
    };
    await click("#costume-reset");
    return same(
      { first, before, emptied, refilled },
      {
        first: "item-costume2-0",
        before: false,
        emptied: {
          pressed: "true",
          ringed: true,
          wornRinged: false,
          tileBlank: true,
          savable: true,
        },
        refilled: { pressed: "false", ringed: false, tileShowsIt: true },
      },
    );
  };
  const gridPickChangesItsTile = async () => {
    await showPart("colorFace");
    const torsoTile = await backgroundOf("#costume-part-colorBody");
    await click("#swatch-colorFace-9");
    const faceTileChanged =
      (await backgroundOf("#costume-part-colorFace")) ===
        (await backgroundOf("#swatch-colorFace-9")) &&
      (await backgroundOf("#costume-part-colorBody")) === torsoTile;
    await showPart("costume3");
    await waitFor(async () => (await exists("#item-costume3-70 img")) || undefined);
    await click("#item-costume3-70");
    const bodyTileShowsTheItem =
      (await pictureAt("#costume-part-costume3 img")) ===
      (await pictureAt("#item-costume3-70 img"));
    await click("#costume-reset");
    return (
      faceTileChanged &&
      bodyTileShowsTheItem &&
      (await backgroundOf("#costume-part-colorFace")) !==
        (await backgroundOf("#swatch-colorFace-9")) &&
      (await pictureAt("#costume-part-costume3 img")) === (await pictureAt("#item-costume3-68 img"))
    );
  };

  const tabsSelected = () =>
    page.evaluate<string[]>(
      `[...document.querySelectorAll('#costume-aside [role="tab"][aria-selected="true"]')].map((tab) => tab.id)`,
    );
  const gridShown = () =>
    page.evaluate<string>(
      `(() => { const grid = document.querySelector("#costume-grid"); return grid.querySelector('[id^="costume-items-"]')?.id ?? (grid.querySelector('[id^="swatch-"]') !== null ? "palette" : "none"); })()`,
    );

  const focusedId = () => page.evaluate<string>("document.activeElement.id");
  const tilesByKeyboard = async () => {
    await showPart("colorLimb");
    await waitFor(async () => (await exists("#swatch-colorLimb-12")) || undefined);
    await page.evaluate(`document.querySelector("#costume-part-colorFace").focus()`);
    await press("ArrowRight");
    const focusedByArrow = await focusedId();
    const stillSelected = await tabsSelected();
    await press("Enter");
    await waitFor(async () => (await exists("#swatch-colorBody-12")) || undefined);
    const pickedByEnter = await tabsSelected();
    await press("ArrowRight");
    await press(" ");
    await waitFor(async () => (await exists("#swatch-colorLimb-12")) || undefined);
    const pickedBySpace = await tabsSelected();
    await press("ArrowRight");
    const wrappedWithinTheGroup = await focusedId();
    await press("ArrowLeft");
    await press("Tab");
    const tabbedToTheNextGroup = await focusedId();
    await press("Tab", SHIFT_MODIFIER);
    const tabbedBack = await focusedId();
    return (
      focusedByArrow === "costume-part-colorBody" &&
      same(stillSelected, ["costume-part-colorLimb"]) &&
      same(pickedByEnter, ["costume-part-colorBody"]) &&
      same(pickedBySpace, ["costume-part-colorLimb"]) &&
      wrappedWithinTheGroup === "costume-part-colorFace" &&
      tabbedToTheNextGroup === "costume-part-costume2" &&
      tabbedBack === "costume-part-colorLimb"
    );
  };

  return {
    stepOf,
    inStep,
    pressedOf,
    previewSrc,
    previewOtherThan,
    savable,
    readEditorAgain,
    barFlush,
    pageOutcome,
    openFreshEditor,
    openEditing,
    showPartOn,
    showPart,
    savedFrom,
    changeInTheWindow,
    historyNow,
    historyTiles,
    openHistory,
    historyClosed,
    pickFromHistory,
    notPictures,
    leaveTheCostumePage,
    aboveThePart,
    bridgeChange,
    askedOnlyWhatIsOnShow,
    buttonsIn,
    tracksOf,
    tileBoxes,
    firstRowOf,
    scrollingBoxes,
    documentScrolls,
    scrollToTheEnd,
    positionOf,
    noneCellInUse,
    gridPickChangesItsTile,
    tabsSelected,
    gridShown,
    focusedId,
    tilesByKeyboard,
  };
}
