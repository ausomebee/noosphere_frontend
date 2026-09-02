import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { format } from 'date-fns';

/**
 * The arms of CustomTable that the main suite in CustomTable.test.jsx leaves
 * alone: the bulk-action bar, the two-stage filter bar (pick a column, then a
 * value or a date range), the row and export menus and where they are placed,
 * and the click-outside handling that closes them.
 *
 * The date range is the awkward part. The calendar always opens on the current
 * month, so the fixtures build their dates from *this* month rather than from a
 * fixed calendar date -- `dayOfMonth(12)` is the twelfth of whatever month the
 * suite runs in, which is what the rendered grid will be showing.
 *
 * jsdom reports every rectangle as zero, so the tests that care about placement
 * stub `getBoundingClientRect` on the specific element under test; that is the
 * only way to make the flip-upwards branch reachable.
 */

const exportTableData = vi.fn();
const exportTableToPDF = vi.fn();
const printTableData = vi.fn();
vi.mock('../utils/TableUtils', () => ({
  exportTableData: (...a) => exportTableData(...a),
  exportTableToPDF: (...a) => exportTableToPDF(...a),
  printTableData: (...a) => printTableData(...a),
}));

import CustomTable from '../Components/Table/CustomTable';

const now = new Date();
const dayOfMonth = (d) => new Date(now.getFullYear(), now.getMonth(), d);
// The table parses row dates with the "MM/dd/yyyy" pattern and nothing else.
const rowDate = (d) => format(dayOfMonth(d), 'MM/dd/yyyy');

const columns = [
  { key: 'name', header: 'Name' },
  { key: 'status', header: 'Status' },
];

const data = [
  { id: '1', name: 'Acme Health', status: 'Active', date_created: rowDate(12), hasCheckbox: true, hasActions: true },
  { id: '2', name: 'Beta Clinic', status: 'Paused', date_created: rowDate(25), hasCheckbox: true, hasActions: true },
  { id: '3', name: 'Gamma Care', status: 'Active', date_created: 'never', hasCheckbox: true, hasActions: true },
  { id: '4', name: 'Delta Labs', status: 'Active', hasCheckbox: true, hasActions: true },
];

// A single filter whose options cover all three kinds the header understands:
// a plain value column, a date column, and the reset entry.
const filters = [
  {
    key: 'filter_type',
    options: [
      { value: 'status', label: 'Status' },
      { value: 'date_created', label: 'Date Created' },
      { value: 'clear_filters', label: 'Clear Filters' },
    ],
  },
];

const renderTable = (props = {}) =>
  render(
    <CustomTable data={data} columns={columns} filters={filters} itemsPerPage={10} {...props} />
  );

const bodyRows = () =>
  Array.from(document.body.querySelectorAll('tbody tr')).filter(
    (tr) => !tr.querySelector('td[colspan]')
  );

const filterTypeSelect = () => document.body.querySelector('.table-filter-select');
const valueSelect = () => document.body.querySelector('.filter-value-select');

const chooseFilterType = (value) =>
  fireEvent.change(filterTypeSelect(), { target: { value } });

const dayCell = (n) =>
  Array.from(document.body.querySelectorAll('.date-filter-day-clickable'))
    .filter((el) => !el.className.includes('date-filter-day-outside'))
    .find((el) => el.textContent === String(n));

