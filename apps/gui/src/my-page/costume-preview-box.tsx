import type { Translator } from "@abth/i18n";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";

import type { CostumeSet, HirobaSessionPort } from "../session-port";
import {
  createPreviewScheduler,
  NO_PREVIEW,
  type PreviewScheduler,
  type PreviewState,
} from "./costume-preview";

export function useCostumePreview(
  port: HirobaSessionPort,
  set: CostumeSet | null,
  active: boolean,
): { readonly preview: PreviewState; readonly reset: () => void } {
  const [preview, setPreview] = useState<PreviewState>(NO_PREVIEW);
  // The scheduler outlives a pause in `active` and StrictMode's second effect run, so a set drawn
  // before is shown again, and the first picture is one request.
  const made = useRef<PreviewScheduler | null>(null);
  if (made.current === null) {
    made.current = createPreviewScheduler({
      load: (wanted) => port.previewCostume(wanted),
      onState: setPreview,
    });
  }
  const scheduler = made.current;
  const reset = useCallback(() => scheduler.reset(), [scheduler]);
  useEffect(() => {
    if (!active) {
      return;
    }

    scheduler.start();
    return () => scheduler.stop();
  }, [scheduler, active]);
  useEffect(() => {
    if (set !== null) {
      scheduler.want(set);
    }
  }, [scheduler, set]);
  return { preview, reset };
}

export function CostumePreviewBox({ preview, i18n }: { preview: PreviewState; i18n: Translator }) {
  const { t } = i18n;
  return (
    <Stack id="costume-preview" spacing={0.5} sx={{ alignItems: "center" }}>
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
