import { describe, it, expect } from "vitest";

import expand from "../utils/expand";

/**
 * The recurrence expander, over the rules its existing suite does not reach.
 *
 * Everything here is deliberately anchored to fixed dates: the expander walks
 * forward from the appointment's own date and clips against a view window, so a
 * fixture pinned to "today" would produce a different number of instances
 * depending on when the suite runs.
 *
 * The three end types are separate code paths per rule type, not one shared
 * loop, which is why each is exercised for every rule: "after" counts
 * occurrences, "on" walks to a stop date, and "never" fills the window.
 *
 * Note the clipping is one-sided in a way worth knowing: an occurrence before
 * the appointment's own day is dropped rather than emitted, so an "after N"
 * rule can return fewer than N instances without that being an error.
 */

const WINDOW = {
  start: new Date("2026-01-01T00:00:00.000Z"),
  end: new Date("2026-12-31T23:59:59.999Z"),
};

const master = (recurrence, over = {}) => ({
  id: "a1",
  date: "2026-03-04T00:00:00.000Z", // a Wednesday
  startTime: "09:00",
  endTime: "10:00",
  isRecurring: true,
  recurrence,
  client: { id: "c1" },
  tenant: { id: "t1" },
  ...over,
});

const datesFrom = (instances) => instances.map((i) => i.date);

describe("a rule that repeats every day", () => {
  it("emits exactly the number of occurrences asked for", () => {
    const out = expand(
      master({ type: "day", endType: "after", occurrences: 3 }),
      WINDOW
    );
    expect(datesFrom(out)).toEqual(["2026-03-04", "2026-03-05", "2026-03-06"]);
  });

  it("treats an unusable occurrence count as no limit at all", () => {
    // `Number(x) || Infinity` means a zero or a nonsense count fills the window
    // rather than producing nothing.
    const out = expand(
      master({ type: "day", endType: "after", occurrences: "lots" }),
      { start: WINDOW.start, end: new Date("2026-03-08T23:59:59.999Z") }
    );
    expect(datesFrom(out)).toEqual([
      "2026-03-04",
      "2026-03-05",
      "2026-03-06",
      "2026-03-07",
      "2026-03-08",
    ]);
  });

  it("stops on the date the rule names", () => {
    const out = expand(
      master({ type: "day", endType: "on", endOn: "2026-03-06T00:00:00.000Z" }),
      WINDOW
    );
    expect(datesFrom(out)).toEqual(["2026-03-04", "2026-03-05", "2026-03-06"]);
  });

  it("emits nothing for a stop date it cannot read", () => {
    const out = expand(
      master({ type: "day", endType: "on", endOn: "not-a-date" }),
      WINDOW
    );
    expect(out).toEqual([]);
  });

  it("fills the window when the rule never ends", () => {
    const out = expand(master({ type: "day", endType: "never" }), {
      start: WINDOW.start,
      end: new Date("2026-03-07T23:59:59.999Z"),
    });
    expect(datesFrom(out)).toEqual(["2026-03-04", "2026-03-05", "2026-03-06", "2026-03-07"]);
  });
});

