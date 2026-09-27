/**
 * Drives the unpackaged desktop app through sign-in, the read, reading again, a rotated session,
 * every どんメダル state, a dan-less, title-less, region-less my page, a set favourite song and a
 * filled favourites folder, a lost session, cancel, a sign-in sent off both sites, a reopen that
 * keeps the session, sign-out, and a reopen that stays signed out, against scripts/mock-hiroba.ts,
 * over the Chrome DevTools Protocol. It counts the reads the mock saw, then searches the app's
 * user-data folder for every token the mock issued and for what the mock ID host left behind. Run
 * `bun run build` first.
 */
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import electronPath from "electron";

const root = join(import.meta.dir, "..");
const HIROBA = "http://hiroba.127.0.0.1.sslip.io:8807";
const CDP_PORT = 9333;
const IDP_HOST = "id.127.0.0.1.sslip.io:8808";
const IDP_MARKER = "abth-mock-idp-marker";
const MY_PAGE = "/mypage_top.php";
const USER_DATA = join(root, "out", "e2e-user-data");
rmSync(USER_DATA, { recursive: true, force: true });

const results: Record<string, unknown> = {};

// One override alone must stop the app before it opens a window.
const halfSet = Bun.spawn([String(electronPath), root], {
  env: { ...process.env, ABTH_DEV_HIROBA_ORIGIN: HIROBA, ABTH_DEV_USER_DATA: USER_DATA },
  stdout: "ignore",
  stderr: "ignore",
});
results.halfOverrideRefused = (await Promise.race([halfSet.exited, Bun.sleep(15_000)])) === 1;
halfSet.kill();
rmSync(USER_DATA, { recursive: true, force: true });

const mock = Bun.spawn(["bun", join(root, "scripts", "mock-hiroba.ts")], { stdout: "ignore" });
await Bun.sleep(500);
results.uaGateActive = (await (await fetch(`${HIROBA}${MY_PAGE}`)).text()).includes(
  "recommended browsers",
);
await fetch(`${HIROBA}/__hits-reset`);

const tokens: string[] = [];
const myPageHits = async () =>
  Number(await (await fetch(`${HIROBA}/__hits?path=${MY_PAGE}`)).text());
const SESSION_FILE = join(USER_DATA, "session.json");

