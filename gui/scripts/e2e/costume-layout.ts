import { RING_ROOM_PX } from "../../src/my-page/pick-ring";
import { HIROBA, PHONE_SHORT, PHONE_TALL, TOP_BAND_PX } from "./config";
import type { Ctx } from "./context";
import { at, costumeHelpers, evenSides, gapsOf, near } from "./costume-helpers";
import { type Box, hoverOver, pageHelpers, SHIFT_MODIFIER, same, waitFor } from "./harness";
import { editorHits, hitsOn, START, savedCostume } from "./stand-in";

export const costumeLayoutKeys = [
  "costumeTilesNamedPartFirst",
  "costumeInTwoColumns",
  "costumePreviewIsSquare",
  "costumePreviewLevelWithTheGridsFirstRow",
  "costumeTilesInTwoRowsUnderTheirCaptions",
  "costumeButtonsStackedInTheLeftColumn",
  "costumeGridCentred",
  "costumeOnlyThePageScrolls",
  "costumeGridHoldsMoreColumnsOnABigWindow",
  "costumePageScrollsForMoreItemsThanFit",
  "costumeLeftColumnStaysInView",
  "costumeLeftColumnScrollsAwayOnAShortWindow",
] as const;

export async function costumeLayout(ctx: Ctx) {
  const { results } = ctx;
  const { page } = ctx.app;
  const { atSize, boxOf, exists } = pageHelpers(page);
  const {
    firstRowOf,
    openFreshEditor,
    positionOf,
    scrollToTheEnd,
    scrollingBoxes,
    showPart,
    tileBoxes,
    tracksOf,
  } = costumeHelpers(ctx.app);

  await fetch(`${HIROBA}/__items?many=1`);
  await openFreshEditor();
  results.costumeTilesNamedPartFirst = same(
    await page.evaluate<(string | null)[]>(
      `[...document.querySelectorAll('#costume-aside [role="tab"]')].map((tab) => tab.getAttribute("aria-label"))`,
    ),
    [
      "Face #5",
      "Torso #12",
      "Limbs #12",
      "Head #21",
      "Body #68",
      "Makeup #37",
      "Mini Character #140",
      "Mascot",
    ],
  );
  const wideAt = (width: number, height: number) =>
    atSize(width, height, async () => {
      await waitFor("costume actions", async () => (await exists("#costume-actions")) || undefined);
      await waitFor(
        "costume preview",
        async () => (await exists("#costume-preview-image")) || undefined,
      );
      await showPart("colorFace");
      await waitFor("colour palette", async () => (await exists("#costume-palette")) || undefined);
      const palette = {
        box: await boxOf("#costume-palette"),
        tracks: await tracksOf("#costume-palette"),
        row: await firstRowOf('#costume-palette [id^="swatch-colorFace-"]'),
        scrolling: await scrollingBoxes(),
      };
      await showPart("costume1");
      await waitFor(
        "Mascot grid",
        async () => (await exists("#costume-items-costume1")) || undefined,
      );
      const items = {
        box: await boxOf("#costume-items-costume1"),
        tracks: await tracksOf("#costume-items-costume1"),
        row: await firstRowOf('#costume-items-costume1 [id^="item-costume1-"]'),
        scrolling: await scrollingBoxes(),
      };
      return {
        aside: await boxOf("#costume-aside"),
        panel: await boxOf("#costume-grid"),
        preview: await boxOf("#costume-preview-image"),
        captions: [await boxOf("#costume-group-colours"), await boxOf("#costume-group-items")],
        tiles: await tileBoxes(),
        save: await boxOf("#costume-save"),
        history: await boxOf("#costume-history"),
        reset: await boxOf("#costume-reset"),
        bar: await exists("#costume-bar"),
        palette,
        items,
      };
    });
  type WideFacts = Awaited<ReturnType<typeof wideAt>>;
  const onDefault = await wideAt(960, 720);
  const onBig = await wideAt(1920, 1080);
  const twoColumns = ({ aside, panel, bar }: WideFacts, asideWidth: number) =>
    near(aside.width, asideWidth) &&
    near(panel.left - aside.right, 24) &&
    near(panel.top, aside.top) &&
    !bar;
  results.costumeInTwoColumns =
    twoColumns(onDefault, 232) && twoColumns(onBig, 280) && onDefault.panel.width > 390;
  const squarePreview = ({ preview, aside }: WideFacts) =>
    Math.abs(preview.width - preview.height) < 1 && near(preview.width, aside.width);
  results.costumePreviewIsSquare = squarePreview(onDefault) && squarePreview(onBig);
  const levelWithTheFirstRow = ({ preview, palette, items }: WideFacts) =>
    [palette, items].every(({ row }) => near(preview.top, at(row, 0).top, 1));
  results.costumePreviewLevelWithTheGridsFirstRow =
    levelWithTheFirstRow(onDefault) && levelWithTheFirstRow(onBig);
  const tilesUnderTheirCaptions = ({ aside, captions, tiles }: WideFacts) => {
    const colours = tiles.slice(0, 3);
    const costume = tiles.slice(3);
    const inARow = (row: Box[]) =>
      row.every(
        (box) => near(box.top, at(row, 0).top) && near(box.width, box.height) && box.width > 30,
      ) && gapsOf(row).every((gap) => near(gap, 6));
    return (
      inARow(colours) &&
      inARow(costume) &&
      at(captions, 0).bottom <= at(colours, 0).top &&
      at(colours, 0).bottom <= at(captions, 1).top &&
      at(captions, 1).bottom <= at(costume, 0).top &&
      colours.every((box, index) => near(box.left, at(costume, index).left)) &&
      tiles.every((box) => box.left >= aside.left - 1 && box.right <= aside.right + 1)
    );
  };
  results.costumeTilesInTwoRowsUnderTheirCaptions =
    tilesUnderTheirCaptions(onDefault) && tilesUnderTheirCaptions(onBig);
  const buttonsStacked = ({ aside, save, history, reset }: WideFacts) =>
    near(save.width, aside.width) &&
    near(save.left, aside.left) &&
    save.bottom <= history.top &&
    near(history.top, reset.top) &&
    history.right <= reset.left &&
    [save, history, reset].every(
      (box) => box.left >= aside.left - 1 && box.right <= aside.right + 1 && box.height < 45,
    );
  results.costumeButtonsStackedInTheLeftColumn = buttonsStacked(onDefault) && buttonsStacked(onBig);
  const centred = ({ box, row }: { box: Box; row: Box[] }) =>
    row.length > 1 && evenSides(row, box) && gapsOf(row).every((gap) => near(gap, 8));
  results.costumeGridCentred = [onDefault, onBig].every(
    ({ items, palette }) => centred(items) && centred(palette),
  );
  results.costumeOnlyThePageScrolls = [onDefault, onBig].every(
    ({ items, palette }) => items.scrolling.length === 0 && palette.scrolling.length === 0,
  );
  results.costumeGridHoldsMoreColumnsOnABigWindow =
    onBig.items.tracks > onDefault.items.tracks && onBig.palette.tracks > onDefault.palette.tracks;
  const stuck = await atSize(960, 720, async () => {
    await waitFor("costume actions", async () => (await exists("#costume-actions")) || undefined);
    await showPart("costume1");
    await waitFor(
      "Mascot grid",
      async () => (await exists("#costume-items-costume1")) || undefined,
    );
    await page.evaluate("window.scrollTo(0, 0)");
    const gridBefore = await boxOf("#costume-items-costume1");
    const scrolledBy = await scrollToTheEnd();
    const after = await boxOf("#costume-aside");
    const gridAfter = await boxOf("#costume-items-costume1");
    const windowHeight = await page.evaluate<number>("innerHeight");
    await page.evaluate("window.scrollTo(0, 0)");
    return { after, gridBefore, gridAfter, scrolledBy, windowHeight };
  });
  results.costumePageScrollsForMoreItemsThanFit =
    stuck.gridBefore.bottom > stuck.windowHeight && stuck.scrolledBy > 50;
  results.costumeLeftColumnStaysInView =
    stuck.scrolledBy > 50 &&
    near(stuck.after.top, TOP_BAND_PX) &&
    stuck.after.bottom <= stuck.windowHeight &&
    stuck.gridAfter.top < stuck.gridBefore.top - 50;
  const onAShortWindow = await atSize(1100, 480, async () => {
    await waitFor("costume actions", async () => (await exists("#costume-actions")) || undefined);
    await showPart("costume1");
    await waitFor(
      "Mascot grid",
      async () => (await exists("#costume-items-costume1")) || undefined,
    );
    await page.evaluate("window.scrollTo(0, 0)");
    const before = await boxOf("#costume-aside");
    const scrolledBy = await scrollToTheEnd();
    const after = await boxOf("#costume-aside");
    const own = await page.evaluate<boolean>(
      `(() => { const node = document.querySelector("#costume-aside"); return node.scrollHeight > node.clientHeight + 1 || getComputedStyle(node).overflowY !== "visible"; })()`,
    );
    const scrolling = await scrollingBoxes();
    await page.evaluate("window.scrollTo(0, 0)");
    return {
      before,
      after,
      scrolledBy,
      own,
      scrolling,
      position: await positionOf("#costume-aside"),
    };
  });
  results.costumeLeftColumnScrollsAwayOnAShortWindow =
    onAShortWindow.position === "static" &&
    onAShortWindow.scrolledBy > 50 &&
    onAShortWindow.after.top < onAShortWindow.before.top - 50 &&
    !onAShortWindow.own &&
    onAShortWindow.scrolling.length === 0;
  await fetch(`${HIROBA}/__items?many=0`);
}

