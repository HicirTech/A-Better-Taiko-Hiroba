import type { Translator } from "@abth/i18n";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import type { PictureLane } from "../pictures/picture-lane";
import type { HirobaSessionPort } from "../shared/session-port";
import {
  filledSlots,
  moved,
  newSetName,
  SET_SONG_LIMIT,
  sameSongs,
  toggledSongs,
} from "../shared/sets/favorite-sets";
import { useFavoriteSets } from "../shared/sets/use-favorite-sets";
import type { ChartSource } from "../shared/song-catalogue/chart-source";
import type { ShownDifficulty } from "../shared/song-catalogue/shown-difficulty";
import { rememberedSongs, resolveSong } from "../shared/song-catalogue/song-look";
import type { SongCatalogue } from "../shared/song-catalogue/use-song-catalogue";
import { SetNameDialog } from "../songs/set-name-dialog";
import { SongDetails } from "../songs/song-details";
import type { DetailsOpener } from "../songs/song-look-row";
import { useBackLeaves } from "../ui/back-closers";
import { HELD_STILL, useFocusKept } from "../ui/editor-parts";
import { COLUMN_MAX_WIDTH_PX } from "../ui/frame-top";
import { ListIcon } from "../ui/icons";
import type { ModalLook } from "../ui/large-modal";
import { LoadFailed } from "../ui/read-failure-alert";
import { CARD_GAP } from "../ui/section-card";
import { SYNC_BAR_PAGE, SyncBar } from "../ui/sync-bar";
import { useTouchFirst } from "../ui/use-touch-first";
import { WriteOutcomeSnackbar } from "../ui/write-outcome";
import { shownFavoritesOf } from "./favorites-state";
import { FolderCard } from "./folder-card";
import type { PickableState } from "./pickable-songs";
import { SetView } from "./set-view";
import { SetsDrawer } from "./sets-drawer";
import { SongCard } from "./song-card";
import { SongPicker } from "./song-picker";
import type { FavoritesEditor } from "./use-favorites";
import { useSetsSwipe } from "./use-sets-swipe";

const NO_SONGS: readonly string[] = [];

/** What the name dialog asks for: a new set, opened for editing or not, or a set's new name. */
/** A new set whose name is asked: its songs, and whether it opens in edit mode. */
interface Naming {
  readonly songs: readonly string[];
  readonly editing: boolean;
}

export interface FavoritesPageProps {
  readonly favorites: FavoritesEditor;
  readonly catalogue: SongCatalogue;
  /** A song's details read its charts' pictures here, and Hiroba's difficulty icons from `lane`. */
  readonly port: Pick<
    HirobaSessionPort,
    "readChartPicture" | "readChartDensity" | "readChartTja" | "readDrawnChart" | "keepDrawnChart"
  >;
  readonly lane: PictureLane;
  /** The songs Hiroba's own picker offers: neither picker lists any other. */
  readonly pickable: PickableState;
  /** As a picker opens: reads the list when it is stale. */
  readonly onPickerOpen: () => void;
  /** The difficulty whose level the songs show in front of the others. */
  readonly shownDifficulty: ShownDifficulty;
  /** Where a song's details take their chart pictures from. */
  readonly chartSource: ChartSource;
  readonly modalLook: ModalLook;
  readonly i18n: Translator;
}

