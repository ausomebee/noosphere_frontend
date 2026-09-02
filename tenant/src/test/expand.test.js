import { describe, it, expect } from "vitest";
import expand from "../utils/expand";

/**
 * Appointment recurrence expansion.
 *
 * `expand(master, viewWindow)` turns one stored appointment into the instances
 * that fall inside the calendar's window. Every recurrence shape has three end
 * conditions -- after N occurrences, on a date, or never -- and each has to
 * respect the window, skip anything before the seed date, and let a
 * "related appointment" (a single edited occurrence) override its slot.
 */

const window2026 = { end: new Date("2026-12-31T23:59:59Z") };
const shortWindow = { end: new Date("2026-01-31T23:59:59Z") };

const master = (over = {}) => ({
  id: "a1",
  date: "2026-01-05T00:00:00Z", // a Monday
  startTime: "09:00",
  endTime: "10:00",
  isRecurring: false,
  client: { id: "c1" },
  tenant: { id: "t1" },
  ...over,
});

const dates = (out) => out.map((i) => i.date);

describe("non-recurring appointments", () => {
  it("returns the single instance", () => {
    const out = expand(master(), window2026);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual(
      expect.objectContaining({
        id: "a1",
        date: "2026-01-05",
        startTime: "09:00",
        endTime: "10:00",
        isRecurringInstance: false,
      })
    );
  });

  it("returns nothing for a date it cannot parse", () => {
    expect(expand(master({ date: "not-a-date" }), window2026)).toEqual([]);
  });

  it("treats a recurring flag with no rule as non-recurring", () => {
    const out = expand(master({ isRecurring: true, recurrence: null }), window2026);
    expect(out).toHaveLength(1);
    expect(out[0].isRecurringInstance).toBe(false);
  });

  it("lets a related appointment override the slot", () => {
    const out = expand(
      master({
        relatedAppointments: [
          {
            id: "edited",
            date: "2026-01-05T00:00:00Z",
            startTime: "13:00",
            endTime: "14:00",
            client: { id: "other" },
            isCanceled: true,
          },
        ],
      }),
      window2026
    );
    expect(out[0]).toEqual(
      expect.objectContaining({
        id: "edited",
        startTime: "13:00",
        parentId: "a1",
        client: { id: "other" },
        isCanceled: true,
      })
    );
  });

  it("falls back to the master's client and tenant on a sparse override", () => {
    const out = expand(
      master({
        relatedAppointments: [
          { id: "edited", date: "2026-01-05T00:00:00Z", startTime: "13:00", endTime: "14:00" },
        ],
      }),
      window2026
    );
    expect(out[0].client).toEqual({ id: "c1" });
    expect(out[0].tenant).toEqual({ id: "t1" });
  });

  it("ignores a related appointment whose date will not parse", () => {
    const out = expand(
      master({ relatedAppointments: [{ id: "bad", date: "nope" }] }),
      window2026
    );
    expect(out[0].id).toBe("a1");
  });
});

describe("daily recurrence", () => {
  const daily = (recurrence) =>
    expand(master({ isRecurring: true, recurrence: { type: "day", ...recurrence } }), shortWindow);

  it("stops after the requested number of occurrences", () => {
    const out = daily({ endType: "after", occurrences: 3 });
    expect(dates(out)).toEqual(["2026-01-05", "2026-01-06", "2026-01-07"]);
  });

  it("stops on the end date", () => {
    const out = daily({ endType: "on", endOn: "2026-01-08T00:00:00Z" });
    expect(dates(out)).toEqual(["2026-01-05", "2026-01-06", "2026-01-07", "2026-01-08"]);
  });

  it("runs to the end of the window when it never ends", () => {
    const out = daily({ endType: "never" });
    expect(out[0].date).toBe("2026-01-05");
    expect(out[out.length - 1].date).toBe("2026-01-31");
  });

  it("returns nothing for an unparseable end date", () => {
    expect(daily({ endType: "on", endOn: "nope" })).toEqual([]);
  });

  it("treats a missing occurrence count as unbounded within the window", () => {
    const out = daily({ endType: "after" });
    expect(out.length).toBeGreaterThan(3);
  });

  it("marks each instance as a recurring instance of its parent", () => {
    const [first] = daily({ endType: "after", occurrences: 1 });
    expect(first.isRecurringInstance).toBe(true);
    expect(first.parentId).toBe("a1");
    expect(first.id).toContain("a1_");
  });

  it("returns nothing when the start time will not parse", () => {
    const out = expand(
      master({ isRecurring: true, startTime: "ab:cd", recurrence: { type: "day", endType: "after", occurrences: 2 } }),
      shortWindow
    );
    expect(out).toEqual([]);
  });

  it("defaults a missing start time to midnight", () => {
    const out = expand(
      master({ isRecurring: true, startTime: undefined, recurrence: { type: "day", endType: "after", occurrences: 1 } }),
      shortWindow
    );
    expect(out).toHaveLength(1);
  });
});

