import type { Translator } from "@abth/i18n";
import { Stack, Typography } from "@mui/material";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { DIFFICULTY_LABEL, GENRE_LABEL, LEVEL_DIFFICULTY } from "../favorites/genre-look";
import { keptShownDifficulty } from "../favorites/shown-difficulty";
import { nameLanguage, shownName } from "../favorites/song-names";
import { fold, searchedNames } from "../favorites/song-search";
import type { SongCatalogue } from "../favorites/use-song-catalogue";
import { HISTORY_ROW_PX, HistoryRow, opensOnPress, type RowProps } from "../history/history-row";
import { HIROBA_LANG } from "../language/hiroba-lang";
import { FrameTop, PAGE_HEIGHT } from "../navigation/app-frame";
import type { PictureLane } from "../pictures/picture-lane";
import type { ScoresProgress, ScoresStop, ScoreView } from "../session-port";
import { ProgressBar } from "../ui/progress-bar";
import { LoadFailed } from "../ui/read-failure-alert";
import { RowList, type RowPlace } from "../ui/row-list";
import { SearchField } from "../ui/search-field";
import { StatusNote } from "../ui/status-note";
import { ScoreDetails } from "./score-details";
import { ScoreFilters } from "./score-filters";
import {
  type ListedScore,
  matchesScore,
  matchesSearch,
  type ScoreFilter,
  type ScoreSort,
  sortScores,
  startingFilter,
} from "./score-order";
import type { ChosenSong, ScoresState } from "./use-scores";

const chartOf = ({ songNo, level }: ScoreView) => `${songNo}/${level}`;
const listedChart = (listed: ListedScore) => chartOf(listed.score);

/** A chart's score as the page lists it, its song named as the player's language names it. */
export function listedOf(score: ScoreView, catalogue: SongCatalogue, locale: Translator["locale"]) {
  const song = catalogue.songs.get(score.songNo);
  const name = song === undefined ? score.songTitle : shownName(song, locale);
  const names = song === undefined ? [] : searchedNames(song);
  return {
    score,
    name,
    nameLang: song === undefined ? HIROBA_LANG : nameLanguage(song, name),
    searched: [score.songTitle, ...names].map(fold),
    stars: song?.levels[LEVEL_DIFFICULTY[score.level]] ?? null,
  } satisfies ListedScore;
}

/** The scores page: every played chart's newest reading, searched, narrowed and sorted. */
export function ScoresPage({
  scores,
  catalogue,
  lane,
  touchFirst,
  i18n,
}: {
  readonly scores: ScoresState;
  /** taiko.wiki's song list: the names in the player's language, and each chart's stars. */
  readonly catalogue: SongCatalogue;
  readonly lane: PictureLane;
  /** A touch screen: a pull reads. */
  readonly touchFirst: boolean;
  readonly i18n: Translator;
}) {
  const { t, number, locale } = i18n;
  const { view, reading, progress, song, failure, load, readSong } = scores;
  useEffect(load, [load]);
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [filter, setFilter] = useState<ScoreFilter>(() => startingFilter(keptShownDifficulty()));
  const [sort, setSort] = useState<ScoreSort | null>(null);
  const [opened, setOpened] = useState<string | null>(null);

  const rows = view?.scores ?? [];
  const listed = useMemo(
    () => rows.map((score) => listedOf(score, catalogue, locale)),
    [rows, catalogue, locale],
  );
  const names = useMemo(() => new Intl.Collator(locale), [locale]);
  const folded = fold(deferred).trim();
  const shown = useMemo(
    () =>
      sortScores(
        listed.filter((one) => matchesScore(one, filter) && matchesSearch(one, folded)),
        sort,
        names,
      ),
    [listed, filter, folded, sort, names],
  );
  const openedScore = listed.find((one) => listedChart(one) === opened) ?? null;
  const settled = view !== null && !reading && failure === null;
  return (
    <>
      {rows.length > 0 && (
        <FrameTop>
          <SearchField
            id="scores-search"
            query={query}
            i18n={i18n}
            hint={t("picker.searchHint")}
            onQuery={setQuery}
          />
        </FrameTop>
      )}
      <Stack spacing={2} id="scores-page" sx={{ minHeight: PAGE_HEIGHT }}>
        {reading && (
          <ScoresReading id="scores-reading" i18n={i18n} progress={progress} song={song} />
        )}
        {failure !== null && (
          <LoadFailed id="scores-failure" failure={failure} i18n={i18n}>
            {failure.at !== undefined && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {stopText(i18n, failure.at)}
              </Typography>
            )}
          </LoadFailed>
        )}
        {settled && rows.length === 0 && (
          <StatusNote id="scores-empty" fill>
            {t(touchFirst ? "scores.emptyPull" : "scores.emptyReadAgain")}
          </StatusNote>
        )}
        {settled && rows.length > 0 && scores.nothingNew && (
          <StatusNote id="scores-nothing-new">{t("scores.nothingNew")}</StatusNote>
        )}
        {settled && rows.length > 0 && view.unread > 0 && (
          <StatusNote id="scores-unread">
            {t("scores.unread", { count: number(view.unread) })}
          </StatusNote>
        )}
        {rows.length > 0 && (
          <ScoreFilters
            filter={filter}
            sort={sort}
            i18n={i18n}
            onFilter={(part) => setFilter((now) => ({ ...now, ...part }))}
            onSort={setSort}
          />
        )}
        {rows.length > 0 && shown.length === 0 && (
          <StatusNote id="scores-no-match" fill>
            {t("scores.noMatch")}
          </StatusNote>
        )}
        <RowList id="scores-list" rows={shown} keyOf={listedChart} rowPx={HISTORY_ROW_PX}>
          {(one, index, place) => (
            <ScoreRow
              listed={one}
              lane={lane}
              order={index}
              place={place}
              i18n={i18n}
              onOpen={() => setOpened(listedChart(one))}
            />
          )}
        </RowList>
        <ScoreDetails
          listed={openedScore}
          lane={lane}
          reading={reading}
          readingSong={song !== null && song.songNo === openedScore?.score.songNo}
          i18n={i18n}
          onReadSong={(score) => void readSong(score)}
          onClose={() => setOpened(null)}
        />
      </Stack>
    </>
  );
}

