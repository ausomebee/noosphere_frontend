import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../Components/Table/DateFilterModal', () => ({
  default: (props) =>
    props.isOpen ? <div data-testid="date-dropdown" /> : null,
}));

import TableHeader from '../Components/Table/TableHeader';

/**
 * The shared table's search-and-filter bar.
 *
 * It is a two-stage filter: the first select picks which column to filter, and
 * what appears beside it depends on that choice — a date range for a date
 * column, a value select for anything else, and nothing at all when the parent
 * has taken over with `onFilterTypeSelect` (which routes the choice into a
 * modal instead).
 *
 * The date inputs read from two sources in turn: `liveRange`, which the picker
 * updates as the user drags, and `filterValues`, which holds what was actually
 * applied. The second is only reached once the picker has closed, so both are
 * covered separately.
 */

const noop = () => {};

const baseProps = () => ({
  searchTerm: '',
  setSearchTerm: vi.fn(),
  filters: [
    {
      key: 'filter_type',
      options: [
        { value: '', label: 'Filters' },
        { value: 'status', label: 'Status' },
        { value: 'created_at', label: 'Date created' },
        { value: 'clear_filters', label: 'Clear Filters' },
      ],
    },
  ],
  filterValues: {},
  handleFilterValueChange: vi.fn(),
  resetFilters: vi.fn(),
  currentDateFilterKey: null,
  setCurrentDateFilterKey: vi.fn(),
  isDateFilterDropdownOpen: false,
  setIsDateFilterDropdownOpen: vi.fn(),
  handleDateRangeSelect: noop,
  liveRange: undefined,
  onDatePreview: noop,
  dateFilterKeys: ['created_at'],
  uniqueFilterValues: { status: ['Active', 'Paused'] },
  onFilterTypeSelect: undefined,
  toggleExportDropdown: vi.fn(),
  exportDropdownOpen: false,
  handleExportCSV: vi.fn(),
  handleExportPDF: vi.fn(),
  handlePrint: vi.fn(),
  exportButtonRef: { current: null },
  exportDropdownRef: { current: null },
  dateFilterStartInputRef: { current: null },
  dateFilterEndInputRef: { current: null },
  dateFilterDropdownRef: { current: null },
});

const renderHeader = (over = {}) => {
  const props = { ...baseProps(), ...over };
  return { ...render(<TableHeader {...props} />), props };
};

const typeSelect = () => document.body.querySelector('.table-filter-select');
const valueSelect = () => document.body.querySelector('.filter-value-select');
const startInput = () => document.body.querySelector('.date-filter-input-start');
const endInput = () =>
  document.body.querySelectorAll('.date-filter-input')[1];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the search box', () => {
  it('reports what is typed to the parent', () => {
    const { props } = renderHeader();
    fireEvent.change(screen.getByPlaceholderText('Search...'), {
      target: { value: 'acme' },
    });
    expect(props.setSearchTerm).toHaveBeenCalledWith('acme');
  });

  it('shows the term the parent is holding', () => {
    renderHeader({ searchTerm: 'acme' });
    expect(screen.getByPlaceholderText('Search...').value).toBe('acme');
  });
});

describe('choosing which column to filter', () => {
  it('clears everything when the choice is emptied', () => {
    const { props } = renderHeader({ filterValues: { filter_type: 'status' } });
    fireEvent.change(typeSelect(), { target: { value: '' } });
    expect(props.resetFilters).toHaveBeenCalled();
    expect(props.handleFilterValueChange).not.toHaveBeenCalled();
  });

  it('clears everything when the clear entry is chosen', () => {
    const { props } = renderHeader();
    fireEvent.change(typeSelect(), { target: { value: 'clear_filters' } });
    expect(props.resetFilters).toHaveBeenCalled();
  });

  it('reports an ordinary column to the parent', () => {
    const { props } = renderHeader();
    fireEvent.change(typeSelect(), { target: { value: 'status' } });
    expect(props.handleFilterValueChange).toHaveBeenCalledWith('filter_type', 'status');
    expect(props.setCurrentDateFilterKey).not.toHaveBeenCalled();
  });

  it('also arms the date picker for a date column', () => {
    const { props } = renderHeader();
    fireEvent.change(typeSelect(), { target: { value: 'created_at' } });
    expect(props.handleFilterValueChange).toHaveBeenCalledWith('filter_type', 'created_at');
    expect(props.setCurrentDateFilterKey).toHaveBeenCalledWith('created_at');
  });

  it('hands an ordinary column to the parent modal when there is one', () => {
    const onFilterTypeSelect = vi.fn();
    const { props } = renderHeader({ onFilterTypeSelect });
    fireEvent.change(typeSelect(), { target: { value: 'status' } });
    expect(onFilterTypeSelect).toHaveBeenCalledWith('status');
    expect(props.resetFilters).toHaveBeenCalled();
    expect(props.handleFilterValueChange).not.toHaveBeenCalled();
  });

  it('keeps a date column for itself even when a parent modal exists', () => {
    const onFilterTypeSelect = vi.fn();
    const { props } = renderHeader({ onFilterTypeSelect });
    fireEvent.change(typeSelect(), { target: { value: 'created_at' } });
    expect(onFilterTypeSelect).not.toHaveBeenCalled();
    expect(props.setCurrentDateFilterKey).toHaveBeenCalledWith('created_at');
  });
});