export const costumeTilesKeys = [
  "costumePartPickedInTheTileShowsItsGrid",
  "costumeTilesMoveByArrowsAndTabAndPickByEnterAndSpace",
  "costumeTilesNamedByTooltipOnHoverAndFocus",
  "costumeNoneCellEmptiesASlotAndCarriesTheRing",
  "costumeGridPickChangesItsTile",
] as const;

export async function costumeTiles(ctx: Ctx) {
  const { results } = ctx;
  const { click, page, textOf } = ctx.app;
  const { exists, press } = pageHelpers(page);
  const {
    gridPickChangesItsTile,
    gridShown,
    noneCellInUse,
    openFreshEditor,
    pressedOf,
    tabsSelected,
    tilesByKeyboard,
  } = costumeHelpers(ctx.app);

  await openFreshEditor();
  const tileSemantics = await page.evaluate<Record<string, unknown>>(
    `(() => { const lists = [...document.querySelectorAll('#costume-aside [role="tablist"]')]; return { orientations: lists.map((list) => list.getAttribute("aria-orientation")), names: lists.map((list) => document.getElementById(list.getAttribute("aria-labelledby") ?? "")?.textContent ?? null), tabs: lists.map((list) => [...list.querySelectorAll('[role="tab"]')].map((tab) => tab.id)), headings: [...document.querySelectorAll("#costume-aside h2")].map((heading) => heading.tagName) }; })()`,
  );
  await click("#costume-part-costume3");
  await waitFor("Body grid", async () => (await exists("#costume-items-costume3")) || undefined);
  const panelFacts = () =>
    page.evaluate<Record<string, unknown>>(
      `(() => { const panel = document.querySelector("#costume-grid"); return { role: panel.getAttribute("role"), labelledby: panel.getAttribute("aria-labelledby"), controlling: [...document.querySelectorAll("#costume-aside [aria-controls]")].map((tab) => tab.id + ">" + tab.getAttribute("aria-controls")) }; })()`,
    );
  const itemPart = {
    selected: await tabsSelected(),
    shown: await gridShown(),
    panel: await panelFacts(),
  };
  await click("#costume-part-colorLimb");
  await waitFor("Limbs palette", async () => (await exists("#swatch-colorLimb-12")) || undefined);
  const colourPart = {
    selected: await tabsSelected(),
    shown: await gridShown(),
    wornPressed: await pressedOf("#swatch-colorLimb-12"),
    panel: await panelFacts(),
  };
  results.costumePartPickedInTheTileShowsItsGrid =
    same(tileSemantics, {
      orientations: [null, null],
      names: ["Colours", "Costume"],
      tabs: [
        ["costume-part-colorFace", "costume-part-colorBody", "costume-part-colorLimb"],
        [
          "costume-part-costume2",
          "costume-part-costume3",
          "costume-part-costume4",
          "costume-part-costume5",
          "costume-part-costume1",
        ],
      ],
      headings: ["H2", "H2"],
    }) &&
    same(itemPart, {
      selected: ["costume-part-costume3"],
      shown: "costume-items-costume3",
      panel: {
        role: "tabpanel",
        labelledby: "costume-part-costume3",
        controlling: ["costume-part-costume3>costume-grid"],
      },
    }) &&
    same(colourPart, {
      selected: ["costume-part-colorLimb"],
      shown: "palette",
      wornPressed: "true",
      panel: {
        role: "tabpanel",
        labelledby: "costume-part-colorLimb",
        controlling: ["costume-part-colorLimb>costume-grid"],
      },
    });

  results.costumeTilesMoveByArrowsAndTabAndPickByEnterAndSpace = await tilesByKeyboard();
  const tooltipGone = () =>
    waitFor("tooltip closed", async () => ((await exists('[role="tooltip"]')) ? undefined : true));
  await page.evaluate("document.activeElement.blur()");
  await tooltipGone();
  await hoverOver(page, "#costume-part-costume3");
  const tileNameOnHover = await waitFor(
    "tile tooltip on hover",
    async () => (await textOf('[role="tooltip"]')) ?? undefined,
  );
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
  await tooltipGone();
  await page.evaluate(`document.querySelector("#costume-part-costume3").focus()`);
  await press("ArrowRight");
  const tileNameOnFocus = await waitFor("tile tooltip on focus", async () => {
    const name = await textOf('[role="tooltip"]');
    return name === "Makeup" ? name : undefined;
  });
  results.costumeTilesNamedByTooltipOnHoverAndFocus =
    tileNameOnHover === "Body" && tileNameOnFocus === "Makeup";
  results.costumeNoneCellEmptiesASlotAndCarriesTheRing = await noneCellInUse();
  results.costumeGridPickChangesItsTile = await gridPickChangesItsTile();
}

