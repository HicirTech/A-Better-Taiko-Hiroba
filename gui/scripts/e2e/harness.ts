/** Talks to the app over the DevTools Protocol, and waits for what its page shows. */

import { MD_WIDTH_PX, PAGE_SIZE } from "./config";

export const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

/** A PNG's base64 can spell a searched string by chance; only its bytes are left out. */
export const withoutPictureBytes = (html: string) =>
  html.replace(/data:image\/png;base64,[A-Za-z0-9+/]*={0,2}/g, "data:image/png;base64,");

export type Page = Awaited<ReturnType<typeof connect>>;

/** Holds the page at `PAGE_SIZE`, whatever size its window has. */
export const holdOwnSize = (page: Page) =>
  page.send("Emulation.setDeviceMetricsOverride", {
    ...PAGE_SIZE,
    deviceScaleFactor: 0,
    mobile: false,
  });

const KEYS = {
  Enter: { code: "Enter", windowsVirtualKeyCode: 13, text: "\r" },
  Escape: { code: "Escape", windowsVirtualKeyCode: 27 },
  Tab: { code: "Tab", windowsVirtualKeyCode: 9 },
  ArrowLeft: { code: "ArrowLeft", windowsVirtualKeyCode: 37 },
  ArrowRight: { code: "ArrowRight", windowsVirtualKeyCode: 39 },
  ArrowDown: { code: "ArrowDown", windowsVirtualKeyCode: 40 },
  " ": { code: "Space", windowsVirtualKeyCode: 32, text: " " },
} as const;
export const SHIFT_MODIFIER = 8;

export const SPACE = { key: " ", code: "Space", windowsVirtualKeyCode: 32 };

export type Box = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type Point = { x: number; y: number };

/** A pull that starts 40 px inside `box`, and the points it is pulled to. */
export const pullAt = (box: Box) => {
  const pullFrom = { x: box.left + box.width / 2, y: box.top + 40 };
  const pulledBy = (dx: number, dy: number) => ({ x: pullFrom.x + dx, y: pullFrom.y + dy });
  return { pullFrom, pulledBy };
};

export async function hoverOver(page: Page, selector: string): Promise<void> {
  const middle = await middleOf(page, selector);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...middle });
}

export function middleOf(page: Page, selector: string): Promise<{ x: number; y: number }> {
  return page.evaluate<{ x: number; y: number }>(
    `(() => { const box = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: box.left + box.width / 2, y: box.top + box.height / 2 }; })()`,
  );
}

/** The section that is running, named by a wait that times out. */
let runningSection = "";
export const setSection = (name: string) => {
  runningSection = name;
};

/** A hidden window asks for no picture: fail at once rather than at the wait's timeout. */
export async function waitForSeen<T>(
  label: string,
  page: { evaluate<V>(expression: string): Promise<V> },
  probe: () => Promise<T | undefined>,
): Promise<T> {
  const visibility = await page.evaluate<string>("document.visibilityState");
  if (visibility !== "visible") {
    throw new Error(
      `The window is ${visibility}: it asks for no picture until it is seen. A minimised window hides it; a covered one does not`,
    );
  }
  return waitFor(label, probe);
}

export async function waitFor<T>(
  label: string,
  probe: () => Promise<T | undefined>,
  timeoutMs = 30_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const value = await probe();
      if (value !== undefined) {
        return value;
      }
    } catch {
      // Not up yet.
    }
    await Bun.sleep(200);
  }
  throw new Error(
    `Timed out after ${timeoutMs} ms waiting for "${label}" in section ${runningSection}`,
  );
}

