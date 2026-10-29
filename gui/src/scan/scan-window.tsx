import type { Translator } from "@abth/i18n";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useCallback, useEffect, useEffectEvent, useRef } from "react";

import { qrTextIn } from "../shared/gifts/qr-codes";
import { PhotoLibraryIcon } from "../ui/icons";
import { LargeModal, type ModalLook } from "../ui/large-modal";

/** How often the camera's view is read for a code. */
const LOOK_EVERY_MS = 200;
/** The view's longer side as it is read: a code fills enough of it, and a phone keeps up. */
const LOOK_PX = 800;
const GUIDE = "min(70vw, 70vh, 320px)";
const OVER_THE_VIEW = { color: "common.white", textAlign: "center" } as const;

/** What the camera does while the scanner is open. */
export type CameraState =
  | { readonly kind: "starting" }
  | { readonly kind: "on"; readonly stream: MediaStream }
  | { readonly kind: "off" };

export interface ScanWindowProps {
  readonly open: boolean;
  readonly camera: CameraState;
  /** What the last code or picture held that was no gift; none while there is nothing to say. */
  readonly note: string | null;
  readonly touchFirst: boolean;
  readonly modalLook: ModalLook;
  readonly i18n: Translator;
  /** A code the camera saw, as its text. */
  readonly onText: (text: string) => void;
  readonly onPicture: (picture: File) => void;
  readonly onClose: () => void;
}

/** A phone's scanner: the camera's view over the whole screen, and a picture from the gallery. */
export function ScanWindow({
  open,
  camera,
  note,
  touchFirst,
  modalLook,
  i18n,
  onText,
  onPicture,
  onClose,
}: ScanWindowProps) {
  const { t } = i18n;
  const input = useRef<HTMLInputElement>(null);
  const stream = camera.kind === "on" ? camera.stream : null;
  const video = useCodesInView(stream, onText);
  return (
    <LargeModal
      id="scan-window"
      open={open}
      title={t("scan.button")}
      picture
      touchFirst={touchFirst}
      modalLook={modalLook}
      i18n={i18n}
      onClose={onClose}
    >
      {stream !== null && (
        <Box
          component="video"
          ref={video}
          autoPlay
          muted
          playsInline
          sx={{ position: "absolute", inset: 0, width: 1, height: 1, objectFit: "cover" }}
        />
      )}
      {stream !== null && (
        <Box
          aria-hidden
          sx={(theme) => ({
            position: "absolute",
            top: "50%",
            left: "50%",
            width: GUIDE,
            height: GUIDE,
            transform: "translate(-50%, -50%)",
            border: 2,
            borderColor: "common.white",
            borderRadius: 2,
            boxShadow: `0 0 0 100vmax ${alpha(theme.palette.common.black, 0.45)}`,
          })}
        />
      )}
      {camera.kind === "starting" && (
        <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          <CircularProgress aria-label={t("scan.button")} sx={{ color: "common.white" }} />
        </Box>
      )}
      <Stack
        spacing={1.5}
        sx={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          px: 2,
          pt: 2,
          pb: "calc(24px + env(safe-area-inset-bottom, 0px))",
          alignItems: "center",
        }}
      >
        {note !== null && (
          <Typography
            id="scan-window-note"
            role="status"
            variant="body2"
            sx={(theme) => ({
              ...OVER_THE_VIEW,
              px: 1.5,
              py: 0.75,
              borderRadius: 1,
              bgcolor: alpha(theme.palette.common.black, 0.7),
            })}
          >
            {note}
          </Typography>
        )}
        <Typography id="scan-window-hint" variant="body2" sx={OVER_THE_VIEW}>
          {t(camera.kind === "off" ? "scan.noCamera" : "scan.hint")}
        </Typography>
        <Button
          id="scan-pick"
          variant="contained"
          startIcon={<PhotoLibraryIcon />}
          onClick={() => input.current?.click()}
        >
          {t("scan.pick")}
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            const [picture] = event.currentTarget.files ?? [];
            event.currentTarget.value = "";
            if (picture !== undefined) {
              onPicture(picture);
            }
          }}
        />
      </Stack>
    </LargeModal>
  );
}

/** The video's ref: it shows `stream`, read for a code every so often while it does. */
function useCodesInView(stream: MediaStream | null, onText: (text: string) => void) {
  const node = useRef<HTMLVideoElement | null>(null);
  const seen = useEffectEvent(onText);
  const video = useCallback(
    (element: HTMLVideoElement | null) => {
      node.current = element;
      if (element !== null) {
        element.srcObject = stream;
      }
    },
    [stream],
  );
  useEffect(() => {
    const element = node.current;
    if (stream === null || element === null) {
      return;
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    let timer = 0;
    const look = () => {
      const { videoWidth: width, videoHeight: height } = element;
      if (context !== null && width > 0 && height > 0) {
        const scale = Math.min(1, LOOK_PX / Math.max(width, height));
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        context.drawImage(element, 0, 0, canvas.width, canvas.height);
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        const text = qrTextIn(data, canvas.width, canvas.height);
        if (text !== null) {
          seen(text);
        }
      }
      timer = window.setTimeout(look, LOOK_EVERY_MS);
    };
    look();
    return () => window.clearTimeout(timer);
  }, [stream]);
  return video;
}
