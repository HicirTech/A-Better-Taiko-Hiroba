import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";
import { Fragment, memo, type ReactNode } from "react";
import type { SongLook } from "./song-look";
import { SongRow } from "./song-row";
import { type Marked, segmentsOf } from "./song-search";

/** A song in the list, and the names a search marked in it. */
export interface PickerEntry {
  readonly look: SongLook;
  /** The name shown, marked, when there was a search. */
  readonly shown: Marked | null;
  readonly other: { readonly marked: Marked; readonly lang: string } | null;
}

/** What a picker that takes many songs shows: the ones in, and how many fit. */
export interface PickedSongs {
  readonly picked: ReadonlySet<string>;
  readonly limit: number;
}

// Rows are plain elements and drawn only when near the view: a genre lists hundreds of songs.
const LIST = {
  listStyle: "none",
  m: 0,
  p: 0,
  "& .picker-row": { contentVisibility: "auto", containIntrinsicSize: "auto 56px" },
  "& .picker-hit": {
    display: "flex",
    alignItems: "center",
    gap: 1.5,
    boxSizing: "border-box",
    width: 1,
    px: 2,
    py: 0.75,
    border: 0,
    bgcolor: "transparent",
    color: "inherit",
    font: "inherit",
    textAlign: "left",
    cursor: "pointer",
    "&:hover": { bgcolor: "action.hover" },
    "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 },
    "&:has(input:disabled)": { opacity: 0.5, cursor: "default" },
  },
  "& .picker-hit input": { flexShrink: 0, m: 0, width: 18, height: 18 },
  "& .picker-hit .song-row": { flex: 1, minWidth: 0 },
} as const;

function MarkedText({ marked }: { marked: Marked }) {
  const parts: ReactNode[] = [];
  let offset = 0;
  for (const { text, bold } of segmentsOf(marked)) {
    parts.push(bold ? <b key={offset}>{text}</b> : <Fragment key={offset}>{text}</Fragment>);
    offset += text.length;
  }
  return <>{parts}</>;
}

function markedName({ shown, other }: PickerEntry): ReactNode {
  if (shown === null) {
    return undefined;
  }

  return (
    <>
      <MarkedText marked={shown} />
      {other !== null && (
        <span lang={other.lang}>
          {" ("}
          <MarkedText marked={other.marked} />
          {")"}
        </span>
      )}
    </>
  );
}

interface RowProps {
  readonly entry: PickerEntry;
  readonly i18n: Translator;
  readonly many: boolean;
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly onActivate: (songNo: string) => void;
}

const PickerRow = memo(function PickerRow({
  entry,
  i18n,
  many,
  checked,
  disabled,
  onActivate,
}: RowProps) {
  const { songNo } = entry.look;
  const row = <SongRow look={entry.look} i18n={i18n} name={markedName(entry)} />;
  return (
    <li className="picker-row" id={`song-picker-row-${songNo}`} data-song-no={songNo}>
      {many ? (
        <label className="picker-hit">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={() => onActivate(songNo)}
          />
          {row}
        </label>
      ) : (
        <button type="button" className="picker-hit" onClick={() => onActivate(songNo)}>
          {row}
        </button>
      )}
    </li>
  );
});

/** The songs, one tap or one check box each; at the limit the rows not checked are shut. */
export function PickerList({
  entries,
  i18n,
  many,
  onActivate,
  describedBy,
}: {
  entries: readonly PickerEntry[];
  i18n: Translator;
  many: PickedSongs | null;
  onActivate: (songNo: string) => void;
  describedBy?: string | undefined;
}) {
  const full = many !== null && many.picked.size >= many.limit;
  return (
    <Box component="ul" id="song-picker-list" aria-describedby={describedBy} sx={LIST}>
      {entries.map((entry) => {
        const checked = many?.picked.has(entry.look.songNo) ?? false;
        return (
          <PickerRow
            key={entry.look.songNo}
            entry={entry}
            i18n={i18n}
            many={many !== null}
            checked={checked}
            disabled={full && !checked}
            onActivate={onActivate}
          />
        );
      })}
    </Box>
  );
}