const openDatePicker = () => {
  chooseFilterType('date_created');
  fireEvent.click(document.body.querySelector('.date-filter-input-start'));
};

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the bulk action bar', () => {
  const handlers = () => ({
    onAssignToStaff: vi.fn(),
    onMoveCandidates: vi.fn(),
    onDelete: vi.fn(),
  });

  const selectFirstTwo = () => {
    const boxes = document.body.querySelectorAll('tbody input[type="checkbox"]');
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
  };

  it('stays hidden until rows are selected', () => {
    renderTable({ tableName: 'ManageColumn', ...handlers() });
    expect(document.body.querySelector('.selected-items-actions')).toBeNull();
  });

  it('appears once a row is selected on the candidate board', () => {
    renderTable({ tableName: 'ManageColumn', ...handlers() });
    selectFirstTwo();
    expect(screen.getByText('Assign to Staff')).toBeInTheDocument();
    expect(screen.getByText('Move candidates')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('stays hidden on any other table even with a selection', () => {
    renderTable({ tableName: 'Tenants', ...handlers() });
    selectFirstTwo();
    expect(document.body.querySelector('.selected-items-actions')).toBeNull();
  });

  it('hands each bulk action the selected record ids', () => {
    const h = handlers();
    renderTable({ tableName: 'ManageColumn', ...h });
    selectFirstTwo();
    fireEvent.click(screen.getByText('Assign to Staff'));
    fireEvent.click(screen.getByText('Move candidates'));
    fireEvent.click(screen.getByText('Delete'));
    expect(h.onAssignToStaff).toHaveBeenCalledWith(['1', '2']);
    expect(h.onMoveCandidates).toHaveBeenCalledWith(['1', '2']);
    expect(h.onDelete).toHaveBeenCalledWith(['1', '2']);
  });

  it('goes away again when the last selection is cleared', () => {
    renderTable({ tableName: 'ManageColumn', ...handlers() });
    const boxes = () => document.body.querySelectorAll('tbody input[type="checkbox"]');
    fireEvent.click(boxes()[0]);
    fireEvent.click(boxes()[0]);
    expect(document.body.querySelector('.selected-items-actions')).toBeNull();
  });

  it('clears everything from the header checkbox after selecting everything', () => {
    renderTable({ tableName: 'ManageColumn', ...handlers() });
    const selectAll = () => document.body.querySelector('thead input[type="checkbox"]');
    fireEvent.click(selectAll());
    expect(screen.getByText('Delete')).toBeInTheDocument();
    fireEvent.click(selectAll());
    expect(document.body.querySelector('.selected-items-actions')).toBeNull();
  });
});

describe('the value filter', () => {
  it('offers the distinct values found in the data', () => {
    renderTable();
    chooseFilterType('status');
    const labels = Array.from(valueSelect().options).map((o) => o.textContent);
    expect(labels).toContain('Active');
    expect(labels).toContain('Paused');
  });

  it('narrows the rows to the chosen value', () => {
    renderTable();
    chooseFilterType('status');
    fireEvent.change(valueSelect(), { target: { value: 'Paused' } });
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText('Beta Clinic')).toBeInTheDocument();
  });

  it('tells the parent which column and value were chosen', () => {
    const onFilterChange = vi.fn();
    renderTable({ onFilterChange });
    chooseFilterType('status');
    expect(onFilterChange).toHaveBeenCalledWith('filter_type', 'status');
    fireEvent.change(valueSelect(), { target: { value: 'Active' } });
    expect(onFilterChange).toHaveBeenLastCalledWith('status', 'Active');
  });

  it('restores every row when the value is set back to its placeholder', () => {
    renderTable();
    chooseFilterType('status');
    fireEvent.change(valueSelect(), { target: { value: 'Paused' } });
    fireEvent.change(valueSelect(), { target: { value: '' } });
    expect(bodyRows()).toHaveLength(4);
  });

  it('clears the filter bar from the clear-filters entry', () => {
    const onFilterChange = vi.fn();
    renderTable({ onFilterChange });
    chooseFilterType('status');
    fireEvent.change(valueSelect(), { target: { value: 'Paused' } });
    chooseFilterType('clear_filters');
    // The header resets on selection rather than storing "clear_filters", so
    // the "Clear All Filters" button it can render never actually appears.
    expect(screen.queryByText('Clear All Filters')).not.toBeInTheDocument();
    expect(bodyRows()).toHaveLength(4);
    expect(onFilterChange).toHaveBeenLastCalledWith('filter_type', '');
  });

  it('clears the filter bar when the column picker returns to its placeholder', () => {
    renderTable();
    chooseFilterType('status');
    fireEvent.change(valueSelect(), { target: { value: 'Paused' } });
    chooseFilterType('');
    expect(bodyRows()).toHaveLength(4);
    expect(valueSelect()).toBeNull();
  });

  it('hands the column straight to a parent that filters through its own modal', () => {
    const onFilterTypeSelect = vi.fn();
    renderTable({ onFilterTypeSelect });
    chooseFilterType('status');
    expect(onFilterTypeSelect).toHaveBeenCalledWith('status');
    // The parent owns the value picker in this mode, so none is rendered.
    expect(valueSelect()).toBeNull();
  });

  it('still handles date columns itself when the parent owns the others', () => {
    const onFilterTypeSelect = vi.fn();
    renderTable({ onFilterTypeSelect });
    chooseFilterType('date_created');
    expect(onFilterTypeSelect).not.toHaveBeenCalled();
    expect(document.body.querySelector('.date-filter-input-start')).toBeInTheDocument();
  });
});

