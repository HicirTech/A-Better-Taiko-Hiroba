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

  const { picture } = shown;
  return (
    <ButtonBase
      className="chart-picture-open"
      onClick={() => onOpen({ picture, label })}
      sx={{ display: "block", maxWidth: "100%", borderRadius: 1, overflow: "hidden" }}
    >
      <img
        className="chart-picture"
        src={picture.src}
        width={picture.width}
        height={picture.height}
        alt={label}
        style={{ display: "block", maxWidth: "100%", height: "auto" }}
      />
    </ButtonBase>
  );
}
