import type { Translator } from "@abth/i18n";
import { Box, IconButton, InputBase, Paper, Skeleton } from "@mui/material";
import { type RefObject, useState } from "react";

import { ArrowBackIcon, CloseIcon, SearchIcon } from "./icons";

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

export interface SearchFieldProps {
  /** The bar's id; its parts take it as their prefix: `-input`, `-clear` and `-leave`. */
  readonly id: string;
  readonly query: string;
  readonly i18n: Translator;
  readonly onQuery: (query: string) => void;
  /** Set while the search stands in for its page: a way back out takes the search mark's place. */
  readonly onLeave?: (() => void) | undefined;
  readonly onFocus?: (() => void) | undefined;
  readonly onSubmit?: (() => void) | undefined;
  readonly inputRef?: RefObject<HTMLInputElement | null> | undefined;
  readonly autoFocus?: boolean | undefined;
  /** What a search takes, in place of the placeholder while open and empty; none with a history. */
  readonly hint?: string | undefined;
}

/** A search field as Gmail draws it: a search mark, or a way back out, the words, and a ×. */
export function SearchField({
  id,
  query,
  i18n,
  onQuery,
  onLeave,
  onFocus,
  onSubmit,
  inputRef,
  autoFocus,
  hint,
}: SearchFieldProps) {
  const { t } = i18n;
  const label = t("picker.search");
  const [focused, setFocused] = useState(false);
  // Open while it has the focus, or while the search stands in for its page.
  const hinted = hint !== undefined && query === "" && (focused || onLeave !== undefined);
  return (
    <Paper
      id={id}
      component="form"
      role="search"
      elevation={onLeave === undefined ? 1 : 4}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
        // Enter is done with the words: a phone's keyboard goes down with the focus.
        event.currentTarget.querySelector("input")?.blur();
      }}
      sx={BAR}
    >
      {onLeave === undefined ? (
        <Box component="span" sx={MARK}>
          <SearchIcon />
        </Box>
      ) : (
        <IconButton id={`${id}-leave`} aria-label={t("search.leave")} onClick={onLeave}>
          <ArrowBackIcon />
        </IconButton>
      )}
      <InputBase
        id={`${id}-input`}
        inputRef={inputRef}
        value={query}
        placeholder={hinted ? hint : label}
        autoFocus={autoFocus}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => setFocused(false)}
        onChange={(event) => onQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Escape") {
            return;
          }
          if (onLeave === undefined) {
            // As a search input does; a dialog around the field still shuts on the same Esc.
            onQuery("");
          } else {
            onLeave();
          }
        }}
        inputProps={{
          "aria-label": label,
          enterKeyHint: "search",
        }}
        sx={{ flex: 1, minWidth: 0 }}
      />
      {query !== "" && (
        <IconButton id={`${id}-clear`} aria-label={t("search.clear")} onClick={() => onQuery("")}>
          <CloseIcon />
        </IconButton>
      )}
    </Paper>
  );
}

/** A search field's shape while its page's first read runs. */
export function SearchFieldSkeleton() {
  return <Skeleton variant="rounded" height={BAR_PX} sx={{ borderRadius: BAR.borderRadius }} />;
}
