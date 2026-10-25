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
  type SortChoice,
  sortOf,
  sortScores,
  startingFilter,
} from "../shared/scores/score-order";
import type { ScoresState } from "../shared/scores/use-scores";
import type { ScoresStop, ScoreView } from "../shared/session-port";
import { newSetName } from "../shared/sets/favorite-sets";
import type { FavoriteSets } from "../shared/sets/use-favorite-sets";
import {
  DIFFICULTY_LABEL,
  GENRE_LABEL,
  LEVEL_DIFFICULTY,
} from "../shared/song-catalogue/genre-look";
import type { ShownDifficulty } from "../shared/song-catalogue/shown-difficulty";
import { fold } from "../shared/song-catalogue/song-search";
import type { SongCatalogue } from "../shared/song-catalogue/use-song-catalogue";
import { PLAY_ROW_PX, PlayRow } from "../songs/play-row";
import { ScoreDetails } from "../songs/score-details";
import { SetNameDialog } from "../songs/set-name-dialog";
import { FrameTop, PAGE_HEIGHT } from "../ui/frame-top";
import type { ItemAction, Point } from "../ui/item-actions";
import { ItemMenu, useItemMenu, useItemPress } from "../ui/item-menu";
import type { ModalLook } from "../ui/large-modal";
import { LoadFailed } from "../ui/read-failure-alert";
import { RowList, type RowPlace } from "../ui/row-list";
import { SearchField } from "../ui/search-field";
import { StatusNote } from "../ui/status-note";
import { AddToSetDialog } from "./add-to-set-dialog";
import { ScoreFilters } from "./score-filters";

const chartOf = ({ songNo, level }: ScoreView) => `${songNo}/${level}`;
const listedChart = (listed: ListedScore) => chartOf(listed.score);

/** The scores page: every played chart's newest reading, searched, narrowed and sorted. */
export function ScoresPage({
  scores,
  catalogue,
  lane,
  keptSets,
  shownDifficulty,
  startingSort,
  touchFirst,
  wide,
  modalLook,
  i18n,
}: {
  readonly scores: ScoresState;
  /** taiko.wiki's song list: the names in the player's language, and each chart's stars. */
  readonly catalogue: SongCatalogue;
  readonly lane: PictureLane;
  /** The sets kept on this device, which a chart's song can go into. */
  readonly keptSets: FavoriteSets;
  /** The difficulty the filter starts on, as Settings chose it. */
  readonly shownDifficulty: ShownDifficulty;
  /** The sort the page starts on, as Settings chose it. */
  readonly startingSort: SortChoice;
  /** A touch screen: a pull reads, and a long press opens a chart's menu. */
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
  const [filter, setFilter] = useState<ScoreFilter>(() => startingFilter(shownDifficulty));
  const [sort, setSort] = useState<ScoreSort | null>(() => sortOf(startingSort));
  const [opened, setOpened] = useState<string | null>(null);
  // The chart whose song is being added to a set.
  const [adding, setAdding] = useState<ListedScore | null>(null);
  // The song a new set starts with, while its name is asked.
  const [naming, setNaming] = useState<string | null>(null);
  const rowActions = (one: ListedScore): readonly ItemAction[] => [
    { key: "add", label: t("history.addToSet"), chooses: true, onPick: () => setAdding(one) },
  ];
  const menu = useItemMenu(rowActions);

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
            lane={lane}
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
              touchFirst={touchFirst}
              i18n={i18n}
              onOpen={() => setOpened(listedChart(one))}
              onMenu={(at) => menu.open(one, at)}
            />
          )}
        </RowList>
        <ScoreDetails
          listed={openedScore}
          lane={lane}
          reading={reading}
          readingSong={song !== null && song.songNo === openedScore?.score.songNo}
          touchFirst={touchFirst}
          modalLook={modalLook}
          i18n={i18n}
          onReadSong={(score) => void readSong(score)}
          onClose={() => setOpened(null)}
        />
        <ItemMenu
          id="scores-row-menu"
          dialogId="scores-row-actions"
          opened={menu.opened}
          nameOf={(one) => one.name}
          actionsOf={rowActions}
          cancel={t("favorites.delete.cancel")}
          onClose={menu.close}
        />
        {adding !== null && (
          <AddToSetDialog
            name={{ text: adding.name, lang: adding.nameLang }}
            songNo={adding.score.songNo}
            sets={keptSets.sets}
            touchFirst={touchFirst}
            modalLook={modalLook}
            i18n={i18n}
            onAdd={(set) => {
              keptSets.replaceSongs(set.id, [...set.songs, adding.score.songNo]);
              setAdding(null);
            }}
            onNewSet={() => setNaming(adding.score.songNo)}
            onClose={() => setAdding(null)}
          />
        )}
        {naming !== null && (
          <SetNameDialog
            title={t("favorites.newSet")}
            initial={newSetName(keptSets.sets, (count) =>
              t("favorites.setName", { number: count }),
            )}
            i18n={i18n}
            onCancel={() => setNaming(null)}
            onSave={(name) => {
              keptSets.add(name, [naming]);
              setNaming(null);
              setAdding(null);
            }}
          />
        )}
      </Stack>
    </>
  );
}

/** A chart's row: a press opens its details; a right-click or a long press, its menu. */
function ScoreRow({
  listed,
  lane,
  order,
  place,
  touchFirst,
  i18n,
  onOpen,
  onMenu,
}: {
  readonly listed: ListedScore;
  readonly lane: PictureLane;
  readonly order: number;
  readonly place: RowPlace;
  readonly touchFirst: boolean;
  readonly i18n: Translator;
  readonly onOpen: () => void;
  /** Where the right-click landed; none for a long press. */
  readonly onMenu: (at: Point | null) => void;
}) {
  const { score } = listed;
  const { handlers, held } = useItemPress(touchFirst, onMenu);
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
      handlers={handlers}
      held={held}
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
