import type { Translator } from "@abth/i18n";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";

import type { CostumeSet, HirobaSessionPort } from "../session-port";
import {
  createPreviewScheduler,
  NO_PREVIEW,
  type PreviewScheduler,
  type PreviewState,
} from "./costume-preview";

/**
 * Hiroba's picture of `set`, kept up with `set` for as long as the calling component is mounted, as
 * the scheduler paces it. Null asks for nothing. The scheduler outlives StrictMode's second run of
 * an effect in development, so the first picture is one request there too.
 */
export function useCostumePreview(port: HirobaSessionPort, set: CostumeSet | null): PreviewState {
  const [preview, setPreview] = useState<PreviewState>(NO_PREVIEW);
  const made = useRef<PreviewScheduler | null>(null);
  if (made.current === null) {
    made.current = createPreviewScheduler({
      load: (wanted) => port.previewCostume(wanted),
      onState: setPreview,
    });
  }
  const scheduler = made.current;
  useEffect(() => {
    scheduler.start();
    return () => scheduler.stop();
  }, [scheduler]);
  useEffect(() => {
    if (set !== null) {
      scheduler.want(set);
    }
  }, [scheduler, set]);
  return preview;
}

/**
 * The top of the editor, as Hiroba's 今のきせかえセット box: the picture of the set as picked. The
 * last picture stays while the next one comes, with a small spinner; one that does not come leaves
 * a neutral note and a code, and the editor works as well without it. The picture is a data: URL:
 * no address of Hiroba's reaches the window.
 */
export function CostumePreviewBox({ preview, i18n }: { preview: PreviewState; i18n: Translator }) {
  const { t } = i18n;
  return (
    <Stack id="costume-preview" spacing={0.5} sx={{ alignItems: "center", mb: 2 }}>
      <Box
        aria-busy={preview.loading}
        sx={{
          position: "relative",
          width: 1,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 1,
          bgcolor: "action.hover",
        }}
      >
        {preview.image !== null && (
          <Box
            component="img"
            id="costume-preview-image"
            src={preview.image}
            alt={t("costume.preview.alt")}
            sx={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              // Dimmed when the picture for the latest pick did not come: it is an older set's.
              opacity: preview.failure === null ? 1 : 0.35,
            }}
          />
        )}
        {preview.loading && (
          <CircularProgress
            id="costume-preview-loading"
            size={20}
            aria-label={t("costume.preview.loading")}
            sx={{ position: "absolute", top: 8, right: 8 }}
          />
        )}
      </Box>
      {preview.failure !== null && (
        <Stack id="costume-preview-unavailable" sx={{ alignItems: "center" }}>
          <Typography variant="body2" color="text.secondary">
            {t("costume.preview.unavailable")}
          </Typography>
          <Typography
            id="costume-preview-code"
            variant="body2"
            color="text.secondary"
            sx={{ fontFamily: "monospace", userSelect: "text", wordBreak: "break-all" }}
          >
            {t("costume.preview.code", { code: preview.failure })}
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}
