const twoDigits = (value: number) => String(value).padStart(2, "0");

/** The calendar day a time falls on in the device's zone, written so that days sort by their words. */
export function localDayOf(time: string): string {
  const date = new Date(time);
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
}
