import type { Result } from "@abth/core";
import type { Translator } from "@abth/i18n";
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  ToggleButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  DIFFICULTY_COLOUR,
  DIFFICULTY_LABEL,
  DIFFICULTY_TEXT,
  GENRE_COLOUR,
  GENRE_LABEL,
} from "../favorites/genre-look";
import { keptShownDifficulty } from "../favorites/shown-difficulty";
import { nameLanguage, shownName } from "../favorites/song-names";
import type { ListedSong } from "../favorites/use-song-catalogue";
import { HIROBA_LANG } from "../language/hiroba-lang";
import { useTouchFirst } from "../navigation/use-touch-first";
import type { PictureLane } from "../pictures/picture-lane";
import { HoldRing, usePressHold } from "../read-again/long-hold";
import { PullToRead } from "../read-again/pull-to-read";
import type { HirobaSessionPort } from "../session-port";
import { type ChartFileFailure, DIFFICULTIES, type Difficulty } from "../song-catalogue/types";
import { RefreshIcon } from "../ui/icons";
import { LargeModal } from "../ui/large-modal";
import { StatusNote } from "../ui/status-note";
import { ChartDensitySection, type DensityState, masterOf } from "./chart-density";
import { ChartPictures } from "./chart-pictures";
import { keptChartSource } from "./chart-source";
import { ChartViewer, type ShownChart } from "./chart-viewer";
import { CourseIcon } from "./course-icon";
import { drawChart } from "./draw-chart";
import { reloadCharts } from "./find-chart-picture";
import { bpmText, openingChart } from "./song-facts";

/** One empty list for a chart with no facts, so its pictures are not asked for at every render. */
const NO_IMAGES: readonly string[] = [];

// color-mix, as a chart's colour can be a light-dark() pair, which MUI's alpha() cannot read.
const chartButton = (difficulty: Difficulty) => {
  const colour = DIFFICULTY_COLOUR[difficulty];
  // Tight enough that five charts stand in one row on a phone 360 pixels wide.
  return {
    gap: 0.25,
    px: 0.5,
    py: 0.5,
    textTransform: "none",
    fontWeight: 600,
    color: "text.primary",
    borderColor: colour,
    bgcolor: `color-mix(in srgb, ${colour} 18%, transparent)`,
    "&:hover": { bgcolor: `color-mix(in srgb, ${colour} 30%, transparent)` },
    "&.Mui-selected, &.Mui-selected:hover": { bgcolor: colour, color: DIFFICULTY_TEXT },
  } as const;
};

export interface SongDetailsProps {
  /** The song to show; none shuts the dialog. */
  readonly song: ListedSong | null;
  readonly port: Pick<
    HirobaSessionPort,
    "readChartPicture" | "readChartDensity" | "readChartTja" | "readDrawnChart" | "keepDrawnChart"
  >;
  /** Where the charts' difficulty icons, Hiroba's own, are read. */
  readonly lane: PictureLane;
  readonly i18n: Translator;
  readonly onClose: () => void;
}

export function SongDetails({ song, port, lane, i18n, onClose }: SongDetailsProps) {
  // Kept while the modal slides away, so it does not go blank on its way, then dropped, so the
  // song opens afresh; stepping aside for the pipelines page keeps it.
  const [last, setLast] = useState(song);
  if (song !== null && song !== last) {
    setLast(song);
  }
  return last === null ? null : (
    <DetailsBody
      key={last.songNo}
      open={song !== null}
      song={last}
      port={port}
      lane={lane}
      i18n={i18n}
      onClose={onClose}
      onExited={() => {
        if (song === null) {
          setLast(null);
        }
      }}
    />
  );
}

function otherNames(song: ListedSong, shown: string): { text: string; lang: string }[] {
  const names = [song.title, song.titleEn, song.titleZh].filter(
    (name): name is string => name !== null && name !== shown,
  );
  return [...new Set(names)].map((text) => ({ text, lang: nameLanguage(song, text) }));
}

/** Notes per second as taiko.wiki's own average is shown: two decimals. */
const averageText = (value: number, locale: Translator["locale"]) =>
  new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    value,
  );

