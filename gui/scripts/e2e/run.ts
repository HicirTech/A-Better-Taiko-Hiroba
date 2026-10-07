/** Drives the unpackaged desktop app against the stand-in over the Chrome DevTools Protocol. */
import { rmSync } from "node:fs";
import { join } from "node:path";
import electronPath from "electron";

import { type App, launch, stop } from "./app";
import { HIROBA, MY_PAGE, NOON_JST, root, USER_DATA } from "./config";
import { type Ctx, newShared, type Phase, type Section } from "./context";
import { setSection, withoutPictureBytes } from "./harness";
import { SECTIONS } from "./sections";

const USAGE = `Usage: bun scripts/e2e/run.ts [--no-build] [--only <section,...>]
Sections: ${SECTIONS.map((section) => section.name).join(", ")}`;

function fail(message: string): never {
  console.error(`${message}\n${USAGE}`);
  process.exit(2);
}

function parseArgs(argv: string[]) {
  let build = true;
  let only: string[] | undefined;
  for (let at = 0; at < argv.length; at++) {
    const arg = argv[at];
    if (arg === "--no-build") {
      build = false;
    } else if (arg === "--only") {
      only = (argv[++at] ?? "").split(",").filter((name) => name !== "");
    } else {
      fail(`Unknown argument: ${arg}`);
    }
  }
  const unknown = (only ?? []).filter((name) => !SECTIONS.some((section) => section.name === name));
  if (unknown.length > 0 || only?.length === 0) {
    fail(`Unknown section: ${unknown.join(", ") || "(none given)"}`);
  }
  return { build, only };
}

const { build, only } = parseArgs(process.argv.slice(2));
const selected = SECTIONS.filter((section) => only === undefined || only.includes(section.name));

if (build) {
  const built = Bun.spawn(["bun", "run", "build"], {
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
  });
  if ((await built.exited) !== 0) {
    process.exit(1);
  }
}

rmSync(USER_DATA, { recursive: true, force: true });

const results: Record<string, unknown> = {};
const tokens: string[] = [];
const medalIds: string[] = [];

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

results.pictureBytesAloneLeftOut =
  withoutPictureBytes(
    `<img src="data:image/png;base64,AAimgsrc000000000000AA==#imgsrc_kisekae.php?cos=4&amp;_token_v2=x">`,
  ) === `<img src="data:image/png;base64,#imgsrc_kisekae.php?cos=4&amp;_token_v2=x">`;

let app: App | undefined;
let signedIn = false;
const ctx: Ctx = {
  results,
  tokens,
  medalIds,
  state: newShared(),
  get app() {
    if (app === undefined) {
      throw new Error("The app is not running");
    }
    return app;
  },
  set app(next) {
    app = next;
  },
};

const errors: { section: string; message: string }[] = [];

async function launchMain() {
  app = await launch({ now: NOON_JST });
  const { until } = app;
  await until("Sign in to Hiroba");
}

/** The pictures fail from the first sign-in until the pictures section restores them. */
const picturesFail = selected.some(
  (section) => SECTIONS.indexOf(section) <= SECTIONS.findIndex((one) => one.name === "pictures"),
);

async function signIn() {
  const { click, until } = ctx.app;
  if (picturesFail) {
    await fetch(`${HIROBA}/__mydon?answer=gif`);
    await fetch(`${HIROBA}/__panel?answer=404`);
    await fetch(`${HIROBA}/__icons?answer=404`);
  }
  // Earlier sections sign in on their own apps; this count is the main run's.
  await fetch(`${HIROBA}/__hits-reset`);
  await click("#sign-in");
  await until("サンプルどん");
  tokens.push(await (await fetch(`${HIROBA}/__last-token`)).text());
}

async function stopMain() {
  if (app !== undefined) {
    const running = app;
    app = undefined;
    signedIn = false;
    await stop(running);
  }
  mock.kill();
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Set once the app cannot be started or signed in, so the sections that need it say so at once. */
let blocked: string | undefined;

async function prepare(phase: Phase) {
  if (phase === "none") {
    return;
  }
  if (phase === "after") {
    await stopMain();
    return;
  }
  if (blocked !== undefined) {
    throw new Error(`Skipped: ${blocked}`);
  }
  if (app === undefined) {
    try {
      await launchMain();
    } catch (error) {
      blocked = `the app did not start (${messageOf(error)})`;
      throw error;
    }
  }
  if (phase === "signedIn" && !signedIn) {
    try {
      await signIn();
    } catch (error) {
      blocked = `the app did not sign in (${messageOf(error)})`;
      throw error;
    }
    signedIn = true;
  }
}

const RECOVERY = [
  "/__hold-precheck?on=0",
  "/__title-hold-precheck?on=0",
  "/__profile-hold-save?on=0",
  "/__hold-read?on=0",
  "/__state?reset=1",
  "/__profile?reset=1",
  "/__items?many=0",
];

/** After a throw the window may be left resized or touch-emulated, and the stand-in holding a reply. */
async function recover() {
  const quickly = (work: Promise<unknown>) =>
    Promise.race([work, Bun.sleep(3_000)]).catch(() => undefined);
  if (app !== undefined) {
    const { page } = app;
    await quickly(page.send("Emulation.clearDeviceMetricsOverride", {}));
    await quickly(page.send("Emulation.setTouchEmulationEnabled", { enabled: false }));
    await quickly(page.send("Emulation.setEmulatedMedia", { features: [] }));
  }
  for (const path of RECOVERY) {
    await quickly(fetch(`${HIROBA}${path}`));
  }
}

async function runSection(section: Section) {
  setSection(section.name);
  const before = new Set(Object.keys(results));
  try {
    await prepare(section.phase);
    await section.run(ctx);
    const unset = section.keys.filter((key) => !(key in results));
    const unlisted = Object.keys(results).filter(
      (key) => !before.has(key) && !section.keys.includes(key),
    );
    if (unset.length > 0 || unlisted.length > 0) {
      throw new Error(
        `The key list is out of date. Not set: [${unset}]. Not listed: [${unlisted}]`,
      );
    }
  } catch (error) {
    errors.push({ section: section.name, message: messageOf(error) });
    for (const key of section.keys) {
      results[key] ??= false;
    }
    await recover();
  }
}

try {
  for (const section of selected) {
    await runSection(section);
  }
} finally {
  await stopMain();
}

if (errors.length > 0) {
  results.errors = errors;
  process.exitCode = 1;
}

console.log(JSON.stringify(results, null, 2));
