/** Talks to the app over the DevTools Protocol, and waits for what its page shows. */

import { MD_WIDTH_PX } from "./config";

export const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

/** A PNG's base64 can spell a searched string by chance; only its bytes are left out. */
export const withoutPictureBytes = (html: string) =>
  html.replace(/data:image\/png;base64,[A-Za-z0-9+/]*={0,2}/g, "data:image/png;base64,");

export type Page = Awaited<ReturnType<typeof connect>>;

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
    throw new Error(`The window is ${visibility}: it asks for no picture until it is seen`);
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

  /** Runs `run` in a window of this size, and gives the window its own size back. */
  const atSize = async <T>(width: number, height: number, run: () => Promise<T>): Promise<T> => {
    const ownWidth = await page.evaluate<number>("innerWidth");
    await page.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 0,
      mobile: false,
    });
    const sideBySide = width >= MD_WIDTH_PX;
    try {
      await waitFor(`window ${width}px wide`, async () =>
        (await page.evaluate<number>("innerWidth")) === width &&
        (await exists(sideBySide ? "#nav-overview" : "#nav-menu"))
          ? true
          : undefined,
      );
      return await run();
    } finally {
      await page.send("Emulation.clearDeviceMetricsOverride", {});
      await waitFor("own window size", async () =>
        (await page.evaluate<number>("innerWidth")) === ownWidth && (await exists("#nav-overview"))
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
  const fabWidth = async () => (await boxOf("#read-again")).width;
  const touchEmulated = async (enabled: boolean) => {
    await page.send("Emulation.setTouchEmulationEnabled", { enabled, maxTouchPoints: 5 });
    await waitFor(
      `touch emulation ${enabled ? "on" : "off"}`,
      async () => (await fabWidth()) <= 1 === enabled || undefined,
    );
  };

  const touchClicks = () => page.evaluate<string[]>("window.touchClicks");

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
    fabWidth,
    touchEmulated,
    touchClicks,
  };
}
