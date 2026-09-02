import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import TableFilterDateModal from '../Components/ReusableModal/TableFilterDateModal';

/**
 * The two-month range picker used by the table filters.
 *
 * It draws the current month and the next one, and collects a range in two
 * clicks: the first sets a provisional start, the second closes the range and
 * silently swaps the ends if the user picked backwards. A third click starts
 * over. Each grid is padded with nulls up to the first weekday and then filled
 * out of the following month, so a cell is either a real day, a dead pad cell,
 * or a real day belonging to the neighbouring month.
 *
 * The clock is pinned to mid-May 2024 throughout: that month starts on a
 * Wednesday and needs two trailing days from June to square off its grid, which
 * is what gives the tests a stable set of pad cells and outside days.
 */

const onClose = vi.fn();
const onApply = vi.fn();

const renderModal = (props = {}) =>
  render(
    <TableFilterDateModal isOpen onClose={onClose} onApply={onApply} {...props} />
  );

const column = (index) => document.body.querySelectorAll('.tfdm-cal-col')[index];
const monthLabel = (index) => column(index).querySelector('.tfdm-month-label').textContent;
const days = (index = 0) =>
  Array.from(column(index).querySelectorAll('.tfdm-day.tfdm-clickable'));

// The left grid ends with two days borrowed from June, so "1" and "2" appear
// twice; `last` reaches those trailing ones.
const day = (text, { index = 0, last = false } = {}) => {
  const matches = days(index).filter((d) => d.textContent === text);
  return last ? matches[matches.length - 1] : matches[0];
};

const boxes = () =>
  Array.from(document.body.querySelectorAll('.tfdm-date-input-box')).map(
    (b) => b.textContent
  );
const primary = () => document.body.querySelector('.primary-button');
const secondary = () => document.body.querySelector('.secondary-button');

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2024, 4, 15, 12));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('when it renders at all', () => {
  it('renders nothing while closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Filter by date')).not.toBeInTheDocument();
  });

  it('opens on this month and the next, with nothing chosen', () => {
    renderModal();
    expect(monthLabel(0)).toBe('May 2024');
    expect(monthLabel(1)).toBe('June 2024');
    expect(boxes()).toEqual(['Start date', 'End date']);
  });

  it('takes its title from the caller', () => {
    renderModal({ title: 'Filter invoices by date' });
    expect(screen.getByText('Filter invoices by date')).toBeInTheDocument();
  });

  it('pads the start of the grid with dead cells', () => {
    // May 2024 opens on a Wednesday, so Monday and Tuesday are blanks.
    renderModal();
    expect(column(0).querySelectorAll('.tfdm-empty')).toHaveLength(2);
  });

  it('fills the end of the grid out of the following month', () => {
    renderModal();
    const outside = column(0).querySelectorAll('.tfdm-outside');
    expect(outside).toHaveLength(2);
    expect(Array.from(outside).map((d) => d.textContent)).toEqual(['1', '2']);
  });

  it('needs nothing borrowed for a month that squares off on its own', () => {
    renderModal();
    expect(column(1).querySelectorAll('.tfdm-outside')).toHaveLength(0);
  });
});

describe('moving between months', () => {
  it('steps back a month', () => {
    renderModal();
    fireEvent.click(screen.getByText('<'));
    expect(monthLabel(0)).toBe('April 2024');
    expect(monthLabel(1)).toBe('May 2024');
  });

  it('steps forward a month', () => {
    renderModal();
    fireEvent.click(screen.getByText('>'));
    expect(monthLabel(0)).toBe('June 2024');
    expect(monthLabel(1)).toBe('July 2024');
  });

  it('only offers navigation on the left calendar', () => {
    renderModal();
    expect(column(1).querySelectorAll('.tfdm-nav-btn')).toHaveLength(0);
  });
});

