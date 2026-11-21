import { listedSongNos, type ScoreBook } from "@abth/core";

import type { ListedChart, ListedChartsView } from "../shared/session-port";

/** Every chart the lists name, and each played chart of a song taken off them, by song number. */
export function listedChartsOf(book: ScoreBook): ListedChartsView {
  const listed = listedSongNos(book);
  const charts = Object.values(book.scores).flatMap(
    ({ songNo, level, crown, scoreRank, record }): ListedChart[] => {
      const removed = !listed.has(songNo);
      return removed && crown === "none"
        ? []
        : [
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
              removed,
            },
          ];
    },
  );
  charts.sort(
    (left, right) => Number(left.songNo) - Number(right.songNo) || left.level - right.level,
  );
  return { charts, songs: book.songs };
}
