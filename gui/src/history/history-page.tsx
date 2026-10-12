import { type RecentPlay, recentPlayKey } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Stack, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";

import { nameLanguage, shownName } from "../favorites/song-names";
import type { SongCatalogue } from "../favorites/use-song-catalogue";
import { HIROBA_LANG } from "../language/hiroba-lang";
import { LoadFailed, Waiting } from "../my-page/editor-parts";
import type { PictureLane } from "../pictures/picture-lane";
import { type PlayNotice, ScoreDetails } from "../scores/score-details";
import { listedOf, scoresReadingText } from "../scores/scores-page";
import type { ScoresState } from "../scores/use-scores";
import { HistoryRow, opensOnPress } from "./history-row";
import { type PlacedPlay, placePlay, playedChart } from "./placed-play";
import { playedSong, songsByTitle } from "./played-song";
import type { RecentPlaysState } from "./use-recent-plays";

const LIST = { listStyle: "none", m: 0, p: 0 } as const;

/** The recent-plays page: the stored walk, read again by a pull, Read again or its keys. */
export function HistoryPage({
  history,
  scores,
  catalogue,
  lane,
  touchFirst,
  i18n,
}: {
  readonly history: RecentPlaysState;
  /** The kept scores: a play opens its chart's details, read from Hiroba there if never read. */
  readonly scores: ScoresState;
  /** taiko.wiki's song list: a play it finds the song of is named in the player's language. */
  readonly catalogue: SongCatalogue;
  readonly lane: PictureLane;
  /** Whether a pull reads again here, or Read again does. */
  readonly touchFirst: boolean;
  readonly i18n: Translator;
}) {
  const { plays, reading, page, failure, load } = history;
  useEffect(load, [load]);
  const { view, reading: scoresReading, song, load: loadScores, readSong } = scores;
  useEffect(loadScores, [loadScores]);
  const rows = plays ?? [];
  const byTitle = useMemo(() => songsByTitle(catalogue.songs.values()), [catalogue.songs]);
  const [opened, setOpened] = useState<RecentPlay | null>(null);
  // Read once each time it opens: a play whose read found nothing is not read in a loop.
  const [asked, setAsked] = useState<string | null>(null);
  // Hiroba's own title where no one song is found for the play, or taiko.wiki does not have it.
  const nameOf = (play: RecentPlay) => {
    const found = playedSong(byTitle, play, view?.songs ?? []);
    const song = found.outcome === "resolved" ? catalogue.songs.get(found.songNo) : undefined;
    if (song === undefined) {
      return { text: play.songTitle, lang: HIROBA_LANG };
    }
    const text = shownName(song, i18n.locale);
    return { text, lang: nameLanguage(song, text) };
  };

  const placed = opened === null || view === null ? null : placePlay(opened, view, byTitle);
  const openedKey = opened === null ? null : recentPlayKey(opened);
  const unread = placed?.kind === "unread" ? placed.songNo : null;
  const readPlayed = useCallback(
    (play: RecentPlay, songNo: string) => {
      setAsked(recentPlayKey(play));
      void readSong({ songNo, songTitle: play.songTitle }, playedChart(play));
    },
    [readSong],
  );
  useEffect(() => {
    if (opened !== null && unread !== null && !scoresReading && asked !== openedKey) {
      readPlayed(opened, unread);
    }
  }, [opened, unread, scoresReading, asked, openedKey, readPlayed]);
  const notice: PlayNotice | null =
    opened === null || placed === null || placed.kind === "scored"
      ? null
      : {
          play: opened,
          name: nameOf(opened),
          why: (
            <PlayWhy
              placed={placed}
              play={opened}
              asked={asked === openedKey}
              scores={scores}
              i18n={i18n}
            />
          ),
          onRead: placed.kind === "unread" ? () => readPlayed(opened, placed.songNo) : null,
        };
  const placedSong =
    placed?.kind === "scored"
      ? placed.score.songNo
      : placed?.kind === "unread"
        ? placed.songNo
        : null;
  const close = () => {
    setOpened(null);
    setAsked(null);
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
            rowProps={opensOnPress(() => setOpened(play))}
          />
        ))}
      </Stack>
      <ScoreDetails
        listed={placed?.kind === "scored" ? listedOf(placed.score, catalogue, i18n.locale) : null}
        notice={notice}
        lane={lane}
        reading={scoresReading}
        readingSong={song !== null && song.songNo === placedSong}
        i18n={i18n}
        onReadSong={(score) => void readSong(score)}
        onClose={close}
      />
    </Stack>
  );
}

/** Why a play's chart shows no details: its song being read, a read that failed, or no song. */
function PlayWhy({
  placed,
  play,
  asked,
  scores,
  i18n,
}: {
  readonly placed: Exclude<PlacedPlay, { readonly kind: "scored" }>;
  readonly play: RecentPlay;
  /** Its song was read for it since it opened. */
  readonly asked: boolean;
  readonly scores: ScoresState;
  readonly i18n: Translator;
}) {
  const { t } = i18n;
  if (placed.kind === "unplaced") {
    const why = placed.why === "shared" ? "history.sharedTitle" : "history.unknownSong";
    return <Typography color="text.secondary">{t(why)}</Typography>;
  }
  if (scores.reading || !asked) {
    return (
      <Waiting>
        {scores.reading
          ? scoresReadingText(i18n, scores.progress, scores.song)
          : t("scores.readingSong", { song: play.songTitle })}
      </Waiting>
    );
  }
  if (scores.failure !== null) {
    return <LoadFailed id="history-play-failure" failure={scores.failure} i18n={i18n} />;
  }
  return <Typography color="text.secondary">{t("history.noScore")}</Typography>;
}
