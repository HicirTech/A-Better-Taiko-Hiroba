import { HIROBA, PHONE_SHORT, TOP_BAND_PX } from "./config";
import type { Ctx } from "./context";
import { at, costumeHelpers, near } from "./costume-helpers";
import { pageHelpers, same, waitFor, withoutPictureBytes } from "./harness";
import {
  COLOUR_REQUESTS,
  editorHits,
  hitsOn,
  myPageHits,
  requestLog,
  resetLog,
  START,
  savedCostume,
  sentAsPlanned,
  thumbs,
  thumbsSettled,
} from "./stand-in";

export const thumbnailsKeys = [
  "thumbnailsShownAsPictures",
  "thumbnailsOnlyWhenSeen",
  "pullFromTheGridLeavesAScrolledPageAlone",
  "pullReadsTheEditorOnTheCostumePage",
  "editorTermsLeftUnmarked",
  "editorTermsInEnglish",
  "thumbnailAddressesKeptOutOfDom",
  "thumbnailsAskedOncePerRun",
  "thumbnailGifLeavesTheId",
  "failedThumbnailsAskedAgainOnReopen",
  "thumbnailNotOfferedRefusedUnsent",
  "pictureShapesRefused",
] as const;

export async function thumbnails(ctx: Ctx) {
  const { results, state, tokens } = ctx;
  const { click, page, textOf } = ctx.app;
  const { boxOf, exists, pullIndicator, swipe, touchEmulated } = pageHelpers(page);
  const {
    askedOnlyWhatIsOnShow,
    inStep,
    leaveTheCostumePage,
    openEditing,
    openFreshEditor,
    showPart,
    stepOf,
  } = costumeHelpers(ctx.app);

  const openItems = async (fresh = false) => {
    await (fresh ? openFreshEditor() : openEditing());
    await showPart("costume1");
    await waitFor(
      "Mascot grid",
      async () => (await exists("#costume-items-costume1")) || undefined,
    );
  };
  await fetch(`${HIROBA}/__thumbs?reset=1`);
  const owned = (await (await fetch(`${HIROBA}/__items?many=1`)).json()) as Record<
    string,
    number[]
  >;
  const ownedIn = (slot: number) => owned[String(slot)] ?? [];
  state.ownedIn = ownedIn;
  /** The tiles fetched the item the set wears when the page was first shown. */
  const unfetchedIn = (slot: number) =>
    ownedIn(slot).filter((id) => id !== START[`costume${slot}`]);

  await openItems(true);
  await waitFor(
    "Mascot #4 picture",
    async () => (await exists("#item-costume1-4 img")) || undefined,
  );
  const seen = await thumbsSettled();
  results.thumbnailsShownAsPictures =
    (
      await page.evaluate<string | null>(
        `document.querySelector("#item-costume1-4 img")?.getAttribute("src") ?? null`,
      )
    )?.startsWith("data:image/png;base64,") === true &&
    (await page.evaluate<number>(
      `document.querySelectorAll("#costume-items-costume1 img").length`,
    )) === seen.length;
  results.thumbnailsOnlyWhenSeen = await askedOnlyWhatIsOnShow(seen, ownedIn(1), false);
  await touchEmulated(true);
  await page.evaluate("window.scrollTo(0, 0)");
  const gridBox = await boxOf("#costume-items-costume1");
  const fromGrid = { x: (gridBox.left + gridBox.right) / 2, y: gridBox.top + 10 };
  const pulledOnGrid = { x: fromGrid.x, y: fromGrid.y + 160 };
  await page.evaluate("window.scrollTo(0, 100)");
  const pageScrolled = (await page.evaluate<number>("scrollY")) > 0;
  const editorReadsBeforeGridPull = await editorHits();
  await swipe(fromGrid, pulledOnGrid);
  await Bun.sleep(500);
  results.pullFromTheGridLeavesAScrolledPageAlone =
    pageScrolled &&
    (await editorHits()) === editorReadsBeforeGridPull &&
    (await stepOf()) === "editing" &&
    !(await pullIndicator()).shown;
  await page.evaluate("window.scrollTo(0, 0)");
  const myPageReadsBeforeGridPull = await myPageHits();
  await swipe(fromGrid, pulledOnGrid);
  await waitFor("editor read by pull", async () =>
    (await editorHits()) > editorReadsBeforeGridPull ? true : undefined,
  );
  await inStep("editing");
  results.pullReadsTheEditorOnTheCostumePage =
    (await editorHits()) === editorReadsBeforeGridPull + 1 &&
    (await myPageHits()) === myPageReadsBeforeGridPull;
  await touchEmulated(false);
  const editorTerms = await page.evaluate<(string | null)[][]>(
    `["#costume-group-items", "#costume-part-costume1", "#item-costume1-0", "#item-costume1-4"].map((selector) => { const node = document.querySelector(selector); return [node?.lang ?? null, node?.getAttribute("aria-label") ?? node?.textContent ?? null]; })`,
  );
  results.editorTermsLeftUnmarked = same(
    editorTerms.map(([lang]) => lang),
    ["", "", "", ""],
  );
  results.editorTermsInEnglish = same(
    editorTerms.map(([, label]) => label),
    ["Costume", "Mascot", "Remove", "Mascot #4"],
  );
  const withThumbnails = withoutPictureBytes(
    await page.evaluate<string>("document.documentElement.outerHTML"),
  );
  results.thumbnailAddressesKeptOutOfDom =
    !withThumbnails.includes("imgsrc") &&
    !withThumbnails.includes("cos=") &&
    !withThumbnails.includes("_token_v2") &&
    !tokens.some((token) => withThumbnails.includes(token));
  // Touch scrolling can bring more rows into view, so count what was asked once the page is left.
  const askedBeforeReopen = (await thumbsSettled()).length;
  await leaveTheCostumePage();
  await openItems();
  await waitFor(
    "Mascot #4 picture",
    async () => (await exists("#item-costume1-4 img")) || undefined,
  );
  await Bun.sleep(1500);
  results.thumbnailsAskedOncePerRun = (await thumbs()).length === askedBeforeReopen;
  await fetch(`${HIROBA}/__thumb?answer=gif`);
  await click("#costume-part-costume2");
  await waitFor(
    "thumbnail notice",
    async () => (await exists("#costume-thumbnails-code")) || undefined,
  );
  const thumbsAfterGif = await thumbsSettled();
  await click("#costume-part-costume1");
  await Bun.sleep(300);
  await click("#costume-part-costume2");
  await Bun.sleep(1500);
  const slotTwoAsked = thumbsAfterGif.slice(askedBeforeReopen);
  results.thumbnailGifLeavesTheId =
    (await textOf("#costume-thumbnails-unavailable > :first-child")) ===
      `Some thumbnails didn't load (${unfetchedIn(2).length}); their numbers are shown instead.` &&
    (await textOf("#costume-thumbnails-code")) ===
      "Code for a report: costumeItem=notPng status=200 type=image/gif bytes=43" &&
    (await page.evaluate<number>(
      `document.querySelectorAll("#costume-thumbnails-code").length`,
    )) === 1 &&
    (await textOf("#item-costume2-59")) === "#59" &&
    !(await exists("#item-costume2-59 img")) &&
    (await exists("#item-costume2-21 img")) &&
    slotTwoAsked.length === unfetchedIn(2).length &&
    slotTwoAsked.every((thumb) => thumb.type === 2) &&
    (await thumbs()).length === thumbsAfterGif.length;
  await fetch(`${HIROBA}/__thumb?answer=png`);
  await leaveTheCostumePage();
  await openItems();
  await click("#costume-part-costume2");
  await waitFor("Head grid", async () => (await exists("#costume-items-costume2")) || undefined);
  const askedOnReopen = (await thumbsSettled()).slice(thumbsAfterGif.length);
  results.failedThumbnailsAskedAgainOnReopen =
    same(
      askedOnReopen.map((thumb) => `${thumb.type}/${thumb.cos}`).sort(),
      unfetchedIn(2)
        .map((id) => `2/${id}`)
        .sort(),
    ) &&
    (await page.evaluate<number>(
      `document.querySelectorAll("#costume-items-costume2 img").length`,
    )) === ownedIn(2).length &&
    !(await exists("#costume-thumbnails-unavailable"));
  await leaveTheCostumePage();
  await fetch(`${HIROBA}/__items?many=0`);
  const thumbsBeforeRefusals = (await thumbs()).length;
  results.thumbnailNotOfferedRefusedUnsent =
    same(
      await page.evaluate(`window.abth.readPicture({ kind: "costumeItem", slot: 1, id: 999 })`),
      {
        ok: false,
        error: { code: "costumeItem=notOffered" },
      },
    ) && (await thumbs()).length === thumbsBeforeRefusals;
  const refusalOf = (want: string) =>
    page.evaluate<string>(
      `window.abth.readPicture(${want}).then(() => "answered", (error) => String(error.message))`,
    );
  const refusals = [
    await refusalOf(`{ kind: "costumeItem", slot: 1, id: 4, url: "${HIROBA}/imgsrc_kisekae.php" }`),
    await refusalOf(`{ kind: "costumeItem", slot: 6, id: 4 }`),
    await refusalOf(`{ kind: "costumeItem", slot: 1, id: 1.5 }`),
    await refusalOf(`{ kind: "titlePlate", url: "${HIROBA}/imgsrc_titleplate.php" }`),
    await refusalOf(`{ kind: "titlePlate", slot: 1 }`),
  ];
  results.pictureShapesRefused =
    refusals.every((message) =>
      message.includes("Refused abth:read-picture: arguments it does not take"),
    ) && (await thumbs()).length === thumbsBeforeRefusals;
}