/** The page: Hiroba's お気に入り and 大好きな曲, and the sets kept on the device. */
export function FavoritesPage({
  favorites,
  catalogue,
  port,
  lane,
  pickable,
  onPickerOpen,
  shownDifficulty,
  chartSource,
  modalLook,
  i18n,
}: FavoritesPageProps) {
  const { t, locale } = i18n;
  const { step, pickSong } = favorites;
  const shown = shownFavoritesOf(step);
  const keptSets = useFavoriteSets();
  const { sets } = keptSets;
  // The folder on Hiroba is shown until a set is picked from the drawer.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // A set is shown, then edited after Edit; the edits wait apart until Save.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<readonly string[] | null>(null);
  const [naming, setNaming] = useState<Naming | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [picking, setPicking] = useState<"song" | "set" | null>(null);
  const openPicker = (picker: "song" | "set") => {
    onPickerOpen();
    catalogue.readIfFailed();
    setPicking(picker);
  };
  const [openSongNo, setOpenSongNo] = useState<string | null>(null);
  const page = useRef<HTMLDivElement>(null);
  useFocusKept(page, step.name);
  const touchFirst = useTouchFirst();
  // A song's details stand over the page, so the sets' swipe waits until they shut.
  useSetsSwipe({
    active: touchFirst && openSongNo === null,
    open: drawerOpen,
    onOpenChange: setDrawerOpen,
  });

  const set = sets.find((one) => one.id === selectedId) ?? null;
  const setId = set?.id ?? null;
  const folderSongs = shown === null ? null : filledSlots(shown.view.folder.state);
  const inUse =
    folderSongs === null || folderSongs.length === 0
      ? null
      : (sets.find((one) => sameSongs(one.songs, folderSongs)) ?? null);
  const view = shown?.view ?? null;
  const remembered = useMemo(() => rememberedSongs(view), [view]);
  const look = useCallback(
    (songNo: string) => resolveSong(songNo, catalogue.songs, remembered, locale),
    [catalogue.songs, remembered, locale],
  );
  const openDetails = useCallback<DetailsOpener>(
    (songNo) => (catalogue.songs.has(songNo) ? () => setOpenSongNo(songNo) : undefined),
    [catalogue.songs],
  );
  const songChoice = useMemo(() => ({ kind: "one", onPick: pickSong }) as const, [pickSong]);
  const savedSongs = set?.songs ?? NO_SONGS;
  const editedSongs = draft ?? savedSongs;
  const edited = draft !== null && !sameSongs(draft, savedSongs);
  const edit = useCallback(
    (change: (songs: readonly string[]) => readonly string[]) =>
      setDraft((now) => change(now ?? savedSongs)),
    [savedSongs],
  );
  const toggleInSet = useCallback(
    (songNo: string) => edit((songs) => toggledSongs(songs, songNo)),
    [edit],
  );
  const setChoice = useMemo(
    () =>
      ({
        kind: "many",
        picked: editedSongs,
        limit: SET_SONG_LIMIT,
        onToggle: toggleInSet,
      }) as const,
    [editedSongs, toggleInSet],
  );
  const showSet = (id: string | null, editingIt = false) => {
    setSelectedId(id);
    setDraft(null);
    setEditing(editingIt);
  };
  const leaveEditing = () => {
    setDraft(null);
    setEditing(false);
  };
  // A set shown from the drawer is a level of its own: Back goes to the current favourites.
  useBackLeaves(set !== null, () => showSet(null));
  useBackLeaves(editing, leaveEditing);
  const named = (name: string) => {
    if (naming !== null) {
      showSet(keptSets.add(name, naming.songs), naming.editing);
    }
    setNaming(null);
    setDrawerOpen(false);
  };

  // Focus leaves the button a write shuts, so it is not dropped to the window's top.
  const saveSong = () => {
    page.current?.focus({ preventScroll: true });
    void favorites.saveSong();
  };
  const apply = async (songs: readonly string[]) => {
    page.current?.focus({ preventScroll: true });
    await favorites.applySet(songs);
    showSet(null);
  };
  const setsLabel = t("favorites.sets");
  // A set shown syncs as it is kept; its edits, on the device, wait for Save first.
  const canApply =
    set !== null &&
    !editing &&
    shown !== null &&
    !shown.shut &&
    set.songs.length > 0 &&
    !sameSongs(set.songs, folderSongs ?? NO_SONGS);
  const songPicked = shown !== null && !shown.shut && shown.draft !== null;
  return (
    <Box
      id="favorites-page"
      ref={page}
      data-step={step.name}
      tabIndex={-1}
      sx={{
        ...SYNC_BAR_PAGE,
        width: 1,
        maxWidth: COLUMN_MAX_WIDTH_PX,
        alignSelf: "center",
        outline: "none",
      }}
    >
      <Stack spacing={2} sx={{ pb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography id="favorites-name" variant="h6" component="h2" noWrap>
              {set === null ? t("favorites.current") : set.name}
            </Typography>
          </Box>
          {/* A touch screen opens the drawer by a swipe from the right edge instead. */}
          {!touchFirst && (
            <IconButton
              id="favorites-sets"
              aria-label={setsLabel}
              title={setsLabel}
              aria-expanded={drawerOpen}
              aria-controls={drawerOpen ? "favorites-drawer" : undefined}
              onClick={() => setDrawerOpen(true)}
            >
              <ListIcon />
            </IconButton>
          )}
        </Box>
        {set !== null ? (
          <SetView
            key={set.id}
            songs={editedSongs}
            look={look}
            shownDifficulty={shownDifficulty}
            i18n={i18n}
            openDetails={openDetails}
            editing={editing}
            edited={edited}
            byLongPress={touchFirst}
            onEdit={() => setEditing(true)}
            onAddSongs={() => openPicker("set")}
            onRemoveSong={(songNo) => edit((songs) => songs.filter((song) => song !== songNo))}
            onMoveSong={(from, to) => edit((songs) => moved(songs, from, to))}
            onReset={() => setDraft(null)}
            onSave={() => {
              if (draft !== null) {
                keptSets.replaceSongs(set.id, draft);
              }
              leaveEditing();
            }}
          />
        ) : shown === null ? (
          failureOf(favorites, i18n)
        ) : (
          <>
            {failureOf(favorites, i18n)}
            <Stack spacing={CARD_GAP} inert={shown.shut} sx={shown.shut ? HELD_STILL : undefined}>
              <SongCard
                shown={shown}
                look={look}
                shownDifficulty={shownDifficulty}
                i18n={i18n}
                openDetails={openDetails}
                onChange={() => openPicker("song")}
              />
              <FolderCard
                shown={shown}
                look={look}
                shownDifficulty={shownDifficulty}
                i18n={i18n}
                openDetails={openDetails}
                sets={sets}
                inUse={inUse}
                onSaveAsSet={() =>
                  setNaming({ songs: filledSlots(shown.view.folder.state), editing: false })
                }
                onSaveToSet={(id) =>
                  keptSets.replaceSongs(id, filledSlots(shown.view.folder.state))
                }
              />
            </Stack>
          </>
        )}
      </Stack>
      {(set !== null || shown !== null) && (
        <SyncBar
          id="favorites"
          canSync={set !== null ? canApply : songPicked}
          onSync={set !== null ? () => void apply(set.songs) : saveSong}
          onReset={set !== null ? undefined : favorites.resetSong}
          canReset={songPicked}
          saving={shown !== null && shown.saving !== null}
          i18n={i18n}
        />
      )}
      {shown?.notice?.write === "favoriteSong" && (
        <WriteOutcomeSnackbar
          id="favorite-song-outcome"
          kind="favoriteSong"
          outcome={shown.notice.outcome}
          i18n={i18n}
          onClosed={favorites.closeNotice}
        />
      )}
      {shown?.notice?.write === "folder" && (
        <WriteOutcomeSnackbar
          id="favorite-folder-outcome"
          kind="folder"
          outcome={shown.notice.outcome}
          i18n={i18n}
          onClosed={favorites.closeNotice}
        />
      )}
      <SetsDrawer
        open={drawerOpen}
        sets={sets}
        folderSongs={folderSongs}
        selectedId={setId}
        byLongPress={touchFirst}
        i18n={i18n}
        onPick={(id) => {
          showSet(id);
          setDrawerOpen(false);
        }}
        onAdd={() => setNaming({ songs: [], editing: true })}
        onMove={keptSets.moveSet}
        onRename={keptSets.rename}
        onDelete={(id) => {
          keptSets.remove(id);
          if (id === selectedId) {
            showSet(null);
          }
        }}
        onClose={() => setDrawerOpen(false)}
      />
      <SongPicker
        open={picking === "song"}
        choice={songChoice}
        catalogue={catalogue}
        pickable={pickable}
        shownDifficulty={shownDifficulty}
        modalLook={modalLook}
        i18n={i18n}
        onClose={() => setPicking(null)}
      />
      {naming !== null && (
        <SetNameDialog
          title={t("favorites.newSet")}
          initial={newSetName(sets, (number) => t("favorites.setName", { number }))}
          i18n={i18n}
          onCancel={() => setNaming(null)}
          onSave={named}
        />
      )}
      {set !== null && (
        <SongPicker
          open={picking === "set"}
          choice={setChoice}
          catalogue={catalogue}
          pickable={pickable}
          shownDifficulty={shownDifficulty}
          modalLook={modalLook}
          i18n={i18n}
          onClose={() => setPicking(null)}
        />
      )}
      <SongDetails
        song={openSongNo === null ? null : (catalogue.songs.get(openSongNo) ?? null)}
        port={port}
        lane={lane}
        modalLook={modalLook}
        touchFirst={touchFirst}
        chartSource={chartSource}
        shownDifficulty={shownDifficulty}
        i18n={i18n}
        onClose={() => setOpenSongNo(null)}
      />
    </Box>
  );
}

// Any read waits under the page's skeleton; one that failed says so here, over what it held.
function failureOf(favorites: FavoritesEditor, i18n: Translator): ReactNode {
  const { failure } = favorites.status;
  return failure === null ? null : (
    <LoadFailed id="favorites-load-failed" failure={failure} i18n={i18n} />
  );
}