describe('the date range filter', () => {
  it('shows two read-only date fields with placeholder text', () => {
    renderTable();
    chooseFilterType('date_created');
    expect(document.body.querySelector('.date-filter-input-start').value).toBe(
      'Select start date'
    );
    expect(document.body.querySelector('.date-filter-input-end').value).toBe('Select end date');
  });

  it('opens the calendar from either field', () => {
    renderTable();
    chooseFilterType('date_created');
    fireEvent.click(document.body.querySelector('.date-filter-input-end'));
    expect(document.body.querySelector('.date-filter-dropdown')).toBeInTheDocument();
  });

  it('previews the picked start date in the field before it is applied', () => {
    renderTable();
    openDatePicker();
    fireEvent.click(dayCell(10));
    expect(document.body.querySelector('.date-filter-input-start').value).toBe(
      format(dayOfMonth(10), 'MMM d, yyyy')
    );
  });

  it('keeps only the rows inside the applied range', () => {
    renderTable();
    openDatePicker();
    fireEvent.click(dayCell(10));
    fireEvent.click(dayCell(20));
    fireEvent.click(screen.getByText('Apply'));
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText('Acme Health')).toBeInTheDocument();
  });

  it('matches a single day exactly when start and end are the same', () => {
    renderTable();
    openDatePicker();
    fireEvent.click(dayCell(25));
    fireEvent.click(screen.getByText('Apply'));
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText('Beta Clinic')).toBeInTheDocument();
  });

  it('drops rows whose date is unparseable or absent', () => {
    renderTable();
    openDatePicker();
    fireEvent.click(dayCell(1));
    fireEvent.click(dayCell(28));
    fireEvent.click(screen.getByText('Apply'));
    const names = bodyRows().map((r) => r.textContent);
    expect(names.some((n) => n.includes('Gamma Care'))).toBe(false);
    expect(names.some((n) => n.includes('Delta Labs'))).toBe(false);
  });

  it('reports the applied range to the parent', () => {
    const onFilterChange = vi.fn();
    renderTable({ onFilterChange });
    openDatePicker();
    fireEvent.click(dayCell(10));
    fireEvent.click(dayCell(20));
    fireEvent.click(screen.getByText('Apply'));
    const [key, range] = onFilterChange.mock.calls.at(-1);
    expect(key).toBe('date_created');
    expect(range.start).toBeInstanceOf(Date);
    expect(range.end).toBeInstanceOf(Date);
  });

  it('closes the calendar without filtering when it is cancelled', () => {
    renderTable();
    openDatePicker();
    fireEvent.click(screen.getByText('Cancel'));
    expect(document.body.querySelector('.date-filter-dropdown')).toBeNull();
    expect(bodyRows()).toHaveLength(4);
  });

  it('forgets an applied range when the filters are cleared', () => {
    renderTable();
    openDatePicker();
    fireEvent.click(dayCell(10));
    fireEvent.click(dayCell(20));
    fireEvent.click(screen.getByText('Apply'));
    chooseFilterType('clear_filters');
    expect(bodyRows()).toHaveLength(4);
    chooseFilterType('date_created');
    expect(document.body.querySelector('.date-filter-input-start').value).toBe(
      'Select start date'
    );
  });

  it('closes the calendar on a click elsewhere on the page', () => {
    renderTable();
    openDatePicker();
    fireEvent.mouseDown(document.body);
    expect(document.body.querySelector('.date-filter-dropdown')).toBeNull();
  });

  it('leaves the calendar open for a click inside it', () => {
    renderTable();
    openDatePicker();
    fireEvent.mouseDown(document.body.querySelector('.date-filter-dropdown'));
    expect(document.body.querySelector('.date-filter-dropdown')).toBeInTheDocument();
  });

  it('leaves the calendar open for a click on the field that opened it', () => {
    renderTable();
    openDatePicker();
    fireEvent.mouseDown(document.body.querySelector('.date-filter-input-end'));
    expect(document.body.querySelector('.date-filter-dropdown')).toBeInTheDocument();
  });
});

