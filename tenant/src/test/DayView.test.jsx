import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import DayView from "../Components/CalendarScheduler/DayView";

/**
 * The scheduler's single-day column: twenty-four hour rows with appointment
 * cards positioned on top by arithmetic on their start and end times.
 *
 * The interesting code is the time parser the whole file leans on. It accepts
 * either an ISO date or anything the Date constructor will take, rejects hours
 * and minutes outside the clock, and swallows anything that throws -- and every
 * caller has its own fallback for the null it can return, so a card with an
 * unreadable start is placed differently from one with an unreadable end.
 *
 * The container scrolls itself to the end of the day on mount, which jsdom has
 * no implementation for, so scrollTo is stubbed. Cards whose position depends
 * on a bare date are asserted against the same expression the component uses,
 * because that value moves with the machine's timezone.
 */

vi.mock("../hooks/useFormatSettings", () => ({
  default: () => ({ dateFormat: "MM/DD/YYYY", timeFormat: "24-hour" }),
}));

// A Monday, so the header text is stable.
const dayDate = new Date(2030, 3, 15);
const DAY = "2030-04-15";

const renderDay = (props = {}) =>
  render(
    <DayView
      date={dayDate}
      appointments={[]}
      onAppointmentClick={vi.fn()}
      {...props}
    />
  );

const cards = () =>
  Array.from(document.querySelectorAll(".day-view-appt-card"));

const slots = () =>
  Array.from(document.querySelectorAll(".day-view-hour-slot"));

const appt = (over = {}) => ({
  id: "a1",
  date: DAY,
  startTime: "09:00",
  endTime: "10:00",
  clientName: "Ada Lovelace",
  ...over,
});

beforeEach(() => {
  // jsdom has no layout, so the mount-time scroll to the end of the day throws
  // "not implemented" unless it is stubbed out.
  Element.prototype.scrollTo = vi.fn();
});

describe("the day on show", () => {
  it("names the date it was given", () => {
    renderDay();
    expect(screen.getByText("Monday, April 15, 2030")).toBeInTheDocument();
  });

  it("tints the slots and falls back to today when given no date", () => {
    renderDay({ date: null });
    expect(slots()[0].style.backgroundColor).toBe("rgb(245, 249, 255)");
  });

  it("leaves the slots plain for any other day", () => {
    renderDay();
    expect(slots()[0].style.backgroundColor).toBe("transparent");
  });

  it("lays out a label and a slot for each hour", () => {
    renderDay();
    expect(document.querySelectorAll(".day-view-hour-label")).toHaveLength(24);
    expect(slots()).toHaveLength(24);
    expect(screen.getByText("09:00")).toBeInTheDocument();
  });

  it("scrolls to the end of the day on arrival", () => {
    renderDay();
    expect(Element.prototype.scrollTo).toHaveBeenCalledWith({
      top: 1380,
      behavior: "smooth",
    });
  });
});

describe("clicking an empty slot", () => {
  it("reports the day being shown", () => {
    const onSlotClick = vi.fn();
    renderDay({ onSlotClick });
    fireEvent.click(slots()[3]);

    expect(onSlotClick).toHaveBeenCalledTimes(1);
    expect(onSlotClick.mock.calls[0][0].getDate()).toBe(15);
  });

  it("reports the same day from a right-click", () => {
    const onSlotClick = vi.fn();
    renderDay({ onSlotClick });
    fireEvent.contextMenu(slots()[3]);
    expect(onSlotClick).toHaveBeenCalledTimes(1);
  });

  it("leaves the slots inert when the parent offers no handler", () => {
    renderDay();
    const slot = slots()[0];
    expect(slot.style.cursor).toBe("default");

    fireEvent.click(slot);
    fireEvent.contextMenu(slot);
    expect(cards()).toHaveLength(0);
  });
});

describe("choosing the day's appointments", () => {
  it("drops an appointment belonging to another day", () => {
    renderDay({ appointments: [appt({ date: "2030-04-16" })] });
    expect(cards()).toHaveLength(0);
  });

  it("keeps an appointment whose date is not written in ISO form", () => {
    renderDay({ appointments: [appt({ date: "April 15, 2030" })] });
    expect(cards()).toHaveLength(1);
  });

  it("drops an appointment whose date cannot be read at all", () => {
    renderDay({ appointments: [appt({ date: "sometime soon" })] });
    expect(cards()).toHaveLength(0);
  });

  it("shows nothing at all for a day with no appointments", () => {
    renderDay({ appointments: [] });
    expect(cards()).toHaveLength(0);
  });
});

