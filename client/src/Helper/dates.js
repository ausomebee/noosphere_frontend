/**
 * Shared date parsing.
 *
 * `new Date("2026-03-04")` is read as midnight UTC, so anywhere west of UTC it
 * shows as March 3rd. The same happens to a calendar date the API sends as a
 * midnight-UTC ISO string ("2026-03-04T00:00:00.000Z"). These helpers treat
 * both as the calendar date they name, in the user's own timezone; anything
 * else is a real moment in time and is parsed as before.
 *
 * Only parsing lives here — every caller keeps its own display format.
 */

// "YYYY-MM-DD"
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
// "YYYY-MM-DDT00:00[:00[.000]]Z" (or a +00:00 offset) — a date stored as midnight UTC
const MIDNIGHT_UTC = /^(\d{4})-(\d{2})-(\d{2})T00:00(?::00(?:\.0+)?)?(?:Z|[+-]00:?00)$/;

const calendarParts = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const match = trimmed.match(DATE_ONLY) || trimmed.match(MIDNIGHT_UTC);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
};

/** True when the value names a calendar date rather than a moment in time. */
export const isCalendarDate = (value) => calendarParts(value) !== null;

/**
 * Parse an API date value into a Date. Calendar dates become local midnight of
 * that day; anything else goes through `new Date()` unchanged. May return an
 * invalid Date, exactly as `new Date()` would — callers check as they did.
 */
export const parseDate = (value) => {
  const parts = calendarParts(value);
  if (parts) {
    const d = new Date(parts.year, parts.month - 1, parts.day);
    // The Date constructor rolls "2026-02-31" over to March 3rd; an
    // impossible date must stay invalid, as it was with new Date(value).
    if (d.getMonth() !== parts.month - 1 || d.getDate() !== parts.day) {
      return new Date(NaN);
    }
    return d;
  }
  return new Date(value);
};

const pad = (n) => String(n).padStart(2, "0");

/**
 * The "YYYY-MM-DD" calendar day a value falls on, in the user's timezone.
 * Returns null when the value can't be parsed.
 */
export const toDateKey = (value) => {
  const d = value instanceof Date ? value : parseDate(value);
  if (isNaN(d)) return null;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