describe("a rule that repeats weekly", () => {
  const weekly = (over) => ({ type: "week", days: ["mon", "wed"], ...over });

  it("emits the named weekdays until the count is met, per day", () => {
    const out = expand(master(weekly({ endType: "after", occurrences: 2 })), WINDOW);
    // Mondays and Wednesdays are counted separately, and the Monday of the
    // seed's own week falls before the appointment, so it is dropped.
    expect(datesFrom(out).sort()).toEqual([
      "2026-03-04",
      "2026-03-09",
      "2026-03-11",
      "2026-03-16",
    ]);
  });

  it("emits nothing when the occurrence count is unusable", () => {
    const out = expand(
      master(weekly({ endType: "after", occurrences: "lots" })),
      WINDOW
    );
    expect(out).toEqual([]);
  });

  it("stops on the date the rule names", () => {
    const out = expand(
      master(weekly({ endType: "on", endOn: "2026-03-12T00:00:00.000Z" })),
      WINDOW
    );
    expect(datesFrom(out).sort()).toEqual(["2026-03-04", "2026-03-09", "2026-03-11"]);
  });

  it("emits nothing for a stop date it cannot read", () => {
    const out = expand(
      master(weekly({ endType: "on", endOn: "not-a-date" })),
      WINDOW
    );
    expect(out).toEqual([]);
  });

  it("fills the window when the rule never ends", () => {
    const out = expand(master(weekly({ endType: "never" })), {
      start: WINDOW.start,
      end: new Date("2026-03-12T23:59:59.999Z"),
    });
    expect(datesFrom(out).sort()).toEqual(["2026-03-04", "2026-03-09", "2026-03-11"]);
  });

  it("skips a weekday name it does not recognise", () => {
    const out = expand(
      master({ type: "week", days: ["mon", "someday"], endType: "after", occurrences: 1 }),
      WINDOW
    );
    expect(datesFrom(out)).toEqual(["2026-03-09"]);
  });

  it("emits nothing when no named day is recognisable", () => {
    const out = expand(
      master({ type: "week", days: ["someday"], endType: "after", occurrences: 2 }),
      WINDOW
    );
    expect(out).toEqual([]);
  });

  it("honours a custom weekly interval", () => {
    const out = expand(
      master({
        type: "custom",
        unit: "week",
        interval: 2,
        days: ["wed"],
        endType: "after",
        occurrences: 3,
      }),
      WINDOW
    );
    expect(datesFrom(out)).toEqual(["2026-03-04", "2026-03-18", "2026-04-01"]);
  });

  it("treats an unusable custom interval as every week", () => {
    const out = expand(
      master({
        type: "custom",
        unit: "week",
        interval: "nonsense",
        days: ["wed"],
        endType: "after",
        occurrences: 2,
      }),
      WINDOW
    );
    expect(datesFrom(out)).toEqual(["2026-03-04", "2026-03-11"]);
  });
});

describe("a rule that repeats on days of the month", () => {
  const monthly = (over) => ({ type: "month", day: [4], ...over });

  it("emits the named day for as many months as asked for", () => {
    const out = expand(master(monthly({ endType: "after", occurrences: 3 })), WINDOW);
    expect(datesFrom(out)).toEqual(["2026-03-04", "2026-04-04", "2026-05-04"]);
  });

  it("emits every named day of each month", () => {
    const out = expand(
      master({ type: "month", day: [4, 20], endType: "after", occurrences: 3 }),
      WINDOW
    );
    // The count is only checked between months, not between days within one, so
    // a month whose days would overshoot the limit still emits all of them.
    expect(datesFrom(out)).toEqual([
      "2026-03-04",
      "2026-03-20",
      "2026-04-04",
      "2026-04-20",
    ]);
  });

  it("stops on the date the rule names", () => {
    const out = expand(
      master(monthly({ endType: "on", endOn: "2026-05-31T00:00:00.000Z" })),
      WINDOW
    );
    expect(datesFrom(out)).toEqual(["2026-03-04", "2026-04-04", "2026-05-04"]);
  });

  it("emits nothing for a stop date it cannot read", () => {
    const out = expand(
      master(monthly({ endType: "on", endOn: "not-a-date" })),
      WINDOW
    );
    expect(out).toEqual([]);
  });

  it("fills the window when the rule never ends", () => {
    const out = expand(master(monthly({ endType: "never" })), {
      start: WINDOW.start,
      end: new Date("2026-05-31T23:59:59.999Z"),
    });
    expect(datesFrom(out)).toEqual(["2026-03-04", "2026-04-04", "2026-05-04"]);
  });

  it("emits nothing when the rule names no days", () => {
    expect(expand(master({ type: "month", day: [], endType: "never" }), WINDOW)).toEqual([]);
    expect(expand(master({ type: "month", endType: "never" }), WINDOW)).toEqual([]);
  });

  it("honours a custom monthly interval", () => {
    const out = expand(
      master({
        type: "custom",
        unit: "month",
        interval: 2,
        day: [4],
        endType: "after",
        occurrences: 3,
      }),
      WINDOW
    );
    expect(datesFrom(out)).toEqual(["2026-03-04", "2026-05-04", "2026-07-04"]);
  });
});

