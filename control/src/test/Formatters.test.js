import { describe, it, expect } from 'vitest';

import {
  formatDate,
  formatDatePadded,
  formatDateShortMonth,
  formatDateTime,
  formatDateTimeParenthesized,
  formatDateMonthYear,
  formatTime,
} from '../Helper/Formatters';

/**
 * Date and time formatting.
 *
 * Each takes an untrusted string off the API, and each has its own placeholder
 * for a value it cannot use -- "N/A", "—", or "Invalid date" depending on where
 * it renders. Those differences are deliberate, so they are pinned here rather
 * than smoothed over.
 */

const DATE = '2026-01-05T14:30:00Z';

describe('formatDate', () => {
  it('renders a readable date', () => {
    expect(formatDate(DATE)).toMatch(/2026/);
  });

  it('reports a missing date as N/A', () => {
    expect(formatDate('')).toBe('N/A');
    expect(formatDate(null)).toBe('N/A');
  });

  it('reports one it cannot parse', () => {
    expect(formatDate('nonsense')).toBe('Invalid date');
  });
});

describe('formatDatePadded', () => {
  it('renders a zero-padded date', () => {
    expect(formatDatePadded(DATE)).toMatch(/\d/);
  });

  it('reports a missing date as N/A', () => {
    expect(formatDatePadded('')).toBe('N/A');
  });

  it('handles one it cannot parse', () => {
    expect(() => formatDatePadded('nonsense')).not.toThrow();
  });
});

describe('formatDateShortMonth', () => {
  it('renders a short month', () => {
    expect(formatDateShortMonth(DATE)).toMatch(/Jan/);
  });

  it('handles a missing or unparseable date', () => {
    expect(() => formatDateShortMonth('')).not.toThrow();
    expect(() => formatDateShortMonth('nonsense')).not.toThrow();
  });
});

describe('formatDateTime', () => {
  it('renders a date and a time together', () => {
    expect(formatDateTime(DATE)).toMatch(/2026/);
  });

  it('uses a dash for a missing value', () => {
    expect(formatDateTime('')).toBe('—');
    expect(formatDateTime(null)).toBe('—');
  });

  it('reports one it cannot parse', () => {
    expect(formatDateTime('nonsense')).toBe('Invalid date');
  });
});

describe('formatDateTimeParenthesized', () => {
  it('renders a date with the time in brackets', () => {
    expect(formatDateTimeParenthesized(DATE)).toMatch(/\(/);
  });

  it('passes an existing N/A straight through', () => {
    expect(formatDateTimeParenthesized('N/A')).toBe('N/A');
  });

  it('uses N/A for a missing or unparseable value', () => {
    expect(formatDateTimeParenthesized('')).toBe('N/A');
    expect(formatDateTimeParenthesized(null)).toBe('N/A');
    expect(formatDateTimeParenthesized('nonsense')).toBe('N/A');
  });
});

describe('formatDateMonthYear', () => {
  it('renders a month and a year', () => {
    expect(formatDateMonthYear(DATE)).toMatch(/2026/);
  });

  it('uses a dash for a missing or unparseable value', () => {
    expect(formatDateMonthYear('')).toBe('—');
    expect(formatDateMonthYear(null)).toBe('—');
    expect(formatDateMonthYear('nonsense')).toBe('—');
  });
});

describe('formatTime', () => {
  it('renders a time out of a timestamp', () => {
    expect(formatTime(DATE)).toMatch(/\d/);
  });

  it('uses N/A for a missing value', () => {
    expect(formatTime('')).toBe('N/A');
    expect(formatTime(null)).toBe('N/A');
  });

  it('reports one it cannot parse', () => {
    expect(formatTime('nonsense')).toBe('Invalid time');
  });
});
