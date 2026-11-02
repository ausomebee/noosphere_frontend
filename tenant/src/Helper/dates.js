/**
 * Calendar-date parsing shared across the tenant app.
 *
 * A date-only value ("2015-04-01") is a day on the calendar, not an instant.
 * `new Date("2015-04-01")` reads it as midnight UTC, which for anyone west of
 * UTC is still the previous evening — so a birthday or an appointment day
 * showed up one day early. The API also sends calendar dates as midnight-UTC
 * ISO strings ("2015-04-01T00:00:00.000Z"), with the same problem.
 *
 * These helpers only change how such values are *parsed*: they come back as
 * local midnight on the same calendar day. Display formats stay with
 * Formatters.js and the admin's settings from useFormatSettings.
 */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
// Midnight UTC with optional seconds/milliseconds: "…T00:00Z", "…T00:00:00.000Z", "…+00:00".
const MIDNIGHT_UTC = /^(\d{4})-(\d{2})-(\d{2})T00:00(?::00(?:\.0+)?)?(?:Z|[+-]00:?00)$/;

const pad = (n) => String(n).padStart(2, "0");

/**
 * Parse a value to a Date, reading date-only and midnight-UTC strings as that
 * calendar day in local time. Other strings, numbers and Dates parse as usual.
 * Returns null for anything unusable.
 */
export const parseCalendarDate = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    const match = trimmed.match(DATE_ONLY) || trimmed.match(MIDNIGHT_UTC);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      const local = new Date(year, month, day);
      // Reject days that don't exist ("2024-02-31") instead of rolling over.
      if (local.getFullYear() !== year || local.getMonth() !== month || local.getDate() !== day) {
        return null;
      }
      return local;
    }
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
};

/** Local calendar day of a Date as "YYYY-MM-DD". */
const toKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/**
 * Any date value → "YYYY-MM-DD" ("" when unusable), using the calendar-date
 * rules above. The shape <input type="date"> and the date-only API fields use.
 */
export const toDateKey = (value) => {
  const parsed = parseCalendarDate(value);
  return parsed ? toKey(parsed) : "";
};

/**
 * Today's local date as "YYYY-MM-DD". `new Date().toISOString()` gives the UTC
 * day, which is already tomorrow for a US user in the evening.
 */
export const todayDateKey = () => toKey(new Date());

/**
 * A wall-clock time ("HH:mm" or "HH:mm:ss") on a calendar day, as an ISO
 * instant. The time is the user's local time on that day; with no usable day,
 * today is used. Returns null without a valid time.
 */
export const localDateTimeToIso = (dateValue, timeStr) => {
  if (!timeStr) return null;
  const match = String(timeStr).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const day = parseCalendarDate(dateValue) || new Date();
  const local = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Number(match[1]),
    Number(match[2]),
    Number(match[3] || 0)
  );
  return isNaN(local.getTime()) ? null : local.toISOString();
};
