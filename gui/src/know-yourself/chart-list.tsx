import { chartKey } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { useState } from "react";
import type { PictureLane } from "../pictures/picture-lane";
import { HIROBA_LANG } from "../shared/language/hiroba-lang";
import { SET_SONG_LIMIT } from "../shared/sets/favorite-sets";
import type { SongLook } from "../shared/song-catalogue/song-look";
import { ChartMarks } from "../songs/chart-level";
import { RowCheckbox, SongRow } from "../songs/song-row";
import { RowList } from "../ui/row-list";
import { type GapKind, gapKindOf, songsOf } from "./gaps";
import type { KnownChart } from "./known-charts";

const GAP_KINDS: readonly GapKind[] = ["never", "notCleared"];
const GAP_LABEL = { never: "know.never", notCleared: "know.tried" } as const;

/** About how tall a chart's row draws, before the list measures it. */
const CHART_ROW_PX = 58;

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
      <RowList id={`${id}-rows`} rows={shown} keyOf={chartKey} rowPx={CHART_ROW_PX}>
        {(chart, order, place) => {
          const key = chartKey(chart);
          const look = lookOf(chart.songNo);
          return (
            <SongRow
              data-song-no={chart.songNo}
              data-level={chart.level}
              start={
                <RowCheckbox
                  checked={ticked.has(key)}
                  label={look.name}
                  onChange={() => tick(key)}
                />
              }
              genres={look.genres}
              name={look.name}
              lang={look.lang}
              lines={
                look.artists.length > 0
                  ? [
                      <span key="artists" lang={HIROBA_LANG}>
                        {look.artists.join(", ")}
                      </span>,
                    ]
                  : []
              }
              marks={
                <ChartMarks
                  difficulty={chart.difficulty}
                  level={chart.stars}
                  lane={lane}
                  order={order}
                  i18n={i18n}
                >
                  <Typography
                    component="span"
                    variant="body2"
                    color="text.secondary"
                    noWrap
                    className="chart-note"
                  >
                    {note(chart)}
                  </Typography>
                </ChartMarks>
              }
              onPress={opener(chart)}
              pressOpens
              place={place}
            />
          );
        }}
      </RowList>
    </Stack>
  );
}
