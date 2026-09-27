/**
 * Drives the unpackaged desktop app through sign-in, the read, reading again, a rotated session, a
 * lost session, cancel, a sign-in sent off both sites, and sign-out against scripts/mock-hiroba.ts,
 * over the Chrome DevTools
 * Protocol. It counts the reads the mock saw, then searches the app's user-data folder for every
 * token the mock issued and for what the mock ID host left behind. Run `bun run build` first.
 */
import { readdirSync, readFileSync, rmSync, statSync } from "node:fs";
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
const app = Bun.spawn([String(electronPath), root, `--remote-debugging-port=${CDP_PORT}`], {
  env: {
    ...process.env,
    ABTH_DEV_HIROBA_ORIGIN: HIROBA,
    ABTH_DEV_IDP_HOST: IDP_HOST,
    ABTH_DEV_USER_DATA: USER_DATA,
  },
  stdout: "ignore",
  stderr: "ignore",
});

const tokens: string[] = [];
const myPageHits = async () =>
  Number(await (await fetch(`${HIROBA}/__hits?path=${MY_PAGE}`)).text());
try {
  const target = await waitFor(async () => {
    const list = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()) as {
      url: string;
      webSocketDebuggerUrl: string;
    }[];
    return list.find((t) => t.url.startsWith("app://gui/"));
  });
  const page = await connect(target.webSocketDebuggerUrl);
  const text = () => page.evaluate<string>("document.body.textContent");
  const click = (selector: string) =>
    page.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const clickButton = (label: string) =>
    page.evaluate(
      `[...document.querySelectorAll("button")].find((b) => b.textContent.trim() === ${JSON.stringify(label)}).click()`,
    );
  const until = (needle: string) =>
    waitFor(async () => (await text()).includes(needle) || undefined);
  await until("Sign in to Hiroba");

  results.surface = await page.evaluate(
    `({ bridge: Object.keys(window.abth ?? {}), require: typeof require, process: typeof process, cookie: document.cookie })`,
  );

  await click("#sign-in");
  await until("サンプルどん");
  tokens.push(await (await fetch(`${HIROBA}/__last-token`)).text());
  results.profileShown = (await text()).includes("Silver 11");
  results.tokenInRendererDom = (
    await page.evaluate<string>("document.documentElement.outerHTML")
  ).includes(tokens[0] ?? "?");
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
    (await text()).includes("Silver 11") &&
    !(await text()).includes("ended");

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
  tokens.push(await (await fetch(`${HIROBA}/__last-token`)).text());
  await click("#sign-out");
  await until("Sign in to Hiroba");
  results.signOutHandled = true;
} finally {
  app.kill();
  await app.exited;
  mock.kill();
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
