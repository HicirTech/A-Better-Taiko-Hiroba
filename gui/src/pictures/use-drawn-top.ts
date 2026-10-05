import { useEffect, useState } from "react";

import type { PictureView } from "../session-port";
import { firstDrawnRow } from "./first-drawn-row";

/** How far down `picture` its first drawn row between the columns `from` and `to` (fractions of
 * the width) lies, over its height; null until the picture is read. */
export function useDrawnTop(picture: PictureView | null, from: number, to: number): number | null {
  const src = picture?.src ?? null;
  const [found, setFound] = useState<{ readonly src: string; readonly top: number } | null>(null);
  useEffect(() => {
    if (src === null) {
      return;
    }

    let current = true;
    const image = new Image();
    image.src = src;
    void image.decode().then(() => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!current || context === null) {
        return;
      }

      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      setFound({ src, top: firstDrawnRow(pixels, from, to) / pixels.height });
    });
    return () => {
      current = false;
    };
  }, [src, from, to]);
  return found?.src === src ? found.top : null;
}
