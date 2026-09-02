import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import WeekView from "../Components/CalendarScheduler/WeekView";

/**
 * The scheduler's week grid: seven day columns over twenty-four hour rows, with
 * appointment cards absolutely positioned on top of them.
 *
 * Two things carry nearly all the logic. Cards are laid out by arithmetic on
 * the grid's measured width, and jsdom measures every box as zero -- so the
 * geometry a test cares about has to be installed on the node by hand before
 * the event that reads it is fired. And overlapping appointments are bundled
 * into groups that share a column's width, by a scan that only ever compares an
 * appointment with the running end of the group it might join, so the fixtures
 * below are ordered deliberately.
 *
 * The width is recomputed from a ResizeObserver, which jsdom does not have; the
 * local stub keeps the callback so a resize can be replayed on demand.
 */

vi.mock("../hooks/useFormatSettings", () => ({
  default: () => ({ dateFormat: "MM/DD/YYYY", timeFormat: "24-hour" }),
}));

// Mid-April 2030: a Monday, whose week runs Sun 14th to Sat 20th.
const weekDate = new Date(2030, 3, 15);
const DAY = "2030-04-15";

// Every observer the component creates, so a resize can be replayed.
let observers = [];

const renderWeek = (props = {}) =>
  render(
    <WeekView
      date={weekDate}
      appointments={[]}
      onAppointmentClick={vi.fn()}
      {...props}
    />
  );

const cards = () =>
  Array.from(document.querySelectorAll(".week-view-appt-card"));

const slots = () =>
  Array.from(document.querySelectorAll(".week-view-hour-slot"));

// jsdom reports every box as zero, so hand the node the rectangle the code is
// about to read off it.
const stubRect = (node, rect) => {
  node.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    right: 0,
    bottom: 0,
    x: 0,
    y: 0,
    ...rect,
  });
};

const resizeGridTo = (width) => {
  stubRect(document.querySelector(".week-view-grid"), { width });
  act(() => {
    observers.forEach((cb) => cb());
  });
};

