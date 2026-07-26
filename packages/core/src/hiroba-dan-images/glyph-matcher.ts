import { GLYPH_GRID_HEIGHT, GLYPH_GRID_WIDTH } from "./glyph-templates";

/** Whether a pixel belongs to the glyph. */
export type InkMask = (x: number, y: number) => boolean;

/**
 * Measures a glyph into the same shape a template holds: find the ink's bounding box, then take
 * the ink fraction of each cell of a fixed grid.
 *
 * Normalising by the bounding box is what makes the measurement independent of where in the image
 * the glyph sits, and of how much empty space surrounds it.
 */
export function measureGlyph(
  mask: InkMask,
  region: { x0: number; x1: number; y0: number; y1: number },
): Float64Array | null {
  let x0 = region.x1;
  let x1 = region.x0;
  let y0 = region.y1;
  let y1 = region.y0;
  for (let y = region.y0; y < region.y1; y++) {
    for (let x = region.x0; x < region.x1; x++) {
      if (!mask(x, y)) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 <= x0 || y1 <= y0) {
    return null;
  }

  const cellW = (x1 - x0 + 1) / GLYPH_GRID_WIDTH;
  const cellH = (y1 - y0 + 1) / GLYPH_GRID_HEIGHT;
  const grid = new Float64Array(GLYPH_GRID_WIDTH * GLYPH_GRID_HEIGHT);
  for (let gy = 0; gy < GLYPH_GRID_HEIGHT; gy++) {
    for (let gx = 0; gx < GLYPH_GRID_WIDTH; gx++) {
      let ink = 0;
      let cells = 0;
      for (let y = Math.round(y0 + gy * cellH); y < y0 + (gy + 1) * cellH; y++) {
        for (let x = Math.round(x0 + gx * cellW); x < x0 + (gx + 1) * cellW; x++) {
          cells++;
          if (mask(x, y)) ink++;
        }
      }
      grid[gy * GLYPH_GRID_WIDTH + gx] = cells === 0 ? 0 : ink / cells;
    }
  }
  return grid;
}

/** Expands a template back into the grid `measureGlyph` produces. */
export function decodeTemplate(template: string): Float64Array {
  const grid = new Float64Array(template.length);
  for (let i = 0; i < template.length; i++) {
    grid[i] = Number.parseInt(template[i] as string, 16) / 15;
  }
  return grid;
}

function distance(a: Float64Array, b: Float64Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = (a[i] as number) - (b[i] as number);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export interface GlyphMatch {
  readonly key: number;
  readonly distance: number;
  /** The runner-up's distance, so a caller can see how close the decision was. */
  readonly runnerUpDistance: number;
}

/**
 * Picks the template a glyph matches, or null when nothing is close enough.
 *
 * Two guards, because a wrong answer is worse than no answer: the winner must sit within
 * `maxDistance`, and it must be clearly ahead of the runner-up. A rank the templates do not cover
 * — a named rank on a label, say — lands far from everything and is refused rather than rounded to
 * the nearest neighbour.
 */
export function matchGlyph(
  grid: Float64Array,
  templates: Readonly<Record<number, string>>,
  maxDistance: number,
  minSeparation: number,
): GlyphMatch | null {
  let best: GlyphMatch | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  let runnerUp = Number.POSITIVE_INFINITY;
  for (const [key, template] of Object.entries(templates)) {
    const d = distance(grid, decodeTemplate(template));
    if (d < bestDistance) {
      runnerUp = bestDistance;
      bestDistance = d;
      best = { key: Number(key), distance: d, runnerUpDistance: runnerUp };
    } else if (d < runnerUp) {
      runnerUp = d;
    }
  }
  if (best === null || bestDistance > maxDistance) {
    return null;
  }
  if (runnerUp - bestDistance < minSeparation) {
    return null;
  }
  return { key: best.key, distance: bestDistance, runnerUpDistance: runnerUp };
}