describe('the value select', () => {
  it('offers every distinct value the column holds', () => {
    renderHeader({ filterValues: { filter_type: 'status' } });
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('offers nothing but its placeholder for a column with no distinct values', () => {
    renderHeader({
      filterValues: { filter_type: 'status' },
      uniqueFilterValues: {},
    });
    // `SelectInput` drops the built "Select Status" entry because its value is
    // empty, and substitutes its own placeholder, so one option is all that is
    // left.
    expect(valueSelect().querySelectorAll('option')).toHaveLength(1);
    expect(screen.queryByText('Select Status')).not.toBeInTheDocument();
  });

  it('builds a readable title for a snake-cased column', () => {
    renderHeader({
      filterValues: { filter_type: 'account_manager' },
      uniqueFilterValues: { account_manager: ['Ada'] },
    });
    // The title only reaches the option `SelectInput` throws away, so what is
    // observable is the values it kept.
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(valueSelect().querySelectorAll('option')).toHaveLength(2);
  });

  it('reports the value that was chosen', () => {
    const { props } = renderHeader({ filterValues: { filter_type: 'status' } });
    fireEvent.change(valueSelect(), { target: { value: 'Active' } });
    expect(props.handleFilterValueChange).toHaveBeenCalledWith('status', 'Active');
  });

  it('shows the value already applied', () => {
    renderHeader({ filterValues: { filter_type: 'status', status: 'Paused' } });
    expect(valueSelect().value).toBe('Paused');
  });

  it('is hidden entirely when the parent filters through a modal', () => {
    renderHeader({
      filterValues: { filter_type: 'status' },
      onFilterTypeSelect: vi.fn(),
    });
    expect(valueSelect()).toBeNull();
  });

  it('is hidden while no column is chosen', () => {
    renderHeader();
    expect(valueSelect()).toBeNull();
  });
});

describe('the date range inputs', () => {
  const asDateFilter = (over = {}) =>
    renderHeader({ filterValues: { filter_type: 'created_at' }, ...over });

  it('prompts for both ends before anything is picked', () => {
    asDateFilter();
    expect(startInput().value).toBe('Select start date');
    expect(endInput().value).toBe('Select end date');
  });

  it('shows the range the picker is previewing', () => {
    asDateFilter({
      liveRange: {
        created_at: {
          start: new Date('2026-03-01T00:00:00'),
          end: new Date('2026-03-31T00:00:00'),
        },
      },
    });
    expect(startInput().value).toBe('Mar 1, 2026');
    expect(endInput().value).toBe('Mar 31, 2026');
  });

  it('falls back to the range already applied once the picker has closed', () => {
    asDateFilter({
      liveRange: undefined,
      filterValues: {
        filter_type: 'created_at',
        created_at: {
          start: new Date('2026-01-05T00:00:00'),
          end: new Date('2026-01-20T00:00:00'),
        },
      },
    });
    expect(startInput().value).toBe('Jan 5, 2026');
    expect(endInput().value).toBe('Jan 20, 2026');
  });

  it('prefers the live preview over the applied range', () => {
    asDateFilter({
      liveRange: { created_at: { start: new Date('2026-06-01T00:00:00') } },
      filterValues: {
        filter_type: 'created_at',
        created_at: { start: new Date('2026-01-05T00:00:00') },
      },
    });
    expect(startInput().value).toBe('Jun 1, 2026');
  });

  it('opens the picker when either end is clicked', () => {
    const { props } = asDateFilter();
    fireEvent.click(startInput());
    expect(props.setCurrentDateFilterKey).toHaveBeenCalledWith('created_at');
    expect(props.setIsDateFilterDropdownOpen).toHaveBeenCalledWith(true);

    fireEvent.click(endInput());
    expect(props.setIsDateFilterDropdownOpen).toHaveBeenCalledTimes(2);
  });

  it('shows the picker only for the column it was armed on', () => {
    asDateFilter({ isDateFilterDropdownOpen: true, currentDateFilterKey: 'created_at' });
    expect(screen.getByTestId('date-dropdown')).toBeInTheDocument();
  });

  it('hides the picker when it was armed on a different column', () => {
    asDateFilter({ isDateFilterDropdownOpen: true, currentDateFilterKey: 'updated_at' });
    expect(screen.queryByTestId('date-dropdown')).not.toBeInTheDocument();
  });

  it('renders no date inputs for an ordinary column', () => {
    renderHeader({ filterValues: { filter_type: 'status' } });
    expect(startInput()).toBeNull();
  });
});

describe('the clear-all button', () => {
  it('is unreachable, because choosing the clear entry resets first', () => {
    // The type select intercepts `clear_filters` and calls `resetFilters()`
    // before the value can be stored, so `filterValues.filter_type` can never
    // hold it and this button can never render from the UI.
    const { props } = renderHeader();
    fireEvent.change(typeSelect(), { target: { value: 'clear_filters' } });
    expect(props.resetFilters).toHaveBeenCalled();
    expect(screen.queryByText('Clear All Filters')).not.toBeInTheDocument();
  });

  it('renders only if the parent forces that value into state', () => {
    renderHeader({ filterValues: { filter_type: 'clear_filters' } });
    expect(screen.getByText('Clear All Filters')).toBeInTheDocument();
  });

  it('clears everything when that forced button is pressed', () => {
    const { props } = renderHeader({ filterValues: { filter_type: 'clear_filters' } });
    fireEvent.click(screen.getByText('Clear All Filters'));
    expect(props.resetFilters).toHaveBeenCalled();
  });
});
