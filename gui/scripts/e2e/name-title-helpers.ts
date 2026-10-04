import { INITIAL_PROFILE, OWNED_TITLES } from "../mock-profile";
import type { App } from "./app";
import { pageHelpers, waitFor } from "./harness";
import { hitsOn, myPageHits, titleOf } from "./stand-in";

export const UNLISTED_TITLE = "部品から作った称号";

export const SAVE = "/ajax/change_mydon_profile.php";

export function nameTitleHelpers(app: App) {
  const { click, page } = app;
  const { exists, press } = pageHelpers(page);

  type Section = "title" | "name";
  const stepIn = (section: Section) =>
    page.evaluate<string | null>(
      `document.querySelector("#${section}-section")?.dataset.step ?? null`,
    );
  const inSection = (section: Section, step: string) =>
    waitFor(`${section} step ${step}`, async () =>
      (await stepIn(section)) === step ? true : undefined,
    );
  /** The kind of notice a section shows; null when it shows none, as after a plain success. */
  const outcomeOf = (section: Section) =>
    page.evaluate<string | null>(
      `document.querySelector("#${section}-outcome")?.dataset.outcome ?? null`,
    );
  const disabledOf = (selector: string) =>
    page.evaluate<boolean | null>(
      `document.querySelector(${JSON.stringify(selector)})?.disabled ?? null`,
    );
  const inputValueOf = (selector: string) =>
    page.evaluate<string | null>(
      `document.querySelector(${JSON.stringify(selector)})?.value ?? null`,
    );
  const titleListIn = () =>
    page.evaluate<string | null>(`document.querySelector("#title-section")?.dataset.list ?? null`);
  // Read again forgets the list; opening the picker reads it where the old page read did.
  const readTitlesAgain = async () => {
    const before = await myPageHits();
    await click("#read-again");
    await waitFor("my page read", async () => ((await myPageHits()) > before ? true : undefined));
    await waitFor("title list forgotten", async () =>
      (await titleListIn()) === "unread" ? true : undefined,
    );
    await inSection("title", "idle");
    await popupOpened();
    await popupClosed();
  };
  const ARROW_DOWN = { key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 };
  const popupOpened = async () => {
    await page.evaluate(`document.querySelector("#title-pick").focus()`);
    await page.send("Input.dispatchKeyEvent", { type: "keyDown", ...ARROW_DOWN });
    await page.send("Input.dispatchKeyEvent", { type: "keyUp", ...ARROW_DOWN });
    await waitFor("title list shown", async () => (await exists('[role="listbox"]')) || undefined);
    await waitFor("title list read", async () =>
      (await titleListIn()) === "read" ? true : undefined,
    );
  };
  const popupClosed = async () => {
    await press("Escape");
    await waitFor("title list closed", async () =>
      (await exists('[role="listbox"]')) ? undefined : true,
    );
  };
  /** Reads the list if a write or Read again forgot it, so typing never starts a read. */
  const titlesRead = async () => {
    if ((await titleListIn()) !== "read") {
      await popupOpened();
      await popupClosed();
    }
  };
  type Listed = {
    id: string | undefined;
    name: string;
    lang: string;
    numbered: boolean;
    current: boolean;
  };
  const listed = () =>
    page.evaluate<Listed[]>(
      `[...document.querySelectorAll('[role="listbox"] [data-title-id]')].map((li) => ({ id: li.dataset.titleId, name: li.querySelector("span")?.textContent ?? "", lang: li.querySelector("span")?.lang ?? "", numbered: /#[0-9]+/.test(li.textContent), current: li.textContent.includes("Current") }))`,
    );
  /** Whether the text under `selector` holds a title's id, or a number sign and digits. */
  const idShownIn = (selector: string) =>
    page.evaluate<boolean>(
      `(() => { const text = [...document.querySelectorAll(${JSON.stringify(selector)})].map((box) => box.textContent).join(" "); return /#[0-9]+/.test(text) || ${JSON.stringify(OWNED_TITLES.map((one) => one.id))}.some((id) => new RegExp("(^|[^0-9])" + id + "([^0-9]|$)").test(text)); })()`,
    );

  const pickTitle = async (typed: string, id: number) => {
    await titlesRead();
    // A pick still held, as a refused save leaves it, would take the typing at its end.
    await page.evaluate(`document.querySelector(".MuiAutocomplete-clearIndicator")?.click()`);
    // The field holds the title worn, so the typing replaces it.
    await page.evaluate(
      `(() => { const input = document.querySelector("#title-pick"); input.focus(); input.select(); })()`,
    );
    await page.send("Input.insertText", { text: typed });
    await waitFor(
      `title option ${id}`,
      async () => (await exists(`[data-title-id="${id}"]`)) || undefined,
    );
    await page.evaluate(`document.querySelector('[data-title-id="${id}"]').click()`);
    await waitFor("title save enabled", async () =>
      (await disabledOf("#title-save")) === false ? true : undefined,
    );
  };
  /** Presses a section's Save, and waits for its write to end. */
  const saveSection = async (section: Section) => {
    const savesBefore = await hitsOn(SAVE);
    await click(`#${section}-save`);
    await waitFor(`${section} save sent`, async () =>
      (await hitsOn(SAVE)) > savesBefore ? true : undefined,
    );
    await inSection(section, "idle");
  };
  /** The read after a title write runs behind the page; the profile is in once it ends. */
  const rereadDone = async (readsBefore: number) => {
    await waitFor("profile reread", async () =>
      (await myPageHits()) >= readsBefore + 2 ? true : undefined,
    );
    await Bun.sleep(300);
  };
  const changeTitleInTheWindow = async (typed: string, id: number, rereads = true) => {
    const readsBefore = await myPageHits();
    await pickTitle(typed, id);
    await saveSection("title");
    if (rereads) {
      await rereadDone(readsBefore);
    }
    return outcomeOf("title");
  };
  /** Sets the value the way a paste does, past the field's own length limit. */
  const typeName = (name: string) =>
    page.evaluate(
      `(() => { const input = document.querySelector("#name-input"); input.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, ${JSON.stringify(name)}); input.dispatchEvent(new Event("input", { bubbles: true })); })()`,
    );
  const nameSavable = () =>
    waitFor("name save enabled", async () =>
      (await disabledOf("#name-save")) === false ? true : undefined,
    );
  const changeNameInTheWindow = async (name: string) => {
    await typeName(name);
    await nameSavable();
    await saveSection("name");
    return outcomeOf("name");
  };
  const bridgeTitle = (
    target = { id: 102, title: titleOf(102).label },
    expected = { title: INITIAL_PROFILE.title },
  ) =>
    page.evaluate<{ kind: string; [key: string]: unknown }>(
      `window.abth.changeTitle(${JSON.stringify({ expected, target })})`,
    );
  const bridgeName = (target: string, expected = INITIAL_PROFILE.nickname) =>
    page.evaluate<{ kind: string; [key: string]: unknown }>(
      `window.abth.changeName(${JSON.stringify({ expected: { nickname: expected }, target: { nickname: target } })})`,
    );

  return {
    stepIn,
    inSection,
    outcomeOf,
    disabledOf,
    inputValueOf,
    titleListIn,
    readTitlesAgain,
    ARROW_DOWN,
    popupOpened,
    popupClosed,
    titlesRead,
    listed,
    idShownIn,
    pickTitle,
    saveSection,
    rereadDone,
    changeTitleInTheWindow,
    typeName,
    nameSavable,
    changeNameInTheWindow,
    bridgeTitle,
    bridgeName,
  };
}
