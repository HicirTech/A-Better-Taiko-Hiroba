import { pngDataUrl, pngSize } from "../hiroba-session/png-answer";
import type { PictureView } from "../shared/session-port";

/** A PNG as a picture crosses to the window; `name` says which picture was no PNG. */
export function pictureOf(bytes: Uint8Array, name = "A stand-in picture"): PictureView {
  const size = pngSize(bytes);
  if (size === null) {
    throw new Error(`${name} is no PNG`);
  }
  return { src: pngDataUrl(bytes), ...size };
}
