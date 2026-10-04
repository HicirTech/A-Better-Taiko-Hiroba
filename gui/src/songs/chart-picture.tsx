import type { Translator } from "@abth/i18n";
import { Box, Button, FormHelperText, Skeleton } from "@mui/material";
import { useEffect, useState } from "react";

import type { HirobaSessionPort, PictureView } from "../session-port";

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
  onRetry,
}: ChartPictureProps & { onRetry: () => void }) {
  const { t } = i18n;
  const [shown, setShown] = useState<Shown>({ kind: "loading" });

  useEffect(() => {
    let current = true;
    void port.readChartPicture(url).then((result) => {
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
    return <Skeleton variant="rounded" height={LOADING_HEIGHT_PX} aria-label={label} />;
  }

  if (shown.kind === "failed") {
    return (
      <Box className="chart-picture-failed">
        <FormHelperText error>
          {t("details.pictureFailed")}
          <Box
            component="span"
            sx={{ display: "block", fontFamily: "monospace", userSelect: "text" }}
          >
            {t("picker.code", { code: shown.code })}
          </Box>
        </FormHelperText>
        <Button size="small" onClick={onRetry}>
          {t("picker.retry")}
        </Button>
      </Box>
    );
  }

  const { src, width, height } = shown.picture;
  return (
    <img
      className="chart-picture"
      src={src}
      width={width}
      height={height}
      alt={label}
      style={{ display: "block", maxWidth: "100%", height: "auto" }}
    />
  );
}
