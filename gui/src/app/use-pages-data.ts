import { useCallback, useEffect, useState } from "react";

import { useFavorites } from "../favorites/use-favorites";
import { usePickableSongs } from "../favorites/use-pickable-songs";
import { useListedCharts } from "../know-yourself/use-listed-charts";
import { useCostumeEditor } from "../my-page/use-costume-editor";
import { useNameEditor } from "../name-title/use-name-editor";
import { useTitleEditor } from "../name-title/use-title-editor";
import type { Page } from "../navigation/pages";
import type { PageData } from "../pages/page";
import { PAGE_REGISTRY } from "../pages/registry";
import type { PictureLane } from "../pictures/picture-lane";
import { useRatingData } from "../rating";
import { useScores } from "../shared/scores/use-scores";
import type { HirobaSessionPort } from "../shared/session-port";
import { useFavoriteSets } from "../shared/sets/use-favorite-sets";
import { useSongCatalogue } from "../shared/song-catalogue/use-song-catalogue";
import { useKeptSearches } from "../song-search/use-kept-searches";
import type { Session } from "./use-session";

/** The data the pages draw from, as the window holds it. */
export type PagesData = Pick<
  PageData,
  | "writing"
  | "scores"
  | "listed"
  | "ratingData"
  | "catalogue"
  | "pickable"
  | "editor"
  | "titleEditor"
  | "nameEditor"
  | "favorites"
  | "keptSets"
  | "keptSearches"
  | "wantSongs"
  | "songSearchOpen"
  | "onSongSearchOpen"
>;

/** Every kind of data the pages show: held across pages, dropped as the session ends. */
export function usePagesData({
  port,
  lane,
  page,
  session,
}: {
  readonly port: HirobaSessionPort;
  readonly lane: PictureLane;
  readonly page: Page;
  readonly session: Session;
}): PagesData {
  const { screen, sessionGone, noSession } = session;
  const profileShown = screen.name === "profile";
  const pickable = usePickableSongs(port, sessionGone);
  const { forget: forgetPickable } = pickable;
  const scores = useScores(port, sessionGone);
  const { load: loadScores, forget: forgetScores } = scores;
  const listed = useListedCharts(port, scores.view);
  const ratingData = useRatingData(port);
  // The editors live here so what they read from Hiroba is kept across pages; their edits are not.
  // The costume's preview is read while its page shows it.
  const editor = useCostumeEditor({
    port,
    lane,
    shown: page === "costume" && profileShown,
    onSessionGone: sessionGone,
  });
  const { forget: forgetEditor } = editor;
  const wornProfile = screen.name === "profile" ? screen.profile : null;
  const titleEditor = useTitleEditor({
    port,
    lane,
    profile: wornProfile,
    onSessionGone: sessionGone,
    onTitle: session.titleRead,
    onMoved: session.readBehindThePage,
  });
  const { forget: forgetTitleEditor } = titleEditor;
  const nameEditor = useNameEditor({
    port,
    lane,
    profile: wornProfile,
    onSessionGone: sessionGone,
    onNickname: session.nameRead,
  });
  const { forget: forgetNameEditor } = nameEditor;
  const favorites = useFavorites({ port, lane, onSessionGone: sessionGone });
  const keptSets = useFavoriteSets();
  const keptSearches = useKeptSearches();
  const { forget: forgetFavorites } = favorites;
  // Read once someone opens a page that shows it or the song search, and kept from then on.
  const [songsWanted, setSongsWanted] = useState(false);
  const wantSongs = useCallback(() => setSongsWanted(true), []);
  const [songSearchOpen, onSongSearchOpen] = useState(false);
  const catalogue = useSongCatalogue(
    port,
    (profileShown && PAGE_REGISTRY[page].needsSongs) || songsWanted,
  );
  const writing = editor.writing || titleEditor.writing || nameEditor.writing || favorites.writing;

  // Another player may sign in next: keep nothing of the last session's editors.
  useEffect(() => {
    if (noSession) {
      forgetEditor();
      forgetTitleEditor();
      forgetNameEditor();
      forgetFavorites();
      forgetPickable();
      forgetScores();
    }
  }, [
    noSession,
    forgetEditor,
    forgetTitleEditor,
    forgetNameEditor,
    forgetFavorites,
    forgetPickable,
    forgetScores,
  ]);
  // What the device keeps comes in while the window is idle, so no page waits for it later.
  useEffect(() => {
    if (!profileShown) {
      return;
    }
    const idle = requestIdleCallback(() => loadScores());
    return () => cancelIdleCallback(idle);
  }, [profileShown, loadScores]);

  return {
    writing,
    scores,
    listed,
    ratingData,
    catalogue,
    pickable,
    editor,
    titleEditor,
    nameEditor,
    favorites,
    keptSets,
    keptSearches,
    wantSongs,
    songSearchOpen,
    onSongSearchOpen,
  };
}
