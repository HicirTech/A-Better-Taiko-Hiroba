/** The stand-in's ABTH CDN: a drawing of each chart the stand-in's ESE holds, and its counts. */
import { cdnChartPath, cdnDensityPath } from "../src/shared/song-catalogue/abth-cdn";
import {
  densitiesByDifficulty,
  densityFile,
} from "../src/shared/song-catalogue/read-chart-density";
import { isDifficulty } from "../src/shared/song-catalogue/types";
import { ESE_MAPPING, eseChart, servedChartPath } from "./mock-ese";

export const ABTH_CDN_PATH = "/__abth-cdn/";

/** Every drawing the stand-in serves is this tall, as no chart TJA Renderer draws here is. */
export const CDN_DRAWING_HEIGHT = 240;
/** A grey band with a red stripe, 816 pixels wide, as a lossless WebP. */
export const CDN_DRAWING = Uint8Array.from(
  atob("UklGRjQAAABXRUJQVlA4TCcAAAAvL8M7AA/wuelPTD9tev7jAQTZNvOXPsXTiP5n/Of/sY/78Z//xw4A"),
  (char) => char.charCodeAt(0),
);

/** What the stand-in's CDN serves at `pathname`, or null for a file it has not. */
export function abthCdnFile(pathname: string): Response | null {
  const path = pathname.slice(ABTH_CDN_PATH.length);
  for (const songNo of Object.keys(ESE_MAPPING)) {
    const tja = eseChart(servedChartPath(songNo));
    if (tja === null) {
      continue;
    }
    const densities = densitiesByDifficulty(tja);
    if (path === cdnDensityPath(songNo)) {
      return new Response(densityFile(densities), {
        headers: { "content-type": "application/json" },
      });
    }
    const drawn = Object.keys(densities).filter(isDifficulty);
    if (drawn.some((difficulty) => path === cdnChartPath(songNo, difficulty))) {
      return new Response(CDN_DRAWING, { headers: { "content-type": "image/webp" } });
    }
  }
  return null;
}
