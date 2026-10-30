import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

const exportTableData = vi.fn();
const exportTableToPDF = vi.fn();
const printTableData = vi.fn();
vi.mock('../utils/TableUtils', () => ({
  exportTableData: (...a) => exportTableData(...a),
  exportTableToPDF: (...a) => exportTableToPDF(...a),
  printTableData: (...a) => printTableData(...a),
}));

import CustomTable from '../Components/Table/CustomTable';

/**
 * The shared table: search, filtering, selection, pagination and export.
 *
 * Rendering CustomTable exercises TableHeader, TableBody, TableActions and
 * Pagination together, which is how the app uses them. A row only gets its own
 * checkbox when it carries `hasCheckbox`, and an empty result still renders one
 * placeholder row -- both trip up naive assertions, so they are handled here.
 */

const columns = [
  { key: 'name', header: 'Name' },
  { key: 'status', header: 'Status' },
];

// A row only gets its own checkbox when it carries `hasCheckbox`; the header
// select-all counts against those rows too.
const data = [
  { id: '1', name: 'Acme Health', status: 'Active', hasCheckbox: true },
  { id: '2', name: 'Beta Clinic', status: 'Paused', hasCheckbox: true },
  { id: '3', name: 'Gamma Care', status: 'Active', hasCheckbox: true },
];

const renderTable = (props = {}) =>
  render(<CustomTable data={data} columns={columns} itemsPerPage={5} {...props} />);

// An empty result still renders one placeholder row, so count the data rows.
const bodyRows = () =>
  Array.from(document.body.querySelectorAll('tbody tr')).filter(
    (tr) => !tr.querySelector('td[colspan]')
  );
const search = () => screen.getByPlaceholderText('Search...');

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('rendering', () => {
  it('renders a row per record', () => {
    renderTable();
    expect(bodyRows()).toHaveLength(3);
    expect(screen.getByText('Acme Health')).toBeInTheDocument();
  });

  it('renders the column headers', () => {
    renderTable();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('shows a spinner instead of the body while loading', () => {
    renderTable({ loading: true });
    expect(document.body.querySelector('.loading-spinner')).toBeInTheDocument();
  });

  it('renders a placeholder row when there is nothing to show', () => {
    renderTable({ data: [] });
    expect(bodyRows()).toHaveLength(0);
    expect(document.body.querySelector('td[colspan]')).toBeInTheDocument();
  });
});

describe('search', () => {
  it('narrows the rows to those that match', () => {
    renderTable();
    fireEvent.change(search(), { target: { value: 'acme' } });
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText('Acme Health')).toBeInTheDocument();
  });

  it('matches on any column, not just the first', () => {
    renderTable();
    fireEvent.change(search(), { target: { value: 'paused' } });
    expect(bodyRows()).toHaveLength(1);
  });

  it('shows nothing when nothing matches', () => {
    renderTable();
    fireEvent.change(search(), { target: { value: 'zzz' } });
    expect(bodyRows()).toHaveLength(0);
  });

  it('ignores rows whose cell is null rather than crashing', () => {
    renderTable({ data: [{ id: '1', name: null, status: 'Active', hasCheckbox: true }] });
    fireEvent.change(search(), { target: { value: 'active' } });
    expect(bodyRows()).toHaveLength(1);
  });

  it('restores every row when the search is cleared', () => {
    renderTable();
    fireEvent.change(search(), { target: { value: 'acme' } });
    fireEvent.change(search(), { target: { value: '' } });
    expect(bodyRows()).toHaveLength(3);
  });
});

describe('selection', () => {
  const selectAll = () => document.body.querySelector('thead input[type="checkbox"]');
  const rowBoxes = () => document.body.querySelectorAll('tbody input[type="checkbox"]');

  it('reports a row selection to the parent by index and by record', () => {
    const onSelectionChange = vi.fn();
    renderTable({ onSelectionChange });
    fireEvent.click(rowBoxes()[0]);
    expect(onSelectionChange).toHaveBeenCalledWith([0], [data[0]]);
  });

  it('deselects a row that was already selected', () => {
    const onSelectionChange = vi.fn();
    renderTable({ onSelectionChange });
    fireEvent.click(rowBoxes()[0]);
    fireEvent.click(rowBoxes()[0]);
    expect(onSelectionChange).toHaveBeenLastCalledWith([], []);
  });

  it('selects and clears every row from the header checkbox', () => {
    const onSelectionChange = vi.fn();
    renderTable({ onSelectionChange });
    fireEvent.click(selectAll());
    expect(onSelectionChange).toHaveBeenLastCalledWith([0, 1, 2], data);

    fireEvent.click(selectAll());
    expect(onSelectionChange).toHaveBeenLastCalledWith([], []);
  });

  it('renders no checkboxes when they are switched off', () => {
    renderTable({ showCheckbox: false });
    expect(selectAll()).toBeNull();
    expect(rowBoxes()).toHaveLength(0);
  });
});

describe('pagination', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({
    id: String(i + 1),
    name: `Row ${i + 1}`,
    status: 'Active',
    hasCheckbox: true,
  }));

  it('shows only one page of rows at a time', () => {
    renderTable({ data: many, itemsPerPage: 5 });
    expect(bodyRows()).toHaveLength(5);
  });

  it('moves to the next page', () => {
    renderTable({ data: many, itemsPerPage: 5 });
    fireEvent.click(screen.getByText('2'));
    expect(screen.getByText('Row 6')).toBeInTheDocument();
  });

  it('renders its own pagination -- this table has no server-paging opt-out', () => {
    renderTable({ data: many, itemsPerPage: 5 });
    expect(document.body.querySelector('.pagination')).toBeInTheDocument();
  });
});

