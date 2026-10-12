import { chartKey } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Box, Button, Checkbox, Chip, Stack, Typography } from "@mui/material";
import { useState } from "react";

import { SET_SONG_LIMIT } from "../favorites/favorite-sets";
import { DIFFICULTY_LABEL } from "../favorites/genre-look";
import type { SongLook } from "../favorites/song-look";
import { SongRow } from "../favorites/song-row";
import type { PictureLane } from "../pictures/picture-lane";
import { CourseIcon } from "../songs/course-icon";
import { type GapKind, gapKindOf, songsOf } from "./gaps";
import type { KnownChart } from "./known-charts";

const GAP_KINDS: readonly GapKind[] = ["never", "notCleared"];
const GAP_LABEL = { never: "know.never", notCleared: "know.tried" } as const;

const LIST = { listStyle: "none", m: 0, p: 0 } as const;
// Rows off screen skip their layout: an opened list can hold hundreds of charts.
const ROW = { contentVisibility: "auto", containIntrinsicSize: "auto 44px", py: 0.25 } as const;
const END = { "& .chart-note": { color: "text.secondary", whiteSpace: "nowrap" } } as const;

/** Charts to tick and add to a set, or the nearest at once; a played one opens its details. */
export function ChartList({
  id,
  charts,
  note,
  narrows,
  lookOf,
  opener,
  lane,
  i18n,
  onAdd,
}: {
  readonly id: string;
  /** The order the nearest are taken in. */
  readonly charts: readonly KnownChart[];
  /** What a row says after its stars, such as what the chart lacks. */
  readonly note: (chart: KnownChart) => string;
  /** Chips that narrow the list to the charts never played, or to those played. */
  readonly narrows: boolean;
  readonly lookOf: (songNo: string) => SongLook;
  /** The way to a chart's details; undefined for a chart with none. */
  readonly opener: (chart: KnownChart) => (() => void) | undefined;
  readonly lane: PictureLane;
  readonly i18n: Translator;
  readonly onAdd: (songs: readonly string[]) => void;
}) {
  const { t, number } = i18n;
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const [kind, setKind] = useState<GapKind | null>(null);
  const shown = kind === null ? charts : charts.filter((chart) => gapKindOf(chart) === kind);
  const tickedSongs = songsOf(shown.filter((chart) => ticked.has(chartKey(chart))));
  const nearest = songsOf(shown).slice(0, SET_SONG_LIMIT);
  const tick = (key: string) =>
    setTicked((now) => {
      const next = new Set(now);
      if (!next.delete(key)) {
        next.add(key);
      }
      return next;
    });
  return (
    <Stack id={id} spacing={1}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
        {narrows &&
          GAP_KINDS.map((each) => (
            <Chip
              key={each}
              id={`${id}-${each}`}
              label={t(GAP_LABEL[each])}
              variant={kind === each ? "filled" : "outlined"}
              color={kind === each ? "primary" : "default"}
              aria-pressed={kind === each}
              onClick={() => setKind(kind === each ? null : each)}
              onDelete={kind === each ? () => setKind(null) : undefined}
            />
          ))}
        <Button
          id={`${id}-add-ticked`}
          size="small"
          disabled={tickedSongs.length === 0}
          onClick={() => onAdd(tickedSongs)}
        >
          {t("know.addTicked")}
        </Button>
        {nearest.length > 0 && (
          <Button id={`${id}-add-nearest`} size="small" onClick={() => onAdd(nearest)}>
            {t("know.addNearest", { count: number(nearest.length) })}
          </Button>
        )}
      </Box>
      <Box component="ul" sx={LIST}>
        {shown.map((chart, order) => {
          const key = chartKey(chart);
          const look = lookOf(chart.songNo);
          return (
            <Box
              component="li"
              key={key}
              data-song-no={chart.songNo}
              data-level={chart.level}
              sx={ROW}
            >
              <SongRow
                look={look}
                i18n={i18n}
                withLevels={false}
                onOpen={opener(chart)}
                start={
                  <Checkbox
                    size="small"
                    checked={ticked.has(key)}
                    onChange={() => tick(key)}
                    slotProps={{ input: { "aria-label": look.name } }}
                    sx={{ alignSelf: "center", p: 0.5 }}
                  />
                }
                end={
                  <Box component="span" sx={{ display: "contents", ...END }}>
                    <CourseIcon
                      difficulty={chart.difficulty}
                      lane={lane}
                      order={order}
                      label={t(DIFFICULTY_LABEL[chart.difficulty])}
                    />
                    {chart.stars !== null && (
                      <Typography component="span" variant="body2">
                        {t("picker.level", { level: chart.stars })}
                      </Typography>
                    )}
                    <Typography component="span" variant="body2" className="chart-note">
                      {note(chart)}
                    </Typography>
                  </Box>
                }
              />
            </Box>
          );
        })}
      </Box>
    </Stack>
  );
}