describe("placing a card", () => {
  it("puts a card at its start hour, sized to its length", () => {
    renderDay({ appointments: [appt()] });
    const [card] = cards();
    expect(card.style.top).toBe("540px");
    expect(card.style.height).toBe("60px");
    expect(card.textContent).toContain("9:00am - 10:00am");
  });

  it("gives a zero-length appointment a floor height", () => {
    renderDay({ appointments: [appt({ endTime: "09:00" })] });
    expect(cards()[0].style.height).toBe("30px");
  });

  it("assumes half an hour when the end time is out of range", () => {
    renderDay({ appointments: [appt({ endTime: "24:00" })] });
    const [card] = cards();
    expect(card.style.top).toBe("540px");
    expect(card.style.height).toBe("30px");
  });

  it("falls back to the appointment's own date when the start is unreadable", () => {
    renderDay({ appointments: [appt({ startTime: "half nine" })] });
    // The bare date parses to midnight UTC, so where that lands in the column
    // depends on the machine's timezone.
    const midnight = new Date(DAY).getHours() + new Date(DAY).getMinutes() / 60;
    expect(cards()[0].style.top).toBe(`${midnight * 60}px`);
  });

  it("rejects an hour outside the clock", () => {
    renderDay({ appointments: [appt({ startTime: "25:00" })] });
    const midnight = new Date(DAY).getHours() + new Date(DAY).getMinutes() / 60;
    expect(cards()[0].style.top).toBe(`${midnight * 60}px`);
  });

  it("rejects minutes outside the clock", () => {
    renderDay({ appointments: [appt({ startTime: "09:75" })] });
    const midnight = new Date(DAY).getHours() + new Date(DAY).getMinutes() / 60;
    expect(cards()[0].style.top).toBe(`${midnight * 60}px`);
  });

  it("rejects minutes that are not a number at all", () => {
    renderDay({ appointments: [appt({ startTime: "09:ab" })] });
    const midnight = new Date(DAY).getHours() + new Date(DAY).getMinutes() / 60;
    expect(cards()[0].style.top).toBe(`${midnight * 60}px`);
  });

  it("rejects an hour before the start of the clock", () => {
    renderDay({ appointments: [appt({ startTime: "-1:00" })] });
    const midnight = new Date(DAY).getHours() + new Date(DAY).getMinutes() / 60;
    expect(cards()[0].style.top).toBe(`${midnight * 60}px`);
  });

  it("survives a time that is not a string at all", () => {
    renderDay({ appointments: [appt({ startTime: 9 })] });
    expect(cards()).toHaveLength(1);
  });

  it("names an unknown client and paints the default colour", () => {
    renderDay({ appointments: [appt({ clientName: undefined })] });
    const [card] = cards();
    expect(card.textContent).toContain("Unknown Client");
    expect(card.style.backgroundColor).toBe("rgb(255, 204, 203)");
  });

  it("uses the appointment's own colour with legible text on top", () => {
    renderDay({ appointments: [appt({ colorCode: "#eeeeee" })] });
    const [card] = cards();
    expect(card.style.backgroundColor).toBe("rgb(238, 238, 238)");
    expect(card.style.color).toBe("rgb(0, 0, 0)");
  });

  it("strikes through a cancelled appointment", () => {
    renderDay({ appointments: [appt({ isCanceled: true })] });
    expect(cards()[0].className).toContain("appt-cancelled");
  });
});

describe("appointments that overlap", () => {
  const at = (id, startTime, endTime) =>
    appt({ id, startTime, endTime, clientName: id });

  it("splits the column between two appointments that share it", () => {
    renderDay({
      appointments: [at("a", "09:00", "10:00"), at("b", "09:30", "10:30")],
    });
    const [first, second] = cards();
    expect(first.style.width).toBe("calc(50% - 6px)");
    expect(first.style.left).toBe(
      "calc(0% + var(--day-hour-col-width, 80px) + 2px)"
    );
    expect(second.style.left).toBe(
      "calc(50% + var(--day-hour-col-width, 80px) + 2px)"
    );
    expect(second.style.zIndex).toBe("11");
  });

  it("keeps appointments that do not touch at full width", () => {
    renderDay({
      appointments: [at("a", "09:00", "10:00"), at("b", "11:00", "12:00")],
    });
    cards().forEach((card) => {
      expect(card.style.width).toBe("calc(100% - 6px)");
    });
  });

  it("sorts an appointment with no usable start time to the front", () => {
    renderDay({
      appointments: [at("timed", "09:00", "10:00"), at("untimed", null, null)],
    });
    expect(cards()[0].textContent).toContain("untimed");
  });
});

describe("clicking a card", () => {
  it("hands the appointment and the click straight to the parent", () => {
    const onAppointmentClick = vi.fn();
    renderDay({ appointments: [appt()], onAppointmentClick });
    fireEvent.click(cards()[0]);

    expect(onAppointmentClick).toHaveBeenCalledTimes(1);
    expect(onAppointmentClick.mock.calls[0][0]).toMatchObject({ id: "a1" });
  });
});
