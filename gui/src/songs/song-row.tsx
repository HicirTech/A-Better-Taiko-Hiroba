import type { Genre } from "@abth/core";
import { Box, Checkbox, type SxProps, type Theme } from "@mui/material";
import type { MouseEvent, ReactNode } from "react";

import { GENRE_COLOUR } from "../favorites/genre-look";
import { LEVEL_BADGES_LOOK } from "../favorites/level-badges";
import { ScrollingText } from "../favorites/scrolling-text";
import type { LongPressHandlers } from "../my-page/use-long-press";
import type { RowPlace } from "../ui/row-list";

const ONE_LINE = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as const;
const NO_GENRE = { backgroundColor: "currentColor", opacity: 0.25 } as const;
// The row's parts are plain elements styled from here: a picker draws hundreds of rows.
const ROW = {
  display: "flex",
  alignItems: "center",
  gap: 1,
  minWidth: 0,
  px: 1,
  py: 0.75,
  "&.song-row-pressable:hover": { bgcolor: "action.hover" },
  "&:has(> .song-open:focus-visible, > .song-open input:focus-visible)": {
    outline: "2px solid",
    outlineColor: "primary.main",
    outlineOffset: "-2px",
  },
  "&:has(input:disabled)": { opacity: 0.5 },
  "& .song-open": {
    display: "flex",
    alignItems: "center",
    alignSelf: "stretch",
    gap: 1,
    flex: 1,
    minWidth: 0,
    p: 0,
    m: 0,
    border: 0,
    bgcolor: "transparent",
    color: "inherit",
    font: "inherit",
    textAlign: "left",
    outline: "none",
  },
  "& button.song-open, & label.song-open": { cursor: "pointer" },
  "& .song-bars": { display: "flex", alignSelf: "stretch", gap: "2px", flexShrink: 0 },
  "& .song-bar": { width: 4, borderRadius: "2px" },
  "& .song-text": { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 0.25 },
  "& .song-name": { ...ONE_LINE, lineHeight: 1.4 },
  "& .song-line": { ...ONE_LINE, color: "text.secondary", fontSize: "0.8125rem", lineHeight: 1.4 },
  "& .song-end": { display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 },
  // The name's line is 22.4 px and a mark 20: a pixel down sets their middles together.
  "& .song-end-top": { alignSelf: "flex-start", mt: "1px" },
  ...LEVEL_BADGES_LOOK,
} as const;

/** The check box every row draws, the one a whole row ticks and the one beside a row alike. */
export function RowCheckbox({
  checked,
  disabled,
  label,
  onChange,
}: {
  readonly checked: boolean;
  readonly disabled?: boolean | undefined;
  /** What it ticks, for screen readers, where no words of its own say it. */
  readonly label?: string | undefined;
  readonly onChange: () => void;
}) {
  return (
    <Checkbox
      size="small"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      slotProps={{ input: label === undefined ? {} : { "aria-label": label } }}
      sx={{ p: 0.5, flexShrink: 0 }}
    />
  );
}

/** A check box that the whole row ticks, in place of a press. */
export interface RowTick {
  readonly checked: boolean;
  readonly disabled?: boolean | undefined;
  readonly onChange: () => void;
}

/** What a row answers besides a press: a long press or a right-click for its own menu. */
export interface RowHandlers extends Partial<LongPressHandlers> {
  readonly onContextMenu?: (event: MouseEvent) => void;
}

export interface SongRowProps {
  readonly id?: string;
  /** A row of a list, or a block that heads a chart's details. */
  readonly component?: "li" | "div";
  readonly className?: string;
  /** Before the bars: a check box beside the row, a handle that moves it, what a page rates. */
  readonly start?: ReactNode;
  /** One bar per genre; none drawn faint. */
  readonly genres: readonly Genre[];
  readonly name: ReactNode;
  readonly lang: string;
  /** A name too long for the row scrolls rather than ends in an ellipsis. */
  readonly scrolling?: boolean;
  /** The name's id where the row heads a chart's details, which name it by it. */
  readonly nameId?: string;
  /** The grey lines under the name: artists, a tempo, a play's score and hits. */
  readonly lines?: readonly ReactNode[];
  /** At the row's end: the charts' levels, a chart's marks, a button that takes the song out. */
  readonly end?: ReactNode;
  /** The end stands at the name's line, as a chart's marks do, rather than in the row's middle. */
  readonly endAtTop?: boolean;
  /** What a press on the row does, which its page decides: open details, pick the song. */
  readonly onPress?: (() => void) | undefined;
  /** The press opens a dialog, as screen readers are told. */
  readonly pressOpens?: boolean;
  /** A check box the whole row ticks, in place of a press. */
  readonly tick?: RowTick | undefined;
  readonly handlers?: RowHandlers;
  /** Where a long list put the row. */
  readonly place?: RowPlace | undefined;
  readonly sx?: SxProps<Theme>;
  readonly [data: `data-${string}`]: string | number | boolean | undefined;
}

/** A song or one of its charts in a row: genre bars, name, grey lines and what a page adds. */
export function SongRow({
  component = "li",
  className,
  start,
  genres,
  name,
  lang,
  scrolling = false,
  nameId,
  lines = [],
  end,
  endAtTop = false,
  onPress,
  pressOpens = false,
  tick,
  handlers,
  place,
  sx,
  ...rest
}: SongRowProps) {
  const pressable = onPress !== undefined || tick !== undefined;
  const song = (
    <>
      <span className="song-bars" aria-hidden>
        {genres.length === 0 ? (
          <span className="song-bar" style={NO_GENRE} />
        ) : (
          genres.map((genre) => (
            <span
              key={genre}
              className="song-bar"
              style={{ backgroundColor: GENRE_COLOUR[genre] }}
            />
          ))
        )}
      </span>
      <span className="song-text">
        {scrolling ? (
          <ScrollingText
            {...(nameId === undefined ? {} : { id: nameId })}
            className="song-name"
            lang={lang}
          >
            {name}
          </ScrollingText>
        ) : (
          <span id={nameId} className="song-name" lang={lang}>
            {name}
          </span>
        )}
        {lines.map((line, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a line is its place under the name
          <span key={index} className="song-line">
            {line}
          </span>
        ))}
      </span>
    </>
  );
  return (
    <Box
      component={component}
      className={["song-row", pressable ? "song-row-pressable" : "", className ?? ""]
        .filter((part) => part !== "")
        .join(" ")}
      {...rest}
      {...handlers}
      {...place}
      sx={[ROW, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      {start}
      {tick !== undefined ? (
        // biome-ignore lint/a11y/noLabelWithoutControl: the check box inside holds the input
        <label className="song-open">
          <RowCheckbox checked={tick.checked} disabled={tick.disabled} onChange={tick.onChange} />
          {song}
        </label>
      ) : onPress !== undefined ? (
        <button
          type="button"
          className="song-open"
          aria-haspopup={pressOpens ? "dialog" : undefined}
          onClick={onPress}
        >
          {song}
        </button>
      ) : (
        <span className="song-open">{song}</span>
      )}
      {end !== undefined && (
        <span className={endAtTop ? "song-end song-end-top" : "song-end"}>{end}</span>
      )}
    </Box>
  );
}
