import type { Level } from "../hiroba-models";
import {
  CHART_BRANCHES,
  type ChartBranch,
  type ChartDensity,
  type NoteDensity,
  type SongDensity,
} from "./types";

const COURSE_LEVEL: Readonly<Record<string, Level>> = {
  easy: 1,
  "0": 1,
  normal: 2,
  "1": 2,
  hard: 3,
  "2": 3,
  oni: 4,
  "3": 4,
  edit: 5,
  ura: 5,
  "4": 5,
};

const BRANCH_OF: Readonly<Record<string, ChartBranch>> = {
  "#N": "normal",
  "#E": "advanced",
  "#M": "master",
};

/** Don and ka, small and big, and the big notes hit with a partner's hand. */
const NOTE = /^[1-4AB]$/;
const SLOT = /^[0-9A-Z]$/;
const DEFAULT_BPM = 120;
// A note on a slice's very edge must not fall back into the slice before through float error.
const EDGE = 1e-6;

interface ChartSource {
  readonly level: Level;
  readonly bpm: number;
  readonly lines: readonly string[];
}

type Step =
  | { readonly kind: "slot"; readonly note: boolean }
  | { readonly kind: "bpm"; readonly bpm: number }
  | { readonly kind: "delay"; readonly seconds: number };

/** The note density of every single-player chart in a TJA's text; the text itself is not kept. */
export function tjaDensities(text: string): SongDensity {
  const densities = new Map<Level, ChartDensity>();
  for (const chart of chartsOf(text)) {
    const density = densityOf(chart);
    if (density !== null && !densities.has(chart.level)) {
      densities.set(chart.level, density);
    }
  }
  return densities;
}

function chartsOf(text: string): ChartSource[] {
  const charts: ChartSource[] = [];
  let level: Level | undefined;
  let bpm = DEFAULT_BPM;
  let double = false;
  let body: string[] | null = null;
  let kept = false;
  for (const raw of text.replace(/^﻿/, "").split(/\r?\n/)) {
    const line = raw.replace(/\/\/.*$/, "").trim();
    if (body !== null) {
      if (commandOf(line) === "#END") {
        if (kept && level !== undefined) {
          charts.push({ level, bpm, lines: body });
        }
        body = null;
      } else {
        body.push(line);
      }
      continue;
    }
    const [command, argument] = splitCommand(line);
    if (command === "#START") {
      // A two-player chart splits its notes between players; Hiroba has none.
      kept = !double && argument === "";
      body = [];
      continue;
    }
    const header = /^([A-Z0-9]+):(.*)$/i.exec(line);
    if (header === null) {
      continue;
    }
    const value = (header[2] ?? "").trim();
    switch ((header[1] ?? "").toUpperCase()) {
      case "COURSE":
        level = COURSE_LEVEL[value.toLowerCase()];
        double = false;
        break;
      case "BPM": {
        const tempo = Number(value);
        bpm = Number.isFinite(tempo) && tempo > 0 ? tempo : bpm;
        break;
      }
      case "STYLE":
        double = /^(double|couple|2)$/i.test(value);
        break;
    }
  }
  return charts;
}

function densityOf(chart: ChartSource): ChartDensity | null {
  const branched = chart.lines.some((line) => commandOf(line) === "#BRANCHSTART");
  if (!branched) {
    const line = noteDensity(noteTimes(chart.lines, chart.bpm));
    return line === null ? null : { branched: false, line };
  }
  const [normal, advanced, master] = CHART_BRANCHES.map((branch) =>
    noteDensity(noteTimes(pathOf(chart.lines, branch), chart.bpm)),
  );
  return normal == null || advanced == null || master == null
    ? null
    : { branched: true, lines: { normal, advanced, master } };
}

