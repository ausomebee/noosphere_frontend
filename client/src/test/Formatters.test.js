import { describe, it, expect } from "vitest";

import {
  formatDate,
  formatDateShort,
  formatTimeFromDate,
  formatTime,
  formatDateHeader,
  formatMsgTime,
} from "../Helper/Formatters";

/**
 * Date and time formatting.
 *
 * Every one of these takes an untrusted string off the API, so each has three
 * paths worth pinning: a real value, nothing at all, and something that will
 * not parse. Chat labels additionally branch on today / yesterday / earlier.
 */

const DATE = "2026-01-05T14:30:00Z";

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

describe("formatDate", () => {
  it("renders a readable date", () => {
    expect(formatDate(DATE)).toMatch(/Jan\s+\d+,\s+2026/);
  });

  it("reports a missing date", () => {
    expect(formatDate("")).toBe("N/A");
    expect(formatDate(null)).toBe("N/A");
    expect(formatDate(undefined)).toBe("N/A");
  });

  it("reports one it cannot parse", () => {
    expect(formatDate("not-a-date")).toBe("Invalid date");
  });
});

describe("formatDateShort", () => {
  it("renders a date with no year", () => {
    expect(formatDateShort(DATE)).toMatch(/Jan/);
    expect(formatDateShort(DATE)).not.toMatch(/2026/);
  });

  it("reports a missing or unparseable date", () => {
    expect(formatDateShort("")).toBe("N/A");
    expect(formatDateShort("nonsense")).toBe("Invalid date");
  });
});

describe("formatTimeFromDate", () => {
  it("renders the time out of a timestamp", () => {
    expect(formatTimeFromDate(DATE)).toMatch(/\d{1,2}:\d{2}/);
  });

  it("returns nothing for a missing or unparseable timestamp", () => {
    expect(formatTimeFromDate("")).toBe("");
    expect(formatTimeFromDate(null)).toBe("");
    expect(formatTimeFromDate("nonsense")).toBe("");
  });
});

describe("formatTime", () => {
  it.each([
    ["09:05", "9:05 AM"],
    ["00:00", "12:00 AM"],
    ["12:00", "12:00 PM"],
    ["13:30", "1:30 PM"],
    ["23:59", "11:59 PM"],
  ])("renders %s as %s", (input, expected) => {
    expect(formatTime(input)).toBe(expected);
  });

  it("pads a single-digit minute", () => {
    expect(formatTime("9:5")).toBe("9:05 AM");
  });

  it("returns nothing for a missing time", () => {
    expect(formatTime("")).toBe("");
    expect(formatTime(null)).toBe("");
    expect(formatTime(undefined)).toBe("");
  });
});

describe("formatDateHeader", () => {
  it("says Today for a message sent today", () => {
    expect(formatDateHeader(new Date().toISOString())).toBe("Today");
  });

  it("says Yesterday for the day before", () => {
    expect(formatDateHeader(daysAgo(1))).toBe("Yesterday");
  });

  it("names the weekday for anything older", () => {
    const label = formatDateHeader(daysAgo(5));
    expect(label).not.toBe("Today");
    expect(label).not.toBe("Yesterday");
    expect(label).toMatch(/day/);
  });
});

describe("formatMsgTime", () => {
  it("omits the weekday for a message sent today", () => {
    expect(formatMsgTime(new Date().toISOString())).not.toMatch(
      /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s/
    );
  });

  it("prefixes the weekday for an older message", () => {
    expect(formatMsgTime(daysAgo(3))).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s/);
  });

  it("returns nothing for a missing timestamp", () => {
    expect(formatMsgTime("")).toBe("");
    expect(formatMsgTime(null)).toBe("");
  });
});