describe('the row action menu', () => {
  const actions = [{ label: 'View', onClick: vi.fn() }];
  const menuButtons = () => screen.getAllByLabelText('Row actions');

  it('opens under its own row and runs the action against that record', () => {
    const onClick = vi.fn();
    renderTable({ actions: [{ label: 'View', onClick }] });
    fireEvent.click(menuButtons()[1]);
    fireEvent.click(screen.getByText('View'));
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: '2' }));
    expect(screen.queryByText('View')).not.toBeInTheDocument();
  });

  it('closes when its own button is clicked again', () => {
    renderTable({ actions });
    fireEvent.click(menuButtons()[0]);
    expect(screen.getByText('View')).toBeInTheDocument();
    fireEvent.click(menuButtons()[0]);
    expect(screen.queryByText('View')).not.toBeInTheDocument();
  });

  it('moves to another row rather than opening two menus', () => {
    renderTable({ actions });
    fireEvent.click(menuButtons()[0]);
    fireEvent.click(menuButtons()[2]);
    expect(screen.getAllByText('View')).toHaveLength(1);
  });

  it('hangs the menu below the button when there is room', () => {
    renderTable({ actions });
    fireEvent.click(menuButtons()[0]);
    const menu = document.body.querySelector('.action-dropdown');
    expect(menu.style.position).toBe('fixed');
    expect(menu.style.top).toBe('2px');
  });

  it('flips the menu above the button when the row sits at the bottom', () => {
    renderTable({ actions });
    const button = menuButtons()[0];
    // jsdom measures everything as zero, so place this button by hand near the
    // foot of a short viewport -- the only way the upward branch is reachable.
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      top: 700,
      bottom: 740,
      left: 300,
      right: 340,
      width: 40,
      height: 40,
    });
    Object.defineProperty(window, 'innerHeight', { value: 750, configurable: true });
    fireEvent.click(button);
    const menu = document.body.querySelector('.action-dropdown');
    // 700 - 150 (the fallback menu height) - 2.
    expect(menu.style.top).toBe('548px');
    expect(menu.style.maxHeight).toBe('150px');
  });

  it('re-places an open menu when the window is resized', () => {
    renderTable({ actions });
    fireEvent.click(menuButtons()[0]);
    const menu = document.body.querySelector('.action-dropdown');
    menu.style.top = '999px';
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(menu.style.top).toBe('2px');
  });

  it('re-places an open menu when an ancestor scrolls', () => {
    renderTable({ actions });
    fireEvent.click(menuButtons()[0]);
    const menu = document.body.querySelector('.action-dropdown');
    menu.style.top = '999px';
    act(() => {
      document.body.querySelector('.table-container').dispatchEvent(
        new Event('scroll', { bubbles: false })
      );
    });
    expect(menu.style.top).toBe('2px');
  });

  it('closes on a click anywhere else on the page', () => {
    renderTable({ actions });
    fireEvent.click(menuButtons()[0]);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('View')).not.toBeInTheDocument();
  });

  it('stays open for a click inside the menu itself', () => {
    renderTable({ actions });
    fireEvent.click(menuButtons()[0]);
    fireEvent.mouseDown(document.body.querySelector('.action-dropdown'));
    expect(screen.getByText('View')).toBeInTheDocument();
  });
});