describe('picking a range', () => {
  it('takes the first click as the start', () => {
    renderModal();
    fireEvent.click(day('10'));
    expect(boxes()).toEqual(['May 10, 2024', 'End date']);
  });

  it('takes the second click as the end', () => {
    renderModal();
    fireEvent.click(day('10'));
    fireEvent.click(day('20'));
    expect(boxes()).toEqual(['May 10, 2024', 'May 20, 2024']);
  });

  it('swaps the ends when the range was picked backwards', () => {
    renderModal();
    fireEvent.click(day('20'));
    fireEvent.click(day('10'));
    expect(boxes()).toEqual(['May 10, 2024', 'May 20, 2024']);
  });

  it('accepts a single-day range', () => {
    renderModal();
    fireEvent.click(day('10'));
    fireEvent.click(day('10'));
    expect(boxes()).toEqual(['May 10, 2024', 'May 10, 2024']);
  });

  it('starts a fresh range on the third click', () => {
    renderModal();
    fireEvent.click(day('10'));
    fireEvent.click(day('20'));
    fireEvent.click(day('25'));
    expect(boxes()).toEqual(['May 25, 2024', 'End date']);
  });

  it('reaches across into the next month', () => {
    renderModal();
    fireEvent.click(day('28'));
    fireEvent.click(day('5', { index: 1 }));
    expect(boxes()).toEqual(['May 28, 2024', 'Jun 5, 2024']);
  });

  it('treats a borrowed day as the month it really belongs to', () => {
    renderModal();
    fireEvent.click(day('1', { last: true }));
    expect(boxes()).toEqual(['Jun 1, 2024', 'End date']);
  });

  it('ignores a click on a dead pad cell', () => {
    renderModal();
    fireEvent.click(column(0).querySelector('.tfdm-empty'));
    expect(boxes()).toEqual(['Start date', 'End date']);
  });
});

describe('how the chosen range is drawn', () => {
  it('marks the start on its own before an end is picked', () => {
    renderModal();
    fireEvent.click(day('10'));
    expect(day('10')).toHaveClass('tfdm-endpoint');
    expect(column(0).querySelectorAll('.tfdm-in-range')).toHaveLength(0);
  });

  it('marks both ends and everything between them', () => {
    renderModal();
    fireEvent.click(day('10'));
    fireEvent.click(day('14'));

    expect(day('10')).toHaveClass('tfdm-endpoint');
    expect(day('14')).toHaveClass('tfdm-endpoint');
    // The three days strictly inside 10..14.
    expect(column(0).querySelectorAll('.tfdm-in-range')).toHaveLength(3);
    expect(day('12')).toHaveClass('tfdm-in-range');
  });

  it('shades the same range on the second calendar', () => {
    renderModal();
    fireEvent.click(day('30'));
    fireEvent.click(day('3', { index: 1 }));
    expect(day('1', { index: 1 })).toHaveClass('tfdm-in-range');
    expect(day('3', { index: 1 })).toHaveClass('tfdm-endpoint');
  });
});

describe('applying the filter', () => {
  it('hands the range back and closes', () => {
    renderModal();
    fireEvent.click(day('10'));
    fireEvent.click(day('20'));
    fireEvent.click(primary());

    expect(onApply).toHaveBeenCalledTimes(1);
    const [range] = onApply.mock.calls[0];
    expect(range.start.getDate()).toBe(10);
    expect(range.end.getDate()).toBe(20);
    expect(onClose).toHaveBeenCalled();
  });

  it('applies a half-finished range with no end at all', () => {
    renderModal();
    fireEvent.click(day('10'));
    fireEvent.click(primary());

    expect(onApply).toHaveBeenCalledWith({ start: expect.any(Date), end: null });
    expect(onClose).toHaveBeenCalled();
  });

  it('does nothing at all when no day was picked', () => {
    renderModal();
    fireEvent.click(primary());
    expect(onApply).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('cancelling', () => {
  it('closes without applying anything', () => {
    renderModal();
    fireEvent.click(day('10'));
    fireEvent.click(secondary());

    expect(onApply).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('forgets the range so the next opening starts clean', () => {
    renderModal();
    fireEvent.click(day('10'));
    fireEvent.click(day('20'));
    fireEvent.click(secondary());

    expect(boxes()).toEqual(['Start date', 'End date']);
  });

  it('forgets that it was mid-range, so the next click is a fresh start', () => {
    renderModal();
    fireEvent.click(day('20'));
    fireEvent.click(secondary());
    fireEvent.click(day('10'));

    expect(boxes()).toEqual(['May 10, 2024', 'End date']);
  });

  it('keeps the month it was left on', () => {
    // Only the range is reset on close; the calendar stays where it was.
    renderModal();
    fireEvent.click(screen.getByText('>'));
    fireEvent.click(secondary());
    expect(monthLabel(0)).toBe('June 2024');
  });
});
