import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import DateFilterDropdown from "../Components/Table/DateFilterModal";

/**
 * The table toolbar's date range dropdown: a single-month calendar drawn by
 * hand out of date-fns, where the first click plants a provisional start and
 * the second closes the range, and a footer that either hands the range up or
 * clears it.
 *
 * The whole grid is built from the month under `currentMonth`, so the tests
 * freeze the clock at 15 February 2024. That month is chosen deliberately:
 * 1 February 2024 is a Thursday, which leaves three leading padding cells with
 * no day behind them, and the 29 days then need three days of March to fill
 * the last row -- so both the "empty" and the "outside the month" arms of the
 * class expression are reachable in one render. `dayCell` below encodes that
 * layout: February's Nth is at index N + 2.
 *
 * The cells are plain divs with no role or accessible name, so they are
 * addressed positionally rather than through Testing Library queries, and the
 * component's state is observed through the class names it writes.
 */

const renderDropdown = (props = {}) => {
  const onClose = vi.fn();
  const onDateRangeSelect = vi.fn();
  const view = render(
    <DateFilterDropdown
      isOpen
      onClose={onClose}
      onDateRangeSelect={onDateRangeSelect}
      {...props}
    />
  );
  return { ...view, onClose, onDateRangeSelect };
};

const cells = () => Array.from(document.body.querySelectorAll(".date-filter-day"));

// February 2024 starts on a Thursday, so three null pads precede the 1st.
const dayCell = (dayOfMonth) => cells()[dayOfMonth + 2];
const outsideCell = (marchDay) => cells()[31 + marchDay];

const monthLabel = () => document.body.querySelector(".date-filter-month-label").textContent;
const navButtons = () => Array.from(document.body.querySelectorAll(".date-filter-nav-button"));
const apply = () => screen.getByRole("button", { name: "Apply" });
const clear = () => screen.getByRole("button", { name: "Clear" });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2024, 1, 15, 9, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the dropdown shell", () => {
  it("renders nothing at all while closed", () => {
    renderDropdown({ isOpen: false });
    expect(document.body.querySelector(".date-filter-dropdown")).toBeNull();
  });

  it("opens on the month containing today", () => {
    renderDropdown();
    expect(monthLabel()).toBe("February 2024");
  });

  it("steps back a month", () => {
    renderDropdown();
    fireEvent.click(navButtons()[0]);
    expect(monthLabel()).toBe("January 2024");
  });

  it("steps forward a month", () => {
    renderDropdown();
    fireEvent.click(navButtons()[1]);
    expect(monthLabel()).toBe("March 2024");
  });

  it("steps forward across a year boundary", () => {
    renderDropdown();
    for (let i = 0; i < 11; i += 1) fireEvent.click(navButtons()[1]);
    expect(monthLabel()).toBe("January 2025");
  });
});

