import type { Translator } from "@abth/i18n";
import { Box, Button, ButtonBase, FormHelperText, Skeleton } from "@mui/material";
import { useEffect, useState } from "react";

import type { HirobaSessionPort, PictureView } from "../session-port";
import type { ShownChart } from "./chart-viewer";

type Shown =
  | { readonly kind: "loading" }
  | { readonly kind: "shown"; readonly picture: PictureView }
  | { readonly kind: "failed"; readonly code: string };

const LOADING_HEIGHT_PX = 160;

interface ChartPictureProps {
  readonly url: string;
  readonly label: string;
  readonly port: Pick<HirobaSessionPort, "readChartPicture">;
  readonly i18n: Translator;
  /** A tap on the picture: such as opening it on the whole screen. */
  readonly onOpen: (chart: ShownChart) => void;
}

/** One picture of a chart's notes, read through the platform, which keeps it on the device. */
export function ChartPicture(props: ChartPictureProps) {
  const [attempt, setAttempt] = useState(0);
  return <ReadChartPicture key={attempt} {...props} onRetry={() => setAttempt((now) => now + 1)} />;
}

// Its own component, so a retry starts the read over from a fresh state.
function ReadChartPicture({
  url,
  label,
  port,
  i18n,
  onOpen,
  onRetry,
}: ChartPictureProps & { onRetry: () => void }) {
  const [shown, setShown] = useState<Shown>({ kind: "loading" });

  useEffect(() => {
    let current = true;
    void port.readChartPicture(url, "any").then((result) => {
      if (current) {
        setShown(
          result.ok
            ? { kind: "shown", picture: result.value }
            : { kind: "failed", code: result.error.code },
        );
      }
    });
    return () => {
      current = false;
    };
  }, [url, port]);

  if (shown.kind === "loading") {
    return <PictureLoading label={label} />;
  }

  if (shown.kind === "failed") {
    return (
      <PictureFailed
        message={i18n.t("details.pictureFailed")}
        code={shown.code}
        i18n={i18n}
        onRetry={onRetry}
      />
    );
  }

  return <PictureButton picture={shown.picture} label={label} onOpen={onOpen} />;
}

export function PictureLoading({ label }: { readonly label: string }) {
  return <Skeleton variant="rounded" height={LOADING_HEIGHT_PX} aria-label={label} />;
}

/** A failure to show a chart picture, its code, and a retry. */
export function PictureFailed({
  message,
  code,
  i18n,
  onRetry,
}: {
  readonly message: string;
  readonly code: string;
  readonly i18n: Translator;
  readonly onRetry: () => void;
}) {
  const { t } = i18n;
  return (
    <Box className="chart-picture-failed">
      <FormHelperText error>
        {message}
        <Box
          component="span"
          sx={{ display: "block", fontFamily: "monospace", userSelect: "text" }}
        >
          {t("picker.code", { code })}
        </Box>
      </FormHelperText>
      <Button size="small" onClick={onRetry}>
        {t("picker.retry")}
      </Button>
    </Box>
  );
}

/** A chart picture as wide as its column, its corners rounded; a tap opens it. */
export function PictureButton({
  picture,
  label,
  drawn = false,
  onOpen,
}: {
  readonly picture: PictureView;
  readonly label: string;
  /** Drawn from TJA rather than fetched. */
  readonly drawn?: boolean;
  readonly onOpen: (chart: ShownChart) => void;
}) {
  return (
    <ButtonBase
      className="chart-picture-open"
      onClick={() => onOpen({ picture, label })}
      sx={{ display: "block", width: "100%", borderRadius: 1, overflow: "hidden" }}
    >
      <img
        className={drawn ? "chart-picture drawn-chart" : "chart-picture"}
        src={picture.src}
        width={picture.width}
        height={picture.height}
        alt={label}
        style={{ display: "block", width: "100%", height: "auto" }}
      />
    </ButtonBase>
  );
}