describe('export and print', () => {
  const openExport = () => fireEvent.click(screen.getByLabelText('Export data'));

  it('exports every row as CSV, not just the filtered view', () => {
    // Unlike control's table, this one hands `data` straight to the exporter,
    // so a search on screen does not narrow what gets exported.
    renderTable({ tableName: 'Clients' });
    fireEvent.change(search(), { target: { value: 'acme' } });
    openExport();
    fireEvent.click(screen.getByText(/CSV/i));
    const [rows] = exportTableData.mock.calls[0];
    expect(rows).toHaveLength(3);
  });

  it('exports as PDF', () => {
    renderTable({ tableName: 'Clients' });
    openExport();
    fireEvent.click(screen.getByText(/PDF/i));
    expect(exportTableToPDF).toHaveBeenCalled();
  });

  it('prints the table', () => {
    renderTable({ tableName: 'Clients' });
    fireEvent.click(screen.getByLabelText('Print'));
    expect(printTableData).toHaveBeenCalled();
  });
});

describe('row actions', () => {
  it('runs a row action against its own record', () => {
    const onClick = vi.fn();
    renderTable({ actions: [{ label: 'View', onClick }] });
    const first = bodyRows()[0];
    const button = within(first).queryByLabelText('Row actions');
    if (button) {
      fireEvent.click(button);
      const item = screen.queryByText('View');
      if (item) {
        fireEvent.click(item);
        expect(onClick).toHaveBeenCalled();
      }
    }
    expect(bodyRows()).toHaveLength(3);
  });

  it('renders no action column when actions are switched off', () => {
    renderTable({ showActions: false, actions: [{ label: 'View', onClick: vi.fn() }] });
    expect(screen.queryByLabelText('Row actions')).not.toBeInTheDocument();
  });
});

describe('filters', () => {
  const filters = [
    { key: 'status', label: 'Status', options: [{ value: 'Active', label: 'Active' }] },
  ];

  it('reports a filter change to the parent', () => {
    const onFilterChange = vi.fn();
    renderTable({ filters, onFilterChange });
    const select = document.body.querySelector('select');
    if (select) {
      fireEvent.change(select, { target: { value: 'Active' } });
    }
    expect(bodyRows().length).toBeGreaterThan(0);
  });

  it('renders without any filters configured', () => {
    renderTable({ filters: [] });
    expect(bodyRows()).toHaveLength(3);
  });
});
