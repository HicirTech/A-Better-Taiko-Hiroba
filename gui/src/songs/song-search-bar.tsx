import type { Translator } from "@abth/i18n";
import { Box, IconButton, InputBase, Paper } from "@mui/material";
import type { RefObject } from "react";

import { CloseIcon } from "../favorites/favorites-icons";
import { ArrowBackIcon, SearchIcon } from "./song-icons";

const BAR_PX = 48;
/** An icon button's own size, so the field starts at one place with the mark or the way back. */
const BUTTON_PX = 40;
const BAR = {
  display: "flex",
  alignItems: "center",
  height: BAR_PX,
  px: 0.5,
  borderRadius: `${BAR_PX / 2}px`,
  bgcolor: "background.paper",
} as const;
const MARK = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: BUTTON_PX,
  height: BUTTON_PX,
  color: "text.secondary",
} as const;

export interface SongSearchBarProps {
  readonly query: string;
  readonly active: boolean;
  readonly i18n: Translator;
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly onQuery: (query: string) => void;
  readonly onActivate: () => void;
  readonly onLeave: () => void;
  readonly onSubmit: () => void;
}

/** A search field as Gmail draws it: a search mark, or a way back out once searching. */
export function SongSearchBar({
  query,
  active,
  i18n,
  inputRef,
  onQuery,
  onActivate,
  onLeave,
  onSubmit,
}: SongSearchBarProps) {
  const { t } = i18n;
  return (
    <Paper
      id="song-search"
      component="form"
      role="search"
      elevation={active ? 4 : 1}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      sx={BAR}
    >
      {active ? (
        <IconButton id="song-search-leave" aria-label={t("search.leave")} onClick={onLeave}>
          <ArrowBackIcon />
        </IconButton>
      ) : (
        <Box component="span" sx={MARK}>
          <SearchIcon />
        </Box>
      )}
      <InputBase
        id="song-search-input"
        inputRef={inputRef}
        value={query}
        placeholder={t("picker.search")}
        onFocus={onActivate}
        onChange={(event) => onQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onLeave();
          }
        }}
        inputProps={{ "aria-label": t("picker.search"), enterKeyHint: "search" }}
        sx={{ flex: 1, minWidth: 0 }}
      />
      {query !== "" && (
        <IconButton
          id="song-search-clear"
          aria-label={t("search.clear")}
          onClick={() => onQuery("")}
        >
          <CloseIcon />
        </IconButton>
      )}
    </Paper>
  );
}