// Its own component, so each song opens on the chart its levels and the setting choose.
function DetailsBody({
  open,
  song,
  port,
  lane,
  i18n,
  onClose,
  onExited,
}: Omit<SongDetailsProps, "song"> & { open: boolean; song: ListedSong; onExited: () => void }) {
  const { t, locale } = i18n;
  // A touch screen's pull reads the chart again, where a computer has the button.
  const touchFirst = useTouchFirst();
  const content = useRef<HTMLDivElement>(null);
  const [density, setDensity] = useState<DensityState>({
    reading: true,
    read: null,
    failure: null,
  });
  const readDensity = useCallback(
    async (again: boolean) => {
      setDensity((was) => ({ ...was, reading: true }));
      const result = await port.readChartDensity(song.songNo, again);
      setDensity((was) =>
        result.ok
          ? { reading: false, read: result.value, failure: null }
          : { reading: false, read: was.read, failure: result.error.code },
      );
    },
    [port, song.songNo],
  );
  useEffect(() => {
    void readDensity(false);
  }, [readDensity]);
  const [source] = useState(keptChartSource);
  // The song's chart file, held for the dialog's life alone: a failed read is not held.
  const tjaRead = useRef<Promise<Result<string, ChartFileFailure>> | null>(null);
  const readTja = useCallback(() => {
    const reading =
      tjaRead.current ??
      port.readChartTja(song.songNo).then((result) => {
        if (!result.ok) {
          tjaRead.current = null;
        }
        return result;
      });
    tjaRead.current = reading;
    return reading;
  }, [port, song.songNo]);
  const [generation, setGeneration] = useState(0);
  const [reloading, setReloading] = useState(false);
  const busy = density.reading || reloading;
  const readLabel = t("details.readDensity");
  const [chart, setChart] = useState(() => openingChart(song.levels, keptShownDifficulty()));
  const [viewing, setViewing] = useState<ShownChart | null>(null);
  const name = shownName(song, locale);
  const charted = DIFFICULTIES.flatMap((difficulty) => {
    const level = song.levels[difficulty];
    return level === null ? [] : [{ difficulty, level }];
  });
  const facts = chart === null ? null : song.charts[chart];
  const chartDensity = chart === null ? undefined : density.read?.[chart];
  const differs =
    chartDensity !== undefined &&
    facts !== null &&
    facts.maxCombo !== null &&
    masterOf(chartDensity).notes !== facts.maxCombo;
  const reloadSong = async () => {
    setReloading(true);
    tjaRead.current = null;
    const reread = readDensity(true);
    await reloadCharts({
      songNo: song.songNo,
      charts: charted.map(({ difficulty }) => ({
        difficulty,
        images: song.charts[difficulty]?.images ?? [],
      })),
      source,
      port,
      tja: readTja,
      draw: drawChart,
    });
    await reread;
    setGeneration((now) => now + 1);
    setReloading(false);
  };
  const hold = usePressHold(busy ? undefined : () => void reloadSong());

  return (
    <>
      <LargeModal
        id="song-details"
        open={open}
        title={name}
        titleLang={nameLanguage(song, name)}
        actions={
          // None while it is shut: a disabled button sends no event to open or close it.
          <Tooltip title={busy ? "" : readLabel}>
            <IconButton
              id="song-details-read-chart"
              aria-label={readLabel}
              disabled={busy}
              onClick={() => {
                if (!hold.endsAHold()) {
                  void readDensity(true);
                }
              }}
              {...hold.handlers}
            >
              {busy ? <CircularProgress size={20} aria-hidden /> : <RefreshIcon />}
              {hold.since !== null && (
                <HoldRing
                  since={hold.since}
                  size={36}
                  sx={{ position: "absolute", top: 2, left: 2 }}
                />
              )}
            </IconButton>
          </Tooltip>
        }
        pageLike
        contentRef={content}
        i18n={i18n}
        onExited={onExited}
        onClose={onClose}
      >
        <PullToRead
          active={touchFirst}
          canRead={!busy}
          onRead={() => void readDensity(true)}
          onHeld={() => void reloadSong()}
          region={content}
          id="song-details-pull"
        />
        <Stack spacing={2}>
          <Box>
            {otherNames(song, name).map(({ text, lang }) => (
              <Typography key={text} lang={lang} variant="body2" color="text.secondary">
                {text}
              </Typography>
            ))}
            {song.artists.length > 0 && (
              <Typography id="song-details-artists" lang={HIROBA_LANG} sx={{ mt: 0.5 }}>
                {song.artists.join(", ")}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
            {song.genres.map((genre) => (
              <Chip
                key={genre}
                size="small"
                label={t(GENRE_LABEL[genre])}
                sx={{
                  bgcolor: GENRE_COLOUR[genre],
                  color: (theme) => theme.palette.getContrastText(GENRE_COLOUR[genre]),
                }}
              />
            ))}
            {song.bpm !== null && (
              <Typography id="song-details-bpm" variant="body2" sx={{ fontWeight: 600 }}>
                {t("song.bpm", { bpm: bpmText(song.bpm) })}
              </Typography>
            )}
          </Box>
          <Box
            id="song-details-charts"
            role="group"
            aria-label={t("details.charts")}
            sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
          >
            {charted.map(({ difficulty, level }, index) => (
              <ToggleButton
                key={difficulty}
                id={`song-details-chart-${difficulty}`}
                value={difficulty}
                selected={difficulty === chart}
                onChange={() => setChart(difficulty)}
                aria-label={t("song.level", { difficulty: t(DIFFICULTY_LABEL[difficulty]), level })}
                sx={chartButton(difficulty)}
              >
                <CourseIcon difficulty={difficulty} lane={lane} order={index} />
                {t("picker.level", { level })}
              </ToggleButton>
            ))}
          </Box>
          {facts !== null && (
            <Typography id="song-details-facts" variant="body2" color="text.secondary">
              {[
                facts.maxCombo !== null && t("details.maxCombo", { count: facts.maxCombo }),
                facts.maxCombo !== null &&
                  facts.playTime !== null &&
                  t("details.averageDensity", {
                    value: averageText(facts.maxCombo / facts.playTime, locale),
                  }),
                facts.branched && t("details.branched"),
              ]
                .filter(Boolean)
                .join(" · ")}
            </Typography>
          )}
          {chart !== null && (
            <ChartDensitySection
              state={density}
              density={chartDensity}
              maxCombo={facts?.maxCombo ?? null}
              i18n={i18n}
            />
          )}
          {chart !== null ? (
            <ChartPictures
              key={chart}
              songNo={song.songNo}
              difficulty={chart}
              images={facts?.images ?? NO_IMAGES}
              source={source}
              differs={differs}
              tja={readTja}
              generation={generation}
              port={port}
              i18n={i18n}
              onOpen={setViewing}
            />
          ) : (
            <StatusNote id="song-details-no-picture">{t("details.noPicture")}</StatusNote>
          )}
        </Stack>
      </LargeModal>
      <ChartViewer chart={viewing} i18n={i18n} onClose={() => setViewing(null)} />
    </>
  );
}
