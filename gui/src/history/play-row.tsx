import type { Genre, RecentPlay } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Box, Skeleton, Stack, type SxProps, type Theme } from "@mui/material";
import type { ReactNode } from "react";

import { GENRE_LABEL, LEVEL_DIFFICULTY } from "../favorites/genre-look";
import { LEVEL_BADGE_PX } from "../favorites/level-badges";
import { HIROBA_LANG } from "../language/hiroba-lang";
import type { PictureLane } from "../pictures/picture-lane";
import { CHART_MARK_PX, ChartMarks } from "../songs/chart-level";
import { type RowHandlers, SongRow, SongRowSkeleton } from "../songs/song-row";
import type { RowPlace } from "../ui/row-list";
import { PLAY_MARKS_SKELETON, PlayMarks } from "./play-marks";

/** About how tall a play's row draws, before a list measures it. */
export const PLAY_ROW_PX = 75;

const PLAIN_LIST = { listStyle: "none", m: 0, p: 0 } as const;
// A play's counts are what its row is for: where the room is short they wrap, never cut short.
const COUNTS = { "& .song-line": { whiteSpace: "normal" } } as const;
const SKELETON_ROWS = [...Array(9).keys()];

export interface PlayRowProps {
  readonly play: RecentPlay;
  /** The song's name as shown, and its language; Hiroba's own title by default. */
  readonly name?: { readonly text: string; readonly lang: string } | undefined;
  /** The song's genres from the song list; Hiroba's one genre where the list lacks the song. */
  readonly genres?: readonly Genre[] | undefined;
  /** The chart's star level from the song list; none where the list lacks it. */
  readonly stars?: number | null;
  readonly lane: PictureLane;
  readonly order: number;
  readonly i18n: Translator;
  /** The title's id where the row heads a chart's details, which list its hits below it. */
  readonly heading?: string;
  /** Shown first in the row, before the genres' bars: what the page rates the chart. */
  readonly lead?: ReactNode;
  /** What a press on the row opens: its chart's details. */
  readonly onOpen?: (() => void) | undefined;
  readonly handlers?: RowHandlers;
  readonly place?: RowPlace | undefined;
  readonly sx?: SxProps<Theme>;
  readonly [data: `data-${string}`]: string | number | undefined;
}

/** One play: its song, its score and hits, the chart's difficulty and level, its marks. */
export function PlayRow({
  play,
  name,
  genres,
  stars = null,
  lane,
  order,
  i18n,
  heading,
  lead,
  onOpen,
  handlers,
  place,
  sx,
  ...rest
}: PlayRowProps) {
  const { t, number } = i18n;
  const { record } = play;
  const shownGenres =
    genres !== undefined && genres.length > 0 ? genres : play.genre === null ? [] : [play.genre];
  const score = [number(record.highScore), labeled(t("history.combo"), record.maxCombo, number)];
  const hits = [
    labeled(t("history.good"), record.good, number),
    labeled(t("history.ok"), record.ok, number),
    labeled(t("history.bad"), record.bad, number),
    labeled(t("history.roll"), record.drumroll, number),
  ];
  const line = (parts: readonly (string | null)[]) =>
    parts.filter((part) => part !== null).join(" · ");
  return (
    <SongRow
      component={heading === undefined ? "li" : "div"}
      {...rest}
      lead={lead}
      genres={shownGenres}
      genresLabel={
        shownGenres.length === 0
          ? undefined
          : shownGenres.map((genre) => t(GENRE_LABEL[genre])).join(", ")
      }
      name={name?.text ?? play.songTitle}
      lang={name?.lang ?? HIROBA_LANG}
      scrolling={heading !== undefined}
      {...(heading === undefined ? {} : { nameId: heading })}
      lines={heading === undefined ? [line(score), line(hits)] : [line(score)]}
      marks={
        <ChartMarks
          difficulty={LEVEL_DIFFICULTY[play.level]}
          level={stars}
          lane={lane}
          order={order}
          i18n={i18n}
        >
          <PlayMarks play={play} lane={lane} order={order} i18n={i18n} />
        </ChartMarks>
      }
      onPress={onOpen}
      pressOpens
      handlers={handlers}
      place={place}
      sx={[COUNTS, ...(Array.isArray(sx) ? sx : [sx])]}
    />
  );
}

function labeled(
  name: string,
  count: number | null,
  number: (value: number) => string,
): string | null {
  return count === null ? null : `${name} ${number(count)}`;
}

/** A play's marks' shape while a page's first read runs: the difficulty's, a crown's, a rank's. */
function MarksSkeleton() {
  return (
    <Box
      component="span"
      sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}
    >
      <Box component="span" sx={{ display: "flex", gap: 0.5 }}>
        {[CHART_MARK_PX, ...PLAY_MARKS_SKELETON].map((width, index) => (
          <Skeleton
            // biome-ignore lint/suspicious/noArrayIndexKey: a mark is its place in the line
            key={index}
            variant="rounded"
            width={width}
            height={CHART_MARK_PX}
          />
        ))}
      </Box>
      <Skeleton variant="rounded" width={LEVEL_BADGE_PX} height={LEVEL_BADGE_PX} />
    </Box>
  );
}

/** As many play rows' shapes as fill a window, while a page's first read runs. */
export function PlayRowsSkeleton() {
  return (
    <Stack component="ul" spacing={0} aria-hidden sx={PLAIN_LIST}>
      {SKELETON_ROWS.map((key) => (
        <SongRowSkeleton key={key} lines={2} marks={<MarksSkeleton />} />
      ))}
    </Stack>
  );
}
