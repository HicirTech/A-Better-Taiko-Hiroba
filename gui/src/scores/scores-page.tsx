import type { Translator } from "@abth/i18n";
import { Stack, Typography } from "@mui/material";
import { useDeferredValue, useMemo, useState } from "react";
import type { PictureLane } from "../pictures/picture-lane";
import {
  type ListedScore,
  listedOf,
  matchesScore,
  matchesSearch,
  type ScoreFilter,
  type ScoreSort,
  sortScores,
  startingFilter,
} from "../shared/scores/score-order";
import type { ScoresState } from "../shared/scores/use-scores";
import type { ScoresStop, ScoreView } from "../shared/session-port";
import {
  DIFFICULTY_LABEL,
  GENRE_LABEL,
  LEVEL_DIFFICULTY,
} from "../shared/song-catalogue/genre-look";
import { keptShownDifficulty } from "../shared/song-catalogue/shown-difficulty";
import { fold } from "../shared/song-catalogue/song-search";
import type { SongCatalogue } from "../shared/song-catalogue/use-song-catalogue";
import { PLAY_ROW_PX, PlayRow } from "../songs/play-row";
import { ScoreDetails } from "../songs/score-details";
import { FrameTop, PAGE_HEIGHT } from "../ui/frame-top";
import type { ModalLook } from "../ui/large-modal";
import { LoadFailed } from "../ui/read-failure-alert";
import { RowList, type RowPlace } from "../ui/row-list";
import { SearchField } from "../ui/search-field";
import { StatusNote } from "../ui/status-note";
import { ScoreFilters } from "./score-filters";

const chartOf = ({ songNo, level }: ScoreView) => `${songNo}/${level}`;
const listedChart = (listed: ListedScore) => chartOf(listed.score);

/** The scores page: every played chart's newest reading, searched, narrowed and sorted. */
export function ScoresPage({
  scores,
  catalogue,
  lane,
  touchFirst,
  wide,
  modalLook,
  i18n,
}: {
  readonly scores: ScoresState;
  /** taiko.wiki's song list: the names in the player's language, and each chart's stars. */
  readonly catalogue: SongCatalogue;
  readonly lane: PictureLane;
  /** A touch screen: a pull reads. */
  readonly touchFirst: boolean;
  /** The window is wide enough for the side panel. */
  readonly wide: boolean;
  readonly modalLook: ModalLook;
  readonly i18n: Translator;
}) {
  const { t, number, locale } = i18n;
  const { view, reading, song, failure, readSong } = scores;
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
        <FrameTop wide={wide} touchFirst={touchFirst}>
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
        <RowList id="scores-list" rows={shown} keyOf={listedChart} rowPx={PLAY_ROW_PX}>
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
          modalLook={modalLook}
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
  return (
    <PlayRow
      play={score}
      name={{ text: listed.name, lang: listed.nameLang }}
      genres={listed.genres}
      stars={listed.stars}
      lane={lane}
      order={order}
      i18n={i18n}
      onOpen={onOpen}
      place={place}
      data-song-no={score.songNo}
      data-level={score.level}
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
