import type { Difficulty } from "../song-catalogue/types";
import { createChartView } from "../vendor/tja-renderer";
import { courseOf } from "./chart-course";

/** As wide as taiko.wiki's chart pictures, so a drawn chart sits where theirs did. */
const DRAWN_WIDTH_PX = 816;
// One pixel a pixel: a long chart with its branches stacked already comes to about a megabyte.
const DRAWN_DPR = 1;
/** Named in the drawn picture's credit line, beside the renderer. */
const TJA_SOURCE = "ESE";

/** `difficulty`'s chart in `tja` as a PNG, every branch stacked; null when it cannot be drawn. */
export async function drawChart(tja: string, difficulty: Difficulty): Promise<Uint8Array | null> {
  const frame = document.createElement("div");
  // Laid out though off the screen: TJA Renderer sizes a chart by its canvas's width on the page.
  Object.assign(frame.style, {
    position: "fixed",
    top: "0",
    left: `${-2 * DRAWN_WIDTH_PX}px`,
    width: `${DRAWN_WIDTH_PX}px`,
  });
  frame.setAttribute("aria-hidden", "true");
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, { display: "block", width: "100%" });
  frame.append(canvas);
  document.body.append(frame);
  try {
    const course = courseOf(tja, difficulty);
    if (course === null) {
      return null;
    }

    createChartView(tja, canvas, course, {
      branch: "auto",
      dpr: DRAWN_DPR,
      tjaSourceName: TJA_SOURCE,
    });
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    return png === null ? null : new Uint8Array(await png.arrayBuffer());
  } catch {
    // A chart the renderer throws on is one it cannot draw: taiko.wiki's pictures stand in.
    return null;
  } finally {
    frame.remove();
  }
}