/** A chart's row: a click, Enter or Space opens its details. */
function ScoreRow({
  listed,
  lane,
  order,
  place,
  i18n,
  onOpen,
}: {
  readonly listed: ListedScore;
  readonly lane: PictureLane;
  readonly order: number;
  readonly place: RowPlace;
  readonly i18n: Translator;
  readonly onOpen: () => void;
}) {
  const { score } = listed;
  const rowProps: RowProps = {
    ...opensOnPress(onOpen),
    "data-song-no": score.songNo,
    "data-level": score.level,
  };
  return (
    <HistoryRow
      play={score}
      name={{ text: listed.name, lang: listed.nameLang }}
      lane={lane}
      order={order}
      i18n={i18n}
      rowProps={rowProps}
      place={place}
    />
  );
}

/** What a read of scores is doing: the walk's page, the lists or charts so far, or one song. */
export function scoresReadingText(
  i18n: Translator,
  progress: ScoresProgress | null,
  song: ChosenSong | null,
): string {
  if (song !== null) {
    return i18n.t("scores.readingSong", { song: song.songTitle });
  }
  if (progress === null || progress.step === "recentPlays") {
    return i18n.t("scores.readingPlays", { page: progress?.page ?? 1 });
  }
  const key = progress.step === "lists" ? "scores.readingLists" : "scores.readingCharts";
  return i18n.t(key, { done: i18n.number(progress.done), total: i18n.number(progress.total) });
}

/** A read of scores as a progress bar: it fills once the read knows its lists or charts. */
export function ScoresReading({
  id,
  i18n,
  progress,
  song,
}: {
  readonly id?: string | undefined;
  readonly i18n: Translator;
  readonly progress: ScoresProgress | null;
  readonly song: ChosenSong | null;
}) {
  const counted = song === null && progress !== null && progress.step !== "recentPlays";
  return (
    <ProgressBar
      id={id}
      label={scoresReadingText(i18n, progress, song)}
      progress={counted ? progress : null}
    />
  );
}

function stopText(i18n: Translator, at: ScoresStop): string {
  switch (at.kind) {
    case "recentPlays":
      return i18n.t("history.failedPage", { page: at.page });
    case "list":
      return i18n.t("scores.failedList", { genre: i18n.t(GENRE_LABEL[at.genre]) });
    case "detail":
      return i18n.t("scores.failedChart", {
        song: at.songTitle ?? at.songNo,
        difficulty: i18n.t(DIFFICULTY_LABEL[LEVEL_DIFFICULTY[at.level]]),
      });
  }
}
