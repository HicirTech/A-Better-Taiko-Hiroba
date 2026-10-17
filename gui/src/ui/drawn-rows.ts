/** The rows a windowed list draws: those near the window, and the focused one wherever it is. */
export function drawnRows(near: number[], focused: number | null, count: number): number[] {
  if (focused === null || focused >= count || near.includes(focused)) {
    return near;
  }
  return [...near, focused].sort((one, other) => one - other);
}
