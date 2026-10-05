import type { Translator } from "@abth/i18n";
import {
  Box,
  Button,
  FormHelperText,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
} from "@mui/material";
import { type ReactNode, useDeferredValue, useMemo, useRef, useState } from "react";
import { CloseIcon } from "../favorites/favorites-icons";
import { type PickerEntry, PickerList } from "../favorites/picker-list";
import { keptShownDifficulty, ShownDifficultyContext } from "../favorites/shown-difficulty";
import { lookOfCatalogue } from "../favorites/song-look";
import { nameLanguage } from "../favorites/song-names";
import { searchSongs } from "../favorites/song-search";
import type { SongCatalogue } from "../favorites/use-song-catalogue";
import { Waiting } from "../my-page/editor-parts";
import { FrameTop } from "../navigation/app-frame";
import { useBackLeaves } from "../navigation/back-closers";
import type { PictureLane } from "../pictures/picture-lane";
import type { HirobaSessionPort } from "../session-port";
import { forgetSearch, keptSearches, rememberSearch } from "./search-history";
import { SongDetails } from "./song-details";
import { bpmText } from "./song-facts";
import { HistoryIcon } from "./song-icons";
import { SongSearchBar } from "./song-search-bar";

export interface SongSearchProps {
  readonly catalogue: SongCatalogue;
  readonly port: Pick<HirobaSessionPort, "readChartPicture">;
  readonly lane: PictureLane;
  readonly i18n: Translator;
  /** The first time the search opens, so the song list is read only once someone looks. */
  readonly onOpen: () => void;
  /** The page under the search, told whether the search stands in for it. */
  readonly children: (searching: boolean) => ReactNode;
}

/** The songs searched for by name, the searches made before, and a song's details. */
export function SongSearch({ catalogue, port, lane, i18n, onOpen, children }: SongSearchProps) {
  const { t, locale } = i18n;
  const [active, setActive] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState(keptSearches);
  const [openSongNo, setOpenSongNo] = useState<string | null>(null);
  const [shownDifficulty] = useState(keptShownDifficulty);
  const input = useRef<HTMLInputElement>(null);
  const deferred = useDeferredValue(query);

  const activate = () => {
    if (!active) {
      setActive(true);
      onOpen();
    }
  };
  const leave = () => {
    setActive(false);
    setQuery("");
    input.current?.blur();
  };
  useBackLeaves(active, leave);
  const open = (songNo: string) => {
    setRecent(rememberSearch(query));
    setOpenSongNo(songNo);
  };

  const entries = useMemo<readonly PickerEntry[]>(
    () =>
      deferred.trim() === ""
        ? []
        : searchSongs(catalogue.list, deferred, locale).map(({ song, shown, other }) => ({
            look: lookOfCatalogue(song, locale),
            shown,
            other: other === null ? null : { marked: other, lang: nameLanguage(song, other.text) },
            detail: song.bpm === null ? undefined : t("song.bpm", { bpm: bpmText(song.bpm) }),
          })),
    [catalogue.list, deferred, locale, t],
  );

  const searched = catalogue.state === "ready" && query.trim() !== "";
  // Only the songs found come in a frame; the searches kept and the notes stand as they are.
  const framed = searched && entries.length > 0;
  let panel: ReactNode;
  if (catalogue.state === "loading") {
    panel = <Waiting id="song-search-loading">{t("picker.loading")}</Waiting>;
  } else if (catalogue.state === "failed") {
    panel = (
      <>
        <FormHelperText id="song-search-failed" error>
          {t("picker.failed")}
          {catalogue.failure !== null && (
            <Box component="span" sx={{ display: "block", mt: 0.5, fontFamily: "monospace" }}>
              {t("picker.code", { code: catalogue.failure })}
            </Box>
          )}
        </FormHelperText>
        <Button onClick={catalogue.retry} sx={{ mt: 1 }}>
          {t("picker.retry")}
        </Button>
      </>
    );
  } else if (!searched) {
    panel =
      recent.length === 0 ? null : (
        <List id="song-search-recent" disablePadding>
          {recent.map((one) => (
            <ListItem
              key={one}
              disablePadding
              secondaryAction={
                <IconButton
                  edge="end"
                  aria-label={t("search.forget", { query: one })}
                  onClick={() => setRecent(forgetSearch(one))}
                >
                  <CloseIcon />
                </IconButton>
              }
            >
              <ListItemButton onClick={() => setQuery(one)}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <HistoryIcon />
                </ListItemIcon>
                <ListItemText primary={one} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      );
  } else if (entries.length === 0) {
    panel = <FormHelperText id="song-search-none">{t("picker.none")}</FormHelperText>;
  } else {
    panel = (
      <PickerList
        idPrefix="song-search"
        entries={entries}
        i18n={i18n}
        many={null}
        onActivate={open}
      />
    );
  }

  return (
    <>
      <FrameTop>
        <SongSearchBar
          query={query}
          active={active}
          i18n={i18n}
          inputRef={input}
          onQuery={(next) => {
            // Typing opens the search too: a window without the focus sends no focus event.
            activate();
            setQuery(next);
          }}
          onActivate={activate}
          onLeave={leave}
          onSubmit={() => {
            setRecent(rememberSearch(query));
            input.current?.blur();
          }}
        />
      </FrameTop>
      {active && panel !== null && (
        <ShownDifficultyContext value={shownDifficulty}>
          {framed ? (
            <Paper id="song-search-panel" variant="outlined" sx={{ py: 1, overflow: "hidden" }}>
              {panel}
            </Paper>
          ) : (
            <Box id="song-search-panel">{panel}</Box>
          )}
        </ShownDifficultyContext>
      )}
      {children(active)}
      <SongDetails
        song={openSongNo === null ? null : (catalogue.songs.get(openSongNo) ?? null)}
        port={port}
        lane={lane}
        i18n={i18n}
        onClose={() => setOpenSongNo(null)}
      />
    </>
  );
}