export const tileThumbnailsKeys = [
  "tileThumbnailWaitsOutAWriteThenIsAskedOnce",
  "thumbnailsOnlyWhenSeenOnAShortWindow",
  "tileThumbnailWaitsOutAWriteOnAPhone",
  "narrowThumbnailsOnlyWhenSeen",
  "narrowThumbnailsAskedOncePerRun",
] as const;

export async function tileThumbnails(ctx: Ctx) {
  const { results, state } = ctx;
  const { click, page } = ctx.app;
  const { atSize, exists, menuClosed, menuOpened } = pageHelpers(page);
  const { askedOnlyWhatIsOnShow, inStep, openFreshEditor, showPart } = costumeHelpers(ctx.app);
  const { ownedIn } = state;

  const farItemSavedAtOnce = async (items: readonly number[]) => {
    await showPart("costume1");
    await waitFor(
      "Mascot grid",
      async () => (await exists("#costume-items-costume1")) || undefined,
    );
    const farItem = items[items.length - 1];
    const thumbsBeforePick = (await thumbsSettled()).length;
    await resetLog();
    await fetch(`${HIROBA}/__hold-precheck?on=1`);
    const prechecksBeforeFarSave = await hitsOn("/ajax/check_ip_kisekae.php");
    await page.evaluate(
      `(async () => { document.querySelector("#item-costume1-${farItem}").click(); await new Promise((resolve) => requestAnimationFrame(resolve)); document.querySelector("#costume-save").click(); })()`,
    );
    await waitFor(
      "held pre-check",
      async () =>
        (await hitsOn("/ajax/check_ip_kisekae.php")) > prechecksBeforeFarSave || undefined,
    );
    await Bun.sleep(700);
    const thumbsDuringTheWrite = (await thumbs()).length - thumbsBeforePick;
    await fetch(`${HIROBA}/__hold-precheck?on=0`);
    await inStep("editing");
    const tiledAfterTheWrite = (await thumbsSettled()).slice(thumbsBeforePick);
    await waitFor(
      "worn Mascot tile picture",
      async () => (await exists("#costume-part-costume1 img")) || undefined,
    );
    const waitedItOut =
      thumbsDuringTheWrite === 0 &&
      same(
        tiledAfterTheWrite.map(({ type, cos }) => `${type}/${cos}`),
        [`1/${farItem}`],
      ) &&
      sentAsPlanned(await requestLog(), [], COLOUR_REQUESTS) &&
      (await savedCostume()).costume1 === farItem;
    await fetch(`${HIROBA}/__state?reset=1`);
    return waitedItOut;
  };
  await fetch(`${HIROBA}/__items?many=1`);
  await openFreshEditor();
  results.tileThumbnailWaitsOutAWriteThenIsAskedOnce = await farItemSavedAtOnce(ownedIn(1));

  const slotInTheWindow = async (firstItem: number | undefined) => {
    await showPart("costume1");
    await waitFor(
      `Mascot #${firstItem} picture`,
      async () => (await exists(`#item-costume1-${firstItem} img`)) || undefined,
    );
  };
  const freshList = async (which: "2" | "3") => {
    const fresh = (await (await fetch(`${HIROBA}/__items?many=${which}`)).json()) as Record<
      string,
      number[]
    >;
    // The editor stays on screen through the read: with a slot shown, the new list's first
    // thumbnails would be fetched before the count starts.
    await ctx.app.goTo("costume");
    await inStep("editing");
    await showPart("colorFace");
    await openFreshEditor();
    await fetch(`${HIROBA}/__thumbs?reset=1`);
    return fresh["1"] ?? [];
  };
  const goOnAPhone = async (to: "overview" | "costume") => {
    await menuOpened();
    await click(`#nav-${to}`);
    await menuClosed();
  };
  const shortWideItems = await freshList("2");
  results.thumbnailsOnlyWhenSeenOnAShortWindow = await atSize(1000, 500, async () => {
    await slotInTheWindow(shortWideItems[0]);
    return askedOnlyWhatIsOnShow(await thumbsSettled(), shortWideItems, true);
  });
  const phoneItems = await freshList("3");
  state.phoneItems = phoneItems;
  const thumbnailsOnAPhone = await atSize(PHONE_SHORT.width, PHONE_SHORT.height, async () => {
    await slotInTheWindow(phoneItems[0]);
    const firstView = await thumbsSettled();
    const onlyWhatIsOnShow = await askedOnlyWhatIsOnShow(firstView, phoneItems, true);
    await goOnAPhone("overview");
    await goOnAPhone("costume");
    await slotInTheWindow(phoneItems[0]);
    await Bun.sleep(1500);
    const askedAfterReopen = (await thumbs()).length;
    const waitsOutAWrite = await farItemSavedAtOnce(phoneItems);
    return { asked: firstView.length, onlyWhatIsOnShow, askedAfterReopen, waitsOutAWrite };
  });
  results.tileThumbnailWaitsOutAWriteOnAPhone = thumbnailsOnAPhone.waitsOutAWrite;
  results.narrowThumbnailsOnlyWhenSeen = thumbnailsOnAPhone.onlyWhatIsOnShow;
  results.narrowThumbnailsAskedOncePerRun =
    thumbnailsOnAPhone.askedAfterReopen === thumbnailsOnAPhone.asked;
}

