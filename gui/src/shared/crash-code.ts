/** The code for a report: where it broke and the error's type, never its message. */
export function crashCodeOf(place: string, error: unknown): string {
  return `${place}=${error instanceof Error ? error.name : typeof error}`;
}
