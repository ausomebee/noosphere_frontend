import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import MonthView from "../Components/CalendarScheduler/MonthView";

/**
 * The scheduler's month grid: six weeks of day cells, each showing at most
 * three appointments with the rest folded behind a "+N more" button that opens
 * a floating list.
 *
 * That dropdown is the only real state here, and it is a three-way toggle: the
 * same day's button closes it, another day's button moves it, and a mousedown
 * anywhere outside the calendar dismisses it. Both click handlers stop the
 * event before the day cell beneath them can read it as a request to create an
 * appointment, which is asserted rather than assumed.
 *
 * Positions are measured off getBoundingClientRect, which jsdom always answers
 * with zeros, so the tests that care install the rectangle on the node first.
 * Dates are written with an explicit local midnight, because the grid compares
 * `new Date(appt.date)` against a local day and a bare "yyyy-MM-dd" is UTC.
 */

// April 2030 begins on a Monday, so the grid runs Sun 31 Mar to Sat 4 May.
const monthDate = new Date(2030, 3, 15);
const on = (day) => `2030-04-${String(day).padStart(2, "0")}T00:00:00`;

const renderMonth = (props = {}) =>
  render(
    <MonthView
      date={monthDate}
      appointments={[]}
      onAppointmentClick={vi.fn()}
      {...props}
    />
  );

const dayCell = (n) =>
  Array.from(document.querySelectorAll(".month-view-day")).find(
    (d) =>
      d.querySelector(".month-view-day-number")?.textContent === String(n) &&
      d.className.includes("month-view-day-current")
  );

const chips = (n) =>
  Array.from(dayCell(n).querySelectorAll(".month-view-appointment"));

const dropdownRows = () => {
  const list = document.querySelector(".month-view-container > div:last-child");
  return list && list.className === ""
    ? Array.from(list.children)
    : [];
};

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

// Five appointments on the 15th: three fit in the cell and two spill over.
const manyOnThe15th = Array.from({ length: 5 }, (_, i) => ({
  id: `a${i + 1}`,
  date: on(15),
  startTime: `0${i + 5}:30`,
  clientName: `Client ${i + 1}`,
}));

describe("the grid", () => {
  it("heads the columns and fills five weeks around the month", () => {
    renderMonth();
    expect(screen.getByText("Sun")).toBeInTheDocument();
    expect(screen.getByText("Thur")).toBeInTheDocument();
    expect(document.querySelectorAll(".month-view-day")).toHaveLength(35);
  });

  it("greys out the days that belong to the neighbouring months", () => {
    renderMonth();
    // One day of March at the front, four of May at the back.
    expect(
      document.querySelectorAll(".month-view-day-outside")
    ).toHaveLength(5);
    expect(dayCell(15).className).toContain("month-view-day-current");
  });

  it("marks today when the month on show contains it", () => {
    renderMonth({ date: new Date() });
    expect(
      document.querySelectorAll(".month-view-day-today")
    ).toHaveLength(1);
  });

  it("marks no day in a month that is not this one", () => {
    renderMonth();
    expect(document.querySelector(".month-view-day-today")).toBeNull();
  });
});

describe("appointments in a day cell", () => {
  it("shows the first three and folds the rest away", () => {
    renderMonth({ appointments: manyOnThe15th });
    expect(chips(15)).toHaveLength(3);
    expect(screen.getByText("+2 more")).toBeInTheDocument();
  });

  it("shows no overflow button for a day with three or fewer", () => {
    renderMonth({ appointments: manyOnThe15th.slice(0, 3) });
    expect(chips(15)).toHaveLength(3);
    expect(screen.queryByText(/more$/)).not.toBeInTheDocument();
  });

  it("puts the start time in front of the client's name", () => {
    renderMonth({ appointments: [manyOnThe15th[0]] });
    expect(chips(15)[0].textContent).toContain("5:30 AM Client 1");
  });

  it("leaves the time out when the appointment has none", () => {
    renderMonth({
      appointments: [{ id: "a1", date: on(15), clientName: "Ada" }],
    });
    expect(chips(15)[0].textContent.trim()).toBe("Ada");
  });

  it("paints the default colour and strikes through a cancellation", () => {
    renderMonth({
      appointments: [
        { id: "a1", date: on(15), clientName: "Ada", isCanceled: true },
        { id: "a2", date: on(15), clientName: "Alan", colorCode: "#102030" },
      ],
    });
    const [cancelled, coloured] = chips(15);
    expect(cancelled.className).toContain("appt-cancelled");
    expect(cancelled.style.backgroundColor).toBe("rgb(255, 204, 203)");
    expect(coloured.style.backgroundColor).toBe("rgb(16, 32, 48)");
    expect(coloured.style.color).toBe("rgb(255, 255, 255)");
  });

  it("keeps appointments on the day they belong to", () => {
    renderMonth({
      appointments: [
        { id: "a1", date: on(15), clientName: "Ada" },
        { id: "a2", date: on(16), clientName: "Alan" },
      ],
    });
    expect(chips(15)).toHaveLength(1);
    expect(chips(16)).toHaveLength(1);
  });
});

