/** Runs a lane's sections on one app and stand-in, and the sections after every lane. */
import { rmSync } from "node:fs";
import { join } from "node:path";
import electronPath from "electron";

import { type App, launch, stop } from "./app";
import { HIROBA, HIROBA_PORT, IDP_PORT, MY_PAGE, NOON_JST, root, USER_DATA } from "./config";
import {
  type AfterSection,
  type Ctx,
  type Lane,
  type LaneSection,
  newShared,
  type Section,
} from "./context";
import { setSection, waitFor, withoutPictureBytes } from "./harness";
import { SECTIONS } from "./sections";
import { sessionHelpers } from "./session";

/** A lane's checks and times, with the tokens and medal ids its data folder must not hold. */
export type LaneReport = {
  results: Record<string, unknown>;
  tokens: string[];
  medalIds: string[];
  errors: { section: string; message: string }[];
  sectionMs: Record<string, number>;
};

export const newReport = (): LaneReport => ({
  results: {},
  tokens: [],
  medalIds: [],
  errors: [],
  sectionMs: {},
});

/** Joins lanes' reports; no check belongs to two sections, so none is overwritten. */
export function mergeReports(reports: readonly LaneReport[]): LaneReport {
  return {
    results: Object.fromEntries(reports.flatMap((report) => Object.entries(report.results))),
    tokens: reports.flatMap((report) => report.tokens),
    medalIds: reports.flatMap((report) => report.medalIds),
    errors: reports.flatMap((report) => report.errors),
    sectionMs: Object.fromEntries(reports.flatMap((report) => Object.entries(report.sectionMs))),
  };
}

