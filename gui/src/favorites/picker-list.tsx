import type { Translator } from "@abth/i18n";
import { Fragment, type ReactNode, type RefObject } from "react";
import { DIFFICULTY_COLOUR } from "../shared/song-catalogue/genre-look";
import type { SongLook } from "../shared/song-catalogue/song-look";
import { type Marked, segmentsOf } from "../shared/song-catalogue/song-search";
import { SongRow } from "../songs/song-row";
import { RowList } from "../ui/row-list";
import { LevelBadges } from "./level-badges";
import { artistsLine } from "./song-look-row";

/** A song in the list, and the names a search marked in it. */
export interface PickerEntry {
  readonly look: SongLook;
  /** The name shown, marked, when there was a search. */
  readonly shown: Marked | null;
  readonly other: { readonly marked: Marked; readonly lang: string } | null;
  /** The start of the line under the name, such as the song's tempo. */
  readonly detail?: string | undefined;
  /** The song's 裏 entry, a row of its own beside the song's. */
  readonly ura?: boolean;
}

/** What a picker that takes many songs shows: the ones in, and how many fit. */
export interface PickedSongs {
  readonly picked: ReadonlySet<string>;
  readonly limit: number;
}

/** About how tall a row draws, before the list measures it. */
const PICKER_ROW_PX = 55;

// A wash of the inner chart's colour, lighter than its badge.
const URA_ROW = {
  bgcolor: `color-mix(in srgb, ${DIFFICULTY_COLOUR.ura} 24%, transparent)`,
  "&.song-row-pressable:hover": {
    bgcolor: `color-mix(in srgb, ${DIFFICULTY_COLOUR.ura} 34%, transparent)`,
  },
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

function markedName({ look, shown, other }: PickerEntry): ReactNode {
  if (shown === null) {
    return look.name;
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

const rowKey = (entry: PickerEntry) => `${entry.look.songNo}${entry.ura === true ? "-ura" : ""}`;

/** The songs, one tap or one check box each; at the limit the rows not checked are shut. */
export function PickerList({
  entries,
  i18n,
  many,
  onActivate,
  describedBy,
  idPrefix = "song-picker",
  scroller,
}: {
  entries: readonly PickerEntry[];
  i18n: Translator;
  many: PickedSongs | null;
  onActivate: (songNo: string, ura: boolean) => void;
  describedBy?: string | undefined;
  /** The list is `<idPrefix>-list`, each row `<idPrefix>-row-<song number>`, a 裏 row `…-ura`. */
  idPrefix?: string;
  /** What the list scrolls in, such as the picker's dialog; the page otherwise. */
  scroller?: RefObject<HTMLElement | null> | undefined;
}) {
  const full = many !== null && many.picked.size >= many.limit;
  return (
    <RowList
      id={`${idPrefix}-list`}
      rows={entries}
      keyOf={rowKey}
      rowPx={PICKER_ROW_PX}
      scroller={scroller}
      describedBy={describedBy}
    >
      {(entry, _index, place) => {
        const { look } = entry;
        const ura = entry.ura === true;
        const activate = () => onActivate(look.songNo, ura);
        const checked = many?.picked.has(look.songNo) ?? false;
        return (
          <SongRow
            id={`${idPrefix}-row-${rowKey(entry)}`}
            data-song-no={look.songNo}
            genres={look.genres}
            name={markedName(entry)}
            lang={look.lang}
            lines={artistsLine(entry.look, entry.detail)}
            end={
              look.levels === null ? undefined : <LevelBadges levels={look.levels} i18n={i18n} />
            }
            {...(many === null
              ? { onPress: activate }
              : { tick: { checked, disabled: full && !checked, onChange: activate } })}
            place={place}
            {...(ura ? { sx: URA_ROW } : {})}
          />
        );
      }}
    </RowList>
  );
}
