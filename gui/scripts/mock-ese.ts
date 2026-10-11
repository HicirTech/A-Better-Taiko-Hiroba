/** The stand-in's OurTaiko map of songs to chart files, and the chart files it names. */
import { WIKI_SONGS, type WikiSong } from "./mock-song-catalogue";

/** Where the stand-in serves the map, and the chart files under a folder of their own. */
export const ESE_MAPPING_PATH = "/__ese-mapping";
export const ESE_CHARTS_PATH = "/__ese/";

/** Its map names a file the stand-in does not have. */
export const MISSING_CHART = "1003";
/** Its Oni chart holds one note more than the song list counts, so it draws no line. */
export const MISCOUNTED_CHART = "1006";
/** Its Oni chart branches, and its tempo doubles halfway. */
export const BRANCHED_CHART = "1005";
export const PLAIN_CHART = "1001";

type Course = keyof WikiSong["courses"];

const COURSE_ORDER: readonly Course[] = ["easy", "normal", "hard", "oni", "ura"];
const COURSE_NAME: Readonly<Record<Course, string>> = {
  easy: "Easy",
  normal: "Normal",
  hard: "Hard",
  oni: "Oni",
  ura: "Edit",
};
/** The notes in each measure, in turn, so the line rises and falls. */
const RHYTHM = [4, 8, 16, 8];
const SLOTS = 16;

const pathOf = (songNo: string) => `01 Pop\\Song ${songNo}\\Song ${songNo}.tja`;

export const ESE_MAPPING: Readonly<Record<string, string>> = Object.fromEntries(
  [PLAIN_CHART, BRANCHED_CHART, MISSING_CHART, MISCOUNTED_CHART].map((songNo) => [
    songNo,
    pathOf(songNo),
  ]),
);

function measure(notes: number): string {
  const slots = Array.from({ length: SLOTS }, () => "0");
  for (let at = 0; at < notes; at++) {
    slots[Math.floor((at * SLOTS) / notes)] = at % 2 === 0 ? "1" : "2";
  }
  return `${slots.join("")},`;
}

function counts(total: number): number[] {
  const each: number[] = [];
  for (let left = total, at = 0; left > 0; at++) {
    const notes = Math.min(left, RHYTHM[at % RHYTHM.length] ?? SLOTS);
    each.push(notes);
    left -= notes;
  }
  return each;
}

function measures(each: readonly number[], tempo: number | null): string[] {
  const half = Math.floor(each.length / 2);
  return each.flatMap((notes, at) => [
    ...(at === half && tempo !== null ? [`#BPMCHANGE ${tempo}`] : []),
    measure(notes),
  ]);
}

function body(total: number, tempo: number | null, branched: boolean): string[] {
  const master = counts(total);
  if (!branched) {
    return measures(master, tempo);
  }
  const share = (part: number) => master.map((notes) => Math.max(1, Math.floor(notes * part)));
  return [
    "#BRANCHSTART p,50,80",
    "#N",
    ...measures(share(0.5), tempo),
    "#E",
    ...measures(share(0.75), tempo),
    "#M",
    ...measures(master, tempo),
    "#BRANCHEND",
  ];
}

/** A TJA whose charts hold the song list's note counts, but for MISCOUNTED_CHART's Oni. */
export function standInTja(song: WikiSong): string {
  const { min, max } = song.bpm;
  const courses = COURSE_ORDER.flatMap((difficulty) => {
    const course = song.courses[difficulty];
    if (course === null) {
      return [];
    }
    const extra = song.songNo === MISCOUNTED_CHART && difficulty === "oni" ? 1 : 0;
    return [
      `COURSE:${COURSE_NAME[difficulty]}`,
      `LEVEL:${course.level}`,
      "#START",
      ...body(course.maxCombo + extra, min === max ? null : max, course.isBranched === 1),
      "#END",
      "",
    ];
  });
  return [`TITLE:${song.title}`, `BPM:${min}`, "OFFSET:0", "", ...courses].join("\n");
}

/** Where the app asks the stand-in for a song's chart file. */
export const servedChartPath = (songNo: string) =>
  `${ESE_CHARTS_PATH}${pathOf(songNo).split("\\").map(encodeURIComponent).join("/")}`;

/** The chart file at `pathname` under ESE_CHARTS_PATH, or null for one the stand-in lacks. */
export function eseChart(pathname: string): string | null {
  const path = decodeURIComponent(pathname.slice(ESE_CHARTS_PATH.length)).split("/").join("\\");
  const songNo = Object.entries(ESE_MAPPING).find(([, mapped]) => mapped === path)?.[0];
  const song = WIKI_SONGS.find((one) => one.songNo === songNo);
  return song === undefined || songNo === MISSING_CHART ? null : standInTja(song);
}
