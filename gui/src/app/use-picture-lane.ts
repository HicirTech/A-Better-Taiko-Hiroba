import { useMemo } from "react";

import { createPictureLane, type PictureLane } from "../pictures/picture-lane";
import { IO_READ_CONSUMERS } from "../shared/pipelines";
import type { HirobaSessionPort } from "../shared/session-port";

/** The window's lane for Hiroba's pictures: one for as long as the port stays the same. */
export function usePictureLane(port: HirobaSessionPort): PictureLane {
  // No more pictures at once than Hiroba's read consumers: the rest wait here, in screen order.
  return useMemo(
    () =>
      createPictureLane({
        load: (want, again) => port.readPicture(want, again),
        atOnce: IO_READ_CONSUMERS,
      }),
    [port],
  );
}