describe("the overflow dropdown", () => {
  const openOverflow = (props = {}) => {
    const view = renderMonth({ appointments: manyOnThe15th, ...props });
    fireEvent.click(screen.getByText("+2 more"));
    return view;
  };

  it("lists only the appointments past the third", () => {
    openOverflow();
    expect(dropdownRows()).toHaveLength(2);
    expect(dropdownRows()[0].textContent).toContain("Client 4");
  });

  it("closes again when the same button is clicked", () => {
    openOverflow();
    fireEvent.click(screen.getByText("+2 more"));
    expect(dropdownRows()).toHaveLength(0);
  });

  it("moves to another day's overflow", () => {
    const others = Array.from({ length: 5 }, (_, i) => ({
      id: `b${i + 1}`,
      date: on(16),
      clientName: `Other ${i + 1}`,
    }));
    renderMonth({ appointments: [...manyOnThe15th, ...others] });

    fireEvent.click(screen.getAllByText("+2 more")[0]);
    expect(dropdownRows()[0].textContent).toContain("Client 4");

    fireEvent.click(screen.getAllByText("+2 more")[1]);
    expect(dropdownRows()[0].textContent).toContain("Other 4");
  });

  it("dismisses itself on a mousedown outside the calendar", () => {
    openOverflow();
    fireEvent.mouseDown(document.body);
    expect(dropdownRows()).toHaveLength(0);
  });

  it("stays open for a mousedown inside the calendar", () => {
    openOverflow();
    fireEvent.mouseDown(dayCell(20));
    expect(dropdownRows()).toHaveLength(2);
  });

  it("colours its rows and dims a cancelled one", () => {
    renderMonth({
      appointments: [
        ...manyOnThe15th.slice(0, 3),
        // A shorthand hex, so the row's hover colour has to be expanded before
        // it can be darkened.
        { id: "x1", date: on(15), clientName: "Coloured", colorCode: "#abc" },
        { id: "x2", date: on(15), clientName: "Gone", isCanceled: true },
      ],
    });
    fireEvent.click(screen.getByText("+2 more"));

    const [coloured, cancelled] = dropdownRows();
    expect(coloured.style.backgroundColor).toBe("rgb(170, 187, 204)");
    expect(cancelled.style.textDecoration).toBe("line-through");
    expect(cancelled.style.backgroundColor).toBe("rgb(255, 204, 203)");
  });

  it("opens an appointment straight from the dropdown", () => {
    const onAppointmentClick = vi.fn();
    openOverflow({ onAppointmentClick });
    fireEvent.click(dropdownRows()[0]);

    expect(onAppointmentClick).toHaveBeenCalledTimes(1);
    expect(onAppointmentClick.mock.calls[0][0]).toMatchObject({ id: "a4" });
  });

  it("does not read the overflow button as a request for a new appointment", () => {
    const onSlotClick = vi.fn();
    openOverflow({ onSlotClick });
    expect(onSlotClick).not.toHaveBeenCalled();
  });
});

describe("clicking an empty day", () => {
  it("reports the day that was clicked", () => {
    const onSlotClick = vi.fn();
    renderMonth({ onSlotClick });
    fireEvent.click(dayCell(20));

    expect(onSlotClick).toHaveBeenCalledTimes(1);
    expect(onSlotClick.mock.calls[0][0].getDate()).toBe(20);
    expect(dayCell(20).style.cursor).toBe("pointer");
  });

  it("reports the same day from a right-click", () => {
    const onSlotClick = vi.fn();
    renderMonth({ onSlotClick });
    fireEvent.contextMenu(dayCell(20));
    expect(onSlotClick).toHaveBeenCalledTimes(1);
  });

  it("leaves the cells inert when the parent offers no handler", () => {
    renderMonth();
    const cell = dayCell(20);
    expect(cell.style.cursor).toBe("");

    fireEvent.click(cell);
    fireEvent.contextMenu(cell);
    expect(document.querySelector(".month-view-grid")).toBeInTheDocument();
  });
});

describe("clicking an appointment", () => {
  it("reports where it sits inside the calendar, and not the day beneath it", () => {
    const onAppointmentClick = vi.fn();
    const onSlotClick = vi.fn();
    renderMonth({
      appointments: [{ id: "a1", date: on(15), clientName: "Ada" }],
      onAppointmentClick,
      onSlotClick,
    });

    stubRect(document.querySelector(".month-view-container"), {
      left: 40,
      top: 20,
    });
    const chip = chips(15)[0];
    stubRect(chip, { left: 140, top: 90, width: 100, height: 18 });
    fireEvent.click(chip);

    expect(onAppointmentClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a1" }),
      { x: 210, y: 70, appointmentWidth: 100, appointmentHeight: 18 }
    );
    expect(onSlotClick).not.toHaveBeenCalled();
  });
});
