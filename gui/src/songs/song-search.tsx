import type { Translator } from "@abth/i18n";
import {
  Box,
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
import { SongListFailed } from "../favorites/song-list-failed";
import { lookOfCatalogue } from "../favorites/song-look";
import { nameLanguage } from "../favorites/song-names";
import { searchSongs } from "../favorites/song-search";
import type { SongCatalogue } from "../favorites/use-song-catalogue";
import { FrameTop, PAGE_HEIGHT } from "../navigation/app-frame";
import { useBackLeaves } from "../navigation/back-closers";
import type { PictureLane } from "../pictures/picture-lane";
import type { HirobaSessionPort } from "../session-port";
import { ProgressBar } from "../ui/progress-bar";
import { SearchField } from "../ui/search-field";
import { StatusNote } from "../ui/status-note";
import { forgetSearch, keptSearches, rememberSearch } from "./search-history";
import { SongDetails } from "./song-details";
import { bpmText } from "./song-facts";
import { HistoryIcon } from "./song-icons";

// A search with nothing found fills the window's page, so its words stand in the middle of it.
const FILLS_THE_PAGE = {
  display: "flex",
  flexDirection: "column",
  minHeight: PAGE_HEIGHT,
} as const;

export interface SongSearchProps {
  readonly catalogue: SongCatalogue;
  readonly port: Pick<
    HirobaSessionPort,
    "readChartPicture" | "readChartDensity" | "readChartTja" | "readDrawnChart" | "keepDrawnChart"
  >;
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
      catalogue.readIfFailed();
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
    panel = <ProgressBar id="song-search-loading" label={t("picker.loading")} />;
  } else if (catalogue.state === "failed") {
    panel = <SongListFailed id="song-search" catalogue={catalogue} i18n={i18n} />;
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
    panel = (
      <StatusNote id="song-search-none" fill>
        {t("picker.none")}
      </StatusNote>
    );
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
        <SearchField
          id="song-search"
          query={query}
          i18n={i18n}
          inputRef={input}
          onQuery={(next) => {
            // Typing opens the search too: a window without the focus sends no focus event.
            activate();
            setQuery(next);
          }}
          onFocus={activate}
          onLeave={active ? leave : undefined}
          onSubmit={() => setRecent(rememberSearch(query))}
          hint={recent.length === 0 ? t("picker.searchHint") : undefined}
        />
      </FrameTop>
      {active && panel !== null && (
        <ShownDifficultyContext value={shownDifficulty}>
          {framed ? (
            <Paper id="song-search-panel" variant="outlined" sx={{ py: 1, overflow: "hidden" }}>
              {panel}
            </Paper>
          ) : (
            <Box id="song-search-panel" sx={searched ? FILLS_THE_PAGE : undefined}>
              {panel}
            </Box>
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
