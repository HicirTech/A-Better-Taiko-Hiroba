/** Starts the desktop app under test, and closes it. */

import electronPath from "electron";
import { TIPS } from "../../src/pages/page-tips";
import { SEEN_TIPS_KEY } from "../../src/shared/tips/seen-tips";
import { ABTH_CDN_PATH } from "../mock-abth-cdn";
import { ESE_CHARTS_PATH, ESE_MAPPING_PATH } from "../mock-ese";
import {
  CDP_PORT,
  HIROBA,
  IDP_HOST,
  IMG,
  PICTURES,
  RATING_DATA,
  RATING_DATA_V2,
  REFUSING_HOST,
  root,
  USER_DATA,
} from "./config";
import { connect, holdOwnSize, waitFor } from "./harness";

let windowsShown = false;

/** Opens the app's windows on screen, for a person watching the run, instead of off every display. */
export function showWindows(): void {
  windowsShown = true;
}

export async function launch({
  now,
  lang = "en-US",
  userData = USER_DATA,
  env = {},
}: {
  now: string;
  lang?: string;
  userData?: string;
  env?: Record<string, string>;
}) {
  const args = [
    `--remote-debugging-port=${CDP_PORT}`,
    // A covered window counts as hidden on Windows, and a hidden page asks for no pictures.
    "--disable-backgrounding-occluded-windows",
    `--lang=${lang}`,
  ];
  // The flag that once opened writes is dropped from the environment: every check runs with none.
  const { ABTH_UNVERIFIED_WRITES: _gone, ...inherited } = process.env;
  const proc = Bun.spawn([String(electronPath), root, ...args], {
    env: {
      ...inherited,
      ABTH_DEV_HIROBA_ORIGIN: HIROBA,
      ABTH_DEV_IDP_HOST: IDP_HOST,
      ABTH_DEV_IMG_ORIGIN: IMG,
      ABTH_DEV_REFUSING_HOST: REFUSING_HOST,
      ABTH_DEV_USER_DATA: userData,
      ABTH_DEV_NOW: now,
      ABTH_DEV_SONG_CATALOGUE: `${HIROBA}/__song-catalogue`,
      ABTH_DEV_RATING_DATA: `${HIROBA}${RATING_DATA}`,
      ABTH_DEV_RATING_DATA_V2: `${HIROBA}${RATING_DATA_V2}`,
      ABTH_DEV_ESE_MAPPING: `${HIROBA}${ESE_MAPPING_PATH}`,
      ABTH_DEV_ESE_CHARTS: `${HIROBA}${ESE_CHARTS_PATH}`,
      ABTH_DEV_ABTH_CDN: `${HIROBA}${ABTH_CDN_PATH}`,
      ABTH_DEV_CHINESE_NAMES: `${HIROBA}/__chinese-names`,
      ABTH_DEV_CHART_ORIGIN: HIROBA,
      ABTH_DEV_PICTURES_FOLDER: PICTURES,
      ABTH_DEBUG_SAVE_READS: "1",
      ...(windowsShown ? {} : { ABTH_DEV_OFF_SCREEN: "1" }),
      ...env,
    },
    stdout: "ignore",
    stderr: "ignore",
  });
  const target = await waitFor("app window", async () => {
    const list = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()) as {
      url: string;
      webSocketDebuggerUrl: string;
    }[];
    return list.find((t) => t.url.startsWith("app://gui/"));
  });
  const page = await connect(target.webSocketDebuggerUrl);
  await holdOwnSize(page);
  // A fresh install tells each page's tips over it: they are seen here, and the tips section
  // asks for them.
  await page.evaluate(
    `localStorage.setItem(${JSON.stringify(SEEN_TIPS_KEY)}, ${JSON.stringify(JSON.stringify(TIPS.map(({ id }) => id)))})`,
  );
  const text = () => page.evaluate<string>("document.body.textContent");
  const textOf = (selector: string) =>
    page.evaluate<string | null>(
      `document.querySelector(${JSON.stringify(selector)})?.textContent ?? null`,
    );
  const click = (selector: string) =>
    page.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const clickButton = (label: string) =>
    page.evaluate(
      `[...document.querySelectorAll("button")].find((b) => b.textContent.trim() === ${JSON.stringify(label)}).click()`,
    );
  const until = (needle: string) =>
    waitFor(`text ${needle}`, async () => (await text()).includes(needle) || undefined);
  const currentPage = () =>
    page.evaluate<string | null>(
      `document.querySelector('[aria-current="page"]')?.id.replace("nav-", "") ?? null`,
    );
  const goTo = async (
    to:
      | "overview"
      | "scores"
      | "rating"
      | "knowYourself"
      | "costume"
      | "nameTitle"
      | "favorites"
      | "settings",
  ) => {
    await click(`#nav-${to}`);
    await waitFor(`page ${to}`, async () => (await currentPage()) === to || undefined).catch(
      async (error: Error) => {
        const shown = await page.evaluate<string>(
          `JSON.stringify({ page: document.querySelector('[aria-current="page"]')?.id ?? null, nav: document.querySelector("#nav-${to}") !== null, signIn: document.querySelector("#sign-in") !== null, size: innerWidth + "x" + innerHeight, seen: document.visibilityState })`,
        );
        throw new Error(`${error.message}; the window shows ${shown}`);
      },
    );
  };
  return { proc, page, text, textOf, click, clickButton, until, currentPage, goTo };
}

/** Closes through the browser's own close so the app saves its state; kills it after 10 s. */
export async function stop(app: { proc: ReturnType<typeof Bun.spawn> }) {
  try {
    const version = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json()) as {
      webSocketDebuggerUrl: string;
    };
    const browser = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((resolve) => browser.addEventListener("open", resolve, { once: true }));
    browser.send(JSON.stringify({ id: 1, method: "Browser.close" }));
  } catch {
    // Already gone, or never came up: the kill below settles it.
  }
  const exited = await Promise.race([
    app.proc.exited.then(() => true),
    Bun.sleep(10_000).then(() => false),
  ]);
  if (!exited) {
    app.proc.kill();
    await app.proc.exited;
  }
}

export type App = Awaited<ReturnType<typeof launch>>;
