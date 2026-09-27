/**
 * The mock's dan labels: a 96×40 RGBA PNG whose opaque silhouette is a dan's name, built from
 * core's label templates as core's own dan-image tests build theirs, so no Bandai Namco art is
 * involved. Also the 43-byte 1×1 GIF Hiroba answers when it has no label to draw.
 *
 * Core's tests paint each template cell over a rectangle of its own, which reads back only roughly:
 * a cell of a 96×40 label is twelve to sixteen pixels, and the reader's cells overlap where 40 rows
 * do not divide into twelve. The reader refuses those labels, as the tests allow. The mock needs
 * one the reader accepts, so this painter lays ink out in the reader's own cells: each four-pixel
 * column is solved on its own for the row counts that come closest to the template, counting the
 * rows two cells share once.
 */
import { decodeTemplate, GLYPH_GRID_HEIGHT, GLYPH_GRID_WIDTH, LABEL_TEMPLATES } from "@abth/core";
import { encode } from "fast-png";

const WIDTH = 96;
const HEIGHT = 40;
/** 96 columns split evenly into 24 cells of four; 40 rows do not split evenly into 12. */
const CELL_WIDTH = WIDTH / GLYPH_GRID_WIDTH;
const CELL_HEIGHT = HEIGHT / GLYPH_GRID_HEIGHT;

/** What Hiroba answers in place of a label when it has none to draw: `GIF89a`, 1×1, 43 bytes. */
export const NO_LABEL_GIF = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
  0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);

/** One cell of a column: the rows only it counts, and the row it shares with the next, if any. */
interface CellRows {
  readonly size: number;
  readonly own: readonly number[];
  readonly sharedWithNext: number | null;
  readonly sharesPrevious: boolean;
}

/**
 * The rows the reader counts for each cell of a column, walked as `measureGlyph` walks them when
 * the ink spans the whole label: from the rounded start to before the unrounded end.
 */
const CELLS: readonly CellRows[] = (() => {
  const spans: number[][] = [];
  for (let gy = 0; gy < GLYPH_GRID_HEIGHT; gy++) {
    const span: number[] = [];
    for (let y = Math.round(gy * CELL_HEIGHT); y < (gy + 1) * CELL_HEIGHT; y++) {
      span.push(y);
    }
    spans.push(span);
  }
  return spans.map((span, gy) => {
    const sharesPrevious = spans[gy - 1]?.at(-1) === span[0];
    const last = span.at(-1);
    const sharedWithNext = last !== undefined && spans[gy + 1]?.[0] === last ? last : null;
    return {
      size: span.length,
      own: span.slice(sharesPrevious ? 1 : 0, sharedWithNext === null ? undefined : -1),
      sharedWithNext,
      sharesPrevious,
    };
  });
})();

/**
 * How many pixels of each row one four-pixel column inks, so every cell's coverage lands as close
 * to its template value as whole pixels allow. A dynamic programme down the cells whose state is
 * the ink in the row a cell shares with the next. The top and bottom cells keep a pixel in a row of
 * their own when their template has any ink, so the ink's bounding box is the whole label, which
 * is what the cell layout above assumes.
 */
function solveColumn(targets: readonly number[]): number[] {
  interface Step {
    readonly cost: number;
    readonly own: number;
    /** The shared-row ink of the cell above that this step continues. */
    readonly from: number;
  }
  const trail: Map<number, Step>[] = [];
  let reached = new Map<number, number>([[0, 0]]);
  CELLS.forEach((cell, gy) => {
    const target = targets[gy] ?? 0;
    const atEdge = gy === 0 || gy === GLYPH_GRID_HEIGHT - 1;
    const steps = new Map<number, Step>();
    for (const [above, costSoFar] of reached) {
      for (let own = atEdge && target > 0 ? 1 : 0; own <= cell.own.length * CELL_WIDTH; own++) {
        for (let shared = 0; shared <= (cell.sharedWithNext === null ? 0 : CELL_WIDTH); shared++) {
          const ink = (cell.sharesPrevious ? above : 0) + own + shared;
          const error = ink / (cell.size * CELL_WIDTH) - target;
          const cost = costSoFar + error * error;
          if (cost < (steps.get(shared)?.cost ?? Number.POSITIVE_INFINITY)) {
            steps.set(shared, { cost, own, from: above });
          }
        }
      }
    }
    trail.push(steps);
    reached = new Map([...steps].map(([shared, step]) => [shared, step.cost]));
  });

  const perRow = new Array<number>(HEIGHT).fill(0);
  let shared = 0;
  for (let gy = GLYPH_GRID_HEIGHT - 1; gy >= 0; gy--) {
    const cell = CELLS[gy];
    const step = trail[gy]?.get(shared);
    if (cell === undefined || step === undefined) {
      throw new Error(`No layout for cell ${gy}`);
    }
    if (cell.sharedWithNext !== null) {
      perRow[cell.sharedWithNext] = shared;
    }
    // Outer rows first, so the top and bottom cells ink the label's first and last rows.
    const own = gy < GLYPH_GRID_HEIGHT / 2 ? cell.own : [...cell.own].reverse();
    let left = step.own;
    for (const y of own) {
      perRow[y] = Math.min(CELL_WIDTH, left);
      left -= CELL_WIDTH;
      if (left <= 0) break;
    }
    shared = step.from;
  }
  return perRow;
}

/** A label for dan 1 to 15, the numbered ranks core has label templates for. */
export function danLabelPng(dan: number): Uint8Array {
  const template = LABEL_TEMPLATES[dan];
  if (template === undefined) {
    throw new Error(`No label template for dan ${dan}`);
  }
  const grid = decodeTemplate(template);
  const data = new Uint8Array(WIDTH * HEIGHT * 4);
  for (let gx = 0; gx < GLYPH_GRID_WIDTH; gx++) {
    const targets = CELLS.map((_, gy) => grid[gy * GLYPH_GRID_WIDTH + gx] ?? 0);
    const perRow = solveColumn(targets);
    // The left half inks from the left edge and the right half from the right, so both edges of
    // the label carry ink.
    const fromRight = gx >= GLYPH_GRID_WIDTH / 2;
    perRow.forEach((count, y) => {
      for (let i = 0; i < count; i++) {
        const x = gx * CELL_WIDTH + (fromRight ? CELL_WIDTH - 1 - i : i);
        data.set([20, 20, 20, 255], (y * WIDTH + x) * 4);
      }
    });
  }
  return new Uint8Array(encode({ width: WIDTH, height: HEIGHT, data, channels: 4 }));
}
