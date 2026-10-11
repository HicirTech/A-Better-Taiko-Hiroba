/** Stand-in for OurTaiko's V1 data: each Extreme and Ura chart the stand-in plays, measured. */
import { COUNTS, mockPlay, mockTitle } from "./mock-history";
import { SONG_NO_BASE } from "./mock-scores";

/** More songs than a run plays. */
const SONGS = 400;
/** Every chart's notes are its details' 良, 可 and 不可 together. */
const NOTES = COUNTS.filter(([key]) => key === "good" || key === "ok" || key === "ng").reduce(
  (sum, [, count]) => sum + count,
  0,
);

/** The feed's answer, as `/api/fumendb_constants` gives it: song `n` at the level it is played. */
export function ratingDataAnswer(): unknown[] {
  return Array.from({ length: SONGS }, (_, index) => index + 1).flatMap((n) => {
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
