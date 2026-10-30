import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  format,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";

import DatePickerModal from "../Components/ReusableModal/SchedulerModal/DatePickerModal";

/**
 * The scheduler's date-range picker: a sidebar of nine named shortcuts beside
 * two adjacent month grids, with a footer that reports the chosen range and an
 * Apply button that hands it back.
 *
 * Its whole state is three pieces held locally -- the month pair on show, the
 * committed range, and a half-finished range being clicked out -- and every
 * branch is one of those three read back through a class name or the footer
 * text. Clicking a day is a three-way: it opens a range, closes one (swapping
 * the ends if the second click came earlier), or throws the last one away and
 * starts again.
 *
 * The component seeds itself with a fixed January 2024 range rather than
 * anything derived from today, so the grid assertions below can name real
 * dates. The shortcut expectations are computed with the same date-fns calls
 * the component uses, since those do move with the clock.
 */

const renderPicker = (props = {}) => {
  const onClose = vi.fn();
  const onDateSelect = vi.fn();
  const view = render(
    <DatePickerModal
      isOpen
      onClose={onClose}
      onDateSelect={onDateSelect}
      {...props}
    />
  );
  return { ...view, onClose, onDateSelect };
};

const monthGrid = (index) =>
  document.querySelectorAll(".date-picker-month")[index];

// Days from the month's own weeks, ignoring the next-month spill at the end.
const dayCell = (monthIndex, text) =>
  Array.from(
    monthGrid(monthIndex).querySelectorAll(".date-picker-day-clickable")
  ).find(
    (d) => d.textContent === text && !d.className.includes("day-outside")
  );

const clickDay = (monthIndex, text) =>
  fireEvent.click(dayCell(monthIndex, text));

const rangeText = () =>
  Array.from(document.querySelectorAll(".date-picker-range-text")).map(
    (n) => n.textContent
  );

const applyButton = () => document.querySelector(".date-picker-apply");

const shortcut = (label) => screen.getByText(label);

const asLabel = (d) => format(d, "MMM d, yyyy");

const today = new Date();

beforeEach(() => {
  // react-modal wants an app element to hide from assistive tech; the real app
  // mounts on #root, which nothing else in the test environment creates.
  if (!document.getElementById("root")) {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);
  }
});

describe("opening the picker", () => {
  it("shows two adjacent months and the range it was seeded with", () => {
    renderPicker();
    expect(screen.getAllByText("January 2024").length).toBeGreaterThan(0);
    expect(screen.getAllByText("February 2024").length).toBeGreaterThan(0);
    expect(rangeText()).toEqual(["Jan 6, 2024", "Jan 13, 2024"]);
  });

  it("marks the ends of the range, the days between it, and the spill-over", () => {
    renderPicker();
    expect(dayCell(0, "6").className).toContain("date-picker-day-start-end");
    expect(dayCell(0, "13").className).toContain("date-picker-day-start-end");
    expect(dayCell(0, "9").className).toContain("date-picker-day-in-range");
    expect(dayCell(0, "20").className).toContain("date-picker-day-normal");
    // January 2024 fills its first row exactly, so the only outside-month days
    // are the February ones spilling into the last row.
    expect(
      monthGrid(0).querySelectorAll(".date-picker-day-outside")
    ).toHaveLength(4);
  });

  it("leaves blank cells before the first of a month that starts mid-week", () => {
    renderPicker();
    expect(
      monthGrid(1).querySelectorAll(".date-picker-day-empty")
    ).toHaveLength(3);
  });

  it("renders nothing while it is shut", () => {
    renderPicker({ isOpen: false });
    expect(document.querySelector(".date-picker-container")).toBeNull();
  });
});

describe("stepping through the months", () => {
  it("jumps two months forward", () => {
    renderPicker();
    fireEvent.click(document.querySelectorAll(".date-picker-nav-button")[1]);
    expect(screen.getAllByText("March 2024").length).toBeGreaterThan(0);
    expect(screen.getAllByText("April 2024").length).toBeGreaterThan(0);
  });

  it("jumps two months back", () => {
    renderPicker();
    fireEvent.click(document.querySelectorAll(".date-picker-nav-button")[0]);
    expect(screen.getAllByText("November 2023").length).toBeGreaterThan(0);
    expect(screen.getAllByText("December 2023").length).toBeGreaterThan(0);
  });
});