/** The report a lane's process printed; with none printed, each of its sections' checks fails. */
export function printedReport(
  printed: string,
  lane: { name: Lane; sections: readonly LaneSection[]; exitCode: number },
): LaneReport {
  try {
    return JSON.parse(printed) as LaneReport;
  } catch {
    const report = newReport();
    report.errors.push({
      section: `${lane.name} lane`,
      message: `Its process ended with code ${lane.exitCode} and printed no report`,
    });
    for (const key of lane.sections.flatMap((section) => section.keys)) {
      report.results[key] = false;
    }
    return report;
  }
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** What a section is given; the app it reaches is whatever `held.app` holds when it asks. */
function contextOf(report: LaneReport, held: { app?: App }): Ctx {
  return {
    results: report.results,
    tokens: report.tokens,
    medalIds: report.medalIds,
    state: newShared(),
    get app() {
      if (held.app === undefined) {
        throw new Error("The app is not running");
      }
      return held.app;
    },
    set app(next) {
      held.app = next;
    },
  };
}

/** Runs one section into `report`; a throw records its error and leaves its keys false. */
async function runSection(
  section: Section,
  report: LaneReport,
  ctx: Ctx,
  { prepare, recover }: { prepare: () => Promise<void>; recover: () => Promise<void> },
) {
  setSection(section.name);
  const started = performance.now();
  const { results } = report;
  const before = new Set(Object.keys(results));
  try {
    await prepare();
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
    report.errors.push({ section: section.name, message: messageOf(error) });
    for (const key of section.keys) {
      results[key] ??= false;
    }
    await recover();
  }
  report.sectionMs[section.name] = Math.round(performance.now() - started);
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

/** Runs `sections` in order; `setupChecks` adds the checks of the app, stand-in and harness. */
export async function runLane(
  sections: readonly LaneSection[],
  { setupChecks }: { setupChecks: boolean },
): Promise<LaneReport> {
  const report = newReport();
  const { results, tokens } = report;

  if (setupChecks) {
    const halfSet = Bun.spawn([String(electronPath), root], {
      env: { ...process.env, ABTH_DEV_HIROBA_ORIGIN: HIROBA, ABTH_DEV_USER_DATA: USER_DATA },
      stdout: "ignore",
      stderr: "ignore",
    });
    results.halfOverrideRefused = (await Promise.race([halfSet.exited, Bun.sleep(15_000)])) === 1;
    halfSet.kill();
    rmSync(USER_DATA, { recursive: true, force: true });
  }

  const mock = Bun.spawn(["bun", join(root, "scripts", "mock-hiroba.ts")], {
    env: {
      ...process.env,
      ABTH_MOCK_HIROBA_PORT: String(HIROBA_PORT),
      ABTH_MOCK_IDP_PORT: String(IDP_PORT),
    },
    stdout: "ignore",
  });
  // Every lane starting at once slows the stand-in's start; wait for its answer.
  await waitFor(
    "the stand-in",
    async () => (await fetch(`${HIROBA}/__hits-reset`)).ok || undefined,
  );
  if (setupChecks) {
    results.uaGateActive = (await (await fetch(`${HIROBA}${MY_PAGE}`)).text()).includes(
      "recommended browsers",
    );
    await fetch(`${HIROBA}/__hits-reset`);
    results.pictureBytesAloneLeftOut =
      withoutPictureBytes(
        `<img src="data:image/png;base64,AAimgsrc000000000000AA==#imgsrc_kisekae.php?cos=4&amp;_token_v2=x">`,
      ) === `<img src="data:image/png;base64,#imgsrc_kisekae.php?cos=4&amp;_token_v2=x">`;
  }

  const held: { app?: App } = {};
  let signedIn = false;
  const ctx = contextOf(report, held);

  async function launchMain() {
    held.app = await launch({ now: NOON_JST });
    const { until } = held.app;
    await until("Sign in to Hiroba");
  }

  /** The pictures fail from the first sign-in until the pictures section restores them. */
  const pictures = SECTIONS.findIndex((one) => one.name === "pictures");
  const picturesFail = sections.some(
    (section) => section.phase === "signedIn" && SECTIONS.indexOf(section) <= pictures,
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

  /** Set once the app cannot be started or signed in, so the sections that need it say so at once. */
  let blocked: string | undefined;

  async function prepare(phase: LaneSection["phase"]) {
    if (phase === "none") {
      return;
    }
    if (blocked !== undefined) {
      throw new Error(`Skipped: ${blocked}`);
    }
    if (held.app === undefined) {
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

  /** After a throw the window may be left resized or touch-emulated, and the stand-in holding a reply. */
  async function recover() {
    const quickly = (work: Promise<unknown>) =>
      Promise.race([work, Bun.sleep(3_000)]).catch(() => undefined);
    if (held.app !== undefined) {
      const { page } = held.app;
      await quickly(page.send("Emulation.clearDeviceMetricsOverride", {}));
      await quickly(page.send("Emulation.setTouchEmulationEnabled", { enabled: false }));
      await quickly(page.send("Emulation.setEmulatedMedia", { features: [] }));
    }
    for (const path of RECOVERY) {
      await quickly(fetch(`${HIROBA}${path}`));
    }
  }

  /** Ends signed out, as a full run does, so a session left on disk is a leak the checks find. */
  async function signOutAtEnd() {
    const { signOut } = sessionHelpers(ctx);
    const app = held.app;
    if (
      app !== undefined &&
      blocked === undefined &&
      (await app.page.evaluate<boolean>("window.abth.isSignedIn()"))
    ) {
      await signOut();
    }
  }

  try {
    for (const section of sections) {
      await runSection(section, report, ctx, { prepare: () => prepare(section.phase), recover });
    }
    try {
      await signOutAtEnd();
    } catch (error) {
      report.errors.push({ section: "sign-out at the lane's end", message: messageOf(error) });
    }
    tokens.push(...((await (await fetch(`${HIROBA}/__tickets`)).json()) as string[]));
  } finally {
    if (held.app !== undefined) {
      await stop(held.app);
    }
    mock.kill();
  }
  return report;
}

/** Runs the sections that read what every lane left on disk, once the lanes have stopped. */
export async function runAfter(sections: readonly AfterSection[], report: LaneReport) {
  const ctx = contextOf(report, {});
  const idle = () => Promise.resolve();
  for (const section of sections) {
    await runSection(section, report, ctx, { prepare: idle, recover: idle });
  }
}