describe("a rule that repeats on the nth weekday of a month", () => {
  const nth = (over) => ({
    type: "custom",
    unit: "month",
    position: "first",
    weekday: "wednesday",
    ...over,
  });

  it("emits the first such weekday for as many months as asked for", () => {
    const out = expand(master(nth({ endType: "after", occurrences: 3 })), WINDOW);
    expect(datesFrom(out)).toEqual(["2026-03-04", "2026-04-01", "2026-05-06"]);
  });

  it("emits the last such weekday when the rule says last", () => {
    const out = expand(
      master(nth({ position: "last", endType: "after", occurrences: 2 })),
      WINDOW
    );
    expect(datesFrom(out)).toEqual(["2026-03-25", "2026-04-29"]);
  });

  it("emits a later ordinal too", () => {
    const out = expand(
      master(nth({ position: "third", endType: "after", occurrences: 2 })),
      WINDOW
    );
    expect(datesFrom(out)).toEqual(["2026-03-18", "2026-04-15"]);
  });

  it("stops on the date the rule names", () => {
    const out = expand(
      master(nth({ endType: "on", endOn: "2026-04-30T00:00:00.000Z" })),
      WINDOW
    );
    expect(datesFrom(out)).toEqual(["2026-03-04", "2026-04-01"]);
  });

  it("emits nothing for a stop date it cannot read", () => {
    const out = expand(master(nth({ endType: "on", endOn: "not-a-date" })), WINDOW);
    expect(out).toEqual([]);
  });

  it("fills the window when the rule never ends", () => {
    const out = expand(master(nth({ endType: "never" })), {
      start: WINDOW.start,
      end: new Date("2026-04-30T23:59:59.999Z"),
    });
    expect(datesFrom(out)).toEqual(["2026-03-04", "2026-04-01"]);
  });

  it("emits nothing for a weekday name it does not recognise", () => {
    const out = expand(
      master(nth({ weekday: "someday", endType: "after", occurrences: 2 })),
      WINDOW
    );
    expect(out).toEqual([]);
  });

  it("emits nothing for an ordinal it does not recognise", () => {
    const out = expand(
      master(nth({ position: "seventeenth", endType: "after", occurrences: 2 })),
      WINDOW
    );
    expect(out).toEqual([]);
  });

  it("emits nothing when the occurrence count is unusable", () => {
    const out = expand(
      master(nth({ endType: "after", occurrences: "lots" })),
      WINDOW
    );
    expect(out).toEqual([]);
  });

  it("honours the rule's own month interval", () => {
    const out = expand(
      master(nth({ interval: 3, endType: "after", occurrences: 2 })),
      WINDOW
    );
    expect(datesFrom(out)).toEqual(["2026-03-04", "2026-06-03"]);
  });

  it("stops early when the months run past the window", () => {
    const out = expand(master(nth({ endType: "after", occurrences: 12 })), {
      start: WINDOW.start,
      end: new Date("2026-04-30T23:59:59.999Z"),
    });
    expect(datesFrom(out)).toEqual(["2026-03-04", "2026-04-01"]);
  });
});

describe("clipping against the window and the seed", () => {
  it("drops an occurrence that would fall before the appointment's own day", () => {
    // The Monday of the seed's week is 2026-03-02, two days before the seed.
    const out = expand(
      master({ type: "week", days: ["mon"], endType: "after", occurrences: 2 }),
      WINDOW
    );
    expect(datesFrom(out)).toEqual(["2026-03-09", "2026-03-16"]);
  });

  it("drops an occurrence past the end of the window", () => {
    const out = expand(master({ type: "day", endType: "never" }), {
      start: WINDOW.start,
      end: new Date("2026-03-04T23:59:59.999Z"),
    });
    expect(datesFrom(out)).toEqual(["2026-03-04"]);
  });

  it("emits nothing for an appointment whose own date is unreadable", () => {
    const out = expand(
      master({ type: "day", endType: "never" }, { date: "not-a-date" }),
      WINDOW
    );
    expect(out).toEqual([]);
  });

  it("emits nothing when the start time is unreadable", () => {
    const out = expand(
      master({ type: "day", endType: "never" }, { startTime: "nonsense" }),
      WINDOW
    );
    expect(out).toEqual([]);
  });

  it("treats a missing start time as midnight", () => {
    const out = expand(
      master({ type: "day", endType: "after", occurrences: 1 }, { startTime: undefined }),
      WINDOW
    );
    expect(datesFrom(out)).toEqual(["2026-03-04"]);
  });

  it("emits nothing for a rule type it does not know", () => {
    expect(expand(master({ type: "fortnight", endType: "never" }), WINDOW)).toEqual([]);
  });
});