describe("weekly recurrence", () => {
  const weekly = (recurrence, win = shortWindow) =>
    expand(master({ isRecurring: true, recurrence: { type: "week", ...recurrence } }), win);

  it("repeats on the named days until the count is met", () => {
    const out = weekly({ days: ["mon"], endType: "after", occurrences: 3 });
    expect(dates(out)).toEqual(["2026-01-05", "2026-01-12", "2026-01-19"]);
  });

  it("handles several days in one week", () => {
    const out = weekly({ days: ["mon", "wed"], endType: "on", endOn: "2026-01-15T00:00:00Z" });
    expect(dates(out).sort()).toEqual(["2026-01-05", "2026-01-07", "2026-01-12", "2026-01-14"]);
  });

  it("runs to the window end when it never ends", () => {
    const out = weekly({ days: ["mon"], endType: "never" });
    expect(dates(out)).toEqual(["2026-01-05", "2026-01-12", "2026-01-19", "2026-01-26"]);
  });

  it("accepts long and short day names alike", () => {
    const short = weekly({ days: ["mon"], endType: "after", occurrences: 1 });
    const long = weekly({ days: ["monday"], endType: "after", occurrences: 1 });
    expect(dates(short)).toEqual(dates(long));
  });

  it("returns nothing when no day is recognised", () => {
    expect(weekly({ days: ["notaday"], endType: "never" })).toEqual([]);
    expect(weekly({ days: [], endType: "never" })).toEqual([]);
    expect(weekly({ endType: "never" })).toEqual([]);
  });

  it("skips a non-string day entry", () => {
    const out = weekly({ days: [7, "mon"], endType: "after", occurrences: 1 });
    expect(dates(out)).toEqual(["2026-01-05"]);
  });

  it("returns nothing for an unparseable end date", () => {
    const out = weekly({ days: ["mon"], endType: "on", endOn: "nope" });
    expect(out).toEqual([]);
  });

  it("honours a custom week interval", () => {
    const out = expand(
      master({
        isRecurring: true,
        recurrence: { type: "custom", unit: "week", days: ["mon"], interval: 2, endType: "never" },
      }),
      shortWindow
    );
    expect(dates(out)).toEqual(["2026-01-05", "2026-01-19"]);
  });

  it("defaults a bad interval to one", () => {
    const out = expand(
      master({
        isRecurring: true,
        recurrence: { type: "custom", unit: "week", days: ["mon"], interval: "x", endType: "never" },
      }),
      shortWindow
    );
    expect(dates(out)).toEqual(["2026-01-05", "2026-01-12", "2026-01-19", "2026-01-26"]);
  });
});

describe("monthly recurrence by day of month", () => {
  const monthly = (recurrence) =>
    expand(master({ isRecurring: true, recurrence: { type: "month", ...recurrence } }), window2026);

  it("repeats on the given dates until the count is met", () => {
    const out = monthly({ day: [5], endType: "after", occurrences: 3 });
    expect(dates(out)).toEqual(["2026-01-05", "2026-02-05", "2026-03-05"]);
  });

  it("stops on the end date", () => {
    const out = monthly({ day: [5], endType: "on", endOn: "2026-03-31T00:00:00Z" });
    expect(dates(out)).toEqual(["2026-01-05", "2026-02-05", "2026-03-05"]);
  });

  it("runs to the window end when it never ends", () => {
    const out = monthly({ day: [5], endType: "never" });
    expect(out).toHaveLength(12);
  });

  it("returns nothing without a day list", () => {
    expect(monthly({ endType: "never" })).toEqual([]);
    expect(monthly({ day: [], endType: "never" })).toEqual([]);
  });

  it("returns nothing for an unparseable end date", () => {
    expect(monthly({ day: [5], endType: "on", endOn: "nope" })).toEqual([]);
  });

  it("honours a custom month interval", () => {
    const out = expand(
      master({
        isRecurring: true,
        recurrence: { type: "custom", unit: "month", day: [5], interval: 3, endType: "never" },
      }),
      window2026
    );
    expect(dates(out)).toEqual(["2026-01-05", "2026-04-05", "2026-07-05", "2026-10-05"]);
  });
});

