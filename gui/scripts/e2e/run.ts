/** Drives the unpackaged desktop app against the stand-in over the Chrome DevTools Protocol. */
import { rmSync } from "node:fs";
import { join } from "node:path";

import { showWindows } from "./app";
import { LANE, LANE_VARIABLE, root, userDataOf } from "./config";
import { type AfterSection, LANES, type Lane, type LaneSection } from "./context";
import { type LaneReport, mergeReports, printedReport, runAfter, runLane } from "./lane";
import { SECTIONS } from "./sections";
import { wrongChecks } from "./verdict";

const USAGE = `Usage: bun run e2e [--no-build] [--show] [--serial] [--only <section,...>]
Sections: ${SECTIONS.map((section) => section.name).join(", ")}`;

function fail(message: string): never {
  console.error(`${message}\n${USAGE}`);
  process.exit(2);
}

function parseArgs(argv: string[]) {
  let build = true;
  let show = false;
  let serial = false;
  let only: string[] | undefined;
  for (let at = 0; at < argv.length; at++) {
    const arg = argv[at];
    if (arg === "--no-build") {
      build = false;
    } else if (arg === "--show") {
      show = true;
    } else if (arg === "--serial") {
      serial = true;
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
  return { build, show, serial, only };
}

const { build, show, serial, only } = parseArgs(process.argv.slice(2));
if (show) {
  showWindows();
}
const selected = SECTIONS.filter((section) => only === undefined || only.includes(section.name));
const inLanes = selected.filter((section): section is LaneSection => section.phase !== "after");
const afterLanes = selected.filter((section): section is AfterSection => section.phase === "after");
const sectionsOf = (lane: Lane) => inLanes.filter((section) => section.lane === lane);
const lanes = LANES.filter((lane) => sectionsOf(lane).length > 0);

/** Runs every lane at once, each in a process of its own, and merges what they print. */
async function runLanes() {
  const args = [
    "--no-build",
    ...(show ? ["--show"] : []),
    ...(only === undefined ? [] : ["--only", only.join(",")]),
  ];
  const runs = await Promise.all(
    lanes.map(async (lane) => {
      const started = performance.now();
      const child = Bun.spawn(["bun", import.meta.path, ...args], {
        env: { ...process.env, [LANE_VARIABLE]: String(LANES.indexOf(lane)) },
        stdout: "pipe",
      });
      const [printed, exitCode] = await Promise.all([
        new Response(child.stdout).text(),
        child.exited,
      ]);
      const report = printedReport(printed, { name: lane, sections: sectionsOf(lane), exitCode });
      return { lane, report, ms: Math.round(performance.now() - started) };
    }),
  );
  return {
    report: mergeReports(runs.map((run) => run.report)),
    laneMs: Object.fromEntries(runs.map((run) => [run.lane, run.ms])),
  };
}

async function runWhole() {
  const startedAt = performance.now();
  if (build) {
    const built = Bun.spawn(["bun", "run", "build"], {
      cwd: join(root, ".."),
      stdout: "inherit",
      stderr: "inherit",
    });
    if ((await built.exited) !== 0) {
      process.exit(1);
    }
  }
  // Every lane's folder goes, so the checks after the lanes read only this run's.
  for (const lane of LANES.keys()) {
    rmSync(userDataOf(lane), { recursive: true, force: true });
  }
  const setupMs = Math.round(performance.now() - startedAt);

  let report: LaneReport;
  let laneMs: Record<string, number> | undefined;
  if (serial || lanes.length < 2) {
    report = await runLane(inLanes, { setupChecks: true });
  } else {
    ({ report, laneMs } = await runLanes());
  }
  await runAfter(afterLanes, report);

  const { results, errors } = report;
  results.setupMs = setupMs;
  if (laneMs !== undefined) {
    results.laneMs = laneMs;
  }
  results.sectionMs = report.sectionMs;
  if (errors.length > 0) {
    results.errors = errors;
  }
  const wrong = wrongChecks(results);
  if (errors.length > 0 || wrong.length > 0) {
    process.exitCode = 1;
  }

  console.log(JSON.stringify(results, null, 2));
  if (wrong.length > 0) {
    console.error(`Wrong: ${wrong.join(", ")}`);
  }
}

/** One lane's process: it prints its report for the run that started it to merge. */
async function runOneLane() {
  const lane = LANES[LANE];
  if (lane === undefined) {
    fail(`No lane ${LANE}`);
  }
  const report = await runLane(sectionsOf(lane), { setupChecks: lane === lanes[0] });
  console.log(JSON.stringify(report));
}

if (process.env[LANE_VARIABLE] === undefined) {
  await runWhole();
} else {
  await runOneLane();
}
