import type { Translator } from "@abth/i18n";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import type { PictureLane } from "../pictures/picture-lane";
import type { SystemShare } from "../platform";
import type { ProfileView } from "../shared/session-port";
import { filledSlots, moved, newSetName, setWithSongs } from "../shared/sets/favorite-sets";
import type { FavoriteSets } from "../shared/sets/use-favorite-sets";
import type { ShownDifficulty } from "../shared/song-catalogue/shown-difficulty";
import { rememberedSongs, resolveSong } from "../shared/song-catalogue/song-look";
import type { SongCatalogue } from "../shared/song-catalogue/use-song-catalogue";
import { SnapshotButton } from "../snapshots/snapshot-button";
import { SetNameDialog } from "../songs/set-name-dialog";
import { SetSongs } from "../songs/set-songs";
import { SongDetails, type SongDetailsSetting } from "../songs/song-details";
import type { DetailsOpener } from "../songs/song-look-row";
import { useSongDetails } from "../songs/use-song-details";
import { HELD_STILL, useFocusKept } from "../ui/editor-parts";
import { COLUMN_MAX_WIDTH_PX } from "../ui/frame-top";
import { CardGiftcardIcon, ListIcon } from "../ui/icons";
import type { ModalLook } from "../ui/large-modal";
import { LoadFailed } from "../ui/read-failure-alert";
import { CARD_GAP, SectionCard } from "../ui/section-card";
import { SYNC_BAR_PAGE } from "../ui/sync-bar";
import { WriteOutcomeSnackbar } from "../ui/write-outcome";
import { FavoritesPickers, type Picking } from "./favorites-pickers";
import { shownFavoritesOf } from "./favorites-state";
import { FavoritesSyncBar } from "./favorites-sync-bar";
import { FolderCard } from "./folder-card";
import { FolderHistoryDialog } from "./folder-history-dialog";
import { GiftMaker } from "./gift-maker";
import { GiftSnapshot } from "./gift-snapshot";
import type { PickableState } from "./pickable-songs";
import { SetView } from "./set-view";
import { SetsDrawer } from "./sets-drawer";
import { SongCard } from "./song-card";
import type { FavoritesEditor } from "./use-favorites";
import { type FavoritesScene, useFavoritesLevel } from "./use-favorites-level";
import { useGiftDraft } from "./use-gift-draft";
import { useSetEdit } from "./use-set-edit";
import { useSetsSwipe } from "./use-sets-swipe";

const NO_SONGS: readonly string[] = [];

/** What the name dialog asks for: a new set, opened for editing or not, or a set's new name. */
interface Naming {
  readonly songs: readonly string[];
  readonly editing: boolean;
  /** The name the dialog starts with, where the songs were a set; a new set's otherwise. */
  readonly name?: string;
}

export interface FavoritesPageProps {
  readonly favorites: FavoritesEditor;
  /** What a tip told now opens: the sets drawer, or the first set being edited. */
  readonly tipScene?: FavoritesScene;
  readonly catalogue: SongCatalogue;
  readonly songDetails: SongDetailsSetting;
  readonly lane: PictureLane;
  /** The songs Hiroba's own picker offers: neither picker lists any other. */
  readonly pickable: PickableState;
  /** As a picker opens: reads the list when it is stale. */
  readonly onPickerOpen: () => void;
  /** The sets kept on this device, which the drawer lists. */
  readonly keptSets: FavoriteSets;
  /** A touch screen: swipes open the sets, and a long press a song's menu. */
  readonly touchFirst: boolean;
  /** The navigation's menu is open, which the sets' swipe leaves alone. */
  readonly menuOpen: boolean;
  /** The pipelines page lies over the page, which the sets' swipe leaves alone. */
  readonly pipelinesShown: boolean;
  /** The difficulty whose level the songs show in front of the others. */
  readonly shownDifficulty: ShownDifficulty;
  readonly modalLook: ModalLook;
  /** The player's, whose plate and My Don a gift's picture shows; none before it is read. */
  readonly profile: ProfileView | null;
  /** The ways a gift's picture goes out. */
  readonly share: SystemShare;
  readonly i18n: Translator;
}

