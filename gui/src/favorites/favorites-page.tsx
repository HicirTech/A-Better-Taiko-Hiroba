import type { Translator } from "@abth/i18n";
import { Stack, Typography } from "@mui/material";
import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";

import { COLUMN_MAX_WIDTH_PX } from "../my-page/costume-page";
import { HELD_STILL, LoadFailed, useFocusKept, Waiting } from "../my-page/editor-parts";
import { type FavoritesStep, shownFavoritesOf } from "./favorites-state";
import { FolderCard } from "./folder-card";
import { SongCard } from "./song-card";
import { rememberedSongs, resolveSong } from "./song-look";
import { SongPicker } from "./song-picker";
import type { FavoritesEditor } from "./use-favorites";
import type { SongCatalogue } from "./use-song-catalogue";

export interface FavoritesPageProps {
  readonly favorites: FavoritesEditor;
  readonly catalogue: SongCatalogue;
  readonly i18n: Translator;
}

export function FavoritesPage({ favorites, catalogue, i18n }: FavoritesPageProps) {
  const { t, locale } = i18n;
  const { step, pickSong } = favorites;
  const shown = shownFavoritesOf(step);
  const [picking, setPicking] = useState(false);
  const page = useRef<HTMLDivElement>(null);
  useFocusKept(page, step.name);

  const view = shown?.view ?? null;
  const remembered = useMemo(() => rememberedSongs(view), [view]);
  const look = useCallback(
    (songNo: string) => resolveSong(songNo, catalogue.songs, remembered, locale),
    [catalogue.songs, remembered, locale],
  );
  const choice = useMemo(() => ({ kind: "one", onPick: pickSong }) as const, [pickSong]);

  // Focus leaves the button the save shuts, so it is not dropped to the window's top.
  const saveSong = () => {
    page.current?.focus({ preventScroll: true });
    void favorites.saveSong();
  };
  return (
    <Stack
      id="favorites-page"
      ref={page}
      data-step={step.name}
      tabIndex={-1}
      spacing={2}
      sx={{ width: 1, maxWidth: COLUMN_MAX_WIDTH_PX, alignSelf: "center", outline: "none" }}
    >
      <Typography id="favorites-name" variant="h6" component="h2" noWrap>
        {t("favorites.folder")}
      </Typography>
      {shown === null ? (
        progressOf(step, i18n)
      ) : (
        <Stack spacing={2} inert={shown.shut} sx={shown.shut ? HELD_STILL : undefined}>
          <SongCard
            shown={shown}
            look={look}
            i18n={i18n}
            onChange={() => setPicking(true)}
            onSave={saveSong}
            onReset={favorites.resetSong}
          />
          <FolderCard shown={shown} look={look} i18n={i18n} />
        </Stack>
      )}
      <SongPicker
        open={picking}
        choice={choice}
        catalogue={catalogue}
        i18n={i18n}
        onClose={() => setPicking(false)}
      />
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
