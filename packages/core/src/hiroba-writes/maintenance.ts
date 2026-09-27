/** Japan's offset from UTC, in hours. Japan keeps no daylight saving, so it never moves. */
const JST_OFFSET_HOURS = 9;
/** The break, in JST hours: from 05:00 up to, not including, 07:00. */
const BREAK_START_HOUR = 5;
const BREAK_END_HOUR = 7;

/**
 * Whether `now` falls in Hiroba's daily maintenance, 05:00 to 07:00 JST. Hiroba's FAQ names it
 * (other-faq.html: 定期メンテナンス, AM 5:00–7:00), and lists name, colour, costume and title editing
 * among what stops. What a write gets in that window has never been seen, so none is sent.
 */
export function inMaintenance(now: Date): boolean {
  const hour = (now.getUTCHours() + JST_OFFSET_HOURS) % 24;
  return hour >= BREAK_START_HOUR && hour < BREAK_END_HOUR;
}