let running = await launch();
try {
  const { page, text, textOf, click, clickButton, until } = running;
  await until("Sign in to Hiroba");

  results.surface = await page.evaluate(
    `({ bridge: Object.keys(window.abth ?? {}), require: typeof require, process: typeof process, cookie: document.cookie })`,
  );

  await click("#sign-in");
  await until("サンプルどん");
  tokens.push(await (await fetch(`${HIROBA}/__last-token`)).text());
  results.profileShown = (await textOf("#crowns-silver")) === "11";
  // What the panel card adds up from the mock's fixed counts: crowns 11, 2 and 1, and ranks 8 down
  // to 2 at 3, 12, 25, 31, 18, 9 and 4. Each total's id names the ranks it adds up.
  const panelTotals: Record<string, string> = {
    "#crowns-cleared": "14",
    "#crowns-full-combo": "3",
    "#ranks-total-2-3-4": "31",
    "#ranks-total-5-6-7": "68",
    "#ranks-total-8": "3",
    "#ranks-total-5-6-7-8": "71",
    "#panel-level": "panel 5",
  };
  const shownTotals: Record<string, string | null> = {};
  for (const selector of Object.keys(panelTotals)) {
    shownTotals[selector] = await textOf(selector);
  }
  results.panelTotalsShown =
    JSON.stringify(shownTotals) === JSON.stringify(panelTotals) &&
    (await page.evaluate<string | null>(
      `document.querySelector("#ranks-total-5-6-7-8")?.previousElementSibling?.textContent ?? null`,
    )) === "雅 tier or better";
  // The crowns cover the panel's charts only, so they sit under its heading and footnote with the
  // ranks, not in a card of their own that reads as every chart the account has cleared.
  results.crownsUnderPanelNote =
    (await textOf("#panel h2")) === "Hiroba's overall panel" &&
    (await page.evaluate<boolean>(
      `["#crowns", "#ranks", "#panel-footnote"].every((part) => document.querySelector("#panel " + part) !== null)`,
    ));
  const rendered = await page.evaluate<string>("document.documentElement.outerHTML");
  results.tokenInRendererDom = rendered.includes(tokens[0] ?? "?");
  // The mock's dan label URL carries a taiko number, as Hiroba's does: only "a dan is shown" may
  // reach the window, never the URL or the number.
  results.taikoNoAndUrlsKeptOutOfDom =
    (await textOf("#dan-shown")) === "Dan shown" &&
    !rendered.includes("000000000000") &&
    !rendered.includes("imgsrc");
  results.readsAfterSignIn = await myPageHits();

  // Read again: one more request, no more.
  await click("#read-again");
  await until("Read at");
  await Bun.sleep(300);
  results.readsAfterReadAgain = await myPageHits();

  // Hiroba hands out a new token on a redirect hop and ends the old one: the next read must still
  // work, and so must the one after it, which only the new token can pass.
  await fetch(`${HIROBA}/__rotate`);
  await click("#read-again");
  await Bun.sleep(500);
  await until("Read at");
  tokens.push(await (await fetch(`${HIROBA}/__last-token`)).text());
  await click("#read-again");
  await Bun.sleep(500);
  await until("Read at");
  results.rotationTakenUp =
    tokens[1] !== tokens[0] &&
    (await textOf("#crowns-silver")) === "11" &&
    !(await text()).includes("ended");

  // Every shape my page can take is a normal state: each renders in its place with the rest of
  // the page around it, and each read is one request. The mock starts on a count, read above.
  const readShowing = async (selector: string) => {
    const before = await myPageHits();
    await click("#read-again");
    await waitFor(async () => ((await textOf(selector)) === null ? undefined : true));
    await Bun.sleep(300);
    return (await myPageHits()) - before;
  };
  const requestsPerRead: number[] = [];
  await fetch(`${HIROBA}/__medal?state=complete`);
  requestsPerRead.push(await readShowing("#medal-complete"));
  results.medalCompleteShown =
    (await textOf("#medal-complete")) === "COMPLETE" && (await textOf("#medal-count")) === null;
  await fetch(`${HIROBA}/__medal?state=odd`);
  requestsPerRead.push(await readShowing("#medal-code"));
  results.medalOddShownWithTheRest =
    (await textOf("#medal-code")) === "Code for a report: medal=noCountNoComplete" &&
    (await textOf("#crowns-silver")) === "11" &&
    (await textOf("#rank-8")) === "3" &&
    !(await text()).includes("did not expect");
  await fetch(`${HIROBA}/__medal?state=none`);
  requestsPerRead.push(await readShowing("#medal-none"));
  results.medalNoneShown = (await textOf("#medal-name")) === null;
  await fetch(`${HIROBA}/__medal?state=collecting`);
  await fetch(`${HIROBA}/__variant?dan=0&title=empty&region=unset`);
  requestsPerRead.push(await readShowing("#no-title"));
  results.medalCountShown = (await textOf("#medal-count")) === "Medals: 12";
  results.danLessRowRead =
    (await text()).includes("サンプルどん") && (await textOf("#dan-shown")) === null;
  results.unsetRegionLeftOut = (await textOf("#region")) === null;
  // Unset so far: no favourite song and an empty folder. Set, the song shows by title and the
  // folder, closed at first, opens on request with every song in it, the two that share a title
  // included.
  results.favoritesUnsetShown =
    (await textOf("#favorite-song")) === "Favourite song: none" &&
    (await textOf("#favorite-folder-empty")) !== null;
  await fetch(`${HIROBA}/__variant?favorites=set`);
  requestsPerRead.push(await readShowing("#favorite-folder"));
  const folderSummary = "#favorite-folder .MuiAccordionSummary-root";
  const folderOpen = () =>
    page.evaluate<string | null>(
      `document.querySelector(${JSON.stringify(folderSummary)})?.getAttribute("aria-expanded") ?? null`,
    );
  const closedAtFirst = (await folderOpen()) === "false";
  await click(folderSummary);
  await waitFor(async () => ((await folderOpen()) === "true" ? true : undefined));
  const folderRows = await page.evaluate<string[]>(
    `[...document.querySelectorAll("#favorite-folder li")].map((row) => row.textContent)`,
  );
  results.favoritesSetShown =
    (await textOf("#favorite-song")) === "Favourite song: サンプル曲アルファ" &&
    (await textOf(folderSummary)) === "Favourites folder (3)" &&
    (await textOf("#favorite-folder-empty")) === null &&
    closedAtFirst &&
    JSON.stringify(folderRows) ===
      JSON.stringify(["サンプル曲ベータ", "サンプル曲ガンマ", "サンプル曲ベータ"]);
  results.oneRequestPerRead = requestsPerRead.every((count) => count === 1);
  await fetch(`${HIROBA}/__variant?dan=1&title=set&region=set&favorites=unset`);

  await fetch(`${HIROBA}/__expire`);
  await click("#read-again");
  await until("Your Hiroba session has ended");
  results.lostSessionHandled = true;

  await click("#sign-in");
  await Bun.sleep(300);
  await clickButton("Cancel sign-in");
  await until("Sign-in was cancelled.");
  results.cancelHandled = true;

  // Sent off both sites: the attempt ends and names the host, instead of sitting there silently.
  await fetch(`${HIROBA}/__offsite?on=1`);
  await click("#sign-in");
  await until("offsite.127.0.0.1.sslip.io:8808, which this app does not open");
  await fetch(`${HIROBA}/__offsite?on=0`);
  results.refusalNamed = true;

  await click("#sign-in");
  await until("サンプルどん");
  const kept = (await (await fetch(`${HIROBA}/__last-token`)).text()).trim();
  tokens.push(kept);
  // Kept on disk for the next launch: the user chose staying signed in over a memory-only session.
  results.sessionKept =
    existsSync(SESSION_FILE) && readFileSync(SESSION_FILE, "utf8").includes(kept);

  // Reopened, the app is still signed in and reads once, by itself.
  const readsBeforeReopen = await myPageHits();
  await stop(running);
  running = await launch();
  await running.until("サンプルどん");
  results.signedInAfterReopen = true;
  results.readsOnReopen = (await myPageHits()) - readsBeforeReopen;

  await running.click("#sign-out");
  await running.until("Sign in to Hiroba");
  results.signOutHandled = !existsSync(SESSION_FILE);

  // Reopened after signing out, it stays signed out and asks Hiroba nothing.
  const readsBeforeSecondReopen = await myPageHits();
  await stop(running);
  running = await launch();
  await running.until("Sign in to Hiroba");
  await Bun.sleep(500);
  results.signedOutAfterReopen = (await myPageHits()) === readsBeforeSecondReopen;
} finally {
  await stop(running);
  mock.kill();
}

