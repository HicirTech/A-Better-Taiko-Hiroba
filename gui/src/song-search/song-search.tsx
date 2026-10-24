import type { Translator } from "@abth/i18n";
import {
  Box,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { type ReactNode, useDeferredValue, useMemo, useRef, useState } from "react";
import type { PictureLane } from "../pictures/picture-lane";
import type { HirobaSessionPort } from "../shared/session-port";
import type { ChartSource } from "../shared/song-catalogue/chart-source";
import type { ShownDifficulty } from "../shared/song-catalogue/shown-difficulty";
import { lookOfCatalogue } from "../shared/song-catalogue/song-look";
import { nameLanguage } from "../shared/song-catalogue/song-names";
import { searchSongs } from "../shared/song-catalogue/song-search";
import type { SongCatalogue } from "../shared/song-catalogue/use-song-catalogue";
import { type PickerEntry, PickerList } from "../songs/picker-list";
import { SongDetails } from "../songs/song-details";
import { bpmText } from "../songs/song-facts";
import { SongListFailed } from "../songs/song-list-failed";
import { useBackLeaves } from "../ui/back-closers";
import { FrameTop, PAGE_HEIGHT } from "../ui/frame-top";
import { CloseIcon, HistoryIcon } from "../ui/icons";
import type { ModalLook } from "../ui/large-modal";
import { ProgressBar } from "../ui/progress-bar";
import { SearchField } from "../ui/search-field";
import { SectionCard } from "../ui/section-card";
import { StatusNote } from "../ui/status-note";
import type { KeptSearches } from "./use-kept-searches";

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
  readonly touchFirst: boolean;
  /** The window is wide enough for the side panel. */
  readonly wide: boolean;
  readonly modalLook: ModalLook;
  /** The difficulty whose level the songs show in front of the others. */
  readonly shownDifficulty: ShownDifficulty;
  /** Where a song's details take their chart pictures from. */
  readonly chartSource: ChartSource;
  /** The searches kept on this device, offered before a query is typed. */
  readonly keptSearches: KeptSearches;
  readonly i18n: Translator;
  /** The first time the search opens, so the song list is read only once someone looks. */
  readonly onOpen: () => void;
  /** The page under the search, told whether the search stands in for it. */
  readonly children: (searching: boolean) => ReactNode;
}

/** The songs searched for by name, the searches made before, and a song's details. */
export function SongSearch({
  catalogue,
  port,
  lane,
  touchFirst,
  wide,
  modalLook,
  shownDifficulty,
  chartSource,
  keptSearches,
  i18n,
  onOpen,
  children,
}: SongSearchProps) {
  const { t, locale } = i18n;
  const [active, setActive] = useState(false);
  const [query, setQuery] = useState("");
  const recent = keptSearches.searches;
  const [openSongNo, setOpenSongNo] = useState<string | null>(null);
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
    keptSearches.remember(query);
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
                  onClick={() => keptSearches.forget(one)}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemButton onClick={() => setQuery(one)}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <HistoryIcon fontSize="small" />
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
        shownDifficulty={shownDifficulty}
        i18n={i18n}
        many={null}
        onActivate={open}
      />
    );
  }

  return (
    <>
      <FrameTop wide={wide} touchFirst={touchFirst}>
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
          onSubmit={() => keptSearches.remember(query)}
          hint={recent.length === 0 ? t("picker.searchHint") : undefined}
        />
      </FrameTop>
      {active &&
        panel !== null &&
        (framed ? (
          <SectionCard id="song-search-panel" flush sx={{ py: 1 }}>
            {panel}
          </SectionCard>
        ) : (
          <Box id="song-search-panel" sx={searched ? FILLS_THE_PAGE : undefined}>
            {panel}
          </Box>
        ))}
      {children(active)}
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
    </>
  );
}