export const costumePhoneKeys = [
  "costumePhoneFocusStaysClearOfTheBlockAndTheBar",
  "costumePhoneGridScrollsOutOfSightUnderTheTopBlock",
  "costumeKeepsThePartPickedAcrossWidths",
  "costumePhoneTilesInOneRowUnderTheSquarePreview",
  "costumePhoneGridBelowTheTiles",
  "barHoldsHistoryLeftAndResetAndSaveRight",
  "costumePhoneBarLabelsStayOnOneLine",
  "costumeNoneCellEmptiesASlotOnAPhone",
  "costumeGridPickChangesItsTileOnAPhone",
  "costumeTilesMoveByArrowsAndTabAndPickByEnterAndSpaceOnAPhone",
  "narrowSaveFromTheBarIsOneClick",
  "narrowNoticeAboveTheEditor",
  "costumePhoneTopBlockStaysInViewOnATallWindowAndScrollsAwayOnAShortOne",
  "costumePhoneBarFlushWithTheBottom",
  "costumePhoneOnlyThePageScrolls",
  "pullFromTheGridLeavesAScrolledPageAloneOnAPhone",
  "pullReadsTheEditorOnAPhone",
] as const;

export async function costumePhone(ctx: Ctx) {
  const { results } = ctx;
  const { click, page } = ctx.app;
  const { atSize, attribute, boxOf, exists, press, pullIndicator, swipe, touchEmulated } =
    pageHelpers(page);
  const {
    barFlush,
    buttonsIn,
    documentScrolls,
    firstRowOf,
    focusedId,
    gridPickChangesItsTile,
    gridShown,
    inStep,
    noneCellInUse,
    openFreshEditor,
    positionOf,
    readEditorAgain,
    savedFrom,
    scrollToTheEnd,
    scrollingBoxes,
    showPart,
    stepOf,
    tabsSelected,
    tileBoxes,
    tilesByKeyboard,
    tracksOf,
  } = costumeHelpers(ctx.app);

  const tabbedAcrossTheSlot = (width: number, height: number) =>
    atSize(width, height, async () => {
      await showPart("costume1");
      await waitFor(
        "Mascot grid",
        async () => (await exists("#costume-items-costume1")) || undefined,
      );
      await page.evaluate("window.scrollTo(0, 0)");
      await page.evaluate(
        `document.querySelector("#item-costume1-0").focus({ preventScroll: true })`,
      );
      const cells = await page.evaluate<string[]>(
        `[...document.querySelectorAll("#costume-items-costume1 > button")].map((cell) => cell.id)`,
      );
      const focusedCellIsClear = () =>
        page.evaluate<boolean>(
          `(() => { const cell = document.activeElement.getBoundingClientRect(); const block = document.querySelector("#costume-aside").getBoundingClientRect(); const bar = document.querySelector("#costume-bar").getBoundingClientRect(); return cell.top - ${RING_ROOM_PX} >= block.bottom - 1 && cell.bottom + ${RING_ROOM_PX} <= bar.top + 1; })()`,
        );
      const walk = async (ids: string[], modifiers: number) => {
        let clear = true;
        for (const id of ids) {
          await press("Tab", modifiers);
          clear = (await focusedId()) === id && (await focusedCellIsClear()) && clear;
        }
        return clear;
      };
      const forward = await walk(cells.slice(1), 0);
      const backward = await walk(cells.slice(0, -1).reverse(), SHIFT_MODIFIER);
      await page.evaluate("window.scrollTo(0, 0)");
      return { cells: cells.length, forward, backward };
    });
  const tabbed = await tabbedAcrossTheSlot(390, 700);
  results.costumePhoneFocusStaysClearOfTheBlockAndTheBar =
    tabbed.cells > 60 && tabbed.forward && tabbed.backward;

  /** The cells over the block's bottom edge, and how many of them are seen there. */
  const cellsOverTheBlock = () =>
    page.evaluate<{ over: number; seen: number }>(
      `(() => { const block = document.querySelector("#costume-aside").getBoundingClientRect(); const over = [...document.querySelectorAll("#costume-items-costume1 > button")].map((cell) => ({ cell, box: cell.getBoundingClientRect() })).filter(({ box }) => box.bottom > 0 && box.top < block.bottom); const seen = over.filter(({ cell, box }) => { const hit = document.elementFromPoint((box.left + box.right) / 2, (Math.max(box.top, 0) + Math.min(box.bottom, block.bottom)) / 2); return hit !== null && cell.contains(hit); }); return { over: over.length, seen: seen.length }; })()`,
    );
  const scrolledUnderTheBlock = await atSize(390, 700, async () => {
    await showPart("costume1");
    await waitFor(
      "Mascot grid",
      async () => (await exists("#costume-items-costume1")) || undefined,
    );
    const end = await scrollToTheEnd();
    const counts: { over: number; seen: number }[] = [];
    for (const part of [0.25, 0.5, 0.75, 1]) {
      await page.evaluate(`window.scrollTo(0, ${Math.round(end * part)})`);
      counts.push(await cellsOverTheBlock());
    }
    await page.evaluate("window.scrollTo(0, 0)");
    return { end, counts };
  });
  results.costumePhoneGridScrollsOutOfSightUnderTheTopBlock =
    scrolledUnderTheBlock.end > 100 &&
    scrolledUnderTheBlock.counts.some(({ over }) => over > 0) &&
    scrolledUnderTheBlock.counts.every(({ seen }) => seen === 0);

  await fetch(`${HIROBA}/__state?reset=1`);
  await fetch(`${HIROBA}/__items?many=1`);
  await readEditorAgain();

  await openFreshEditor();
  await click("#costume-part-costume4");
  const phone = await atSize(PHONE_TALL.width, PHONE_TALL.height, async () => {
    await waitFor("costume bar", async () => (await exists("#costume-bar")) || undefined);
    const kept = {
      part: await attribute("#costume-part-costume4", "aria-selected"),
      grid: await exists("#costume-items-costume4"),
    };
    await showPart("colorBody");
    await waitFor("colour palette", async () => (await exists("#costume-palette")) || undefined);
    const layout = {
      page: await boxOf("#costume-page"),
      aside: await boxOf("#costume-aside"),
      preview: await boxOf("#costume-preview-image"),
      tiles: await tileBoxes(),
      panel: await boxOf("#costume-grid"),
      palette: await boxOf("#costume-palette"),
      swatches: await tracksOf("#costume-palette"),
      swatchRow: await firstRowOf('#costume-palette [id^="swatch-colorBody-"]'),
      scrolling: await scrollingBoxes(),
      noColumns: !(await exists("#costume-actions")),
      tabRows: await exists("#costume-tab-colours"),
    };
    const barButtons = await buttonsIn("#costume-bar");
    const barBox = await boxOf("#costume-bar");
    const barFlushNow = await barFlush();
    await showPart("costume1");
    await waitFor(
      "Mascot grid",
      async () => (await exists("#costume-items-costume1")) || undefined,
    );
    const items = {
      tracks: await tracksOf("#costume-items-costume1"),
      row: await firstRowOf('#costume-items-costume1 [id^="item-costume1-"]'),
      box: await boxOf("#costume-items-costume1"),
    };
    const noneCell = await noneCellInUse();
    const gridPick = await gridPickChangesItsTile();
    const keyboard = await tilesByKeyboard();

    const before = await savedCostume();
    const savesBefore = await hitsOn("/ajax/change_mydon.php");
    await showPart("colorBody");
    await click("#swatch-colorBody-40");
    const outcome = await savedFrom(before);
    const savedFromTheBar = {
      outcome,
      saves: (await hitsOn("/ajax/change_mydon.php")) - savesBefore,
      moved: same(await savedCostume(), { ...START, colorBody: 40 }),
    };
    await fetch(`${HIROBA}/__noop-save`);
    await click("#swatch-colorBody-41");
    const unmoved = await savedFrom(await savedCostume());
    const noticeAboveTheGrid = await page.evaluate<boolean>(
      `(() => { const notice = document.querySelector("#costume-page #write-outcome"); const aside = document.querySelector("#costume-aside"); const panel = document.querySelector("#costume-grid"); return notice !== null && notice.getBoundingClientRect().top >= aside.getBoundingClientRect().bottom && notice.getBoundingClientRect().bottom <= panel.getBoundingClientRect().top; })()`,
    );
    return {
      kept,
      layout,
      barButtons,
      barBox,
      barFlushNow,
      items,
      noneCell,
      gridPick,
      keyboard,
      savedFromTheBar,
      unmoved,
      noticeAboveTheGrid,
    };
  });
  await waitFor("costume actions", async () => (await exists("#costume-actions")) || undefined);
  const { layout } = phone;
  results.costumeKeepsThePartPickedAcrossWidths =
    same(phone.kept, { part: "true", grid: true }) &&
    same(await tabsSelected(), ["costume-part-colorBody"]) &&
    (await gridShown()) === "palette";
  const phoneTiles = layout.tiles;
  results.costumePhoneTilesInOneRowUnderTheSquarePreview =
    Math.abs(layout.preview.width - layout.preview.height) < 1 &&
    near(layout.preview.width, 160) &&
    near(
      (layout.preview.left + layout.preview.right) / 2,
      (layout.page.left + layout.page.right) / 2,
    ) &&
    phoneTiles.every(
      (box) =>
        near(box.top, at(phoneTiles, 0).top) &&
        near(box.width, at(phoneTiles, 0).width) &&
        near(box.width, box.height) &&
        box.width > 30 &&
        box.left >= layout.page.left - 1 &&
        box.right <= layout.page.right + 1,
    ) &&
    layout.preview.bottom <= at(phoneTiles, 0).top &&
    gapsOf(phoneTiles).every((gap, index) => (index === 2 ? gap > 9 : near(gap, 6))) &&
    layout.tabRows === false;
  results.costumePhoneGridBelowTheTiles =
    layout.panel.top >= Math.max(...phoneTiles.map((box) => box.bottom)) &&
    layout.panel.top >= layout.aside.bottom &&
    layout.noColumns &&
    layout.swatches >= 8 &&
    layout.swatchRow.length === layout.swatches &&
    evenSides(layout.swatchRow, layout.palette) &&
    gapsOf(layout.swatchRow).every((gap) => near(gap, 6, 0.5)) &&
    phone.items.tracks >= 6 &&
    phone.items.box.top >= layout.panel.top &&
    gapsOf(phone.items.row).every((gap) => near(gap, 6)) &&
    evenSides(phone.items.row, phone.items.box);
  results.barHoldsHistoryLeftAndResetAndSaveRight =
    same(
      phone.barButtons.map(({ id }) => id),
      ["costume-history", "costume-reset", "costume-save"],
    ) &&
    Math.abs((phone.barButtons[0]?.left ?? 0) - (phone.barBox.left + 12)) < 2 &&
    Math.abs(phone.barBox.right - 12 - (phone.barButtons[2]?.right ?? 0)) < 2 &&
    (phone.barButtons[1]?.right ?? 0) <= (phone.barButtons[2]?.left ?? 0);
  /** The lines each button's label takes. */
  const labelLines = (container: string) =>
    page.evaluate<number[]>(
      `[...document.querySelectorAll(${JSON.stringify(`${container} button`)})].map((button) => { const range = document.createRange(); range.selectNodeContents([...button.childNodes].find((node) => node.nodeType === Node.TEXT_NODE)); return new Set([...range.getClientRects()].map((box) => Math.round(box.top))).size; })`,
    );
  const barLabelsAt = (width: number) =>
    atSize(width, 700, async () => {
      await waitFor("costume bar", async () => (await exists("#costume-bar")) || undefined);
      const bar = await boxOf("#costume-bar");
      const buttons = await buttonsIn("#costume-bar");
      return {
        lines: await labelLines("#costume-bar"),
        inside: buttons.every(({ left, right }) => left >= bar.left && right <= bar.right),
        apart: buttons.every(
          ({ left }, index) => index === 0 || left >= (buttons[index - 1]?.right ?? 0),
        ),
      };
    });
  const labelsOnOneLine = ({ lines, inside, apart }: Awaited<ReturnType<typeof barLabelsAt>>) =>
    lines.length === 3 && lines.every((count) => count === 1) && inside && apart;
  results.costumePhoneBarLabelsStayOnOneLine =
    labelsOnOneLine(await barLabelsAt(320)) && labelsOnOneLine(await barLabelsAt(390));
  results.costumeNoneCellEmptiesASlotOnAPhone = phone.noneCell;
  results.costumeGridPickChangesItsTileOnAPhone = phone.gridPick;
  results.costumeTilesMoveByArrowsAndTabAndPickByEnterAndSpaceOnAPhone = phone.keyboard;
  results.narrowSaveFromTheBarIsOneClick = same(phone.savedFromTheBar, {
    outcome: "applied",
    saves: 1,
    moved: true,
  });
  results.narrowNoticeAboveTheEditor = phone.unmoved === "notApplied" && phone.noticeAboveTheGrid;
  const phoneScrolling = (size: { width: number; height: number }) =>
    atSize(size.width, size.height, async () => {
      await waitFor("costume bar", async () => (await exists("#costume-bar")) || undefined);
      await showPart("costume1");
      await waitFor(
        "Mascot grid",
        async () => (await exists("#costume-items-costume1")) || undefined,
      );
      await page.evaluate("window.scrollTo(0, 0)");
      const before = await boxOf("#costume-aside");
      const scrolls = await documentScrolls();
      const scrolledBy = await scrollToTheEnd();
      const after = await boxOf("#costume-aside");
      const flush = await barFlush();
      const scrolling = await scrollingBoxes();
      await page.evaluate("window.scrollTo(0, 0)");
      return {
        before,
        after,
        scrolls,
        scrolledBy,
        flush,
        scrolling,
        position: await positionOf("#costume-aside"),
        windowHeight: await page.evaluate<number>("innerHeight"),
      };
    });
  const onATallPhone = await phoneScrolling({ width: 390, height: 700 });
  const onAShortPhone = await phoneScrolling(PHONE_SHORT);
  results.costumePhoneTopBlockStaysInViewOnATallWindowAndScrollsAwayOnAShortOne =
    onATallPhone.scrolls &&
    onATallPhone.position === "sticky" &&
    onATallPhone.scrolledBy > 30 &&
    near(onATallPhone.after.top, onATallPhone.before.top) &&
    onATallPhone.after.bottom < onATallPhone.windowHeight &&
    onAShortPhone.scrolls &&
    onAShortPhone.position === "static" &&
    onAShortPhone.scrolledBy > 30 &&
    onAShortPhone.after.top < onAShortPhone.before.top - 30;
  results.costumePhoneBarFlushWithTheBottom =
    phone.barFlushNow && onATallPhone.flush && onAShortPhone.flush;
  results.costumePhoneOnlyThePageScrolls =
    onATallPhone.scrolls &&
    onAShortPhone.scrolls &&
    [layout, onATallPhone, onAShortPhone].every(({ scrolling }) => scrolling.length === 0);
  const pullOnAPhone = await atSize(PHONE_SHORT.width, PHONE_SHORT.height, async () => {
    await waitFor("costume bar", async () => (await exists("#costume-bar")) || undefined);
    await showPart("costume1");
    await waitFor(
      "Mascot grid",
      async () => (await exists("#costume-items-costume1")) || undefined,
    );
    await touchEmulated(true);
    await page.evaluate("window.scrollTo(0, 0)");
    const grid = await boxOf("#costume-items-costume1");
    const from = { x: (grid.left + grid.right) / 2, y: grid.top + 10 };
    const to = { x: from.x, y: from.y + 160 };
    await page.evaluate("window.scrollTo(0, 60)");
    const scrolled = (await page.evaluate<number>("scrollY")) > 0;
    const readsBefore = await editorHits();
    await swipe(from, to);
    await Bun.sleep(500);
    const leftAlone =
      scrolled &&
      (await editorHits()) === readsBefore &&
      (await stepOf()) === "editing" &&
      !(await pullIndicator()).shown;
    await page.evaluate("window.scrollTo(0, 0)");
    await swipe(from, to);
    await waitFor("editor read again", async () =>
      (await editorHits()) > readsBefore ? true : undefined,
    );
    await inStep("editing");
    const reads = (await editorHits()) === readsBefore + 1;
    await touchEmulated(false);
    return { leftAlone, reads };
  });
  results.pullFromTheGridLeavesAScrolledPageAloneOnAPhone = pullOnAPhone.leftAlone;
  results.pullReadsTheEditorOnAPhone = pullOnAPhone.reads;
  await fetch(`${HIROBA}/__items?many=0`);
  await fetch(`${HIROBA}/__state?reset=1`);
  await readEditorAgain();
}
