import { chartKey } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Box, Stack } from "@mui/material";
import { useCallback, useMemo, useState } from "react";

import { newSetName, SET_SONG_LIMIT } from "../favorites/favorite-sets";
import { FilterChip } from "../favorites/filter-chip";
import { DIFFICULTY_COLOUR, DIFFICULTY_LABEL, DIFFICULTY_TEXT } from "../favorites/genre-look";
import { SetNameDialog } from "../favorites/set-name-dialog";
import { keptShownDifficulty, SHOWN_DIFFICULTIES } from "../favorites/shown-difficulty";
import { SongListFailed } from "../favorites/song-list-failed";
import { resolveSong } from "../favorites/song-look";
import { useFavoriteSets } from "../favorites/use-favorite-sets";
import type { SongCatalogue } from "../favorites/use-song-catalogue";
import { PAGE_HEIGHT } from "../navigation/app-frame";
import type { PictureLane } from "../pictures/picture-lane";
import type { SystemToast } from "../platform";
import { ScoreDetails } from "../scores/score-details";
import { listedOf } from "../scores/scores-page";
import type { ScoresState } from "../scores/use-scores";
import type { ListedChartsView, ShownSong } from "../session-port";
import { LoadFailed } from "../ui/read-failure-alert";
import { CARD_GAP } from "../ui/section-card";
import { StatusNote } from "../ui/status-note";
import { AddSongsDialog } from "./add-songs-dialog";
import { BandItem } from "./band-item";
import { ChartList } from "./chart-list";
import { CrownsItem } from "./crowns-item";
import { anchorOf, gapKindOf, gapsOf, nearestFirst } from "./gaps";
import { type KnownChart, knownCharts, shownAt } from "./known-charts";
import { NearMissItem } from "./near-miss-item";
import type { PageParts } from "./page-parts";
import { RanksItem } from "./ranks-item";

