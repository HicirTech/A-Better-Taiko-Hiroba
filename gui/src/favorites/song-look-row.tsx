import type { Translator } from "@abth/i18n";
import { Skeleton } from "@mui/material";
import type { ReactNode } from "react";

import { HIROBA_LANG } from "../shared/language/hiroba-lang";
import type { SongLook } from "../shared/song-catalogue/song-look";
import { SongRow, SongRowSkeleton } from "../songs/song-row";
import { LEVEL_BADGE_PX, LevelBadges } from "./level-badges";

/** The way to a song's details, for a row's `onOpen`; undefined for a song without any. */
export type DetailsOpener = (songNo: string) => (() => void) | undefined;

/** The line under a song's name: a detail, such as its tempo, then its artists; none for neither. */
export function artistsLine({ artists }: SongLook, detail?: string): ReactNode[] {
  if (artists.length === 0 && detail === undefined) {
    return [];
  }
  return [
    <span key="line">
      {detail}
      {detail !== undefined && artists.length > 0 && " · "}
      {artists.length > 0 && <span lang={HIROBA_LANG}>{artists.join(", ")}</span>}
    </span>,
  ];
}

/** A song from its look in the shared row: its genres, name and artists, and its levels. */
export function SongLookRow({
  id,
  component = "li",
  look,
  i18n,
  detail,
  scrolling = false,
  start,
  end,
  onOpen,
  ...rest
}: {
  readonly id?: string;
  readonly component?: "li" | "div";
  readonly look: SongLook;
  readonly i18n: Translator;
  /** Before the artists on the second line: such as the song's tempo, or its inner chart. */
  readonly detail?: string | undefined;
  readonly scrolling?: boolean;
  /** Before the bars: such as the handle that moves the row. */
  readonly start?: ReactNode;
  /** After the levels: such as a button that takes the song out. */
  readonly end?: ReactNode;
  /** What a press opens: the song's details; no press for a song without any. */
  readonly onOpen?: (() => void) | undefined;
  readonly [data: `data-${string}`]: string | number | undefined;
}) {
  const { levels } = look;
  return (
    <SongRow
      {...(id === undefined ? {} : { id })}
      component={component}
      data-song-no={look.songNo}
      {...rest}
      start={start}
      genres={look.genres}
      name={look.name}
      lang={look.lang}
      scrolling={scrolling}
      lines={artistsLine(look, detail)}
      end={
        levels === null && end === undefined ? undefined : (
          <>
            {levels !== null && <LevelBadges levels={levels} i18n={i18n} />}
            {end}
          </>
        )
      }
      onPress={onOpen}
      pressOpens
    />
  );
}

/** A song's row's shape while a page's first read runs: its bar, name, artists and level. */
export function SongLookRowSkeleton({ component = "li" }: { readonly component?: "li" | "div" }) {
  return (
    <SongRowSkeleton
      component={component}
      end={<Skeleton variant="rounded" width={LEVEL_BADGE_PX} height={LEVEL_BADGE_PX} />}
    />
  );
}
