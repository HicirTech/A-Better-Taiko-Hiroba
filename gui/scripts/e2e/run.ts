/** Drives the unpackaged desktop app against the stand-in over the Chrome DevTools Protocol. */
import { rmSync } from "node:fs";
import { join } from "node:path";
import electronPath from "electron";

import { type App, launch, stop } from "./app";
import { HIROBA, MY_PAGE, NOON_JST, root, USER_DATA } from "./config";
import { type Ctx, newShared, type Phase } from "./context";
import { withoutPictureBytes } from "./harness";
import { SECTIONS } from "./sections";

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

async function launchMain() {
  app = await launch({ now: NOON_JST });
  const { until } = app;
  await until("Sign in to Hiroba");
}

/** The pictures fail from the first sign-in until the pictures section restores them. */
async function signIn() {
  const { click, until } = ctx.app;
  await fetch(`${HIROBA}/__mydon?answer=gif`);
  await fetch(`${HIROBA}/__panel?answer=404`);
  await fetch(`${HIROBA}/__icons?answer=404`);
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

async function prepare(phase: Phase) {
  if (phase === "none") {
    return;
  }
  if (phase === "after") {
    await stopMain();
    return;
  }
  if (app === undefined) {
    await launchMain();
  }
  if (phase === "signedIn" && !signedIn) {
    await signIn();
    signedIn = true;
  }
}

try {
  for (const section of SECTIONS) {
    await prepare(section.phase);
    await section.run(ctx);
  }
} finally {
  await stopMain();
}

console.log(JSON.stringify(results, null, 2));