export async function connect(url: string) {
  const socket = new WebSocket(url);
  await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
  let nextId = 1;
  const waiting = new Map<number, (value: unknown) => void>();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as {
      id?: number;
      result?: { result?: { value?: unknown } };
    };
    if (message.id !== undefined) {
      waiting.get(message.id)?.(message.result?.result?.value);
      waiting.delete(message.id);
    }
  });
  const send = <T = unknown>(method: string, params: Record<string, unknown>): Promise<T> => {
    const id = nextId++;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve) => waiting.set(id, resolve as (value: unknown) => void));
  };
  return {
    send,
    evaluate<T = unknown>(expression: string): Promise<T> {
      return send<T>("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    },
  };
}

export function pageHelpers(page: Page) {
  const exists = (selector: string) =>
    page.evaluate<boolean>(`document.querySelector(${JSON.stringify(selector)}) !== null`);
  const attribute = (selector: string, name: string) =>
    page.evaluate<string | null>(
      `document.querySelector(${JSON.stringify(selector)})?.getAttribute(${JSON.stringify(name)}) ?? null`,
    );

  const press = async (key: keyof typeof KEYS, modifiers = 0) => {
    await page.send("Input.dispatchKeyEvent", { type: "keyDown", key, modifiers, ...KEYS[key] });
    await page.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key,
      code: KEYS[key].code,
      modifiers,
    });
  };
  const menuOpened = async () => {
    await page.evaluate(`document.querySelector("#nav-menu").focus()`);
    await press("Enter");
    return waitFor("drawer open", async () => (await exists("#nav-favorites")) || undefined);
  };
  const menuClosed = () =>
    waitFor("drawer closed", async () => ((await exists("#nav-overview")) ? undefined : true));

  const allOf = (selector: string, property: "textContent" | "title" | "ariaLabel") =>
    page.evaluate<string[]>(
      `[...document.querySelectorAll(${JSON.stringify(selector)})].map((part) => part.${property})`,
    );

  const boxOf = (selector: string) =>
    page.evaluate<Box>(
      `(() => { const box = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height }; })()`,
    );

  /** Runs `run` in a window of this size, and gives the page its own size back. */
  const atSize = async <T>(width: number, height: number, run: () => Promise<T>): Promise<T> => {
    await page.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 0,
      mobile: false,
    });
    const sideBySide = width >= MD_WIDTH_PX;
    // Signed out, the window has no navigation: the sign-in card is what has settled.
    const shellReady = async (wide: boolean) => {
      if (await exists("#sign-in")) {
        return !(await exists("nav"));
      }
      return await exists(wide ? "#nav-overview" : "#nav-menu");
    };
    try {
      await waitFor(`window ${width}px wide`, async () =>
        (await page.evaluate<number>("innerWidth")) === width && (await shellReady(sideBySide))
          ? true
          : undefined,
      );
      return await run();
    } finally {
      await holdOwnSize(page);
      const ownWide = PAGE_SIZE.width >= MD_WIDTH_PX;
      await waitFor("own window size", async () =>
        (await page.evaluate<number>("innerWidth")) === PAGE_SIZE.width &&
        (await shellReady(ownWide))
          ? true
          : undefined,
      );
    }
  };

  const column = () => boxOf("main .MuiContainer-root");
  type Column = Awaited<ReturnType<typeof column>>;
  const sameColumn = (one: Column, other: Column) =>
    Math.abs(one.left - other.left) < 1 && Math.abs(one.right - other.right) < 1;

  const tooltipClosed = () =>
    waitFor("tooltip closed", async () => ((await exists('[role="tooltip"]')) ? undefined : true));

  const fabState = () =>
    page.evaluate<{ shut: boolean; spinning: boolean }>(
      `(() => { const fab = document.querySelector("#read-again"); return { shut: fab.disabled, spinning: fab.querySelector(".MuiCircularProgress-root") !== null }; })()`,
    );

  const swipe = async (from: Point, to: Point, whileDown?: () => Promise<unknown>) => {
    const STEPS = 12;
    await page.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
    for (let step = 1; step <= STEPS; step++) {
      const at = (start: number, end: number) => start + ((end - start) * step) / STEPS;
      await page.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: at(from.x, to.x), y: at(from.y, to.y) }],
      });
    }
    const seen = await whileDown?.();
    await page.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    return seen;
  };

  const pullIndicator = () =>
    page.evaluate<{ shown: boolean; ring: string | null }>(
      `(() => { const indicator = document.querySelector("#pull-indicator"); return { shown: indicator !== null && getComputedStyle(indicator).opacity === "1", ring: indicator?.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow") ?? null }; })()`,
    );
  const touchEmulated = async (enabled: boolean) => {
    await page.send("Emulation.setTouchEmulationEnabled", { enabled, maxTouchPoints: 5 });
    await waitFor(
      `touch emulation ${enabled ? "on" : "off"}`,
      async () =>
        (await page.evaluate<boolean>(`matchMedia("(pointer: coarse)").matches`)) === enabled ||
        undefined,
    );
    // The window redraws for the pointer it now has before anything is asked of it.
    await page.evaluate(
      "new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))",
    );
  };

  /** Starts `window.touchClicks` afresh: the pointer type of each click from now on. */
  const recordClicks = () =>
    page.evaluate(
      `(() => { if (window.touchClicks === undefined) document.addEventListener("click", (event) => window.touchClicks.push(event.pointerType), true); window.touchClicks = []; })()`,
    );
  const touchClicks = () => page.evaluate<string[]>("window.touchClicks");
  /** Starts `window.touchMoves` afresh: how many touch moves the page hears from now on. */
  const countTouchMoves = () =>
    page.evaluate(
      `(() => { if (window.touchMoves === undefined) document.addEventListener("touchmove", () => { window.touchMoves += 1; }, true); window.touchMoves = 0; })()`,
    );
  const touchMoves = () => page.evaluate<number>("window.touchMoves");

  // A long list keeps only the rows near the window in the page: the window walks it to see more.
  // What a list scrolls in: the page, or the element `scroller` names, such as a dialog's body.
  const scrolling = (scroller?: string) =>
    `const box = ${scroller === undefined ? "null" : `document.querySelector(${JSON.stringify(scroller)})`};
      const at = () => (box === null ? scrollY : box.scrollTop);
      const to = (top) => (box === null ? scrollTo(0, top) : box.scrollTo(0, top));
      const onward = () => (box === null ? scrollBy(0, innerHeight) : box.scrollBy(0, box.clientHeight));`;
  /** Every row of a long list, read by `read`; its scroll walks it from the top and back. */
  const listRows = <T>(list: string, read: string, scroller?: string) =>
    page.evaluate<T[]>(`(async () => {
      const frame = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      const read = ${read};
      ${scrolling(scroller)}
      const from = at();
      const seen = new Map();
      to(0);
      await frame();
      for (;;) {
        for (const row of document.querySelectorAll(${JSON.stringify(`${list} > li`)})) seen.set(Number(row.dataset.index), read(row));
        const before = at();
        onward();
        await frame();
        if (at() === before) break;
      }
      to(from);
      await frame();
      return [...seen].sort(([one], [other]) => one - other).map(([, value]) => value);
    })()`);
  /** The selector of the long list's row that `matches`, walked to and put mid-window. */
  const rowInView = async (list: string, matches: string, scroller?: string) => {
    const index = await page.evaluate<number | null>(`(async () => {
      const frame = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      const matches = ${matches};
      ${scrolling(scroller)}
      const found = () => [...document.querySelectorAll(${JSON.stringify(`${list} > li`)})].find(matches);
      let row = found();
      if (row === undefined) {
        to(0);
        await frame();
        row = found();
      }
      while (row === undefined) {
        const before = at();
        onward();
        await frame();
        if (at() === before) return null;
        row = found();
      }
      row.scrollIntoView({ block: "center" });
      await frame();
      return Number(row.dataset.index);
    })()`);
    if (index === null) {
      throw new Error(`No row of ${list} matches ${matches}`);
    }
    return `${list} > li[data-index="${index}"]`;
  };

  /** Waits until a modal's panel has slid in, as a finger can touch only what is there. */
  const inPlace = (modal: string) =>
    waitFor(
      `${modal} in place`,
      async () =>
        (await page.evaluate<boolean>(
          `document.querySelector(${JSON.stringify(`${modal} [role="dialog"]`)})?.getAnimations().length === 0`,
        )) || undefined,
    );

  // A real press: an SVG has no click(), and a chip's × is one.
  const mousePress = async (selector: string, button: "left" | "right", heldMs = 0) => {
    await page.evaluate(
      `document.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: "center" })`,
    );
    await Bun.sleep(300);
    const at = await middleOf(page, selector);
    await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...at });
    await page.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      ...at,
      button,
      clickCount: 1,
    });
    await Bun.sleep(heldMs);
    await page.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      ...at,
      button,
      clickCount: 1,
    });
  };

  return {
    exists,
    attribute,
    press,
    menuOpened,
    menuClosed,
    allOf,
    boxOf,
    atSize,
    column,
    sameColumn,
    tooltipClosed,
    fabState,
    swipe,
    pullIndicator,
    touchEmulated,
    recordClicks,
    touchClicks,
    countTouchMoves,
    touchMoves,
    listRows,
    rowInView,
    inPlace,
    mousePress,
  };
}
