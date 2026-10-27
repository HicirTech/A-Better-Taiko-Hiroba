import type { Level } from "../hiroba-models";
import { isMeasure, isObject, songNoOf } from "./ourtaiko-feed";
import type { OurTaikoV2Chart, OurTaikoV2Data } from "./ourtaiko-v2";

const LEVEL_OF_KEY: readonly (readonly [string, Level])[] = [
  ["hard", 3],
  ["oni", 4],
  ["edit", 5],
];

/** OurTaiko's V2 feed, or null when it is no object; malformed songs and charts are left out. */
export function parseOurTaikoV2Data(answer: unknown): OurTaikoV2Data | null {
  if (!isObject(answer)) {
    return null;
  }
  const songs = new Map<string, ReadonlyMap<Level, OurTaikoV2Chart>>();
  for (const [id, difficulties] of Object.entries(answer)) {
    const songNo = songNoOf(id);
    if (songNo === null || !isObject(difficulties)) {
      continue;
    }
    const charts = new Map(
      LEVEL_OF_KEY.flatMap(([key, level]) => {
        const chart = chartOf(difficulties[key]);
        return chart === null ? [] : [[level, chart] as const];
      }),
    );
    if (charts.size > 0) {
      songs.set(songNo, charts);
    }
  }
  return songs;
}

function chartOf(value: unknown): OurTaikoV2Chart | null {
  if (!isObject(value)) {
    return null;
  }
  const {
    sub_constant_1: low,
    main_constant: main,
    sub_constant_2: high,
    stamina,
    handspeed,
    burst,
    complex,
    rhythm,
    totalNotes,
  } = value;
  if (
    !isMeasure(low) ||
    !isMeasure(main) ||
    !isMeasure(high) ||
    !isMeasure(stamina) ||
    !isMeasure(handspeed) ||
    !isMeasure(burst) ||
    !isMeasure(complex) ||
    !isMeasure(rhythm) ||
    !isMeasure(totalNotes) ||
    !Number.isInteger(totalNotes)
  ) {
    return null;
  }
  return {
    lowConstant: low,
    mainConstant: main,
    highConstant: high,
    stamina,
    handSpeed: handspeed,
    burst,
    complex,
    rhythm,
    notes: totalNotes,
  };
}
