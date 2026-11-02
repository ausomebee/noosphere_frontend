import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import {
  parseCalendarDate,
  toDateKey,
  todayDateKey,
  localDateTimeToIso,
} from "../Helper/dates";
import { formatDate, formatDateTime } from "../Helper/Formatters";

/**
 * The shared calendar-date helpers, pinned to a US timezone.
 *
 * West of UTC is where `new Date("2015-04-01")` (midnight UTC) is still the
 * previous evening, so every "a day early" bug shows up here and nowhere east.
 */

let originalTZ;
beforeAll(() => {
  originalTZ = process.env.TZ;
  process.env.TZ = "America/New_York";
});
afterAll(() => {
  process.env.TZ = originalTZ;
  if (originalTZ === undefined) delete process.env.TZ;
});
afterEach(() => vi.useRealTimers());

describe("parseCalendarDate", () => {
  it("reads a date-only string as that local day", () => {
    const d = parseCalendarDate("2015-04-01");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2015, 3, 1, 0]);
  });

  it.each([
    "2015-04-01T00:00:00.000Z",
    "2015-04-01T00:00:00Z",
    "2015-04-01T00:00Z",
    "2015-04-01T00:00:00+00:00",
  ])("reads the midnight-UTC calendar date %s as that local day", (value) => {
    expect(parseCalendarDate(value).getDate()).toBe(1);
  });

  it("leaves a real timestamp as the instant it is", () => {
    const d = parseCalendarDate("2015-04-01T02:30:00.000Z");
    // 02:30 UTC is 22:30 the evening before in New York.
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([31, 22, 30]);
  });

  it("passes a Date through untouched", () => {
    const d = new Date(2020, 0, 2, 15, 0);
    expect(parseCalendarDate(d)).toBe(d);
  });

  it.each([null, undefined, "", "nope", "2024-02-31", new Date("x")])(
    "returns null for the unusable value %s",
    (value) => {
      expect(parseCalendarDate(value)).toBeNull();
    }
  );
});

describe("toDateKey / todayDateKey", () => {
  it("keeps a midnight-UTC date on its calendar day", () => {
    expect(toDateKey("2026-03-10T00:00:00.000Z")).toBe("2026-03-10");
  });

  it("returns an empty string for nothing usable", () => {
    expect(toDateKey(undefined)).toBe("");
    expect(toDateKey("garbage")).toBe("");
  });

  it("uses the local day for today, not the UTC one", () => {
    vi.useFakeTimers({ now: new Date("2026-03-10T03:00:00.000Z"), toFake: ["Date"] });
    expect(todayDateKey()).toBe("2026-03-09");
  });
});

describe("localDateTimeToIso", () => {
  it("places a wall-clock time on the given calendar day in local time", () => {
    // 08:00 in New York on 10 March 2026 (EDT, UTC-4) is 12:00 UTC.
    expect(localDateTimeToIso("2026-03-10T00:00:00.000Z", "08:00")).toBe(
      "2026-03-10T12:00:00.000Z"
    );
    // Before the clocks change it is EST, UTC-5.
    expect(localDateTimeToIso("2026-03-02", "08:30")).toBe("2026-03-02T13:30:00.000Z");
  });

  it("falls back to today when there is no usable day", () => {
    vi.useFakeTimers({ now: new Date("2026-03-10T15:00:00.000Z"), toFake: ["Date"] });
    expect(localDateTimeToIso(undefined, "08:00")).toBe("2026-03-10T12:00:00.000Z");
  });

  it("returns null without a valid time", () => {
    expect(localDateTimeToIso("2026-03-10", "")).toBeNull();
    expect(localDateTimeToIso("2026-03-10", "soon")).toBeNull();
  });
});

describe("formatDate in New York", () => {
  it("shows a date of birth on the day it is, in every admin format", () => {
    const dob = "2015-04-01T00:00:00.000Z";
    expect(formatDate(dob, "MM/DD/YYYY")).toBe("04/01/2015");
    expect(formatDate(dob, "DD/MM/YYYY")).toBe("01/04/2015");
    expect(formatDate(dob, "YYYY-MM-DD")).toBe("2015-04-01");
    expect(formatDate(dob, "MMM DD, YYYY")).toBe("Apr 01, 2015");
    expect(formatDate("2015-04-01", "MM/DD/YYYY")).toBe("04/01/2015");
  });

  it("still formats a real timestamp by its local day", () => {
    expect(formatDate("2015-04-01T02:30:00.000Z", "YYYY-MM-DD")).toBe("2015-03-31");
  });

  it("keeps the date and time of a timestamp from the same instant", () => {
    expect(formatDateTime("2015-04-01T00:00:00.000Z", "YYYY-MM-DD", "24-hour")).toMatch(
      /^2015-03-31 /
    );
  });

  // An impossible calendar date is rejected rather than rolled over to 3 March.
  it.each(["2026-02-31", "2026-02-31T00:00:00.000Z", "2026-04-31"])(
    "keeps the impossible date %s invalid rather than rolling it over",
    (value) => {
      expect(parseCalendarDate(value)).toBeNull();
      expect(toDateKey(value)).toBe("");
      expect(formatDate(value)).toBe("Invalid date");
    }
  );

  it("still says so for missing and unparseable values", () => {
    expect(formatDate(null)).toBe("N/A");
    expect(formatDate("not a date")).toBe("Invalid date");
  });
});
