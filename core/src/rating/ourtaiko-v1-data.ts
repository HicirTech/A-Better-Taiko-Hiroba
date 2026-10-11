import type { Level } from "../hiroba-models";
import type { OurTaikoV1Chart, OurTaikoV1Data } from "./ourtaiko-v1";

const SONG_NO = /^[1-9]\d{0,4}$/;
const LEVEL_OF_KEY: readonly (readonly [string, Level])[] = [
  ["oni", 4],
  ["ura", 5],
];

/** OurTaiko's V1 feed, or null when it is no list; malformed songs and charts are left out. */
export function parseOurTaikoV1Data(answer: unknown): OurTaikoV1Data | null {
  if (!Array.isArray(answer)) {
    return null;
  }
  const songs = new Map<string, ReadonlyMap<Level, OurTaikoV1Chart>>();
  for (const entry of answer) {
    const songNo = isObject(entry) ? songNoOf(entry.id) : null;
    const constants = isObject(entry) ? entry.constants : undefined;
    if (songNo === null || !isObject(constants)) {
      continue;
    }
    const charts = new Map(
      LEVEL_OF_KEY.flatMap(([key, level]) => {
        const chart = chartOf(constants[key]);
        return chart === null ? [] : [[level, chart] as const];
      }),
    );
    if (charts.size > 0) {
      songs.set(songNo, charts);
    }
  }
  return songs;
}

const isObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isMeasure = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

function songNoOf(id: unknown): string | null {
  const text = typeof id === "number" ? String(id) : id;
  return typeof text === "string" && SONG_NO.test(text) ? text : null;
}

function chartOf(value: unknown): OurTaikoV1Chart | null {
  if (!isObject(value)) {
    return null;
  }
  const { constant, totalNotes, composite, avgDensity, instDensity, separation, bpmChange } = value;
  if (
    !isMeasure(constant) ||
    constant === 0 ||
    typeof totalNotes !== "number" ||
    !Number.isInteger(totalNotes) ||
    totalNotes <= 0 ||
    !isMeasure(composite) ||
    !isMeasure(avgDensity) ||
    !isMeasure(instDensity) ||
    !isMeasure(separation) ||
    !isMeasure(bpmChange)
  ) {
    return null;
  }
  return {
    constant,
    notes: totalNotes,
    composite,
    averageDensity: avgDensity,
    instantDensity: instDensity,
    separation,
    tempoChange: bpmChange,
  };
}
