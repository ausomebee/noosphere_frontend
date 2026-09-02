import { describe, it, expect, vi, beforeEach } from "vitest";
import { addDays, addMonths, format, startOfDay } from "date-fns";

const expandMock = vi.fn();
vi.mock("../utils/expand", () => ({ default: (...args) => expandMock(...args) }));

import expandForAppointments from "../utils/expandForAppointments";

/**
 * The appointments-page wrapper around recurrence expansion.
 *
 * `expand` only knows about dates; this wrapper picks the six-month window that
 * the Upcoming and Past tabs each want, merges the master row back over every
 * expanded instance (the instances carry only date/id, while the master carries
 * display fields such as `service`), and then drops anything on the wrong side
 * of today. `expand` is mocked so the tests are about the window and the
 * filter, not about recurrence rules -- those are covered in expand.test.js.
 *
 * Every assertion is written relative to `startOfDay(new Date())` because the
 * wrapper reads the clock itself and takes no reference date.
 */

const today = startOfDay(new Date());
const iso = (d) => format(d, "yyyy-MM-dd");

const master = { id: "a1", service: [{ name: "Speech" }], client: { id: "c1" } };

// `expand` returns thin instances: a date and a per-occurrence id, nothing else.
const instance = (date, over = {}) => ({ id: "a1_1", date, ...over });

beforeEach(() => {
  expandMock.mockReset();
  expandMock.mockReturnValue([]);
});

describe("the window handed to expand", () => {
  it("looks six months ahead for the upcoming tab", () => {
    expandForAppointments(master, "future");
    const [passedMaster, window] = expandMock.mock.calls[0];
    expect(passedMaster).toBe(master);
    expect(window.start).toEqual(today);
    expect(window.end).toEqual(addMonths(today, 6));
  });

  it("defaults to the upcoming window when no direction is given", () => {
    expandForAppointments(master);
    expect(expandMock.mock.calls[0][1].end).toEqual(addMonths(today, 6));
  });

  it("looks six months back, ending yesterday, for the past tab", () => {
    expandForAppointments(master, "past");
    const window = expandMock.mock.calls[0][1];
    expect(window.start).toEqual(addMonths(today, -6));
    expect(window.end).toEqual(addDays(today, -1));
  });

  it("expands nothing at all for a direction it does not recognise", () => {
    expect(expandForAppointments(master, "sideways")).toEqual([]);
    expect(expandMock).not.toHaveBeenCalled();
  });
});

describe("merging the master back in", () => {
  it("keeps master fields the thin instance does not carry", () => {
    expandMock.mockReturnValue([instance(iso(addDays(today, 3)))]);
    const [row] = expandForAppointments(master, "future");
    expect(row.service).toEqual(master.service);
    expect(row.client).toEqual(master.client);
  });

  it("lets the instance win where the two overlap", () => {
    // The master's own id is the recurrence master; the instance id identifies
    // this occurrence and must survive the merge.
    expandMock.mockReturnValue([instance(iso(addDays(today, 3)))]);
    const [row] = expandForAppointments(master, "future");
    expect(row.id).toBe("a1_1");
    expect(row.date).toBe(iso(addDays(today, 3)));
  });
});

describe("filtering by direction", () => {
  it("keeps a future instance", () => {
    expandMock.mockReturnValue([instance(iso(addDays(today, 10)))]);
    expect(expandForAppointments(master, "future")).toHaveLength(1);
  });

  it("keeps an instance that falls today, since the tab is inclusive of it", () => {
    expandMock.mockReturnValue([instance(iso(today))]);
    expect(expandForAppointments(master, "future")).toHaveLength(1);
  });

  it("drops a past instance from the upcoming tab", () => {
    expandMock.mockReturnValue([instance(iso(addDays(today, -1)))]);
    expect(expandForAppointments(master, "future")).toEqual([]);
  });

  it("keeps a past instance on the past tab", () => {
    expandMock.mockReturnValue([instance(iso(addDays(today, -4)))]);
    expect(expandForAppointments(master, "past")).toHaveLength(1);
  });

  it("drops today from the past tab, which ends yesterday", () => {
    expandMock.mockReturnValue([instance(iso(today))]);
    expect(expandForAppointments(master, "past")).toEqual([]);
  });

  it("drops an instance whose date cannot be parsed", () => {
    expandMock.mockReturnValue([instance("not-a-date")]);
    expect(expandForAppointments(master, "future")).toEqual([]);
  });

  it("keeps the surviving instances in the order expand produced them", () => {
    expandMock.mockReturnValue([
      instance(iso(addDays(today, 1)), { id: "a1_1" }),
      instance(iso(addDays(today, -1)), { id: "a1_2" }),
      instance(iso(addDays(today, 2)), { id: "a1_3" }),
    ]);
    expect(expandForAppointments(master, "future").map((r) => r.id)).toEqual([
      "a1_1",
      "a1_3",
    ]);
  });

  it("returns an empty list when the master expanded to nothing", () => {
    expect(expandForAppointments(master, "past")).toEqual([]);
  });
});