describe("monthly recurrence by weekday position", () => {
  const byPosition = (recurrence, win = window2026) =>
    expand(
      master({
        isRecurring: true,
        recurrence: { type: "custom", unit: "month", position: "second", weekday: "mon", ...recurrence },
      }),
      win
    );

  it("picks the nth weekday of each month", () => {
    const out = byPosition({ endType: "after", occurrences: 3 });
    expect(dates(out)).toEqual(["2026-01-12", "2026-02-09", "2026-03-09"]);
  });

  it("picks the last weekday when asked", () => {
    const out = byPosition({ position: "last", endType: "after", occurrences: 2 });
    expect(dates(out)).toEqual(["2026-01-26", "2026-02-23"]);
  });

  it("stops on the end date", () => {
    const out = byPosition({ endType: "on", endOn: "2026-03-31T00:00:00Z" });
    expect(dates(out)).toEqual(["2026-01-12", "2026-02-09", "2026-03-09"]);
  });

  it("runs to the window end when it never ends", () => {
    const out = byPosition({ endType: "never" }, shortWindow);
    expect(dates(out)).toEqual(["2026-01-12"]);
  });

  it("returns nothing for an unrecognised weekday or position", () => {
    expect(byPosition({ weekday: "notaday", endType: "never" })).toEqual([]);
    expect(byPosition({ position: "ninth", endType: "never" })).toEqual([]);
  });

  it("returns nothing for an unparseable end date", () => {
    expect(byPosition({ endType: "on", endOn: "nope" })).toEqual([]);
  });

  it("honours the interval between months", () => {
    const out = byPosition({ interval: 2, endType: "after", occurrences: 2 });
    expect(dates(out)).toEqual(["2026-01-12", "2026-03-09"]);
  });
});

describe("related appointments inside a series", () => {
  it("overrides the generated instance that shares its date", () => {
    const out = expand(
      master({
        isRecurring: true,
        recurrence: { type: "day", endType: "after", occurrences: 3 },
        relatedAppointments: [
          { id: "edited", date: "2026-01-06T00:00:00Z", startTime: "15:00", endTime: "16:00" },
        ],
      }),
      shortWindow
    );
    const edited = out.find((i) => i.date === "2026-01-06");
    expect(edited.id).toBe("edited");
    expect(edited.startTime).toBe("15:00");
  });

  it("adds a related appointment that no generated instance covers", () => {
    const out = expand(
      master({
        isRecurring: true,
        recurrence: { type: "week", days: ["mon"], endType: "after", occurrences: 1 },
        relatedAppointments: [
          { id: "extra", date: "2026-01-20T00:00:00Z", startTime: "11:00", endTime: "12:00" },
        ],
      }),
      shortWindow
    );
    expect(dates(out)).toContain("2026-01-20");
    expect(out.find((i) => i.date === "2026-01-20").id).toBe("extra");
  });

  it("leaves out a related appointment beyond the window or before the seed", () => {
    const out = expand(
      master({
        isRecurring: true,
        recurrence: { type: "week", days: ["mon"], endType: "after", occurrences: 1 },
        relatedAppointments: [
          { id: "past", date: "2025-12-01T00:00:00Z" },
          { id: "future", date: "2027-01-01T00:00:00Z" },
        ],
      }),
      shortWindow
    );
    expect(dates(out)).toEqual(["2026-01-05"]);
  });
});

describe("window and seed boundaries", () => {
  it("drops instances that fall past the window end", () => {
    const out = expand(
      master({ isRecurring: true, recurrence: { type: "day", endType: "never" } }),
      { end: new Date("2026-01-07T23:59:59Z") }
    );
    expect(dates(out)).toEqual(["2026-01-05", "2026-01-06", "2026-01-07"]);
  });

  it("returns nothing at all when the window ends before the seed", () => {
    const out = expand(
      master({ isRecurring: true, recurrence: { type: "day", endType: "never" } }),
      { end: new Date("2025-12-01T00:00:00Z") }
    );
    expect(out).toEqual([]);
  });

  it("returns nothing for an unknown recurrence type", () => {
    const out = expand(
      master({ isRecurring: true, recurrence: { type: "fortnight", endType: "never" } }),
      window2026
    );
    expect(out).toEqual([]);
  });
});
