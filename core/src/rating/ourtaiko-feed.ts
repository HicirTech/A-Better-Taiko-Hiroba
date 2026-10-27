const SONG_NO = /^[1-9]\d{0,4}$/;

export const isObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isMeasure = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

/** A feed's song id as Hiroba's song number, or null when it is none. */
export function songNoOf(id: unknown): string | null {
  const text = typeof id === "number" ? String(id) : id;
  return typeof text === "string" && SONG_NO.test(text) ? text : null;
}