describe("the month grid", () => {
  it("heads the grid with the seven weekday initials", () => {
    renderDropdown();
    const headers = Array.from(
      document.body.querySelectorAll(".date-filter-day-header")
    ).map((h) => h.textContent);
    expect(headers).toEqual(["Mo", "Tu", "We", "Th", "Fr", "Sat", "Su"]);
  });

  it("pads the first row with blank cells and fills the last with next month", () => {
    renderDropdown();
    // Three pads, 29 days of February, three days of March: five full weeks.
    expect(cells()).toHaveLength(35);
    expect(cells()[0]).toHaveClass("date-filter-day-empty");
    expect(cells()[0]).toHaveTextContent("");
    expect(cells()[2]).toHaveClass("date-filter-day-empty");
    expect(dayCell(1)).toHaveTextContent("1");
    expect(dayCell(29)).toHaveTextContent("29");
  });

  it("marks the trailing days as belonging to another month", () => {
    renderDropdown();
    expect(outsideCell(1)).toHaveTextContent("1");
    expect(outsideCell(1)).toHaveClass("date-filter-day-outside");
    expect(outsideCell(3)).toHaveClass("date-filter-day-outside");
    // A day of the month on show is offered for hover instead.
    expect(dayCell(10)).toHaveClass("date-filter-day-hover");
  });

  it("ignores a click on a padding cell", () => {
    const { onDateRangeSelect, onClose } = renderDropdown();
    fireEvent.click(cells()[0]);
    fireEvent.click(apply());
    expect(onDateRangeSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("picking a range", () => {
  it("treats the first click as a one-day range", () => {
    renderDropdown();
    fireEvent.click(dayCell(5));
    expect(dayCell(5)).toHaveClass("date-filter-day-start-end");
    expect(dayCell(6)).not.toHaveClass("date-filter-day-in-range");
  });

  it("closes the range on the second click and shades the days between", () => {
    renderDropdown();
    fireEvent.click(dayCell(5));
    fireEvent.click(dayCell(9));
    expect(dayCell(5)).toHaveClass("date-filter-day-start-end");
    expect(dayCell(9)).toHaveClass("date-filter-day-start-end");
    expect(dayCell(7)).toHaveClass("date-filter-day-in-range");
    // The endpoints are in the interval too, but they keep the endpoint class.
    expect(dayCell(5)).not.toHaveClass("date-filter-day-in-range");
    expect(dayCell(9)).not.toHaveClass("date-filter-day-in-range");
    expect(dayCell(12)).not.toHaveClass("date-filter-day-in-range");
  });

  it("puts the earlier day first when the range is drawn backwards", () => {
    const { onDateRangeSelect } = renderDropdown();
    fireEvent.click(dayCell(20));
    fireEvent.click(dayCell(4));
    fireEvent.click(apply());
    const range = onDateRangeSelect.mock.calls[0][0];
    expect(range.start.getDate()).toBe(4);
    expect(range.end.getDate()).toBe(20);
  });

  it("accepts the same day twice as a single-day range", () => {
    const { onDateRangeSelect } = renderDropdown();
    fireEvent.click(dayCell(11));
    fireEvent.click(dayCell(11));
    fireEvent.click(apply());
    const range = onDateRangeSelect.mock.calls[0][0];
    expect(range.start.getDate()).toBe(11);
    expect(range.end.getDate()).toBe(11);
  });

  it("starts a fresh range once a complete one has been drawn", () => {
    renderDropdown();
    fireEvent.click(dayCell(5));
    fireEvent.click(dayCell(9));
    fireEvent.click(dayCell(20));
    expect(dayCell(20)).toHaveClass("date-filter-day-start-end");
    expect(dayCell(7)).not.toHaveClass("date-filter-day-in-range");
  });

  it("lets a trailing next-month day close the range", () => {
    const { onDateRangeSelect } = renderDropdown();
    fireEvent.click(dayCell(27));
    fireEvent.click(outsideCell(2));
    // Being selected outranks being outside the month on show.
    expect(outsideCell(2)).toHaveClass("date-filter-day-start-end");
    fireEvent.click(apply());
    const range = onDateRangeSelect.mock.calls[0][0];
    expect(range.end.getMonth()).toBe(2);
    expect(range.end.getDate()).toBe(2);
  });

  it("keeps a range drawn in one month highlighted when the month is changed", () => {
    renderDropdown();
    fireEvent.click(dayCell(5));
    fireEvent.click(dayCell(9));
    fireEvent.click(navButtons()[1]);
    expect(monthLabel()).toBe("March 2024");
    // None of March falls inside 5-9 February, so nothing is shaded there.
    expect(
      document.body.querySelectorAll(".date-filter-day-in-range")
    ).toHaveLength(0);
  });
});

describe("the footer", () => {
  it("hands the finished range up and closes", () => {
    const { onDateRangeSelect, onClose } = renderDropdown();
    fireEvent.click(dayCell(3));
    fireEvent.click(dayCell(8));
    fireEvent.click(apply());
    expect(onDateRangeSelect).toHaveBeenCalledTimes(1);
    const range = onDateRangeSelect.mock.calls[0][0];
    expect(range.start.getDate()).toBe(3);
    expect(range.end.getDate()).toBe(8);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does nothing on Apply when no day has been picked", () => {
    const { onDateRangeSelect, onClose } = renderDropdown();
    fireEvent.click(apply());
    expect(onDateRangeSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("reports null and closes on Clear", () => {
    const { onDateRangeSelect, onClose } = renderDropdown();
    fireEvent.click(dayCell(5));
    fireEvent.click(dayCell(9));
    fireEvent.click(clear());
    expect(onDateRangeSelect).toHaveBeenCalledWith(null);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("drops the highlighting when the range is cleared", () => {
    renderDropdown();
    fireEvent.click(dayCell(5));
    fireEvent.click(dayCell(9));
    fireEvent.click(clear());
    expect(dayCell(5)).not.toHaveClass("date-filter-day-start-end");
    expect(dayCell(7)).not.toHaveClass("date-filter-day-in-range");
  });

  it("forgets a half-drawn range on Clear so the next click starts over", () => {
    const { onDateRangeSelect } = renderDropdown();
    fireEvent.click(dayCell(20));
    fireEvent.click(clear());
    fireEvent.click(dayCell(6));
    expect(dayCell(6)).toHaveClass("date-filter-day-start-end");
    expect(dayCell(20)).not.toHaveClass("date-filter-day-start-end");
    fireEvent.click(apply());
    const range = onDateRangeSelect.mock.calls[1][0];
    expect(range.start.getDate()).toBe(6);
    expect(range.end.getDate()).toBe(6);
  });
});