describe('the export menu', () => {
  const exportButton = () => screen.getByLabelText('Export data');

  it('marks the container while the menu is open and unmarks it on close', () => {
    renderTable();
    fireEvent.click(exportButton());
    expect(document.body.querySelector('.custom-table-container').className).toContain(
      'export-dropdown-open'
    );
    fireEvent.click(exportButton());
    expect(document.body.querySelector('.custom-table-container').className).not.toContain(
      'export-dropdown-open'
    );
  });

  it('places the menu above its button once the layout settles', async () => {
    vi.useFakeTimers();
    renderTable();
    fireEvent.click(exportButton());
    await act(async () => {
      vi.runAllTimers();
    });
    const menu = document.body.querySelector('.export-dropdown');
    expect(menu.style.position).toBe('absolute');
    expect(menu.style.right).toBe('0px');
    vi.useRealTimers();
  });

  it('exports only the rows left after a filter', () => {
    renderTable({ tableName: 'Tenants' });
    chooseFilterType('status');
    fireEvent.change(valueSelect(), { target: { value: 'Paused' } });
    fireEvent.click(exportButton());
    fireEvent.click(screen.getByText('Export as CSV'));
    expect(exportTableData.mock.calls[0][0]).toHaveLength(1);
    expect(exportTableData.mock.calls[0][2]).toBe('tenants.csv');
  });

  it('closes itself after a PDF export', () => {
    renderTable({ tableName: 'Tenant List' });
    fireEvent.click(exportButton());
    fireEvent.click(screen.getByText('Export as PDF'));
    expect(exportTableToPDF.mock.calls[0][2]).toBe('tenant-list.pdf');
    expect(document.body.querySelector('.export-dropdown')).toBeNull();
  });

  it('prints the filtered rows', () => {
    renderTable({ tableName: 'Tenants' });
    chooseFilterType('status');
    fireEvent.change(valueSelect(), { target: { value: 'Active' } });
    fireEvent.click(screen.getByLabelText('Print table'));
    expect(printTableData.mock.calls[0][0]).toHaveLength(3);
  });

  it('closes on a click elsewhere on the page', () => {
    renderTable();
    fireEvent.click(exportButton());
    fireEvent.mouseDown(document.body);
    expect(document.body.querySelector('.export-dropdown')).toBeNull();
  });

  it('stays open for a click inside the menu', () => {
    renderTable();
    fireEvent.click(exportButton());
    fireEvent.mouseDown(document.body.querySelector('.export-dropdown'));
    expect(document.body.querySelector('.export-dropdown')).toBeInTheDocument();
  });
});

describe('the active toggle', () => {
  const activeColumns = [
    { key: 'name', header: 'Name' },
    { key: 'active', header: 'Active', type: 'active' },
  ];
  const activeData = Array.from({ length: 4 }, (_, i) => ({
    id: String(i + 1),
    name: `Row ${i + 1}`,
    active: i % 2 === 0,
  }));

  it('reports the row index within the whole data set, not the page', () => {
    const onToggleActive = vi.fn();
    render(
      <CustomTable
        data={activeData}
        columns={activeColumns}
        itemsPerPage={2}
        showCheckbox={false}
        onToggleActive={onToggleActive}
      />
    );
    fireEvent.click(screen.getByText('2'));
    fireEvent.click(document.body.querySelectorAll('tbody input[type="checkbox"]')[0]);
    expect(onToggleActive).toHaveBeenCalledWith(2);
  });

  it('does nothing when the parent supplied no handler', () => {
    render(
      <CustomTable
        data={activeData}
        columns={activeColumns}
        itemsPerPage={10}
        showCheckbox={false}
      />
    );
    fireEvent.click(document.body.querySelectorAll('tbody input[type="checkbox"]')[0]);
    expect(bodyRows()).toHaveLength(4);
  });
});

