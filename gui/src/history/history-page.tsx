import { type RecentPlay, recentPlayKey } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Stack, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";

import { newSetName } from "../favorites/favorite-sets";
import { GENRE_LABEL } from "../favorites/genre-look";
import { SetNameDialog } from "../favorites/set-name-dialog";
import { nameLanguage, shownName } from "../favorites/song-names";
import { useFavoriteSets } from "../favorites/use-favorite-sets";
import type { SongCatalogue } from "../favorites/use-song-catalogue";
import { HIROBA_LANG } from "../language/hiroba-lang";
import { useLongPress } from "../my-page/use-long-press";
import type { PictureLane } from "../pictures/picture-lane";
import { type PlayNotice, ScoreDetails } from "../scores/score-details";
import { listedOf, ScoresReading } from "../scores/scores-page";
import type { ScoresState } from "../scores/use-scores";
import { ProgressBar } from "../ui/progress-bar";
import { LoadFailed } from "../ui/read-failure-alert";
import { RowList, type RowPlace } from "../ui/row-list";
import { HISTORY_ROW_PX, HistoryRow, opensOnPress, type RowProps } from "./history-row";
import { type PlacedPlay, placePlay, playedChart } from "./placed-play";
import { AddToSetDialog, type NamedSong, PlayMenu, type Point } from "./play-menu";
import { playedSong, songsByTitle } from "./played-song";
import type { RecentPlaysState } from "./use-recent-plays";

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
  /** Whether a pull reads again here, or Read again does, and a long press opens a play's menu. */
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

  const kept = useFavoriteSets();
  const [menu, setMenu] = useState<{ readonly play: RecentPlay; readonly at: Point } | null>(null);
  // The play whose song is being added to a set.
  const [adding, setAdding] = useState<RecentPlay | null>(null);
  // Where the play's title is shared, the song the player chose among those sharing it.
  const [chosen, setChosen] = useState<string | null>(null);
  // The song a new set starts with, while its name is asked.
  const [naming, setNaming] = useState<string | null>(null);
  const found = adding === null ? null : playedSong(byTitle, adding, view?.songs ?? []);
  // Its genres and artists tell it from the songs that share its title.
  const namedSong = (songNo: string): NamedSong => {
    const song = catalogue.songs.get(songNo);
    const listed = view?.songs.find((one) => one.songNo === songNo);
    const text = song === undefined ? (listed?.title ?? songNo) : shownName(song, i18n.locale);
    const genres = (song?.genres ?? listed?.genres ?? []).map((genre) =>
      i18n.t(GENRE_LABEL[genre]),
    );
    return {
      songNo,
      text,
      lang: song === undefined ? HIROBA_LANG : nameLanguage(song, text),
      detail: [...genres, ...(song?.artists ?? [])].join(" · "),
    };
  };
  const shut = () => {
    setAdding(null);
    setChosen(null);
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
        <ProgressBar
          id="history-reading"
          label={i18n.t("history.readingPage", { page: page ?? 1 })}
        />
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
      <RowList id="history-list" rows={rows} keyOf={recentPlayKey} rowPx={HISTORY_ROW_PX}>
        {(play, index, place) => (
          <PlayRow
            play={play}
            name={nameOf(play)}
            lane={lane}
            order={index}
            place={place}
            touchFirst={touchFirst}
            i18n={i18n}
            onOpen={() => setOpened(play)}
            onHold={(at) => (at === null ? setAdding(play) : setMenu({ play, at }))}
          />
        )}
      </RowList>
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
      {menu !== null && (
        <PlayMenu
          at={menu.at}
          i18n={i18n}
          onAddToSet={() => {
            setAdding(menu.play);
            setMenu(null);
          }}
          onClose={() => setMenu(null)}
        />
      )}
      {adding !== null && found !== null && (
        <AddToSetDialog
          name={nameOf(adding)}
          songNo={found.outcome === "resolved" ? found.songNo : chosen}
          candidates={found.outcome === "ambiguous" ? found.candidates.map(namedSong) : []}
          sets={kept.sets}
          i18n={i18n}
          onChooseSong={setChosen}
          onAdd={(set, songNo) => {
            kept.replaceSongs(set.id, [...set.songs, songNo]);
            shut();
          }}
          onNewSet={setNaming}
          onClose={shut}
        />
      )}
      {naming !== null && (
        <SetNameDialog
          title={i18n.t("favorites.newSet")}
          initial={newSetName(kept.sets, (number) => i18n.t("favorites.setName", { number }))}
          i18n={i18n}
          onCancel={() => setNaming(null)}
          onSave={(name) => {
            kept.add(name, [naming]);
            setNaming(null);
            shut();
          }}
        />
      )}
    </Stack>
  );
}

/** A play's row: a click opens its chart's details; a right-click, or a long press, its menu. */
function PlayRow({
  play,
  name,
  lane,
  order,
  place,
  touchFirst,
  i18n,
  onOpen,
  onHold,
}: {
  readonly play: RecentPlay;
  readonly name: { readonly text: string; readonly lang: string };
  readonly lane: PictureLane;
  readonly order: number;
  readonly place: RowPlace;
  readonly touchFirst: boolean;
  readonly i18n: Translator;
  readonly onOpen: () => void;
  /** Where the right-click landed; none for a long press. */
  readonly onHold: (at: Point | null) => void;
}) {
  const longPress = useLongPress(touchFirst, () => onHold(null));
  const rowProps: RowProps = {
    ...opensOnPress(onOpen),
    ...(touchFirst ? longPress : {}),
    onContextMenu: (event) => {
      event.preventDefault();
      if (!touchFirst) {
        onHold({ x: event.clientX, y: event.clientY });
      }
    },
  };
  return (
    <HistoryRow
      play={play}
      name={name}
      lane={lane}
      order={order}
      i18n={i18n}
      rowProps={rowProps}
      place={place}
    />
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
  if (scores.reading) {
    return <ScoresReading i18n={i18n} progress={scores.progress} song={scores.song} />;
  }
  if (!asked) {
    return <ProgressBar label={t("scores.readingSong", { song: play.songTitle })} />;
  }
  if (scores.failure !== null) {
    return <LoadFailed id="history-play-failure" failure={scores.failure} i18n={i18n} />;
  }
  return <Typography color="text.secondary">{t("history.noScore")}</Typography>;
}