/** The chart's lines along one branch; a block that lacks it follows its normal path. */
function pathOf(lines: readonly string[], branch: ChartBranch): string[] {
  const path: string[] = [];
  let block: Record<ChartBranch, string[]> | null = null;
  let current: ChartBranch | null = null;
  const close = () => {
    if (block !== null) {
      path.push(...(block[branch].length > 0 ? block[branch] : block.normal));
    }
    block = null;
    current = null;
  };
  for (const line of lines) {
    const command = commandOf(line);
    const named = command === null ? undefined : BRANCH_OF[command];
    if (command === "#BRANCHSTART") {
      close();
      block = { normal: [], advanced: [], master: [] };
    } else if (command === "#BRANCHEND") {
      close();
    } else if (block !== null && named !== undefined) {
      current = named;
    } else if (block === null) {
      path.push(line);
    } else if (current === null) {
      for (const each of CHART_BRANCHES) {
        block[each].push(line);
      }
    } else {
      block[current].push(line);
    }
  }
  close();
  return path;
}

/** Each note's time in seconds from the chart's start, measure by measure as TJA lays them out. */
function noteTimes(lines: readonly string[], bpm: number): number[] {
  const times: number[] = [];
  let time = 0;
  let tempo = bpm;
  let ratio = 1;
  let nextRatio = 1;
  let steps: Step[] = [];
  let slots = 0;
  const endMeasure = () => {
    const beats = 4 * ratio;
    for (const step of steps) {
      if (step.kind === "bpm") {
        tempo = step.bpm;
      } else if (step.kind === "delay") {
        time += step.seconds;
      } else {
        if (step.note) {
          times.push(time);
        }
        time += ((beats / slots) * 60) / tempo;
      }
    }
    if (slots === 0) {
      time += (beats * 60) / tempo;
    }
    steps = [];
    slots = 0;
    ratio = nextRatio;
  };
  for (const line of lines) {
    const [command, argument] = splitCommand(line);
    if (command === "#BPMCHANGE") {
      const value = Number(argument);
      if (Number.isFinite(value) && value > 0) {
        steps.push({ kind: "bpm", bpm: value });
      }
    } else if (command === "#DELAY") {
      const value = Number(argument);
      if (Number.isFinite(value)) {
        steps.push({ kind: "delay", seconds: value });
      }
    } else if (command === "#MEASURE") {
      const [top, bottom] = argument.split("/").map(Number);
      if (top !== undefined && bottom !== undefined && top > 0 && bottom > 0) {
        nextRatio = top / bottom;
        // Before a measure's first slot it shapes that measure, after it the next one.
        ratio = slots === 0 ? nextRatio : ratio;
      }
    } else if (command === null) {
      for (const char of line) {
        if (char === ",") {
          endMeasure();
        } else if (SLOT.test(char)) {
          steps.push({ kind: "slot", note: NOTE.test(char) });
          slots += 1;
        }
      }
    }
  }
  if (slots > 0) {
    endMeasure();
  }
  return times;
}

function noteDensity(times: readonly number[]): NoteDensity | null {
  const sorted = [...times].sort((a, b) => a - b);
  const first = sorted[0];
  const last = sorted.at(-1);
  if (first === undefined || last === undefined) {
    return null;
  }
  const seconds = last - first;
  const perSecond = Array.from({ length: Math.floor(seconds + EDGE) + 1 }, () => 0);
  for (const time of sorted) {
    const slice = Math.floor(time - first + EDGE);
    perSecond[slice] = (perSecond[slice] ?? 0) + 1;
  }
  return { notes: sorted.length, seconds, perSecond };
}

function commandOf(line: string): string | null {
  return line.startsWith("#") ? splitCommand(line)[0] : null;
}

function splitCommand(line: string): [command: string | null, argument: string] {
  if (!line.startsWith("#")) {
    return [null, ""];
  }
  const space = line.search(/\s/);
  return space === -1
    ? [line.toUpperCase(), ""]
    : [line.slice(0, space).toUpperCase(), line.slice(space).trim()];
}
