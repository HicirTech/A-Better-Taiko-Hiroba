import type { Result } from "@abth/core";
import type { MessageKey, Translator } from "@abth/i18n";
import { FormHelperText, Stack } from "@mui/material";
import { useEffect, useState } from "react";
import type { HirobaSessionPort } from "../shared/session-port";
import type { ChartSource } from "../shared/song-catalogue/chart-source";
import { DIFFICULTY_LABEL } from "../shared/song-catalogue/genre-look";
import type { ChartFileFailure, Difficulty } from "../shared/song-catalogue/types";
import { ReadFailureAlert } from "../ui/read-failure-alert";
import { StatusNote } from "../ui/status-note";
import { ChartPicture, PictureButton, PictureLoading } from "./chart-picture";
import type { ShownChart } from "./chart-viewer";
import { drawChart } from "./draw-chart";
import { type ChartShown, findCdnPicture, findChartPicture } from "./find-chart-picture";

const WIKI: ChartShown = { kind: "wiki", lacking: null };

/** Why taiko.wiki's pictures stand in, by the source that had no drawing. */
const LACKING: Readonly<Record<"tja" | "cdn", { readonly id: string; readonly note: MessageKey }>> =
  {
    tja: { id: "song-details-no-tja", note: "details.noTja" },
    cdn: { id: "song-details-no-cdn", note: "details.noCdn" },
  };

interface ChartPicturesProps {
  readonly songNo: string;
  readonly difficulty: Difficulty;
  /** taiko.wiki's pictures of the chart. */
  readonly images: readonly string[];
  readonly source: ChartSource;
  /** Whether the chart file's notes differ from the game's count. */
  readonly differs: boolean;
  /** The song's chart file, read once for the details. */
  readonly tja: () => Promise<Result<string, ChartFileFailure>>;
  /** Bumped by a reload of the whole song, so the pictures kept are taken anew. */
  readonly generation: number;
  readonly port: Pick<
    HirobaSessionPort,
    "readChartPicture" | "readCdnChart" | "readDrawnChart" | "keepDrawnChart"
  >;
  readonly i18n: Translator;
  readonly onOpen: (chart: ShownChart) => void;
}

/** A chart's pictures, ABTH CDN's, drawn from its TJA, or taiko.wiki's, as Settings choose. */
export function ChartPictures(props: ChartPicturesProps) {
  const { songNo, difficulty, images, source, differs, tja, generation, port, i18n, onOpen } =
    props;
  const { t } = i18n;
  // Kept while a reload draws anew: the picture shown stays until its successor is ready.
  const [shown, setShown] = useState<ChartShown | null>(source === "wiki" ? WIKI : null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a reload asks again
  useEffect(() => {
    if (source === "wiki") {
      return;
    }

    let current = true;
    const finding =
      source === "cdn"
        ? findCdnPicture(port, songNo, difficulty)
        : findChartPicture({ songNo, difficulty, images, port, tja, draw: drawChart });
    void finding.then((next) => {
      if (current) {
        setShown(next);
      }
    });
    return () => {
      current = false;
    };
  }, [songNo, difficulty, images, source, tja, port, generation]);

  const chartName = t(DIFFICULTY_LABEL[difficulty]);
  if (shown === null) {
    return <PictureLoading label={t("details.drawnPicture", { difficulty: chartName })} />;
  }

  if (shown.kind === "failed") {
    return <ReadFailureAlert message={t("details.densityFailed")} code={shown.code} i18n={i18n} />;
  }

  if (shown.kind === "drawn") {
    return (
      <Stack id="song-details-pictures" spacing={0.5}>
        <PictureButton
          picture={shown.picture}
          label={t("details.drawnPicture", { difficulty: chartName })}
          drawn
          onOpen={onOpen}
        />
        {differs && (
          <FormHelperText id="song-details-chart-differs" sx={{ m: 0 }}>
            {t("details.chartDiffers")}
          </FormHelperText>
        )}
      </Stack>
    );
  }

  return (
    <Stack spacing={1}>
      {shown.lacking !== null && (
        <FormHelperText id={LACKING[shown.lacking].id} sx={{ m: 0 }}>
          {t(LACKING[shown.lacking].note)}
        </FormHelperText>
      )}
      {images.length > 0 ? (
        <Stack id="song-details-pictures" spacing={1}>
          {images.map((url, index) => (
            <ChartPicture
              key={`${generation} ${url}`}
              url={url}
              label={t("details.picture", {
                difficulty: chartName,
                n: index + 1,
                count: images.length,
              })}
              port={port}
              i18n={i18n}
              onOpen={onOpen}
            />
          ))}
        </Stack>
      ) : (
        <StatusNote id="song-details-no-picture">{t("details.noPicture")}</StatusNote>
      )}
    </Stack>
  );
}