beforeEach(() => {
  observers = [];
  class CapturingResizeObserver {
    constructor(callback) {
      observers.push(callback);
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = CapturingResizeObserver;
  globalThis.ResizeObserver = CapturingResizeObserver;
});

describe("the week on show", () => {
  it("runs from the Sunday before the date it was given", () => {
    renderWeek();
    expect(screen.getByText("14 Sun")).toBeInTheDocument();
    expect(screen.getByText("20 Sat")).toBeInTheDocument();
  });

  it("falls back to the current week when given no date", () => {
    renderWeek({ date: null });
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("badges no day in a week that is not this one", () => {
    renderWeek();
    expect(screen.queryByText("Today")).not.toBeInTheDocument();
    expect(
      document.querySelector(".week-view-day-col-today")
    ).not.toBeInTheDocument();
  });

  it("lays out an hour label and seven slots for each of the day's hours", () => {
    renderWeek();
    expect(document.querySelectorAll(".week-view-hour-label")).toHaveLength(24);
    expect(slots()).toHaveLength(24 * 7);
    expect(screen.getAllByText("09:00")).toHaveLength(1);
  });
});

describe("clicking an empty slot", () => {
  it("reports the day that was clicked", () => {
    const onSlotClick = vi.fn();
    renderWeek({ onSlotClick });
    // The first slot of the second column is midnight on the Monday.
    fireEvent.click(slots()[1]);

    expect(onSlotClick).toHaveBeenCalledTimes(1);
    expect(onSlotClick.mock.calls[0][0].getDate()).toBe(15);
  });

  it("reports the same day from a right-click", () => {
    const onSlotClick = vi.fn();
    renderWeek({ onSlotClick });
    fireEvent.contextMenu(slots()[0]);

    expect(onSlotClick).toHaveBeenCalledTimes(1);
    expect(onSlotClick.mock.calls[0][0].getDate()).toBe(14);
  });

  it("leaves the slots inert when the parent offers no handler", () => {
    renderWeek();
    const slot = slots()[0];
    expect(slot.style.cursor).toBe("default");

    fireEvent.click(slot);
    fireEvent.contextMenu(slot);
    expect(document.querySelector(".week-view-grid")).toBeInTheDocument();
  });
});

describe("placing a card", () => {
  const appt = (over = {}) => ({
    id: "a1",
    date: DAY,
    startTime: "09:00",
    endTime: "10:00",
    clientName: "Ada Lovelace",
    ...over,
  });

  it("puts a card at its start hour, sized to its length", () => {
    renderWeek({ appointments: [appt()] });
    const [card] = cards();
    // 40px of header sits above the first hour row.
    expect(card.style.top).toBe("580px");
    expect(card.style.height).toBe("60px");
    expect(card.textContent).toContain("9:00am - 10:00am");
  });

  it("gives a five-minute appointment a floor height", () => {
    renderWeek({ appointments: [appt({ endTime: "09:05" })] });
    expect(cards()[0].style.height).toBe("20px");
  });

  it("flattens a card whose times cannot be read", () => {
    renderWeek({ appointments: [appt({ startTime: "later", endTime: null })] });
    const [card] = cards();
    expect(card.style.top).toBe("0px");
    expect(card.style.height).toBe("0px");
    // With no usable time both ends of the label fall back to the same
    // instant -- the appointment's date parsed on its own.
    const range = card.querySelector(".week-view-appt-time").textContent;
    const [from, to] = range.split(" - ");
    expect(from).toBe(to);
  });

  it("rejects a start time whose minutes are not a number", () => {
    renderWeek({ appointments: [appt({ startTime: "09:ab" })] });
    expect(cards()[0].style.top).toBe("0px");
  });

  it("flattens a card whose end time alone cannot be read", () => {
    renderWeek({ appointments: [appt({ endTime: "10:ab" })] });
    const [card] = cards();
    expect(card.style.top).toBe("0px");
    expect(card.style.height).toBe("0px");
    expect(card.textContent).toContain("9:00am - ");
  });

  it("names an unknown client and paints the default colour", () => {
    renderWeek({ appointments: [appt({ clientName: undefined })] });
    const [card] = cards();
    expect(card.textContent).toContain("Unknown Client");
    expect(card.style.backgroundColor).toBe("rgb(255, 204, 203)");
  });

  it("uses the appointment's own colour with legible text on top", () => {
    renderWeek({ appointments: [appt({ colorCode: "#102030" })] });
    const [card] = cards();
    expect(card.style.backgroundColor).toBe("rgb(16, 32, 48)");
    expect(card.style.color).toBe("rgb(255, 255, 255)");
  });

  it("strikes through a cancelled appointment", () => {
    renderWeek({ appointments: [appt({ isCanceled: true })] });
    expect(cards()[0].className).toContain("appt-cancelled");
  });

  it("leaves an appointment from another week off the grid", () => {
    renderWeek({ appointments: [appt({ date: "2030-05-15" })] });
    expect(cards()).toHaveLength(0);
  });
});

describe("appointments that overlap", () => {
  const at = (id, startTime, endTime) => ({
    id,
    date: DAY,
    startTime,
    endTime,
    clientName: id,
  });

  it("splits a column between two appointments that share it", () => {
    renderWeek({
      appointments: [at("a", "09:00", "10:00"), at("b", "09:30", "10:30")],
    });
    const [first, second] = cards();
    // Two in a group means each takes half the (jsdom-measured) column, and the
    // second is offset by that half.
    expect(first.style.width).toBe(second.style.width);
    expect(first.style.left).not.toBe(second.style.left);
  });

  it("keeps appointments that do not touch at full width", () => {
    renderWeek({
      appointments: [at("a", "09:00", "10:00"), at("b", "11:00", "12:00")],
    });
    const [first, second] = cards();
    expect(first.style.left).toBe(second.style.left);
  });

  it("holds a group open to the latest end time among its members", () => {
    renderWeek({
      appointments: [
        // The long one sets the group's end; the short one must not pull it in
        // again, or the third would start a group of its own.
        at("long", "09:00", "12:00"),
        at("short", "09:30", "10:00"),
        at("late", "11:00", "11:30"),
      ],
    });
    expect(cards()).toHaveLength(3);
    const lefts = new Set(cards().map((c) => c.style.left));
    expect(lefts.size).toBe(3);
  });

  it("sorts an appointment with no usable start time to the front", () => {
    renderWeek({
      appointments: [at("timed", "09:00", "10:00"), at("untimed", null, null)],
    });
    expect(cards()[0].textContent).toContain("untimed");
  });
});

describe("measuring the grid", () => {
  const appointments = [
    { id: "a1", date: DAY, startTime: "09:00", endTime: "10:00" },
  ];

  it("re-places the cards when the grid is measured wider", () => {
    renderWeek({ appointments });
    const before = cards()[0].style.left;

    // 780px wide leaves 700 for seven 100px day columns.
    resizeGridTo(780);
    const after = cards()[0].style.left;

    expect(before).not.toBe(after);
    // The Monday is the second column: 80px of hour gutter plus one day.
    expect(after).toBe("180px");
  });

  it("leaves the cards alone when the width has not moved", () => {
    renderWeek({ appointments });
    resizeGridTo(780);
    const after = cards()[0].style.left;

    resizeGridTo(780);
    expect(cards()[0].style.left).toBe(after);
  });
});

describe("clicking a card", () => {
  it("reports the appointment and where it sits inside the calendar", () => {
    const onAppointmentClick = vi.fn();
    const appointment = {
      id: "a1",
      date: DAY,
      startTime: "09:00",
      endTime: "10:00",
    };
    renderWeek({ appointments: [appointment], onAppointmentClick });

    stubRect(document.querySelector(".week-view-container"), {
      left: 50,
      top: 100,
    });
    const card = cards()[0];
    stubRect(card, { left: 200, top: 150, width: 120, height: 60 });
    fireEvent.click(card);

    expect(onAppointmentClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a1" }),
      { x: 280, y: 50, appointmentWidth: 120, appointmentHeight: 60 }
    );
  });
});
