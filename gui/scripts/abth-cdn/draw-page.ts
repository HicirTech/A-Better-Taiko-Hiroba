// The page ABTH CDN's charts are drawn in: the app's own drawChart, so each picture is the app's.
import { DIFFICULTIES } from "../../src/shared/song-catalogue/types";
import { drawChart } from "../../src/songs/draw-chart";

function base64(bytes: Uint8Array): string {
  let text = "";
  for (let at = 0; at < bytes.length; at += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
  }
  return btoa(text);
}

/** Each difficulty's drawing of `tja` as a base64 PNG, in DIFFICULTIES' order; null for none. */
async function drawAll(tja: string): Promise<(string | null)[]> {
  const drawn: (string | null)[] = [];
  for (const difficulty of DIFFICULTIES) {
    const png = await drawChart(tja, difficulty);
    drawn.push(png === null ? null : base64(png));
  }
  return drawn;
}

Object.assign(window, { drawAll });
