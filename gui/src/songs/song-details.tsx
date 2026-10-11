import type { Translator } from "@abth/i18n";
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormHelperText,
  IconButton,
  Stack,
  ToggleButton,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useCallback, useContext, useEffect, useRef, useState } from "react";

import { CloseIcon } from "../favorites/favorites-icons";
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
import { useBackLeaves } from "../navigation/back-closers";
import { PipelinesShownContext } from "../navigation/pipelines-shown";
import { useTouchFirst } from "../navigation/use-touch-first";
import type { PictureLane } from "../pictures/picture-lane";
import { PullToRead } from "../read-again/pull-to-read";
import { RefreshIcon } from "../read-again/read-again-foot";
import type { HirobaSessionPort } from "../session-port";
import { DIFFICULTIES, type Difficulty } from "../song-catalogue/types";
import { ChartDensitySection, type DensityState } from "./chart-density";
import { ChartPicture } from "./chart-picture";
import { ChartViewer, type ShownChart } from "./chart-viewer";
import { CourseIcon } from "./course-icon";
import { bpmText, openingChart } from "./song-facts";

const TITLE_ID = "song-details-title";

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
  readonly port: Pick<HirobaSessionPort, "readChartPicture" | "readChartDensity">;
  /** Where the charts' difficulty icons, Hiroba's own, are read. */
  readonly lane: PictureLane;
  readonly i18n: Translator;
  readonly onClose: () => void;
}

export function SongDetails({ song, port, lane, i18n, onClose }: SongDetailsProps) {
  const narrow = useMediaQuery(useTheme().breakpoints.down("sm"), { noSsr: true });
  // Kept while the dialog fades out, so it does not go blank on its way.
  const [last, setLast] = useState(song);
  if (song !== null && song !== last) {
    setLast(song);
  }
  // A page of its own on a phone: Back leaves it as it leaves a mode, and the menu's swipe still
  // opens the menu over it.
  useBackLeaves(song !== null, onClose);
  const covered = useContext(PipelinesShownContext);
  return (
    <Dialog
      id="song-details"
      open={song !== null && !covered}
      onClose={onClose}
      fullScreen={narrow}
      fullWidth
      maxWidth="md"
      aria-labelledby={TITLE_ID}
    >
      {last !== null && (
        <DetailsBody
          key={last.songNo}
          song={last}
          port={port}
          lane={lane}
          i18n={i18n}
          onClose={onClose}
        />
      )}
    </Dialog>
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
  song,
  port,
  lane,
  i18n,
  onClose,
}: Omit<SongDetailsProps, "song"> & { song: ListedSong }) {
  const { t, locale } = i18n;
  // A touch screen's Back shuts the dialog and a pull reads the chart again: no buttons.
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
  const readLabel = t("details.readDensity");
  const [chart, setChart] = useState(() => openingChart(song.levels, keptShownDifficulty()));
  const [viewing, setViewing] = useState<ShownChart | null>(null);
  const name = shownName(song, locale);
  const charted = DIFFICULTIES.flatMap((difficulty) => {
    const level = song.levels[difficulty];
    return level === null ? [] : [{ difficulty, level }];
  });
  const facts = chart === null ? null : song.charts[chart];
  const images = facts?.images ?? [];

  return (
    <>
      <DialogTitle
        id={TITLE_ID}
        lang={nameLanguage(song, name)}
        sx={touchFirst ? undefined : { pr: 13 }}
      >
        {name}
      </DialogTitle>
      {!touchFirst && (
        <Box sx={{ position: "absolute", top: 12, right: 12, display: "flex" }}>
          {/* None while it is shut: a disabled button sends no event to open or close it. */}
          <Tooltip title={density.reading ? "" : readLabel}>
            <IconButton
              id="song-details-read-chart"
              aria-label={readLabel}
              disabled={density.reading}
              onClick={() => void readDensity(true)}
            >
              {density.reading ? <CircularProgress size={20} aria-hidden /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
          <IconButton id="song-details-close" aria-label={t("picker.close")} onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      )}
      <DialogContent ref={content} dividers>
        <PullToRead
          active={touchFirst}
          canRead={!density.reading}
          onRead={() => void readDensity(true)}
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
              density={density.read?.[chart]}
              maxCombo={facts?.maxCombo ?? null}
              i18n={i18n}
            />
          )}
          {chart !== null && images.length > 0 ? (
            <Stack id="song-details-pictures" spacing={1}>
              {images.map((url, index) => (
                <ChartPicture
                  key={url}
                  url={url}
                  label={t("details.picture", {
                    difficulty: t(DIFFICULTY_LABEL[chart]),
                    n: index + 1,
                    count: images.length,
                  })}
                  port={port}
                  i18n={i18n}
                  onOpen={setViewing}
                />
              ))}
            </Stack>
          ) : (
            <FormHelperText id="song-details-no-picture" sx={{ m: 0 }}>
              {t("details.noPicture")}
            </FormHelperText>
          )}
        </Stack>
      </DialogContent>
      <ChartViewer chart={viewing} i18n={i18n} onClose={() => setViewing(null)} />
    </>
  );
}
