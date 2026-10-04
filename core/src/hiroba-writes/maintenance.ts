/** Japan keeps no daylight saving, so the offset never moves. */
const JST_OFFSET_HOURS = 9;
/** The break, in JST hours: from 05:00 up to, not including, 07:00. */
const BREAK_START_HOUR = 5;
const BREAK_END_HOUR = 7;

/** Whether `now` is in Hiroba's daily maintenance, 05:00 to 07:00 JST; no write is sent then. */
export function inMaintenance(now: Date): boolean {
  const hour = (now.getUTCHours() + JST_OFFSET_HOURS) % 24;
  return hour >= BREAK_START_HOUR && hour < BREAK_END_HOUR;
}