/** The page: Hiroba's お気に入り and 大好きな曲, and the sets kept on the device. */
export function FavoritesPage({
  favorites,
  tipScene = null,
  catalogue,
  songDetails,
  lane,
  pickable,
  onPickerOpen,
  keptSets,
  touchFirst,
  menuOpen,
  pipelinesShown,
  shownDifficulty,
  modalLook,
  profile,
  share,
  i18n,
}: FavoritesPageProps) {
  const { t, locale, dateTime } = i18n;
  const { step, pickSong } = favorites;
  const shown = shownFavoritesOf(step);
  const { sets } = keptSets;
  const [naming, setNaming] = useState<Naming | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [picking, setPicking] = useState<Picking | null>(null);
  const openPicker = (picker: Picking) => {
    // A gift may hold any song: whether its receiver has each is that player's Hiroba to say.
    if (picker !== "gift") {
      onPickerOpen();
    }
    catalogue.readIfFailed();
    setPicking(picker);
  };
  const details = useSongDetails(catalogue.songs);
  const page = useRef<HTMLDivElement>(null);
  useFocusKept(page, step.name);
  // A song's details stand over the page, so the sets' swipe waits until they shut.
  useSetsSwipe({
    active: touchFirst && !details.shown,
    open: drawerOpen,
    menuOpen,
    covered: pipelinesShown,
    onOpenChange: setDrawerOpen,
  });
  const level = useFavoritesLevel({ sets, tipScene, onDrawer: setDrawerOpen });
  const { set, editing, putBack, gift, showSet } = level;
  const setEdit = useSetEdit(level);
  const giftEdit = useGiftDraft(level, catalogue);

  const setId = set?.id ?? null;
  const folderSongs = shown === null ? null : filledSlots(shown.view.folder.state);
  const inUse = folderSongs === null ? null : setWithSongs(sets, folderSongs);
  const view = shown?.view ?? null;
  const remembered = useMemo(() => rememberedSongs(view), [view]);
  const look = useCallback(
    (songNo: string) => resolveSong(songNo, catalogue.songs, remembered, locale),
    [catalogue.songs, remembered, locale],
  );
  const openDetails = useCallback<DetailsOpener>(
    (songNo) => (catalogue.songs.has(songNo) ? () => details.open(songNo) : undefined),
    [catalogue.songs, details.open],
  );
  const named = (name: string) => {
    if (naming !== null) {
      showSet(keptSets.add(name, naming.songs), naming.editing);
    }
    setNaming(null);
    setDrawerOpen(false);
    setHistoryOpen(false);
  };

  const setsLabel = t("favorites.sets");
  const madeGift = gift === null || profile === null ? null : { ...gift, giver: profile.nickname };
  const giveLabel = t("gift.make");
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
              {gift !== null
                ? t("gift.new")
                : set !== null
                  ? set.name
                  : putBack !== null
                    ? (putBack.setName ?? dateTime(putBack.keptAt))
                    : t("favorites.current")}
            </Typography>
          </Box>
          {madeGift !== null && profile !== null && (
            <SnapshotButton
              id="gift-share"
              shows="abth-gift"
              share={share}
              lane={lane}
              i18n={i18n}
              disabled={madeGift.songs.length === 0}
              snapshot={(snapshotLane) => (
                <GiftSnapshot
                  gift={{ ...madeGift, title: madeGift.title.trim() }}
                  profile={profile}
                  look={look}
                  shownDifficulty={shownDifficulty}
                  lane={snapshotLane}
                  i18n={i18n}
                />
              )}
            />
          )}
          {gift === null && set === null && putBack === null && profile !== null && (
            <IconButton
              id="favorites-gift"
              aria-label={giveLabel}
              title={giveLabel}
              onClick={giftEdit.start}
            >
              <CardGiftcardIcon />
            </IconButton>
          )}
          {/* A touch screen opens the drawer by a swipe from the right edge instead. */}
          {!touchFirst && gift === null && (
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
        {madeGift !== null && profile !== null ? (
          <GiftMaker
            gift={madeGift}
            profile={profile}
            look={look}
            shownDifficulty={shownDifficulty}
            lane={lane}
            byLongPress={touchFirst}
            i18n={i18n}
            onAddSongs={() => openPicker("gift")}
            onRemoveSong={(songNo) =>
              giftEdit.change((now) => ({ songs: now.songs.filter((song) => song !== songNo) }))
            }
            onMoveSong={(from, to) =>
              giftEdit.change((now) => ({ songs: moved(now.songs, from, to) }))
            }
            onTitle={(title) => giftEdit.change(() => ({ title }))}
            onShown={(giftShown) => giftEdit.change(() => ({ shown: giftShown }))}
          />
        ) : set !== null ? (
          <SetView
            key={set.id}
            songs={setEdit.songs}
            look={look}
            shownDifficulty={shownDifficulty}
            i18n={i18n}
            openDetails={openDetails}
            editing={editing}
            edited={setEdit.edited}
            byLongPress={touchFirst}
            onEdit={level.edit}
            onAddSongs={() => openPicker("set")}
            onRemoveSong={(songNo) =>
              setEdit.edit((songs) => songs.filter((song) => song !== songNo))
            }
            onMoveSong={(from, to) => setEdit.edit((songs) => moved(songs, from, to))}
            onReset={() => level.setDraft(null)}
            onSave={() => {
              if (level.draft !== null) {
                keptSets.replaceSongs(set.id, level.draft);
              }
              level.leaveEditing();
            }}
          />
        ) : putBack !== null && shown !== null ? (
          <SectionCard id="favorite-kept-view">
            <SetSongs
              id="favorite-kept"
              songs={putBack.songs}
              look={look}
              shownDifficulty={shownDifficulty}
              i18n={i18n}
              openDetails={openDetails}
            />
          </SectionCard>
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
                touchFirst={touchFirst}
                modalLook={modalLook}
              />
            </Stack>
          </>
        )}
      </Stack>
      {gift === null && (
        <FavoritesSyncBar
          favorites={favorites}
          shown={shown}
          level={level}
          sets={sets}
          folderSongs={folderSongs}
          inUse={inUse}
          keepFocus={() => page.current?.focus({ preventScroll: true })}
          onHistory={() => setHistoryOpen(true)}
          i18n={i18n}
        />
      )}
      {shown !== null && (
        <FolderHistoryDialog
          open={historyOpen}
          entries={favorites.history}
          current={folderSongs ?? NO_SONGS}
          look={look}
          shownDifficulty={shownDifficulty}
          touchFirst={touchFirst}
          modalLook={modalLook}
          i18n={i18n}
          onPutBack={(entry) => {
            level.setPutBack(entry);
            setHistoryOpen(false);
          }}
          onSaveAsSet={(entry) =>
            setNaming({
              songs: entry.songs,
              editing: false,
              ...(entry.setName !== null && { name: entry.setName }),
            })
          }
          onClose={() => setHistoryOpen(false)}
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
          if (id === setId) {
            showSet(null);
          }
        }}
        onClose={() => setDrawerOpen(false)}
      />
      <FavoritesPickers
        picking={picking}
        onPickSong={pickSong}
        set={set === null ? null : setEdit.choice}
        gift={gift === null ? null : giftEdit}
        catalogue={catalogue}
        pickable={pickable}
        shownDifficulty={shownDifficulty}
        touchFirst={touchFirst}
        modalLook={modalLook}
        i18n={i18n}
        onClose={() => setPicking(null)}
      />
      {naming !== null && (
        <SetNameDialog
          title={t("favorites.newSet")}
          initial={naming.name ?? newSetName(sets, (number) => t("favorites.setName", { number }))}
          i18n={i18n}
          onCancel={() => setNaming(null)}
          onSave={named}
        />
      )}
      <SongDetails {...songDetails} song={details.song} onClose={details.close} />
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
