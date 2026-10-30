import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

/**
 * The calendar popover behind the table's date filter: one month at a time,
 * arrows to step through months, and a two-click range selection with Clear and
 * Apply underneath.
 *
 * The clock is pinned to mid-January 2026 so the grid is stable. That month
 * starts on a Thursday, which means three empty padding cells before the 1st
 * and one trailing cell from February -- the two cases the day renderer treats
 * differently -- so the helpers below address cells by position rather than by
 * the number printed in them, which is ambiguous across the month boundary.
 *
 * The second click of a range is deliberately made backwards in one test: the
 * component orders the pair itself rather than trusting the click order.
 */

import DateFilterDropdown from "../Components/Table/DateFilterModal";

const renderCalendar = (props = {}) =>
  render(
    <DateFilterDropdown
      isOpen
      onClose={vi.fn()}
      onDateRangeSelect={vi.fn()}
      {...props}
    />
  );

const cells = () => Array.from(document.body.querySelectorAll(".date-filter-day"));

// January 2026 begins on a Thursday, so three padding cells come first.
const PADDING = 3;
const january = (dayOfMonth) => cells()[PADDING + dayOfMonth - 1];

const monthLabel = () =>
  document.body.querySelector(".date-filter-month-label").textContent;

const apply = () => fireEvent.click(screen.getByText("Apply"));
const clear = () => fireEvent.click(screen.getByText("Clear"));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the calendar itself", () => {
  it("renders nothing while it is closed", () => {
    renderCalendar({ isOpen: false });
    expect(document.body.querySelector(".date-filter-dropdown")).toBeNull();
  });

  it("opens on the current month with a full seven-column grid", () => {
    renderCalendar();
    expect(monthLabel()).toBe("January 2026");
    expect(cells()).toHaveLength(35);
    expect(
      Array.from(document.body.querySelectorAll(".date-filter-day-header")).map(
        (d) => d.textContent
      )
    ).toEqual(["Mo", "Tu", "We", "Th", "Fr", "Sat", "Su"]);
  });

  it("pads the week before the first of the month with blanks", () => {
    renderCalendar();
    const padding = cells().slice(0, PADDING);
    padding.forEach((cell) => {
      expect(cell).toHaveClass("date-filter-day-empty");
      expect(cell.textContent).toBe("");
    });
    expect(january(1)).toHaveClass("date-filter-day-clickable");
    expect(january(1).textContent).toBe("1");
  });

  it("fills the last week out with days from the next month", () => {
    renderCalendar();
    const trailing = cells()[34];
    expect(trailing.textContent).toBe("1");
    expect(trailing).toHaveClass("date-filter-day-outside");
  });

  it("steps back a month and forward again", () => {
    renderCalendar();
    fireEvent.click(screen.getByText("<"));
    expect(monthLabel()).toBe("December 2025");

    fireEvent.click(screen.getByText(">"));
    fireEvent.click(screen.getByText(">"));
    expect(monthLabel()).toBe("February 2026");
  });

  it("crosses the year boundary in both directions", () => {
    renderCalendar();
    for (let i = 0; i < 12; i += 1) fireEvent.click(screen.getByText(">"));
    expect(monthLabel()).toBe("January 2027");
  });
});

