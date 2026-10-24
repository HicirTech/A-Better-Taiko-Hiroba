import type { Translator } from "@abth/i18n";
import { useCallback, useEffect, useRef, useState } from "react";

import { HirobaPicture } from "../pictures/hiroba-picture";
import type { CostumeSet, HirobaSessionPort } from "../shared/session-port";
import { ReadFailureAlert } from "../ui/read-failure-alert";
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
): {
  readonly preview: PreviewState;
  readonly reset: () => void;
  readonly keep: (set: CostumeSet, image: string) => void;
} {
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
  const keep = useCallback(
    (kept: CostumeSet, image: string) => scheduler.keep(kept, image),
    [scheduler],
  );
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
  return { preview, reset, keep };
}

export function CostumePreviewBox({
  preview,
  i18n,
  size,
}: {
  preview: PreviewState;
  i18n: Translator;
  /** The box's side in pixels, centred; without it the box is as wide as its container. */
  size?: number;
}) {
  const { t } = i18n;
  return (
    <HirobaPicture
      id="costume-preview"
      src={preview.image}
      onItsWay={preview.loading}
      alt={t("costume.preview.alt")}
      loadingLabel={t("costume.preview.loading")}
      wordsColour="text.secondary"
      sx={{
        width: 1,
        aspectRatio: "1",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 1,
        bgcolor: "action.hover",
        ...(size !== undefined && { width: size, maxWidth: 1, alignSelf: "center" }),
      }}
      imageSx={{
        width: 1,
        height: 1,
        objectFit: "contain",
        // Dimmed when the picture for the latest pick did not come: it is an older set's.
        opacity: preview.failure === null ? 1 : 0.35,
      }}
      i18n={i18n}
    />
  );
}

/** A preview that did not come, with the code to report. */
export function PreviewFailure({ preview, i18n }: { preview: PreviewState; i18n: Translator }) {
  if (preview.failure === null) {
    return null;
  }

  return (
    <ReadFailureAlert
      id="costume-preview-unavailable"
      message={i18n.t("costume.preview.unavailable")}
      code={preview.failure}
      codeId="costume-preview-code"
      i18n={i18n}
    />
  );
}