export const saveInPlaceKeys = [
  "costumeThumbnailsInViewDuringASaveWaitForIt",
  "costumeSaveKeepsTheEditorAndThePageInPlace",
  "costumePhoneSaveKeepsTheEditorAndThePageInPlace",
  "costumePreviewLevelWithTheGridsFirstRowBelowTheNotices",
  "costumeLeftColumnStaysInViewWithANoticeAndTheMascotNote",
  "costumeNoticeIsScrolledIntoViewAfterAFailedSave",
  "costumePhoneNoticeIsScrolledIntoViewBetweenTheBlockAndTheBar",
] as const;

export async function saveInPlace(ctx: Ctx) {
  const { results, state } = ctx;
  const { click, page } = ctx.app;
  const { atSize, boxOf, exists } = pageHelpers(page);
  const { firstRowOf, inStep, readEditorAgain, scrollToTheEnd, showPart } = costumeHelpers(ctx.app);
  const { phoneItems } = state;

  // The other slots empty, so a saved Mascot leaves no note behind to change the page's height.
  const withOnlyTheMascotSlot = async () => {
    await fetch(`${HIROBA}/__state?reset=1&costume_2=0&costume_3=0&costume_4=0&costume_5=0`);
    await readEditorAgain();
  };
  const heldFacts = () =>
    page.evaluate<{
      scrolled: number;
      sameGrid: boolean;
      inert: boolean;
      progressIn: string | null;
    }>(
      `({ scrolled: scrollY, sameGrid: document.querySelector("#costume-items-costume1") === window.gridKept, inert: document.querySelector("#costume-grid")?.inert === true && document.querySelector("#costume-part-colorFace")?.closest("[inert]") != null, progressIn: document.querySelector("#costume-saving")?.closest("#costume-aside, #costume-bar")?.id ?? null })`,
    );
  const saveFromTheEndOfTheSlot = async (width: number, height: number) => {
    await withOnlyTheMascotSlot();
    return atSize(width, height, async () => {
      await showPart("costume1");
      await waitFor(
        "Mascot grid",
        async () => (await exists("#costume-items-costume1")) || undefined,
      );
      const farItem = phoneItems[phoneItems.length - 1];
      await page.evaluate(`document.querySelector("#item-costume1-${farItem}").click()`);
      const end = await scrollToTheEnd();
      await page.evaluate(`window.gridKept = document.querySelector("#costume-items-costume1")`);
      await fetch(`${HIROBA}/__hold-precheck?on=1`);
      await click("#costume-save");
      await inStep("saving");
      const held = await heldFacts();
      await fetch(`${HIROBA}/__hold-precheck?on=0`);
      await inStep("editing");
      const settled = await heldFacts();
      const saved = (await savedCostume()).costume1 === farItem;
      await page.evaluate("window.scrollTo(0, 0)");
      return { end, held, settled, saved };
    });
  };
  const keptInPlace = (
    { end, held, settled, saved }: Awaited<ReturnType<typeof saveFromTheEndOfTheSlot>>,
    progressIn: string,
  ) =>
    end > 50 &&
    near(held.scrolled, end) &&
    near(settled.scrolled, end) &&
    held.sameGrid &&
    settled.sameGrid &&
    held.inert &&
    !settled.inert &&
    held.progressIn === progressIn &&
    saved;
  await withOnlyTheMascotSlot();
  results.costumeThumbnailsInViewDuringASaveWaitForIt = await atSize(960, 720, async () => {
    await showPart("costume1");
    await waitFor(
      "Mascot grid",
      async () => (await exists("#costume-items-costume1")) || undefined,
    );
    await page.evaluate("window.scrollTo(0, 0)");
    await click(`#item-costume1-${phoneItems[0]}`);
    const askedBefore = (await thumbsSettled()).length;
    await fetch(`${HIROBA}/__hold-precheck?on=1`);
    await click("#costume-save");
    await inStep("saving");
    await page.evaluate("window.scrollBy(0, 160)");
    await Bun.sleep(700);
    const askedDuringTheWrite = (await thumbs()).length - askedBefore;
    await fetch(`${HIROBA}/__hold-precheck?on=0`);
    await inStep("editing");
    const askedAfterTheWrite = (await thumbsSettled()).length - askedBefore;
    await page.evaluate("window.scrollTo(0, 0)");
    return askedDuringTheWrite === 0 && askedAfterTheWrite > 0;
  });
  results.costumeSaveKeepsTheEditorAndThePageInPlace = keptInPlace(
    await saveFromTheEndOfTheSlot(960, 720),
    "costume-aside",
  );
  results.costumePhoneSaveKeepsTheEditorAndThePageInPlace = keptInPlace(
    await saveFromTheEndOfTheSlot(390, 700),
    "costume-bar",
  );

  await fetch(`${HIROBA}/__state?reset=1`);
  await readEditorAgain();
  const withTheNotesUp = async <T>(width: number, height: number, run: () => Promise<T>) => {
    await fetch(`${HIROBA}/__preview?answer=gif`);
    try {
      return await atSize(width, height, async () => {
        await showPart("colorFace");
        await click("#swatch-colorFace-55");
        await showPart("costume1");
        await waitFor(
          "Mascot grid",
          async () => (await exists("#costume-items-costume1")) || undefined,
        );
        await click(`#item-costume1-${phoneItems[0]}`);
        await waitFor(
          "kigurumi warning",
          async () => (await exists("#kigurumi-warning")) || undefined,
        );
        await waitFor(
          "preview unavailable notice",
          async () => (await exists("#costume-preview-unavailable")) || undefined,
        );
        await scrollToTheEnd();
        await fetch(`${HIROBA}/__noop-save`);
        await click("#costume-save");
        await waitFor("write notice", async () => (await exists("#write-outcome")) || undefined);
        return await run();
      });
    } finally {
      await fetch(`${HIROBA}/__preview?answer=png`);
      await click("#costume-reset");
    }
  };
  const noticeIsInView = async (
    clearTop: () => Promise<number>,
    clearBottom: () => Promise<number>,
  ) => {
    try {
      return await waitFor(
        "notice in view",
        async () => {
          const notice = await boxOf("#write-outcome");
          const fits =
            notice.top >= (await clearTop()) - 0.5 && notice.bottom <= (await clearBottom()) + 0.5;
          return fits ? true : undefined;
        },
        3_000,
      );
    } catch {
      return false;
    }
  };
  const columnWithTheNotesUp = (width: number, height: number) =>
    withTheNotesUp(width, height, async () => {
      const noticeSeen = await noticeIsInView(
        async () => TOP_BAND_PX,
        () => page.evaluate<number>("innerHeight"),
      );
      const apart = await page.evaluate<boolean>(
        `["#write-outcome", "#kigurumi-warning", "#costume-preview-unavailable"].every((selector) => document.querySelector(selector) !== null && !document.querySelector("#costume-aside").contains(document.querySelector(selector)))`,
      );
      await page.evaluate("window.scrollTo(0, 0)");
      const preview = await boxOf("#costume-preview");
      const firstRow = await firstRowOf('#costume-items-costume1 [id^="item-costume1-"]');
      const level = near(preview.top, at(firstRow, 0).top, 1);
      const end = await page.evaluate<number>(
        "document.documentElement.scrollHeight - innerHeight",
      );
      const stuckOverhangs: number[] = [];
      for (const part of [0, 0.25, 0.5, 0.75, 1]) {
        await page.evaluate(`window.scrollTo(0, ${Math.round(end * part)})`);
        const aside = await boxOf("#costume-aside");
        if (near(aside.top, TOP_BAND_PX, 0.5)) {
          stuckOverhangs.push(aside.bottom - (await page.evaluate<number>("innerHeight")));
        }
      }
      return { noticeSeen, apart, level, end, stuckOverhangs };
    });
  const wideWithTheNotesUp = [
    await columnWithTheNotesUp(946, 657),
    await columnWithTheNotesUp(960, 720),
  ];
  results.costumePreviewLevelWithTheGridsFirstRowBelowTheNotices = wideWithTheNotesUp.every(
    ({ level }) => level,
  );
  results.costumeLeftColumnStaysInViewWithANoticeAndTheMascotNote = wideWithTheNotesUp.every(
    ({ apart, end, stuckOverhangs }) =>
      apart && end > 100 && stuckOverhangs.length > 0 && stuckOverhangs.every((one) => one <= 0.5),
  );
  results.costumeNoticeIsScrolledIntoViewAfterAFailedSave = wideWithTheNotesUp.every(
    ({ noticeSeen }) => noticeSeen,
  );
  results.costumePhoneNoticeIsScrolledIntoViewBetweenTheBlockAndTheBar = await withTheNotesUp(
    390,
    700,
    () =>
      noticeIsInView(
        async () => (await boxOf("#costume-aside")).bottom,
        async () => (await boxOf("#costume-bar")).top,
      ),
  );
}