describe("appointments already moved off the pattern", () => {
  const related = (over = {}) => ({
    id: "r1",
    date: "2026-03-05T00:00:00.000Z",
    startTime: "14:00",
    endTime: "15:00",
    ...over,
  });

  it("uses the moved appointment in place of the generated one", () => {
    const out = expand(
      master({ type: "day", endType: "after", occurrences: 2 }, {
        relatedAppointments: [related()],
      }),
      WINDOW
    );
    const moved = out.find((i) => i.date === "2026-03-05");
    expect(moved.id).toBe("r1");
    expect(moved.startTime).toBe("14:00");
  });

  it("adds a moved appointment the pattern never generated", () => {
    const out = expand(
      master({ type: "day", endType: "after", occurrences: 1 }, {
        relatedAppointments: [related({ date: "2026-06-01T00:00:00.000Z" })],
      }),
      WINDOW
    );
    expect(datesFrom(out)).toContain("2026-06-01");
  });

  it("ignores a moved appointment whose date is unreadable", () => {
    const out = expand(
      master({ type: "day", endType: "after", occurrences: 1 }, {
        relatedAppointments: [related({ date: "not-a-date" })],
      }),
      WINDOW
    );
    expect(datesFrom(out)).toEqual(["2026-03-04"]);
  });

  it("falls back to the master's client and tenant when the moved one has none", () => {
    const out = expand(
      master({ type: "day", endType: "after", occurrences: 2 }, {
        relatedAppointments: [related()],
      }),
      WINDOW
    );
    const moved = out.find((i) => i.date === "2026-03-05");
    expect(moved.client).toEqual({ id: "c1" });
    expect(moved.tenant).toEqual({ id: "t1" });
  });

  it("keeps the moved appointment's own client and tenant when it has them", () => {
    const out = expand(
      master({ type: "day", endType: "after", occurrences: 2 }, {
        relatedAppointments: [related({ client: { id: "c9" }, tenant: { id: "t9" } })],
      }),
      WINDOW
    );
    const moved = out.find((i) => i.date === "2026-03-05");
    expect(moved.client).toEqual({ id: "c9" });
    expect(moved.tenant).toEqual({ id: "t9" });
  });

  it("carries a cancellation from the moved appointment", () => {
    const out = expand(
      master({ type: "day", endType: "after", occurrences: 2 }, {
        isCanceled: false,
        relatedAppointments: [related({ isCanceled: true })],
      }),
      WINDOW
    );
    expect(out.find((i) => i.date === "2026-03-05").isCanceled).toBe(true);
  });

  it("falls back to the master's cancellation when the moved one says nothing", () => {
    const out = expand(
      master({ type: "day", endType: "after", occurrences: 2 }, {
        isCanceled: true,
        relatedAppointments: [related()],
      }),
      WINDOW
    );
    expect(out.find((i) => i.date === "2026-03-05").isCanceled).toBe(true);
  });
});

describe("occurrences the start time moves out of range", () => {
  it("drops the day the start time pushes past the window's last moment", () => {
    // The window closes at the seed's own midnight, so the seed's day survives
    // the loop's own bounds check and is only rejected once 09:00 is stamped on
    // it — the one route through the expander that discards an already-chosen
    // candidate.
    const out = expand(master({ type: "day", endType: "never" }), {
      start: WINDOW.start,
      end: new Date("2026-03-04T00:00:00.000Z"),
    });
    expect(out).toEqual([]);
  });

  it("drops the week the start time pushes back before the appointment", () => {
    // "-1:00" parses to hour -1, which rolls the candidate onto the previous
    // evening; for the seed's own week that lands before the appointment.
    const out = expand(
      master({ type: "week", days: ["wed"], endType: "after", occurrences: 1 }, {
        startTime: "-1:00",
      }),
      WINDOW
    );
    expect(datesFrom(out)).toEqual(["2026-03-10"]);
  });
});