/** Where the player stands, from the kept scores and taiko.wiki's list; asks Hiroba nothing. */
export function KnowYourselfPage({
  scores,
  listed,
  catalogue,
  lane,
  touchFirst,
  toast,
  i18n,
}: {
  readonly scores: ScoresState;
  /** Every chart the lists name, held by the window across visits. */
  readonly listed: ListedChartsView | null;
  /** taiko.wiki's song list: each chart's stars, notes and tempo, and the names. */
  readonly catalogue: SongCatalogue;
  readonly lane: PictureLane;
  /** A touch screen: a pull reads. */
  readonly touchFirst: boolean;
  /** Where a long-press names a legend's item, on a touch screen. */
  readonly toast: SystemToast | undefined;
  readonly i18n: Translator;
}) {
  const { t, number, locale } = i18n;
  const { view, reading, song, failure, readSong } = scores;
  const kept = useFavoriteSets();
  const [shown, setShown] = useState(keptShownDifficulty);
  const [opened, setOpened] = useState<string | null>(null);
  const [details, setDetails] = useState<string | null>(null);
  const [adding, setAdding] = useState<readonly string[] | null>(null);
  const [naming, setNaming] = useState<readonly string[] | null>(null);

  const known = useMemo(
    () =>
      listed === null || catalogue.state !== "ready" ? null : knownCharts(listed, catalogue.songs),
    [listed, catalogue.state, catalogue.songs],
  );
  const here = useMemo(() => (known === null ? [] : shownAt(known, shown)), [known, shown]);
  const anchor = useMemo(() => anchorOf(here), [here]);
  const scoreOf = useMemo(
    () => new Map((view?.scores ?? []).map((score) => [chartKey(score), score])),
    [view],
  );
  const remembered = useMemo(
    () =>
      new Map<string, ShownSong>(
        (listed?.songs ?? []).map(({ songNo, title, genres }) => [
          songNo,
          { songNo, title, genre: genres[0] ?? null },
        ]),
      ),
    [listed],
  );
  const lookOf = useCallback(
    (songNo: string) => resolveSong(songNo, catalogue.songs, remembered, locale),
    [catalogue.songs, remembered, locale],
  );
  const opener = (chart: KnownChart) =>
    scoreOf.has(chartKey(chart)) ? () => setDetails(chartKey(chart)) : undefined;
  const chartList: PageParts["chartList"] = (id, charts, note) => (
    <ChartList
      key={id}
      id={id}
      charts={charts}
      note={note}
      narrows={false}
      lookOf={lookOf}
      opener={opener}
      lane={lane}
      i18n={i18n}
      onAdd={setAdding}
    />
  );
  const parts: PageParts = {
    i18n,
    lane,
    toast,
    openedIn: (part) =>
      opened?.startsWith(`${part}:`) === true ? opened.slice(part.length + 1) : null,
    toggleIn: (part) => (row) =>
      setOpened((now) => (now === `${part}:${row}` ? null : `${part}:${row}`)),
    gapList: (id, charts) => {
      const gaps = gapsOf(charts);
      return gaps.length === 0
        ? null
        : () => (
            <ChartList
              key={id}
              id={id}
              charts={nearestFirst(gaps, anchor)}
              note={(chart) => t(gapKindOf(chart) === "never" ? "know.never" : "know.tried")}
              narrows
              lookOf={lookOf}
              opener={opener}
              lane={lane}
              i18n={i18n}
              onAdd={setAdding}
            />
          );
    },
    chartList,
  };

  const openedScore = details === null ? undefined : scoreOf.get(details);
  const settled = view !== null && !reading && failure === null;
  const difficulties = SHOWN_DIFFICULTIES.map((difficulty) => ({
    value: difficulty,
    label: t(DIFFICULTY_LABEL[difficulty]),
    fill: { colour: DIFFICULTY_COLOUR[difficulty], text: DIFFICULTY_TEXT },
  }));
  return (
    <Stack spacing={3} id="know-yourself-page" sx={{ minHeight: PAGE_HEIGHT }}>
      {failure !== null && <LoadFailed id="know-scores-failure" failure={failure} i18n={i18n} />}
      {catalogue.state === "failed" && (
        <Box>
          <SongListFailed id="know-songs" catalogue={catalogue} i18n={i18n} />
        </Box>
      )}
      {settled && listed !== null && listed.charts.length === 0 && (
        <StatusNote id="know-empty" fill>
          {t(touchFirst ? "scores.emptyPull" : "scores.emptyReadAgain")}
        </StatusNote>
      )}
      {settled && view.unread > 0 && (
        <StatusNote id="know-unread">
          {t("scores.unread", { count: number(view.unread) })}
        </StatusNote>
      )}
      {known !== null && known.length > 0 && (
        <>
          <Box>
            <FilterChip
              id="know-difficulty"
              name={t("picker.difficulty")}
              options={difficulties}
              chosen={shown}
              i18n={i18n}
              required
              onChoose={(next) => {
                if (next !== null) {
                  setShown(next);
                  setOpened(null);
                }
              }}
            />
          </Box>
          <Stack spacing={CARD_GAP}>
            <CrownsItem charts={here} parts={parts} />
            <RanksItem charts={here} parts={parts} />
            <BandItem view="perSecond" charts={here} parts={parts} />
            <BandItem view="bpm" charts={here} parts={parts} />
            <NearMissItem crown="fullCombo" charts={here} parts={parts} />
            <NearMissItem crown="donderful" charts={here} parts={parts} />
          </Stack>
        </>
      )}
      <ScoreDetails
        listed={openedScore === undefined ? null : listedOf(openedScore, catalogue, locale)}
        lane={lane}
        reading={reading}
        readingSong={song !== null && song.songNo === openedScore?.songNo}
        i18n={i18n}
        onReadSong={(score) => void readSong(score)}
        onClose={() => setDetails(null)}
      />
      {adding !== null && (
        <AddSongsDialog
          songs={adding}
          sets={kept.sets}
          i18n={i18n}
          onAdd={(set, added) => {
            kept.replaceSongs(set.id, [...set.songs, ...added]);
            setAdding(null);
          }}
          onNewSet={() => setNaming(adding.slice(0, SET_SONG_LIMIT))}
          onClose={() => setAdding(null)}
        />
      )}
      {naming !== null && (
        <SetNameDialog
          title={t("favorites.newSet")}
          initial={newSetName(kept.sets, (count) => t("favorites.setName", { number: count }))}
          i18n={i18n}
          onCancel={() => setNaming(null)}
          onSave={(name) => {
            kept.add(name, naming);
            setNaming(null);
            setAdding(null);
          }}
        />
      )}
    </Stack>
  );
}