describe("choosing a range", () => {
  it("marks the first click as both ends of the range", () => {
    renderCalendar();
    fireEvent.click(january(10));
    expect(january(10)).toHaveClass("date-filter-day-start-end");
    expect(document.body.querySelectorAll(".date-filter-day-in-range")).toHaveLength(0);
  });

  it("fills in everything between the two clicks", () => {
    renderCalendar();
    fireEvent.click(january(10));
    fireEvent.click(january(14));

    expect(january(10)).toHaveClass("date-filter-day-start-end");
    expect(january(14)).toHaveClass("date-filter-day-start-end");
    expect(january(12)).toHaveClass("date-filter-day-in-range");
    expect(january(9)).not.toHaveClass("date-filter-day-in-range");
    expect(january(15)).not.toHaveClass("date-filter-day-in-range");
  });

  it("puts a backwards pair the right way round", () => {
    const onDateRangeSelect = vi.fn();
    renderCalendar({ onDateRangeSelect });
    fireEvent.click(january(20));
    fireEvent.click(january(5));
    apply();

    const { start, end } = onDateRangeSelect.mock.calls[0][0];
    expect(start.getDate()).toBe(5);
    expect(end.getDate()).toBe(20);
    expect(january(12)).toHaveClass("date-filter-day-in-range");
  });

  it("starts a new range on the next click after a pair is complete", () => {
    renderCalendar();
    fireEvent.click(january(10));
    fireEvent.click(january(14));
    fireEvent.click(january(20));

    expect(january(20)).toHaveClass("date-filter-day-start-end");
    expect(january(12)).not.toHaveClass("date-filter-day-in-range");
  });

  it("ignores a click on a padding cell", () => {
    renderCalendar();
    fireEvent.click(cells()[0]);
    expect(document.body.querySelectorAll(".date-filter-day-start-end")).toHaveLength(0);
  });

  it("takes a day from the next month as an end point", () => {
    const onDateRangeSelect = vi.fn();
    renderCalendar({ onDateRangeSelect });
    fireEvent.click(january(30));
    fireEvent.click(cells()[34]);
    apply();

    const { end } = onDateRangeSelect.mock.calls[0][0];
    expect(end.getMonth()).toBe(1);
    expect(end.getDate()).toBe(1);
  });

  it("keeps the selection while the month is changed under it", () => {
    renderCalendar();
    fireEvent.click(january(10));
    fireEvent.click(january(14));
    fireEvent.click(screen.getByText(">"));
    expect(document.body.querySelectorAll(".date-filter-day-in-range")).toHaveLength(0);

    fireEvent.click(screen.getByText("<"));
    expect(january(12)).toHaveClass("date-filter-day-in-range");
  });

  it("gives a plain day the hover class rather than a range one", () => {
    renderCalendar();
    expect(january(10)).toHaveClass("date-filter-day-hover");
    fireEvent.click(january(10));
    expect(january(10)).not.toHaveClass("date-filter-day-hover");
  });
});

describe("applying and clearing", () => {
  it("reports the chosen range and closes", () => {
    const onDateRangeSelect = vi.fn();
    const onClose = vi.fn();
    renderCalendar({ onDateRangeSelect, onClose });
    fireEvent.click(january(3));
    fireEvent.click(january(9));
    apply();

    const { start, end } = onDateRangeSelect.mock.calls[0][0];
    expect(start.getDate()).toBe(3);
    expect(end.getDate()).toBe(9);
    expect(onClose).toHaveBeenCalled();
  });

  it("applies a single day as a range of one", () => {
    const onDateRangeSelect = vi.fn();
    renderCalendar({ onDateRangeSelect });
    fireEvent.click(january(7));
    apply();

    const { start, end } = onDateRangeSelect.mock.calls[0][0];
    expect(start.getDate()).toBe(7);
    expect(end.getDate()).toBe(7);
  });

  it("does nothing at all when Apply is pressed with no range", () => {
    const onDateRangeSelect = vi.fn();
    const onClose = vi.fn();
    renderCalendar({ onDateRangeSelect, onClose });
    apply();

    expect(onDateRangeSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("empties the range, tells the table so, and closes", () => {
    const onDateRangeSelect = vi.fn();
    const onClose = vi.fn();
    renderCalendar({ onDateRangeSelect, onClose });
    fireEvent.click(january(3));
    fireEvent.click(january(9));
    clear();

    expect(onDateRangeSelect).toHaveBeenCalledWith(null);
    expect(onClose).toHaveBeenCalled();
    expect(document.body.querySelectorAll(".date-filter-day-start-end")).toHaveLength(0);
  });

  it("clears just as happily when nothing was chosen", () => {
    const onDateRangeSelect = vi.fn();
    renderCalendar({ onDateRangeSelect });
    clear();
    expect(onDateRangeSelect).toHaveBeenCalledWith(null);
  });

  it("forgets a half-finished selection when it is cleared", () => {
    renderCalendar();
    fireEvent.click(january(10));
    clear();
    fireEvent.click(january(20));
    // The pending start was dropped, so this click starts a range of its own
    // rather than closing the earlier one.
    expect(january(20)).toHaveClass("date-filter-day-start-end");
    expect(january(15)).not.toHaveClass("date-filter-day-in-range");
  });
});