describe("an nth-weekday rule whose first month falls short", () => {
  // The first Monday of March 2026 is the 2nd, two days before the seed, so
  // every end type has to walk past its own month before it emits anything.
  const firstMonday = (over) => ({
    type: "custom",
    unit: "month",
    position: "first",
    weekday: "monday",
    ...over,
  });

  it("counts only the months whose weekday lands on or after the appointment", () => {
    const out = expand(
      master(firstMonday({ endType: "after", occurrences: 2 })),
      WINDOW
    );
    expect(datesFrom(out)).toEqual(["2026-04-06", "2026-05-04"]);
  });

  it("skips its own month when it walks to a stop date", () => {
    const out = expand(
      master(firstMonday({ endType: "on", endOn: "2026-04-30T00:00:00.000Z" })),
      WINDOW
    );
    expect(datesFrom(out)).toEqual(["2026-04-06"]);
  });

  it("skips its own month when it never ends", () => {
    const out = expand(master(firstMonday({ endType: "never" })), {
      start: WINDOW.start,
      end: new Date("2026-04-30T23:59:59.999Z"),
    });
    expect(datesFrom(out)).toEqual(["2026-04-06"]);
  });
});

describe("a day-of-month rule whose first month falls short", () => {
  const second = (over) => ({ type: "month", day: [2], ...over });

  it("counts only the months whose day lands on or after the appointment", () => {
    const out = expand(master(second({ endType: "after", occurrences: 2 })), WINDOW);
    expect(datesFrom(out)).toEqual(["2026-04-02", "2026-05-02"]);
  });

  it("skips its own month when it walks to a stop date", () => {
    const out = expand(
      master(second({ endType: "on", endOn: "2026-04-30T00:00:00.000Z" })),
      WINDOW
    );
    expect(datesFrom(out)).toEqual(["2026-04-02"]);
  });

  it("skips its own month when it never ends", () => {
    const out = expand(master(second({ endType: "never" })), {
      start: WINDOW.start,
      end: new Date("2026-04-30T23:59:59.999Z"),
    });
    expect(datesFrom(out)).toEqual(["2026-04-02"]);
  });
});

describe("a day-of-month rule carrying a day it cannot read", () => {
  // `setDate("nonsense")` leaves an Invalid Date rather than throwing, so the
  // unreadable entry is skipped and the readable one beside it still lands.
  const mixed = (over) => ({ type: "month", day: ["nonsense", 4], ...over });

  it("skips the unreadable day while counting occurrences", () => {
    const out = expand(master(mixed({ endType: "after", occurrences: 2 })), WINDOW);
    expect(datesFrom(out)).toEqual(["2026-03-04", "2026-04-04"]);
  });

  it("skips the unreadable day while walking to a stop date", () => {
    const out = expand(
      master(mixed({ endType: "on", endOn: "2026-04-30T00:00:00.000Z" })),
      WINDOW
    );
    expect(datesFrom(out)).toEqual(["2026-03-04", "2026-04-04"]);
  });

  it("skips the unreadable day while filling the window", () => {
    const out = expand(master(mixed({ endType: "never" })), {
      start: WINDOW.start,
      end: new Date("2026-04-30T23:59:59.999Z"),
    });
    expect(datesFrom(out)).toEqual(["2026-03-04", "2026-04-04"]);
  });

  it("emits nothing when the occurrence count is unusable", () => {
    const out = expand(
      master({ type: "month", day: [4], endType: "after", occurrences: "lots" }),
      WINDOW
    );
    expect(out).toEqual([]);
  });

  it("treats an unusable custom month interval as every month", () => {
    const out = expand(
      master({
        type: "custom",
        unit: "month",
        interval: "soon",
        day: [4],
        endType: "after",
        occurrences: 2,
      }),
      WINDOW
    );
    expect(datesFrom(out)).toEqual(["2026-03-04", "2026-04-04"]);
  });
});

describe("end types the expander does not know", () => {
  it("emits nothing for a weekly rule", () => {
    expect(
      expand(master({ type: "week", days: ["wed"], endType: "whenever" }), WINDOW)
    ).toEqual([]);
  });

  it("emits nothing for a day-of-month rule", () => {
    expect(
      expand(master({ type: "month", day: [4], endType: "whenever" }), WINDOW)
    ).toEqual([]);
  });

  it("emits nothing for an nth-weekday rule", () => {
    expect(
      expand(
        master({
          type: "custom",
          unit: "month",
          position: "first",
          weekday: "wednesday",
          endType: "whenever",
        }),
        WINDOW
      )
    ).toEqual([]);
  });
});
