/** Where a chart's axis starts and ends, and the round figures it marks. */
export interface ChartScale {
  readonly low: number;
  readonly high: number;
  readonly ticks: readonly number[];
}

const ROUND_STEPS: readonly number[] = [1, 2, 2.5, 5, 10];
const MARKS_WANTED = 4;

/** Drops what adding fractions of ten leaves behind, such as 8.700000000000001. */
const tidy = (value: number) => Number(value.toFixed(10));

/** An axis of round figures round the values; values all alike still get room above and below. */
export function chartScale(lowestOf: number, highestOf: number): ChartScale {
  const lowest = tidy(lowestOf);
  const highest = tidy(highestOf);
  const span = highest - lowest || Math.abs(highest) * 0.02 || 1;
  const rough = span / MARKS_WANTED;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = (ROUND_STEPS.find((each) => each * power >= rough) ?? 10) * power;
  const low = tidy(Math.floor(lowest / step) * step);
  const high = tidy(Math.max(Math.ceil(highest / step) * step, low + step));
  const marks = Math.round((high - low) / step);
  return {
    low,
    high,
    ticks: Array.from({ length: marks + 1 }, (_, index) => tidy(low + index * step)),
  };
}

/** Where labels wanted at `wanted`, top to bottom, stand: `gap` apart, inside `top` to `bottom`. */
export function spreadPlaces(
  wanted: readonly number[],
  gap: number,
  top: number,
  bottom: number,
): readonly number[] {
  // Labels that would touch share the middle of what they want: equal values spread both ways.
  const runs: { sum: number; count: number }[] = [];
  const middle = ({ sum, count }: { sum: number; count: number }) => sum / count;
  wanted.forEach((place, order) => {
    let run = { sum: place - order * gap, count: 1 };
    for (let before = runs.at(-1); before !== undefined; before = runs.at(-1)) {
      if (middle(before) <= middle(run)) {
        break;
      }
      runs.pop();
      run = { sum: before.sum + run.sum, count: before.count + run.count };
    }
    runs.push(run);
  });
  const last = wanted.length - 1;
  return runs
    .flatMap((run) => Array<number>(run.count).fill(middle(run)))
    .map((place, order) =>
      Math.max(top + order * gap, Math.min(bottom - (last - order) * gap, place + order * gap)),
    );
}

/** The colours of a CSS gradient, as an SVG takes none; none for a plain colour. */
export function gradientStops(colour: string): readonly string[] | null {
  return colour.startsWith("linear-gradient(") ? colour.match(/#[0-9a-f]+/gi) : null;
}

/** The earliest of the times, and how far the latest stands from it. */
export function timeSpan(times: readonly number[]): {
  readonly first: number;
  readonly span: number;
} {
  const first = Math.min(...times);
  return { first, span: Math.max(...times) - first };
}

/** The time nearest `at` in `times`, by its place. */
export function nearestPlace(times: readonly number[], at: number): number {
  let nearest = 0;
  times.forEach((time, place) => {
    if (Math.abs(time - at) < Math.abs((times[nearest] ?? time) - at)) {
      nearest = place;
    }
  });
  return nearest;
}
