import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

/**
 * The two-click range calendar behind the table's date filters: first click
 * pins a start, second click closes the range, a third starts over, and hovering
 * between the first and second paints a provisional range that flips direction
 * if the pointer is to the left of the start.
 *
 * The grid always opens on the current month, and the number of leading blanks
 * and trailing next-month days depends entirely on which month that is, so the
 * clock is pinned to March 2026 -- a month that starts on a Sunday and therefore
 * renders six leading blanks and five trailing April days, making both the
 * "empty" and "outside the month" cells reachable by construction.
 *
 * Cells carry their state only as a class name, so the assertions read the class
 * of a cell rather than any text.
 */

import DateFilterDropdown from '../Components/Table/DateFilterModal';

const props = () => ({
  isOpen: true,
  onClose: vi.fn(),
  onDateRangeSelect: vi.fn(),
  onDateChange: vi.fn(),
});

const cells = () => Array.from(document.body.querySelectorAll('.date-filter-day'));
// A day number appears twice in March 2026 -- once for March, once for the
// April days padding the last row -- so in-month lookups exclude the padding.
const day = (n) =>
  cells().find(
    (c) => c.textContent === String(n) && !c.className.includes('date-filter-day-outside')
  );
const classOf = (n) => day(n).className;
const outsideCells = () =>
  cells().filter((c) => c.className.includes('date-filter-day-outside'));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 2, 15, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('rendering', () => {
  it('renders nothing while closed', () => {
    render(<DateFilterDropdown {...props()} isOpen={false} />);
    expect(document.body.querySelector('.date-filter-dropdown')).toBeNull();
  });

  it('opens on the current month', () => {
    render(<DateFilterDropdown {...props()} />);
    expect(screen.getByText('March 2026')).toBeInTheDocument();
  });

  it('labels the week starting on Monday', () => {
    render(<DateFilterDropdown {...props()} />);
    const headers = Array.from(
      document.body.querySelectorAll('.date-filter-day-header')
    ).map((h) => h.textContent);
    expect(headers).toEqual(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']);
  });

  it('pads the first week with blanks up to the first of the month', () => {
    render(<DateFilterDropdown {...props()} />);
    // 1 March 2026 is a Sunday, so Monday through Saturday are blank.
    expect(document.body.querySelectorAll('.date-filter-day-empty')).toHaveLength(6);
  });

  it('fills the last week with the days that follow the month', () => {
    render(<DateFilterDropdown {...props()} />);
    expect(outsideCells().map((c) => c.textContent)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('draws every day of the month', () => {
    render(<DateFilterDropdown {...props()} />);
    expect(day(31)).toBeTruthy();
    expect(classOf(15)).toContain('date-filter-day-normal');
  });
});

describe('moving between months', () => {
  it('steps back a month', () => {
    render(<DateFilterDropdown {...props()} />);
    fireEvent.click(screen.getByText('<'));
    expect(screen.getByText('February 2026')).toBeInTheDocument();
  });

  it('steps forward a month', () => {
    render(<DateFilterDropdown {...props()} />);
    fireEvent.click(screen.getByText('>'));
    expect(screen.getByText('April 2026')).toBeInTheDocument();
  });

  it('crosses a year boundary going back', () => {
    render(<DateFilterDropdown {...props()} />);
    for (let i = 0; i < 3; i += 1) fireEvent.click(screen.getByText('<'));
    expect(screen.getByText('December 2025')).toBeInTheDocument();
  });
});

describe('picking a range', () => {
  it('treats the first click as a single selected day', () => {
    const p = props();
    render(<DateFilterDropdown {...p} />);
    fireEvent.click(day(10));
    expect(classOf(10)).toContain('date-filter-day-single');
    const [range] = p.onDateChange.mock.calls[0];
    expect(range.start).toEqual(range.end);
  });

  it('closes the range on the second click and marks the days between', () => {
    const p = props();
    render(<DateFilterDropdown {...p} />);
    fireEvent.click(day(10));
    fireEvent.click(day(20));
    expect(classOf(10)).toContain('date-filter-day-start');
    expect(classOf(20)).toContain('date-filter-day-end');
    expect(classOf(15)).toContain('date-filter-day-in-range');
    const [range] = p.onDateChange.mock.calls.at(-1);
    expect(range.start.getDate()).toBe(10);
    expect(range.end.getDate()).toBe(20);
  });

  it('puts a backwards second click the right way round', () => {
    const p = props();
    render(<DateFilterDropdown {...p} />);
    fireEvent.click(day(20));
    fireEvent.click(day(10));
    const [range] = p.onDateChange.mock.calls.at(-1);
    expect(range.start.getDate()).toBe(10);
    expect(range.end.getDate()).toBe(20);
    expect(classOf(10)).toContain('date-filter-day-start');
    expect(classOf(20)).toContain('date-filter-day-end');
  });

  it('starts a fresh range on the third click', () => {
    const p = props();
    render(<DateFilterDropdown {...p} />);
    fireEvent.click(day(10));
    fireEvent.click(day(20));
    fireEvent.click(day(5));
    expect(classOf(5)).toContain('date-filter-day-single');
    expect(classOf(15)).not.toContain('date-filter-day-in-range');
    const [range] = p.onDateChange.mock.calls.at(-1);
    expect(range.start).toEqual(range.end);
  });

  it('selects a day from the following month shown in the last row', () => {
    const p = props();
    render(<DateFilterDropdown {...p} />);
    fireEvent.click(outsideCells()[0]);
    const [range] = p.onDateChange.mock.calls[0];
    expect(range.start.getMonth()).toBe(3);
  });

  it('ignores a click on a blank leading cell', () => {
    const p = props();
    render(<DateFilterDropdown {...p} />);
    fireEvent.click(document.body.querySelector('.date-filter-day-empty'));
    expect(p.onDateChange).not.toHaveBeenCalled();
  });

  it('works for a caller that wants no preview callback', () => {
    const p = props();
    render(<DateFilterDropdown {...p} onDateChange={undefined} />);
    fireEvent.click(day(10));
    expect(classOf(10)).toContain('date-filter-day-single');
  });
});

describe('the hover preview', () => {
  it('paints a provisional range towards the pointer', () => {
    render(<DateFilterDropdown {...props()} />);
    fireEvent.click(day(10));
    fireEvent.mouseEnter(day(18));
    expect(classOf(14)).toContain('date-filter-day-in-range');
    expect(classOf(18)).toContain('date-filter-day-end');
  });

  it('paints backwards when the pointer is before the start', () => {
    render(<DateFilterDropdown {...props()} />);
    fireEvent.click(day(20));
    fireEvent.mouseEnter(day(12));
    expect(classOf(16)).toContain('date-filter-day-in-range');
    // The swapped preview puts the hovered day at the *start* of the range, and
    // only the range's end is given the cap class, so the day under the pointer
    // is left looking untouched.
    expect(classOf(12)).toContain('date-filter-day-normal');
  });

  it('drops the preview when the pointer leaves', () => {
    render(<DateFilterDropdown {...props()} />);
    fireEvent.click(day(10));
    fireEvent.mouseEnter(day(18));
    fireEvent.mouseLeave(day(18));
    expect(classOf(14)).not.toContain('date-filter-day-in-range');
  });

  it('previews nothing before a start has been picked', () => {
    render(<DateFilterDropdown {...props()} />);
    fireEvent.mouseEnter(day(18));
    expect(classOf(14)).toContain('date-filter-day-normal');
  });

  it('previews nothing once the range is closed', () => {
    render(<DateFilterDropdown {...props()} />);
    fireEvent.click(day(10));
    fireEvent.click(day(12));
    fireEvent.mouseEnter(day(25));
    expect(classOf(20)).not.toContain('date-filter-day-in-range');
  });
});

describe('applying the range', () => {
  const applyButton = () => screen.getByText('Apply').closest('button');

  it('cannot be applied until a day is picked', () => {
    const p = props();
    render(<DateFilterDropdown {...p} />);
    expect(applyButton()).toBeDisabled();
    expect(p.onDateRangeSelect).not.toHaveBeenCalled();
  });

  it('hands the chosen range to the table and closes', () => {
    const p = props();
    render(<DateFilterDropdown {...p} />);
    fireEvent.click(day(10));
    fireEvent.click(day(20));
    fireEvent.click(applyButton());
    const [range] = p.onDateRangeSelect.mock.calls[0];
    expect(range.start.getDate()).toBe(10);
    expect(range.end.getDate()).toBe(20);
    expect(p.onClose).toHaveBeenCalled();
  });

  it('applies a single day as a range of one', () => {
    const p = props();
    render(<DateFilterDropdown {...p} />);
    fireEvent.click(day(7));
    fireEvent.click(applyButton());
    const [range] = p.onDateRangeSelect.mock.calls[0];
    expect(range.start).toEqual(range.end);
  });

  it('closes without selecting anything from Cancel', () => {
    const p = props();
    render(<DateFilterDropdown {...p} />);
    fireEvent.click(day(10));
    fireEvent.click(screen.getByText('Cancel'));
    expect(p.onClose).toHaveBeenCalled();
    expect(p.onDateRangeSelect).not.toHaveBeenCalled();
  });
});
