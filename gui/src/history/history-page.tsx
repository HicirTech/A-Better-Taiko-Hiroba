import { type RecentPlay, recentPlayKey } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Stack, Typography } from "@mui/material";
import { useEffect, useMemo } from "react";

import { nameLanguage, shownName } from "../favorites/song-names";
import type { SongCatalogue } from "../favorites/use-song-catalogue";
import { HIROBA_LANG } from "../language/hiroba-lang";
import { LoadFailed, Waiting } from "../my-page/editor-parts";
import type { PictureLane } from "../pictures/picture-lane";
import { HistoryRow } from "./history-row";
import { playedSong, songsByTitle } from "./played-song";
import type { RecentPlaysState } from "./use-recent-plays";

const LIST = { listStyle: "none", m: 0, p: 0 } as const;

/** The recent-plays page: the stored walk, read again by a pull, Read again or its keys. */
export function HistoryPage({
  history,
  catalogue,
  lane,
  touchFirst,
  i18n,
}: {
  readonly history: RecentPlaysState;
  /** taiko.wiki's song list: a play it finds the song of is named in the player's language. */
  readonly catalogue: SongCatalogue;
  readonly lane: PictureLane;
  /** Whether a pull reads again here, or Read again does. */
  readonly touchFirst: boolean;
  readonly i18n: Translator;
}) {
  const { plays, reading, page, failure, load } = history;
  useEffect(load, [load]);
  const rows = plays ?? [];
  const byTitle = useMemo(() => songsByTitle(catalogue.songs.values()), [catalogue.songs]);
  // Hiroba's own title where the list finds no song for the play, or more than one.
  const nameOf = (play: RecentPlay) => {
    const found = playedSong(byTitle, play);
    const song = found.outcome === "resolved" ? catalogue.songs.get(found.songNo) : undefined;
    if (song === undefined) {
      return { text: play.songTitle, lang: HIROBA_LANG };
    }
    const text = shownName(song, i18n.locale);
    return { text, lang: nameLanguage(song, text) };
  };
  return (
    <Stack spacing={2} id="history-page">
      {reading && rows.length === 0 && (
        <Waiting id="history-reading">{i18n.t("history.readingPage", { page: page ?? 1 })}</Waiting>
      )}
      {failure !== null && (
        <LoadFailed id="history-failure" failure={failure} i18n={i18n}>
          {failure.page !== undefined && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {i18n.t("history.failedPage", { page: failure.page })}
            </Typography>
          )}
        </LoadFailed>
      )}
      {plays !== null && rows.length === 0 && !reading && (
        <Typography id="history-empty" color="text.secondary">
          {i18n.t(touchFirst ? "history.emptyPull" : "history.emptyReadAgain")}
        </Typography>
      )}
      <Stack component="ul" id="history-list" spacing={0} sx={LIST}>
        {rows.map((play, index) => (
          <HistoryRow
            key={recentPlayKey(play)}
            play={play}
            name={nameOf(play)}
            lane={lane}
            order={index}
            i18n={i18n}
          />
        ))}
      </Stack>
    </Stack>
  );
}