/** Starts the app on the stand-in and attaches to its window over the DevTools protocol. */
async function launch() {
  const proc = Bun.spawn([String(electronPath), root, `--remote-debugging-port=${CDP_PORT}`], {
    env: {
      ...process.env,
      ABTH_DEV_HIROBA_ORIGIN: HIROBA,
      ABTH_DEV_IDP_HOST: IDP_HOST,
      ABTH_DEV_USER_DATA: USER_DATA,
    },
    stdout: "ignore",
    stderr: "ignore",
  });
  const target = await waitFor(async () => {
    const list = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()) as {
      url: string;
      webSocketDebuggerUrl: string;
    }[];
    return list.find((t) => t.url.startsWith("app://gui/"));
  });
  const page = await connect(target.webSocketDebuggerUrl);
  const text = () => page.evaluate<string>("document.body.textContent");
  /** One element's text, or null when nothing on the page matches the selector. */
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
    waitFor(async () => (await text()).includes(needle) || undefined);
  return { proc, page, text, textOf, click, clickButton, until };
}

/**
 * Closes the app the way a user does, through the browser's own close, so it shuts down and saves
 * its state; only an app that has not gone after ten seconds is killed.
 */
async function stop(app: { proc: ReturnType<typeof Bun.spawn> }) {
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

const hits: string[] = [];
for (const file of walk(USER_DATA)) {
  const bytes = readFileSync(file).toString("latin1");
  if (
    tokens.some((t) => t !== "" && bytes.includes(t)) ||
    bytes.includes("_token_v2") ||
    bytes.includes(IDP_MARKER) ||
    bytes.includes("abth_mock_idp")
  ) {
    hits.push(file.slice(USER_DATA.length));
  }
}
results.userDataHits = hits;
results.partitionsFolder = readdirSync(USER_DATA).includes("Partitions");
console.log(JSON.stringify(results, null, 2));

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      yield* walk(path);
    } else {
      yield path;
    }
  }
}

async function waitFor<T>(probe: () => Promise<T | undefined>, timeoutMs = 30_000): Promise<T> {
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
  throw new Error(`Timed out after ${timeoutMs} ms`);
}

async function connect(url: string) {
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
  return {
    evaluate<T = unknown>(expression: string): Promise<T> {
      const id = nextId++;
      socket.send(
        JSON.stringify({
          id,
          method: "Runtime.evaluate",
          params: { expression, returnByValue: true },
        }),
      );
      return new Promise((resolve) => waiting.set(id, resolve as (value: unknown) => void));
    },
  };
}
