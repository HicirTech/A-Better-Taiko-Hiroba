import type { Translator } from "@abth/i18n";
import { Box, FormHelperText } from "@mui/material";
import {
  type ReactNode,
  useCallback,
  useContext,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from "react";

import { useTouchFirst } from "../navigation/use-touch-first";
import { failureMessageOf } from "../shared/read-failure-message";
import type { FavoriteSongState } from "../shared/session-port";
import { LargeModal } from "../ui/large-modal";
import { ProgressBar } from "../ui/progress-bar";
import { ReadFailureAlert } from "../ui/read-failure-alert";
import { SearchField } from "../ui/search-field";
import { StatusNote } from "../ui/status-note";
import type { PickableState } from "./pickable-songs";
import { type PickerEntry, PickerList } from "./picker-list";
import { ShownDifficultyContext, shownFor } from "./shown-difficulty";
import { matchesCharts, matchesFilter, NO_FILTER, type SongFilter } from "./song-filter";
import { SongFilters } from "./song-filters";
import { SongListFailed } from "./song-list-failed";
import { levelsOfEntry, lookOfCatalogue } from "./song-look";
import { nameLanguage } from "./song-names";
import { newestFirst } from "./song-order";
import { searchSongs } from "./song-search";
import type { SongCatalogue } from "./use-song-catalogue";

const LIMIT_NOTE_ID = "song-picker-limit";

/** One song to pick, which closes the picker; or many to check until the picker is closed. */
export type SongChoice =
  | { readonly kind: "one"; readonly onPick: (song: FavoriteSongState) => void }
  | {
      readonly kind: "many";
      readonly picked: readonly string[];
      readonly limit: number;
      readonly onToggle: (songNo: string) => void;
    };

export interface SongPickerProps {
  readonly open: boolean;
  readonly choice: SongChoice;
  readonly catalogue: SongCatalogue;
  /** Only the songs Hiroba's own picker offers are listed; a choice of one lists 裏 entries too. */
  readonly pickable: PickableState;
  readonly i18n: Translator;
  readonly onClose: () => void;
}

export function SongPicker({ open, onClose, ...body }: SongPickerProps) {
  // Drawn from its opening until it has slid away, so the search and the filter start over.
  const [drawn, setDrawn] = useState(open);
  if (open && !drawn) {
    setDrawn(true);
  }
  return drawn ? (
    <PickerBody {...body} open={open} onClose={onClose} onExited={() => setDrawn(false)} />
  ) : null;
}

function PickerBody({
  open,
  choice,
  catalogue,
  pickable,
  i18n,
  onClose,
  onExited,
}: SongPickerProps & { readonly onExited: () => void }) {
  const { t, locale } = i18n;
  const touchFirst = useTouchFirst();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SongFilter>(NO_FILTER);
  const kept = useContext(ShownDifficultyContext);
  const shown = filter.difficulty === null ? kept : shownFor(filter.difficulty);
  const deferred = useDeferredValue(query);
  const scroller = useRef<HTMLDivElement>(null);
  const rewind = () => scroller.current?.scrollTo({ top: 0 });
  const filterBy = (part: Partial<SongFilter>) => {
    setFilter((current) => ({ ...current, ...part }));
    rewind();
  };

  const newest = useMemo(() => [...catalogue.list].sort(newestFirst), [catalogue.list]);
  // The list kept from the last read serves while a newer one is read.
  const { offered, status } = pickable;
  const withUra = choice.kind === "one";
  const entries = useMemo<readonly PickerEntry[]>(() => {
    if (offered === null) {
      return [];
    }
    const songs = newest.filter(
      (song) =>
        offered.songs.has(song.songNo) &&
        matchesFilter(song, withUra ? { ...filter, difficulty: null, level: null } : filter),
    );
    const listed: readonly PickerEntry[] =
      deferred.trim() === ""
        ? songs.map((song) => ({ look: lookOfCatalogue(song, locale), shown: null, other: null }))
        : searchSongs(songs, deferred, locale).map(({ song, shown, other }) => ({
            look: lookOfCatalogue(song, locale),
            shown,
            other: other === null ? null : { marked: other, lang: nameLanguage(song, other.text) },
          }));
    if (!withUra) {
      return listed;
    }
    // Hiroba lists a song's 裏 entry as a row of its own, just after the song.
    const side = (entry: PickerEntry, ura: boolean): PickerEntry => ({
      ...entry,
      ...(ura ? { ura: true } : {}),
      look: { ...entry.look, levels: levelsOfEntry(entry.look.levels, ura) },
    });
    // A chart filter applies to the row, once 表 and 裏 are separate.
    return listed
      .flatMap((entry) =>
        offered.ura.has(entry.look.songNo)
          ? [side(entry, false), side(entry, true)]
          : [side(entry, false)],
      )
      .filter((entry) => entry.look.levels !== null && matchesCharts(entry.look.levels, filter));
  }, [newest, offered, withUra, filter, deferred, locale]);

  const many =
    choice.kind === "many" ? { picked: new Set(choice.picked), limit: choice.limit } : null;
  const onPick = choice.kind === "one" ? choice.onPick : null;
  const onToggle = choice.kind === "many" ? choice.onToggle : null;
  const activate = useCallback(
    (songNo: string, ura: boolean) => {
      if (onToggle !== null) {
        onToggle(songNo);
        return;
      }

      onPick?.({ songNo, ura });
      onClose();
    },
    [onPick, onToggle, onClose],
  );
  const full = many !== null && many.picked.size >= many.limit;

  let content: ReactNode;
  if (catalogue.state === "loading") {
    content = (
      <Box sx={{ p: 2 }}>
        <ProgressBar id="song-picker-loading" label={t("picker.loading")} />
      </Box>
    );
  } else if (catalogue.state === "failed") {
    content = (
      <Box sx={{ p: 2 }}>
        <SongListFailed id="song-picker" catalogue={catalogue} i18n={i18n} />
      </Box>
    );
  } else if (offered === null && status.kind === "failed") {
    const { kind, detail } = status.failure;
    content = (
      <Box sx={{ p: 2 }}>
        <ReadFailureAlert
          id="song-picker-offered-failed"
          message={`${t("picker.offeredFailed")} ${t(failureMessageOf(kind, new Date()))}`}
          code={detail ?? null}
          i18n={i18n}
        />
      </Box>
    );
  } else if (offered === null) {
    content = (
      <Box sx={{ p: 2 }}>
        <ProgressBar id="song-picker-offered-reading" label={t("picker.offeredReading")} />
      </Box>
    );
  } else if (entries.length === 0) {
    content = (
      <Box sx={{ height: 1, display: "flex", flexDirection: "column" }}>
        <StatusNote id="song-picker-none" fill>
          {t("picker.none")}
        </StatusNote>
      </Box>
    );
  } else {
    content = (
      <PickerList
        entries={entries}
        i18n={i18n}
        many={many}
        onActivate={activate}
        describedBy={full ? LIMIT_NOTE_ID : undefined}
        scroller={scroller}
      />
    );
  }

  return (
    <LargeModal
      id="song-picker"
      open={open}
      title={many === null ? t("picker.title.single") : t("picker.title.multi")}
      head={
        <>
          <SearchField
            id="song-picker-search"
            query={query}
            i18n={i18n}
            autoFocus={!touchFirst}
            hint={t("picker.searchHint")}
            onQuery={(next) => {
              setQuery(next);
              rewind();
            }}
          />
          <SongFilters filter={filter} i18n={i18n} onFilter={filterBy} />
          {full && many !== null && (
            <FormHelperText id={LIMIT_NOTE_ID} sx={{ m: 0 }}>
              {t("picker.limit", { max: many.limit })}
            </FormHelperText>
          )}
        </>
      }
      fills
      flush
      contentRef={scroller}
      i18n={i18n}
      onExited={onExited}
      onClose={onClose}
    >
      <ShownDifficultyContext value={shown}>{content}</ShownDifficultyContext>
    </LargeModal>
  );
}
