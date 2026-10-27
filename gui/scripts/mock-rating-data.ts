/** Stand-in for OurTaiko's rating data: each chart the stand-in plays that a version rates. */
import { COUNTS, mockPlay, mockTitle } from "./mock-history";
import { SONG_NO_BASE } from "./mock-scores";

/** More songs than a run plays. */
const SONGS = 400;
/** Every chart's notes are its details' 良, 可 and 不可 together. */
const NOTES = COUNTS.filter(([key]) => key === "good" || key === "ok" || key === "ng").reduce(
  (sum, [, count]) => sum + count,
  0,
);
const V2_KEY_OF_LEVEL: Readonly<Record<number, string>> = { 3: "hard", 4: "oni", 5: "edit" };

const playedSongs = () => Array.from({ length: SONGS }, (_, index) => index + 1);

/** The feed's answer, as `/api/fumendb_constants` gives it: song `n` at the level it is played. */
export function ratingDataAnswer(): unknown[] {
  return playedSongs().flatMap((n) => {
    const { level } = mockPlay(n);
    if (level < 4) {
      return [];
    }
    const chart = {
      constant: (80 + (n % 37)) / 10,
      totalNotes: NOTES,
      rollSeconds: 0,
      balloonCount: 0,
      composite: 20 + (n % 50),
      avgDensity: 30 + (n % 40),
      instDensity: 40 + (n % 30),
      separation: 10 + (n % 35),
      bpmChange: n % 10,
      hsChange: 0,
    };
    return [
      {
        id: SONG_NO_BASE + n,
        title: mockTitle(n),
        constants: level === 4 ? { oni: chart } : { ura: chart },
      },
    ];
  });
}

/** The V2 feed's answer, as `/api/gugu_constants` gives it: Hard charts too, none near the top. */
export function ratingDataV2Answer(): Record<string, unknown> {
  return Object.fromEntries(
    playedSongs().flatMap((n) => {
      const key = V2_KEY_OF_LEVEL[mockPlay(n).level];
      if (key === undefined) {
        return [];
      }
      const main = (60 + (n % 37)) / 10;
      const handspeed = (60 + (n % 30)) / 10;
      const chart = {
        sub_constant_1: main - 1,
        main_constant: main,
        sub_constant_2: main + 1,
        stamina: (50 + (n % 40)) / 10,
        handspeed,
        burst: handspeed + 1,
        complex: (40 + (n % 50)) / 10,
        rhythm: (50 + (n % 35)) / 10,
        totalNotes: NOTES,
      };
      return [[String(SONG_NO_BASE + n), { [key]: chart }]];
    }),
  );
}
