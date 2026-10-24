import type { ScoreBook } from "@abth/core";

import type { ListedChart, ListedChartsView } from "../shared/session-port";

/** Every chart the lists name, in song number order; one whose song left the lists is not. */
export function listedChartsOf(book: ScoreBook): ListedChartsView {
  const listed = new Set(book.songs.map(({ songNo }) => songNo));
  const charts = Object.values(book.scores).flatMap(
    ({ songNo, level, crown, scoreRank, record }): ListedChart[] =>
      listed.has(songNo)
        ? [
            {
              songNo,
              level,
              crown,
              scoreRank,
              hits:
                record === null
                  ? null
                  : {
                      highScore: record.highScore,
                      good: record.good,
                      ok: record.ok,
                      bad: record.bad,
                    },
            },
          ]
        : [],
  );
  charts.sort(
    (left, right) => Number(left.songNo) - Number(right.songNo) || left.level - right.level,
  );
  return { charts, songs: book.songs };
}