describe("clicking out a range", () => {
  it("opens a new range on the first click and leaves it unfinished", () => {
    renderPicker();
    clickDay(0, "20");

    expect(rangeText()).toEqual(["Jan 20, 2024", "End Date"]);
    expect(applyButton().disabled).toBe(true);
  });

  it("closes the range on the second click", () => {
    renderPicker();
    clickDay(0, "20");
    clickDay(0, "25");

    expect(rangeText()).toEqual(["Jan 20, 2024", "Jan 25, 2024"]);
    expect(applyButton().disabled).toBe(false);
  });

  it("swaps the ends when the second click lands earlier", () => {
    renderPicker();
    clickDay(0, "20");
    clickDay(0, "10");

    expect(rangeText()).toEqual(["Jan 10, 2024", "Jan 20, 2024"]);
  });

  it("throws a finished range away and starts again", () => {
    renderPicker();
    clickDay(0, "20");
    clickDay(0, "25");
    clickDay(0, "3");

    expect(rangeText()).toEqual(["Jan 3, 2024", "End Date"]);
    expect(applyButton().disabled).toBe(true);
  });

  it("reaches into the next month through its spill-over days", () => {
    renderPicker();
    const spill = monthGrid(0).querySelector(".date-picker-day-outside");
    fireEvent.click(spill);
    expect(rangeText()[0]).toBe("Feb 1, 2024");
  });

  it("ignores a click on a blank cell", () => {
    renderPicker();
    fireEvent.click(monthGrid(1).querySelector(".date-picker-day-empty"));
    expect(rangeText()).toEqual(["Jan 6, 2024", "Jan 13, 2024"]);
  });
});

describe("the shortcut list", () => {
  it("marks no shortcut active until one is picked", () => {
    renderPicker();
    expect(
      document.querySelector(".date-picker-quick-option-active")
    ).toBeNull();

    fireEvent.click(shortcut("This month"));
    expect(
      document.querySelector(".date-picker-quick-option-active").textContent
    ).toBe("This month");
  });

  it("collapses Today and Yesterday onto a single day", () => {
    renderPicker();
    fireEvent.click(shortcut("Today"));
    expect(rangeText()).toEqual([asLabel(today), asLabel(today)]);

    fireEvent.click(shortcut("Yesterday"));
    const y = subDays(today, 1);
    expect(rangeText()).toEqual([asLabel(y), asLabel(y)]);
  });

  it("spans seven days for This week", () => {
    renderPicker();
    fireEvent.click(shortcut("This week"));
    const start = startOfMonth(today);
    expect(rangeText()).toEqual([asLabel(start), asLabel(addDays(start, 6))]);
  });

  // Last week hands `end` a day EARLIER than `start`, so the range it produces
  // reads backwards and nothing in either grid can fall inside it.
  it("produces a backwards range for Last week", () => {
    renderPicker();
    fireEvent.click(shortcut("Last week"));
    const start = subDays(startOfMonth(today), 7);
    expect(rangeText()).toEqual([asLabel(start), asLabel(subDays(start, 1))]);
    expect(
      document.querySelectorAll(".date-picker-day-in-range")
    ).toHaveLength(0);
  });

  it("spans whole months for This month and Last month", () => {
    renderPicker();
    fireEvent.click(shortcut("This month"));
    expect(rangeText()).toEqual([
      asLabel(startOfMonth(today)),
      asLabel(endOfMonth(today)),
    ]);

    fireEvent.click(shortcut("Last month"));
    const prev = subMonths(today, 1);
    expect(rangeText()).toEqual([
      asLabel(startOfMonth(prev)),
      asLabel(endOfMonth(prev)),
    ]);
  });

  it("spans whole years for This year and Last year", () => {
    renderPicker();
    fireEvent.click(shortcut("This year"));
    const year = today.getFullYear();
    expect(rangeText()).toEqual([
      asLabel(new Date(year, 0, 1)),
      asLabel(new Date(year, 11, 31)),
    ]);

    fireEvent.click(shortcut("Last year"));
    expect(rangeText()).toEqual([
      asLabel(new Date(year - 1, 0, 1)),
      asLabel(new Date(year - 1, 11, 31)),
    ]);
  });

  it("reaches back to the millennium for All time", () => {
    renderPicker();
    fireEvent.click(shortcut("All time"));
    expect(rangeText()).toEqual([asLabel(new Date(2000, 0, 1)), asLabel(today)]);
    expect(screen.getAllByText("January 2000").length).toBeGreaterThan(0);
  });

  it("drops the active mark again once a day is clicked by hand", () => {
    renderPicker();
    fireEvent.click(shortcut("This month"));
    const day = monthGrid(0).querySelector(".date-picker-day-clickable");
    fireEvent.click(day);
    expect(
      document.querySelector(".date-picker-quick-option-active")
    ).toBeNull();
  });
});

describe("finishing", () => {
  it("hands the finished range back and closes", () => {
    const { onDateSelect, onClose } = renderPicker();
    fireEvent.click(applyButton());

    expect(onDateSelect).toHaveBeenCalledWith({
      start: new Date(2024, 0, 6),
      end: new Date(2024, 0, 13),
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("refuses to apply a range with only one end", () => {
    const { onDateSelect } = renderPicker();
    clickDay(0, "20");

    expect(applyButton().disabled).toBe(true);
    expect(onDateSelect).not.toHaveBeenCalled();
  });

  it("closes without choosing anything", () => {
    const { onDateSelect, onClose } = renderPicker();
    fireEvent.click(screen.getByText("Cancel"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onDateSelect).not.toHaveBeenCalled();
  });
});