describe('paging against changing data', () => {
  const many = (n, prefix) =>
    Array.from({ length: n }, (_, i) => ({
      id: `${prefix}${i}`,
      name: `${prefix} ${i}`,
      status: 'Active',
      hasCheckbox: true,
    }));

  it('returns to the first page when the data is replaced', () => {
    const { rerender } = render(
      <CustomTable data={many(12, 'A')} columns={columns} itemsPerPage={5} />
    );
    fireEvent.click(screen.getByText('3'));
    expect(screen.getByText('A 10')).toBeInTheDocument();
    rerender(<CustomTable data={many(12, 'B')} columns={columns} itemsPerPage={5} />);
    expect(screen.getByText('B 0')).toBeInTheDocument();
  });
});

describe('selecting everything on a mixed page', () => {
  it('ticks only the rows that carry a checkbox', () => {
    const onAssignToStaff = vi.fn();
    const mixed = [
      { id: '1', name: 'Acme Health', status: 'Active', hasCheckbox: true },
      // A row the parent marked unselectable: select-all has to step over it.
      { id: '2', name: 'Beta Clinic', status: 'Paused' },
      { id: '3', name: 'Gamma Care', status: 'Active', hasCheckbox: true },
    ];
    renderTable({ data: mixed, tableName: 'ManageColumn', onAssignToStaff });

    fireEvent.click(document.body.querySelector('thead input[type="checkbox"]'));
    fireEvent.click(screen.getByText('Assign to Staff'));

    expect(onAssignToStaff).toHaveBeenCalledWith(['1', '3']);
  });
});

describe('where the calendar is drawn', () => {
  // The calendar is `position: fixed` and sized from `scrollHeight`, which jsdom
  // reports as zero, so the component falls back to 300px. Each test below
  // places the start field by hand; that is the only way past the "there is room
  // below" arm the zeroed layout always takes.
  const placeStartField = ({ top, bottom, innerHeight }) => {
    chooseFilterType('date_created');
    const field = document.body.querySelector('.date-filter-input-start');
    vi.spyOn(field, 'getBoundingClientRect').mockReturnValue({
      top,
      bottom,
      left: 100,
      right: 260,
      width: 160,
      height: bottom - top,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: innerHeight,
      configurable: true,
    });
    fireEvent.click(field);
    return document.body.querySelector('.date-filter-dropdown-wrapper');
  };

  it('flips the calendar above the field when the field sits at the foot', () => {
    renderTable();
    const dropdown = placeStartField({ top: 700, bottom: 740, innerHeight: 750 });

    // 700 - 300 (the fallback height) - 4, with the 690px of space above as cap.
    expect(dropdown.style.top).toBe('396px');
    expect(dropdown.style.maxHeight).toBe('690px');
  });

  it('squeezes the calendar below the field when neither side has room', () => {
    renderTable();
    const dropdown = placeStartField({ top: 250, bottom: 600, innerHeight: 768 });

    expect(dropdown.style.top).toBe('604px');
    expect(dropdown.style.maxHeight).toBe('158px');
  });
});

describe('an open row menu whose row goes away', () => {
  it('gives up quietly when the button it was placed against is gone', () => {
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
    const { rerender } = renderTable({ actions: [{ label: 'View', onClick: vi.fn() }] });
    fireEvent.click(screen.getAllByLabelText('Row actions')[3]);
    expect(screen.getByText('View')).toBeInTheDocument();

    // The row unmounts while its menu is still the open one, which nulls the
    // refs the placement code measures against; the resize listener is still
    // attached and fires against them.
    rerender(
      <CustomTable
        data={[data[0]]}
        columns={columns}
        filters={filters}
        itemsPerPage={10}
        actions={[{ label: 'View', onClick: vi.fn() }]}
      />
    );
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(screen.queryByText('View')).not.toBeInTheDocument();
    expect(bodyRows()).toHaveLength(1);
  });
});
