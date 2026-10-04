import type { Translator } from "@abth/i18n";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";

import { COLUMN_MAX_WIDTH_PX } from "../my-page/costume-page";
import { HELD_STILL, LoadFailed, useFocusKept, Waiting } from "../my-page/editor-parts";
import { useBackLeaves } from "../navigation/back-closers";
import { useTouchFirst } from "../navigation/use-touch-first";
import {
  type FavoriteSet,
  filledSlots,
  moved,
  newSetName,
  SET_SONG_LIMIT,
  sameSongs,
  toggledSongs,
} from "./favorite-sets";
import { SetsIcon } from "./favorites-icons";
import { type FavoritesStep, shownFavoritesOf } from "./favorites-state";
import { FolderCard } from "./folder-card";
import { SetNameDialog } from "./set-name-dialog";
import { SetView } from "./set-view";
import { SetsDrawer } from "./sets-drawer";
import { keptShownDifficulty, ShownDifficultyContext } from "./shown-difficulty";
import { SongCard } from "./song-card";
import { rememberedSongs, resolveSong } from "./song-look";
import { SongPicker } from "./song-picker";
import { useFavoriteSets } from "./use-favorite-sets";
import type { FavoritesEditor } from "./use-favorites";
import { useSetsSwipe } from "./use-sets-swipe";
import type { SongCatalogue } from "./use-song-catalogue";

const NO_SONGS: readonly string[] = [];

/** What the name dialog asks for: a new set, opened for editing or not, or a set's new name. */
type Naming =
  | { readonly kind: "new"; readonly songs: readonly string[]; readonly editing: boolean }
  | { readonly kind: "rename"; readonly set: FavoriteSet };

export interface FavoritesPageProps {
  readonly favorites: FavoritesEditor;
  readonly catalogue: SongCatalogue;
  readonly i18n: Translator;
}

/** The page, with the difficulty whose levels the songs show first, as kept when it opened. */
export function FavoritesPage(props: FavoritesPageProps) {
  const [shownDifficulty] = useState(keptShownDifficulty);
  return (
    <ShownDifficultyContext value={shownDifficulty}>
      <FavoritesBody {...props} />
    </ShownDifficultyContext>
  );
}

function FavoritesBody({ favorites, catalogue, i18n }: FavoritesPageProps) {
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
  const page = useRef<HTMLDivElement>(null);
  useFocusKept(page, step.name);
  const touchFirst = useTouchFirst();
  useSetsSwipe({ active: touchFirst, open: drawerOpen, onOpenChange: setDrawerOpen });

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
  useBackLeaves(editing, leaveEditing);
  const named = (name: string) => {
    if (naming?.kind === "new") {
      showSet(keptSets.add(name, naming.songs), naming.editing);
    } else if (naming?.kind === "rename") {
      keptSets.rename(naming.set.id, name);
    }
    setNaming(null);
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
  return (
    <Stack
      id="favorites-page"
      ref={page}
      data-step={step.name}
      tabIndex={-1}
      spacing={2}
      sx={{ width: 1, maxWidth: COLUMN_MAX_WIDTH_PX, alignSelf: "center", outline: "none" }}
    >
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
            <SetsIcon />
          </IconButton>
        )}
      </Box>
      {set !== null ? (
        <SetView
          key={set.id}
          songs={editedSongs}
          look={look}
          i18n={i18n}
          editing={editing}
          edited={edited}
          canApply={
            shown !== null &&
            !shown.shut &&
            set.songs.length > 0 &&
            !sameSongs(set.songs, folderSongs ?? NO_SONGS)
          }
          applying={shown?.saving === "folder"}
          byLongPress={touchFirst}
          onEdit={() => setEditing(true)}
          onAddSongs={() => setPicking("set")}
          onRemoveSong={(songNo) => edit((songs) => songs.filter((song) => song !== songNo))}
          onMoveSong={(from, to) => edit((songs) => moved(songs, from, to))}
          onReset={() => setDraft(null)}
          onSave={() => {
            if (draft !== null) {
              keptSets.replaceSongs(set.id, draft);
            }
            leaveEditing();
          }}
          onApply={() => void apply(set.songs)}
        />
      ) : shown === null ? (
        progressOf(step, i18n)
      ) : (
        <Stack spacing={2} inert={shown.shut} sx={shown.shut ? HELD_STILL : undefined}>
          <SongCard
            shown={shown}
            look={look}
            i18n={i18n}
            onChange={() => setPicking("song")}
            onSave={saveSong}
            onReset={favorites.resetSong}
          />
          <FolderCard
            shown={shown}
            look={look}
            i18n={i18n}
            sets={sets}
            inUse={inUse}
            onSaveAsSet={() =>
              setNaming({
                kind: "new",
                songs: filledSlots(shown.view.folder.state),
                editing: false,
              })
            }
            onSaveToSet={(id) => keptSets.replaceSongs(id, filledSlots(shown.view.folder.state))}
          />
        </Stack>
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
        onAdd={() => {
          setDrawerOpen(false);
          setNaming({ kind: "new", songs: [], editing: true });
        }}
        onMove={keptSets.moveSet}
        onRename={(id) => {
          const chosen = sets.find((one) => one.id === id);
          if (chosen !== undefined) {
            setNaming({ kind: "rename", set: chosen });
          }
        }}
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
        i18n={i18n}
        onClose={() => setPicking(null)}
      />
      {naming !== null && (
        <SetNameDialog
          key={naming.kind === "rename" ? naming.set.id : "new"}
          title={t(naming.kind === "rename" ? "favorites.rename.title" : "favorites.newSet")}
          initial={
            naming.kind === "rename"
              ? naming.set.name
              : newSetName(sets, (number) => t("favorites.setName", { number }))
          }
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
          i18n={i18n}
          onClose={() => setPicking(null)}
        />
      )}
    </Stack>
  );
}

function progressOf(step: FavoritesStep, i18n: Translator): ReactNode {
  switch (step.name) {
    case "unread":
    case "loading":
      return <Waiting id="favorites-reading">{i18n.t("favorites.reading")}</Waiting>;
    case "loadFailed":
      return <LoadFailed id="favorites-load-failed" failure={step.failure} i18n={i18n} />;
    case "ready":
    case "saving":
      return null;
  }
}
