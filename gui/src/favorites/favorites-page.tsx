import type { Translator } from "@abth/i18n";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";

import { COLUMN_MAX_WIDTH_PX } from "../my-page/costume-page";
import { HELD_STILL, LoadFailed, useFocusKept, Waiting } from "../my-page/editor-parts";
import { filledSlots, newSetName, SET_SONG_LIMIT, sameSongs } from "./favorite-sets";
import { SetsIcon } from "./favorites-icons";
import { type FavoritesStep, shownFavoritesOf } from "./favorites-state";
import { FolderCard } from "./folder-card";
import { SetNameField } from "./set-name-field";
import { SetView } from "./set-view";
import { SetsDrawer } from "./sets-drawer";
import { SongCard } from "./song-card";
import { rememberedSongs, resolveSong } from "./song-look";
import { SongPicker } from "./song-picker";
import { useFavoriteSets } from "./use-favorite-sets";
import type { FavoritesEditor } from "./use-favorites";
import type { SongCatalogue } from "./use-song-catalogue";

const NO_SONGS: readonly string[] = [];

export interface FavoritesPageProps {
  readonly favorites: FavoritesEditor;
  readonly catalogue: SongCatalogue;
  readonly i18n: Translator;
}

export function FavoritesPage({ favorites, catalogue, i18n }: FavoritesPageProps) {
  const { t, locale } = i18n;
  const { step, pickSong } = favorites;
  const shown = shownFavoritesOf(step);
  const keptSets = useFavoriteSets();
  const { sets, toggleSong } = keptSets;
  // The folder on Hiroba is shown until a set is picked from the drawer.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [picking, setPicking] = useState<"song" | "set" | null>(null);
  const page = useRef<HTMLDivElement>(null);
  useFocusKept(page, step.name);

  const set = sets.find((one) => one.id === selectedId) ?? null;
  const setId = set?.id ?? null;
  const folderSongs = shown === null ? null : filledSlots(shown.view.folder.state);
  const view = shown?.view ?? null;
  const remembered = useMemo(() => rememberedSongs(view), [view]);
  const look = useCallback(
    (songNo: string) => resolveSong(songNo, catalogue.songs, remembered, locale),
    [catalogue.songs, remembered, locale],
  );
  const songChoice = useMemo(() => ({ kind: "one", onPick: pickSong }) as const, [pickSong]);
  const toggleInSet = useCallback(
    (songNo: string) => {
      if (setId !== null) {
        toggleSong(setId, songNo);
      }
    },
    [setId, toggleSong],
  );
  const setSongs = set?.songs ?? NO_SONGS;
  const setChoice = useMemo(
    () =>
      ({
        kind: "many",
        picked: setSongs,
        limit: SET_SONG_LIMIT,
        onToggle: toggleInSet,
      }) as const,
    [setSongs, toggleInSet],
  );

  // Focus leaves the button a write shuts, so it is not dropped to the window's top.
  const saveSong = () => {
    page.current?.focus({ preventScroll: true });
    void favorites.saveSong();
  };
  const addSet = (songs: readonly string[]) =>
    setSelectedId(
      keptSets.add(
        newSetName(sets, (number) => t("favorites.setName", { number })),
        songs,
      ),
    );
  const apply = async (songs: readonly string[]) => {
    page.current?.focus({ preventScroll: true });
    await favorites.applySet(songs);
    setSelectedId(null);
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
          {set === null ? (
            <Typography id="favorites-name" variant="h6" component="h2" noWrap>
              {t("favorites.folder")}
            </Typography>
          ) : (
            <SetNameField
              key={set.id}
              set={set}
              i18n={i18n}
              onRename={(name) => keptSets.rename(set.id, name)}
            />
          )}
        </Box>
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
      </Box>
      {set !== null ? (
        <SetView
          key={set.id}
          set={set}
          look={look}
          i18n={i18n}
          canApply={
            shown !== null &&
            !shown.shut &&
            set.songs.length > 0 &&
            !sameSongs(set.songs, folderSongs ?? NO_SONGS)
          }
          applying={shown?.saving === "folder"}
          onAddSongs={() => setPicking("set")}
          onRemoveSong={(songNo) => keptSets.toggleSong(set.id, songNo)}
          onApply={() => void apply(set.songs)}
          onDelete={() => {
            keptSets.remove(set.id);
            setSelectedId(null);
          }}
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
            onSaveAsSet={() => addSet(filledSlots(shown.view.folder.state))}
          />
        </Stack>
      )}
      <SetsDrawer
        open={drawerOpen}
        sets={sets}
        folderSongs={folderSongs}
        selectedId={setId}
        i18n={i18n}
        onPick={(id) => {
          setSelectedId(id);
          setDrawerOpen(false);
        }}
        onAdd={() => {
          addSet([]);
          setDrawerOpen(false);
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
