import type { Genre } from "@abth/core";
import type { Translator } from "@abth/i18n";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormHelperText,
  TextField,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { type ReactNode, useCallback, useDeferredValue, useMemo, useRef, useState } from "react";

import { Waiting } from "../my-page/editor-parts";
import { useBackCloses } from "../navigation/back-closers";
import { useTouchFirst } from "../navigation/use-touch-first";
import { GenreGrid } from "./genre-grid";
import { GENRE_ORDER } from "./genre-look";
import { type PickerEntry, PickerList } from "./picker-list";
import { lookOfCatalogue } from "./song-look";
import { nameLanguage } from "./song-names";
import { songsByGenre } from "./song-order";
import { searchSongs } from "./song-search";
import type { SongCatalogue } from "./use-song-catalogue";

const TITLE_ID = "song-picker-title";
const LIMIT_NOTE_ID = "song-picker-limit";

/** One song to pick, which closes the picker; or many to check, which the Done button closes. */
export type SongChoice =
  | { readonly kind: "one"; readonly onPick: (songNo: string) => void }
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
  readonly i18n: Translator;
  readonly onClose: () => void;
}

export function SongPicker({ open, choice, catalogue, i18n, onClose }: SongPickerProps) {
  const narrow = useMediaQuery(useTheme().breakpoints.down("sm"), { noSsr: true });
  useBackCloses(open, onClose);
  return (
    <Dialog
      id="song-picker"
      open={open}
      onClose={onClose}
      fullScreen={narrow}
      fullWidth
      maxWidth="md"
      aria-labelledby={TITLE_ID}
      slotProps={{ paper: { sx: { height: 1 } } }}
    >
      <PickerBody choice={choice} catalogue={catalogue} i18n={i18n} onClose={onClose} />
    </Dialog>
  );
}

// Its own component, so the search and the genre start over each time the picker opens.
function PickerBody({ choice, catalogue, i18n, onClose }: Omit<SongPickerProps, "open">) {
  const { t, locale } = i18n;
  const touchFirst = useTouchFirst();
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<Genre>(GENRE_ORDER[0]);
  const deferred = useDeferredValue(query);
  const searching = deferred.trim() !== "";
  const scroller = useRef<HTMLDivElement>(null);
  const rewind = () => scroller.current?.scrollTo({ top: 0 });

  const byGenre = useMemo(() => songsByGenre(catalogue.list), [catalogue.list]);
  const entries = useMemo<readonly PickerEntry[]>(() => {
    if (searching) {
      return searchSongs(catalogue.list, deferred, locale).map(({ song, shown, other }) => ({
        look: lookOfCatalogue(song, locale),
        shown,
        other: other === null ? null : { marked: other, lang: nameLanguage(song, other.text) },
      }));
    }

    return (byGenre.get(genre) ?? []).map((song) => ({
      look: lookOfCatalogue(song, locale),
      shown: null,
      other: null,
    }));
  }, [searching, deferred, genre, byGenre, catalogue.list, locale]);

  const many =
    choice.kind === "many" ? { picked: new Set(choice.picked), limit: choice.limit } : null;
  const onPick = choice.kind === "one" ? choice.onPick : null;
  const onToggle = choice.kind === "many" ? choice.onToggle : null;
  const activate = useCallback(
    (songNo: string) => {
      if (onToggle !== null) {
        onToggle(songNo);
        return;
      }

      onPick?.(songNo);
      onClose();
    },
    [onPick, onToggle, onClose],
  );
  const full = many !== null && many.picked.size >= many.limit;

  let content: ReactNode;
  if (catalogue.state === "loading") {
    content = (
      <Box sx={{ p: 2 }}>
        <Waiting id="song-picker-loading">{t("picker.loading")}</Waiting>
      </Box>
    );
  } else if (catalogue.state === "failed") {
    content = (
      <Box sx={{ p: 2 }}>
        <FormHelperText id="song-picker-failed" error>
          {t("picker.failed")}
          {catalogue.failure !== null && (
            <Box
              component="span"
              sx={{ display: "block", mt: 0.5, fontFamily: "monospace", userSelect: "text" }}
            >
              {t("picker.code", { code: catalogue.failure })}
            </Box>
          )}
        </FormHelperText>
        <Button id="song-picker-retry" onClick={catalogue.retry} sx={{ mt: 1 }}>
          {t("picker.retry")}
        </Button>
      </Box>
    );
  } else if (entries.length === 0) {
    content = (
      <Box sx={{ p: 2 }}>
        <FormHelperText id="song-picker-none">{t("picker.none")}</FormHelperText>
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
      />
    );
  }

  return (
    <>
      <DialogTitle id={TITLE_ID}>
        {many === null ? t("picker.title.single") : t("picker.title.multi")}
      </DialogTitle>
      <Box sx={{ px: 3, pb: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
        <TextField
          id="song-picker-search"
          type="search"
          fullWidth
          autoFocus={!touchFirst}
          label={t("picker.search")}
          helperText={t("picker.searchHint")}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            rewind();
          }}
        />
        <GenreGrid
          chosen={searching ? null : genre}
          i18n={i18n}
          onChoose={(next) => {
            setQuery("");
            setGenre(next);
            rewind();
          }}
        />
        {full && many !== null && (
          <FormHelperText id={LIMIT_NOTE_ID} sx={{ m: 0 }}>
            {t("picker.limit", { max: many.limit })}
          </FormHelperText>
        )}
      </Box>
      <DialogContent ref={scroller} dividers sx={{ p: 0 }}>
        {content}
      </DialogContent>
      <DialogActions>
        <Button id="song-picker-done" onClick={onClose}>
          {many === null ? t("picker.close") : t("picker.done")}
        </Button>
      </DialogActions>
    </>
  );
}
