import {
  PICTURE_EPOCH,
  type PictureKey,
  type PictureStore,
} from "../../hiroba-session/picture-store";
import type { PictureView } from "../session-port/types";
import { viewOf } from "./read-chart-picture";
import { sniffPicture } from "./sniff-picture";
import { CHART_PICTURE_MAX_BYTES, type Difficulty } from "./types";

/** The charts the page drew from TJA, kept on the device until it draws them again. */
export interface DrawnCharts {
  read(songNo: string, difficulty: Difficulty): Promise<PictureView | null>;
  /** Never throws: a picture that cannot be kept is simply not kept. */
  keep(songNo: string, difficulty: Difficulty, png: Uint8Array): Promise<void>;
}

export function createDrawnCharts(store: PictureStore): DrawnCharts {
  const keyOf = (songNo: string, difficulty: Difficulty): PictureKey => ({
    scope: "shared",
    player: null,
    name: `${PICTURE_EPOCH}/drawn/${songNo}/${difficulty}`,
  });
  return {
    async read(songNo, difficulty) {
      const kept = await store.get(keyOf(songNo, difficulty));
      const view = kept === null ? null : viewOf(kept);
      return view?.ok ? view.value : null;
    },
    async keep(songNo, difficulty, png) {
      // The page drew it, but its bytes are still the page's word: only a PNG of a picture's size.
      if (png.byteLength <= CHART_PICTURE_MAX_BYTES && sniffPicture(png)?.format === "png") {
        await store.put(keyOf(songNo, difficulty), png);
      }
    },
  };
}
