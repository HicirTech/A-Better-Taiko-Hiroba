import type { Translator } from "@abth/i18n";
import { Stack, TextField, Typography } from "@mui/material";
import { useContext, useDeferredValue, useEffect, useMemo, useState } from "react";

import { DIFFICULTY_LABEL, GENRE_LABEL, LEVEL_DIFFICULTY } from "../favorites/genre-look";
import { ShownDifficultyContext } from "../favorites/shown-difficulty";
import { nameLanguage, shownName } from "../favorites/song-names";
import { fold, searchedNames } from "../favorites/song-search";
import type { SongCatalogue } from "../favorites/use-song-catalogue";
import { HistoryRow, type RowProps } from "../history/history-row";
import { HIROBA_LANG } from "../language/hiroba-lang";
import { LoadFailed, Waiting } from "../my-page/editor-parts";
import type { PictureLane } from "../pictures/picture-lane";
import type { ScoresProgress, ScoresStop, ScoreView } from "../session-port";
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
import type { ScoresState } from "./use-scores";

const LIST = { listStyle: "none", m: 0, p: 0 } as const;

const chartOf = ({ songNo, level }: ScoreView) => `${songNo}/${level}`;

/** A chart's score as the page lists it, its song named as the player's language names it. */
function listedOf(score: ScoreView, catalogue: SongCatalogue, locale: Translator["locale"]) {
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
  const shownDifficulty = useContext(ShownDifficultyContext);
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [filter, setFilter] = useState<ScoreFilter>(() => startingFilter(shownDifficulty));
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
  const openedScore = listed.find((one) => chartOf(one.score) === opened) ?? null;
  const settled = view !== null && !reading && failure === null;
  return (
    <Stack spacing={2} id="scores-page">
      {reading && <Waiting id="scores-reading">{scoresReadingText(i18n, progress, song)}</Waiting>}
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
        <Typography id="scores-empty" color="text.secondary">
          {t(touchFirst ? "scores.emptyPull" : "scores.emptyReadAgain")}
        </Typography>
      )}
      {settled && rows.length > 0 && scores.nothingNew && (
        <Typography id="scores-nothing-new" color="text.secondary">
          {t("scores.nothingNew")}
        </Typography>
      )}
      {settled && rows.length > 0 && view.unread > 0 && (
        <Typography id="scores-unread" color="text.secondary">
          {t("scores.unread", { count: number(view.unread) })}
        </Typography>
      )}
      {rows.length > 0 && (
        <Stack spacing={1.5}>
          <TextField
            id="scores-search"
            type="search"
            size="small"
            label={t("picker.search")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <ScoreFilters
            filter={filter}
            sort={sort}
            i18n={i18n}
            onFilter={(part) => setFilter((now) => ({ ...now, ...part }))}
            onSort={setSort}
          />
        </Stack>
      )}
      {rows.length > 0 && shown.length === 0 && (
        <Typography id="scores-no-match" color="text.secondary">
          {t("scores.noMatch")}
        </Typography>
      )}
      <Stack component="ul" id="scores-list" spacing={0} sx={LIST}>
        {shown.map((one, index) => (
          <ScoreRow
            key={chartOf(one.score)}
            listed={one}
            lane={lane}
            order={index}
            i18n={i18n}
            onOpen={() => setOpened(chartOf(one.score))}
          />
        ))}
      </Stack>
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
  );
}

/** A chart's row: a click, Enter or Space opens its details. */
function ScoreRow({
  listed,
  lane,
  order,
  i18n,
  onOpen,
}: {
  readonly listed: ListedScore;
  readonly lane: PictureLane;
  readonly order: number;
  readonly i18n: Translator;
  readonly onOpen: () => void;
}) {
  const { score } = listed;
  const rowProps: RowProps = {
    role: "button",
    tabIndex: 0,
    "aria-haspopup": "dialog",
    "data-song-no": score.songNo,
    "data-level": score.level,
    onClick: onOpen,
    onKeyDown: (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onOpen();
      }
    },
  };
  return (
    <HistoryRow
      play={score}
      name={{ text: listed.name, lang: listed.nameLang }}
      lane={lane}
      order={order}
      i18n={i18n}
      rowProps={rowProps}
    />
  );
}

/** What a read of scores is doing: the walk's page, the lists or charts so far, or one song. */
export function scoresReadingText(
  i18n: Translator,
  progress: ScoresProgress | null,
  song: ScoreView | null,
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
