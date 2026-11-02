import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";

import { parseDate, toDateKey, isCalendarDate } from "../Helper/dates";
import { formatDate, formatDateShort } from "../Helper/Formatters";
import AppointmentDetailsModal from "../Components/Modal/UpcomingDashboardModal/AppointmentDetailsModal";

/**
 * Calendar dates must not shift with the user's timezone.
 *
 * Pinned to a US timezone, where midnight UTC is still the previous evening:
 * `new Date("2026-03-04")` reads as March 3rd there, which is exactly the bug.
 */

let originalTZ;
beforeAll(() => {
  originalTZ = process.env.TZ;
  process.env.TZ = "America/Los_Angeles";
});
afterAll(() => {
  if (originalTZ === undefined) delete process.env.TZ;
  else process.env.TZ = originalTZ;
});

describe("the timezone pin", () => {
  it("is in effect (the raw Date shifts a date-only value back a day)", () => {
    expect(new Date("2026-03-04").getDate()).toBe(3);
  });
});

describe("parseDate", () => {
  it("keeps a date-only value on its own day", () => {
    const d = parseDate("2026-03-04");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 2, 4]);
  });

  it("treats a midnight-UTC ISO string as the calendar date it names", () => {
    for (const v of ["2026-03-04T00:00:00.000Z", "2026-03-04T00:00:00Z", "2026-03-04T00:00Z", "2026-03-04T00:00:00+00:00"]) {
      expect(parseDate(v).getDate()).toBe(4);
      expect(isCalendarDate(v)).toBe(true);
    }
  });

  it("leaves a real moment in time alone", () => {
    const v = "2026-03-04T15:30:00Z";
    expect(isCalendarDate(v)).toBe(false);
    expect(parseDate(v).getTime()).toBe(new Date(v).getTime());
  });

  it("keeps an impossible calendar date invalid rather than rolling it over", () => {
    expect(isNaN(parseDate("2026-02-31"))).toBe(true);
    expect(isNaN(parseDate("2026-13-01T00:00:00.000Z"))).toBe(true);
    expect(toDateKey("2026-02-31")).toBeNull();
    expect(formatDate("2026-02-31")).toBe("Invalid date");
    // A real leap day is fine.
    expect(parseDate("2028-02-29").getDate()).toBe(29);
  });

  it("returns an invalid date for garbage, like new Date would", () => {
    expect(isNaN(parseDate("not-a-date"))).toBe(true);
  });
});

describe("toDateKey", () => {
  it("names the calendar day in the user's timezone", () => {
    expect(toDateKey("2026-03-04")).toBe("2026-03-04");
    expect(toDateKey("2026-03-04T00:00:00.000Z")).toBe("2026-03-04");
    // 03:00 UTC on the 5th is still the evening of the 4th in Los Angeles.
    expect(toDateKey("2026-03-05T03:00:00Z")).toBe("2026-03-04");
    expect(toDateKey("nope")).toBeNull();
  });
});

describe("formatDate / formatDateShort in a US timezone", () => {
  it("shows a date-only value on its own day, in the same format as before", () => {
    expect(formatDate("2026-03-04")).toBe("Mar 4, 2026");
    expect(formatDate("2026-03-04T00:00:00.000Z")).toBe("Mar 4, 2026");
    expect(formatDateShort("2026-03-04")).toBe("Mar 4");
  });

  it("still shows a timestamp on the local day it happened", () => {
    expect(formatDate("2026-03-05T03:00:00Z")).toBe("Mar 4, 2026");
  });
});

describe("AppointmentDetailsModal in a US timezone", () => {
  const renderWith = (originalData) =>
    render(
      <AppointmentDetailsModal
        isOpen
        onClose={() => {}}
        onReschedule={() => {}}
        appointment={{ originalData: { startTime: "09:30", endTime: "10:45", ...originalData } }}
      />
    );
  const dateAndTime = () =>
    screen.getByText("Date and Time").closest(".detail-column").querySelector(".detail-value").textContent;

  it("shows a date-only appointment on its own day", () => {
    renderWith({ date: "2026-03-04" });
    expect(dateAndTime()).toBe("03/04/2026 • 9:30 AM - 10:45 AM");
  });

  it("parses the times against a full ISO date instead of falling back to now", () => {
    renderWith({ date: "2026-03-04T00:00:00.000Z" });
    expect(dateAndTime()).toBe("03/04/2026 • 9:30 AM - 10:45 AM");
  });

  it("keeps a recurrence end date on its own day", () => {
    renderWith({
      date: "2026-03-04",
      isRecurring: true,
      recurrence: { type: "day", endType: "on", endOn: "2026-06-01T00:00:00.000Z" },
    });
    expect(screen.getByText("Daily until 06/01/2026")).toBeInTheDocument();
  });
});
