import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import TableBody from '../Components/Table/TableBody';

/**
 * The rendering half of CustomTable.
 *
 * It is a pure component -- every piece of state lives in the parent -- and
 * almost all of it is one long chain of `col.type` ternaries deciding how a
 * single cell is drawn. Each arm slugifies the cell value into a class name,
 * and several call `.toLowerCase()` on it unguarded, so the type a column
 * declares has to match the data it is pointed at.
 *
 * Two pieces of behaviour are not obvious from the props. The name column is
 * inferred rather than declared: it is the first column with neither a `type`
 * nor `hasColumnActions`, and it becomes a link only when the table's action
 * list contains something that looks like a view or an edit. And the dropdowns
 * are keyed by position -- `"<rowIndex>-<colIndex>"` for a column menu,
 * `"<rowIndex>-action"` for the row menu -- so the parent's `openDropdown`
 * string is what decides which single menu is on screen.
 *
 * The component is normally exercised through CustomTable; it is driven
 * directly here so each cell type can be reached without the surrounding
 * pagination, search and column-management state.
 */

const handlers = {
  handleCheckboxChange: vi.fn(),
  handleSelectAllChange: vi.fn(),
  handleToggleActive: vi.fn(),
  toggleDropdown: vi.fn(),
  setOpenDropdown: vi.fn(),
};

const renderBody = (props = {}) => {
  const menuRefs = { current: {} };
  return render(
    <TableBody
      columns={[{ header: 'Name', key: 'name' }]}
      currentData={[{ name: 'Acme' }]}
      showCheckbox={false}
      showActions={false}
      actions={[]}
      selectedRows={[]}
      openDropdown={null}
      menuRefs={menuRefs}
      tableContainerRef={{ current: null }}
      tableName="Tenants"
      hasStatusDot={false}
      {...handlers}
      {...props}
    />
  );
};

// One row rendered through a single typed column, which is how every cell
// variant below is reached.
const renderCell = (col, value, rest = {}) =>
  renderBody({
    columns: [{ header: 'Cell', key: 'cell', ...col }],
    currentData: [{ cell: value, ...rest.row }],
    ...rest.props,
  });

const cell = () => document.body.querySelector('.table-cell');

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the header row', () => {
  it('renders one heading per column', () => {
    renderBody({
      columns: [
        { header: 'Name', key: 'name' },
        { header: 'Plan', key: 'plan' },
      ],
    });
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Plan')).toBeInTheDocument();
  });

  it('adds an action heading only when the table has row actions', () => {
    renderBody();
    expect(screen.queryByText('Action')).not.toBeInTheDocument();

    renderBody({ showActions: true });
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('lets a column declare its own width, and wrap', () => {
    renderBody({ columns: [{ header: 'Notes', key: 'notes', width: '30%' }] });
    const heading = screen.getByText('Notes');
    expect(heading).toHaveStyle({ width: '30%' });
    expect(heading.className).toBe('table-col-wrap');
    expect(cell().className).toContain('table-col-wrap');
  });

  it('leaves a column with no declared width unstyled', () => {
    renderBody();
    expect(screen.getByText('Name')).not.toHaveAttribute('class');
    expect(cell().className).toBe('table-cell');
  });
});

describe('the select-all checkbox', () => {
  const selectable = {
    showCheckbox: true,
    currentData: [
      { name: 'Acme', hasCheckbox: true },
      { name: 'Globex', hasCheckbox: true },
      // A row that cannot be selected is left out of the "all" count.
      { name: 'Initech', hasCheckbox: false },
    ],
  };

  const boxes = () => document.body.querySelectorAll('input[type="checkbox"]');

  it('is unchecked when nothing is selected', () => {
    renderBody({ ...selectable, selectedRows: [] });
    expect(boxes()[0]).not.toBeChecked();
  });

  it('is unchecked while only some selectable rows are selected', () => {
    renderBody({ ...selectable, selectedRows: [0] });
    expect(boxes()[0]).not.toBeChecked();
  });

  it('is checked once every selectable row is selected', () => {
    renderBody({ ...selectable, selectedRows: [0, 1] });
    expect(boxes()[0]).toBeChecked();
  });

  it('tells the parent when it is clicked', () => {
    renderBody({ ...selectable, selectedRows: [] });
    fireEvent.click(boxes()[0]);
    expect(handlers.handleSelectAllChange).toHaveBeenCalled();
  });

  it('gives a checkbox only to the rows that may be selected', () => {
    renderBody({ ...selectable, selectedRows: [1] });
    // The header box, plus one per selectable row.
    expect(boxes()).toHaveLength(3);
    expect(boxes()[2]).toBeChecked();

    fireEvent.click(boxes()[1]);
    expect(handlers.handleCheckboxChange).toHaveBeenCalledWith(0, selectable.currentData[0]);
  });
});

describe('the empty state', () => {
  it('names the table it is standing in for', () => {
    renderBody({ currentData: [], tableName: 'Tenants' });
    expect(screen.getByText('No records found')).toBeInTheDocument();
    expect(
      screen.getByText('There are no tenants entries to display right now.')
    ).toBeInTheDocument();
  });

  it('spans the columns alone when the table has neither checkboxes nor actions', () => {
    renderBody({ currentData: [], columns: [{ header: 'A', key: 'a' }, { header: 'B', key: 'b' }] });
    expect(document.body.querySelector('.table-empty-state')).toHaveAttribute('colspan', '2');
  });

  it('spans one extra column for the checkbox column', () => {
    renderBody({ currentData: [], showCheckbox: true });
    expect(document.body.querySelector('.table-empty-state')).toHaveAttribute('colspan', '2');
  });

  it('spans two extra columns whenever there are row actions', () => {
    renderBody({ currentData: [], showActions: true, showCheckbox: true });
    expect(document.body.querySelector('.table-empty-state')).toHaveAttribute('colspan', '3');
  });
});

describe('the typed cells', () => {
  it('draws a stage completion as a filled bar', () => {
    renderCell({ type: 'stage_completion' }, 40);
    expect(document.body.querySelector('.progress-fills')).toHaveStyle({ width: '40%' });
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('slugifies a plan name into its label class', () => {
    renderCell({ type: 'plan' }, 'Premium');
    expect(document.body.querySelector('.plan-label')).toHaveClass('plan-premium');
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });

  it('gives a subscription status a dot of its own', () => {
    renderCell({ type: 'subscription_status' }, 'Active');
    expect(document.body.querySelector('.subscription_status-active')).toBeInTheDocument();
    expect(document.body.querySelector('.status-dot')).toBeInTheDocument();
  });

  it('slugifies a payment status', () => {
    renderCell({ type: 'payment_status' }, 'Overdue');
    expect(document.body.querySelector('.payment_status-label')).toHaveClass(
      'payment_status-overdue'
    );
  });

  it('leaves a plain status without a dot by default', () => {
    renderCell({ type: 'status' }, 'Open');
    expect(document.body.querySelector('.status-label')).toHaveClass('status-open');
    expect(document.body.querySelector('.status-dot')).toBeNull();
  });

  it('adds a dot to a plain status when the table asked for one', () => {
    renderCell({ type: 'status' }, 'Open', { props: { hasStatusDot: true } });
    expect(document.body.querySelector('.status-dot')).toBeInTheDocument();
  });

  it('puts a document icon beside a document name', () => {
    renderCell({ type: 'document' }, 'contract.pdf');
    expect(document.body.querySelector('.table-document-icon')).toBeInTheDocument();
    expect(screen.getByText('contract.pdf')).toBeInTheDocument();
  });

  it('slugifies a severity', () => {
    renderCell({ type: 'severity' }, 'Critical');
    expect(document.body.querySelector('.severity-label')).toHaveClass('severity-critical');
  });

  it('hyphenates the spaces and dashes out of a priority', () => {
    renderCell({ type: 'priority' }, 'Very High');
    expect(document.body.querySelector('.priority-label')).toHaveClass('priority-very-high');

    renderCell({ type: 'priority' }, 'Semi-Urgent');
    expect(document.body.querySelector('.priority-semi-urgent')).toBeInTheDocument();
  });

  it('draws an active flag as a switch that reports its row', () => {
    renderCell({ type: 'active' }, true);
    const toggle = document.body.querySelector('input[type="checkbox"]');
    expect(toggle).toBeChecked();

    fireEvent.click(toggle);
    expect(handlers.handleToggleActive).toHaveBeenCalledWith(0);
  });

  it('draws an inactive flag as an unchecked switch', () => {
    renderCell({ type: 'active' }, false);
    expect(document.body.querySelector('input[type="checkbox"]')).not.toBeChecked();
  });

  it('splits a day_time cell into its date and its time', () => {
    renderCell({ type: 'day_time' }, { date: '01 Jan 2026', time: '09:30' });
    expect(screen.getByText('01 Jan 2026')).toBeInTheDocument();
    expect(screen.getByText('09:30')).toBeInTheDocument();
  });

  it('fills in the missing half of a day_time cell', () => {
    renderCell({ type: 'day_time' }, { date: '01 Jan 2026' });
    expect(screen.getByText('01 Jan 2026')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();

    renderCell({ type: 'day_time' }, { time: '09:30' });
    expect(screen.getByText('09:30')).toBeInTheDocument();
  });

  it('says N/A for a day_time cell with no value at all', () => {
    renderCell({ type: 'day_time' }, null);
    expect(document.body.querySelector('.day-time-cell').textContent).toBe('N/A');
  });

  it('prints anything untyped as it stands', () => {
    renderCell({}, 'Acme Corporation');
    expect(cell().textContent).toBe('Acme Corporation');
    expect(cell().querySelector('button')).toBeNull();
  });
});

describe('a column with its own menu', () => {
  const columnActions = [
    { label: 'Approve', onClick: vi.fn() },
    { label: 'Reject', className: 'danger', onClick: vi.fn() },
  ];
  const columns = [
    { header: 'Name', key: 'name' },
    { header: 'Stage', key: 'stage', hasColumnActions: true, columnActions },
  ];
  const currentData = [{ name: 'Acme', stage: 'Review' }];

  it('draws the cell value as the menu trigger', () => {
    renderBody({ columns, currentData });
    expect(screen.getByText('Review')).toHaveClass('action-button');
    expect(document.body.querySelector('.action-dropdown')).toBeNull();
  });

  it('asks the parent to open the menu for its own row and column', () => {
    renderBody({ columns, currentData });
    fireEvent.click(screen.getByText('Review'));
    expect(handlers.toggleDropdown).toHaveBeenCalledWith(0, 1);
  });

  it('opens only the menu the parent named', () => {
    renderBody({ columns, currentData, openDropdown: '0-1' });
    expect(screen.getByText('Approve')).toBeInTheDocument();
    // The danger styling is a per-action opt-in.
    expect(screen.getByText('Reject').className).toBe('dropdown-item danger');
    expect(screen.getByText('Approve').className).toBe('dropdown-item ');
  });

  it('stays shut when the parent named a different cell', () => {
    renderBody({ columns, currentData, openDropdown: '0-0' });
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
  });

  it('runs the action against its row and closes the menu', () => {
    renderBody({ columns, currentData, openDropdown: '0-1' });
    fireEvent.click(screen.getByText('Approve'));
    expect(columnActions[0].onClick).toHaveBeenCalledWith(currentData[0]);
    expect(handlers.setOpenDropdown).toHaveBeenCalledWith(null);
  });
});

describe('the row action menu', () => {
  const actions = [
    { label: 'View profile', onClick: vi.fn() },
    { label: 'Delete', className: 'danger', onClick: vi.fn() },
  ];
  const withActions = {
    showActions: true,
    actions,
    currentData: [{ name: 'Acme', hasActions: true }],
  };

  it('gives a menu only to the rows that carry actions', () => {
    renderBody({
      showActions: true,
      actions,
      currentData: [{ name: 'Acme', hasActions: false }],
    });
    expect(screen.queryByLabelText('Row actions')).not.toBeInTheDocument();
    expect(document.body.querySelector('.action-cell')).toBeInTheDocument();
  });

  it('asks the parent to open the menu for its row', () => {
    renderBody(withActions);
    fireEvent.click(screen.getByLabelText('Row actions'));
    expect(handlers.toggleDropdown).toHaveBeenCalledWith(0, 'action');
  });

  it('opens only the row the parent named', () => {
    renderBody({
      ...withActions,
      currentData: [
        { name: 'Acme', hasActions: true },
        { name: 'Globex', hasActions: true },
      ],
      openDropdown: '1-action',
    });
    expect(screen.getAllByText('Delete')).toHaveLength(1);
  });

  it('runs the action against its row and closes the menu', () => {
    renderBody({ ...withActions, openDropdown: '0-action' });
    fireEvent.click(screen.getByText('Delete'));
    expect(actions[1].onClick).toHaveBeenCalledWith(withActions.currentData[0]);
    expect(handlers.setOpenDropdown).toHaveBeenCalledWith(null);
  });
});

describe('the inferred name link', () => {
  const row = { name: 'Acme', status: 'Open', hasActions: true };

  it('turns the first plain column into a link to the view action', () => {
    const onClick = vi.fn();
    renderBody({
      columns: [{ header: 'Name', key: 'name' }],
      currentData: [row],
      actions: [{ label: 'View profile', onClick }],
    });
    const link = screen.getByText('Acme');
    expect(link).toHaveClass('table-link-cell');
    expect(link).toHaveAttribute('title', 'View profile');

    fireEvent.click(link);
    expect(onClick).toHaveBeenCalledWith(row);
  });

  it('falls back to an edit action when nothing looks like a view', () => {
    renderBody({
      columns: [{ header: 'Name', key: 'name' }],
      currentData: [row],
      actions: [{ label: 'Suspend', onClick: vi.fn() }, { label: 'Edit tenant', onClick: vi.fn() }],
    });
    expect(screen.getByText('Acme')).toHaveAttribute('title', 'Edit tenant');
  });

  it('prefers a view action over an edit action wherever both exist', () => {
    renderBody({
      columns: [{ header: 'Name', key: 'name' }],
      currentData: [row],
      actions: [{ label: 'Edit tenant', onClick: vi.fn() }, { label: 'View details', onClick: vi.fn() }],
    });
    expect(screen.getByText('Acme')).toHaveAttribute('title', 'View details');
  });

  it('leaves the name plain when no action looks like either', () => {
    renderBody({
      columns: [{ header: 'Name', key: 'name' }],
      currentData: [row],
      actions: [{ label: 'Suspend', onClick: vi.fn() }],
    });
    expect(screen.getByText('Acme')).not.toHaveClass('table-link-cell');
  });

  it('survives an action entry with no label at all', () => {
    renderBody({
      columns: [{ header: 'Name', key: 'name' }],
      currentData: [row],
      actions: [{ onClick: vi.fn() }, null],
    });
    expect(screen.getByText('Acme')).not.toHaveClass('table-link-cell');
  });

  it('leaves the name plain when the table has no action list', () => {
    renderBody({
      columns: [{ header: 'Name', key: 'name' }],
      currentData: [row],
      actions: undefined,
    });
    expect(screen.getByText('Acme')).not.toHaveClass('table-link-cell');
  });

  it('leaves the name plain on a row that carries no actions', () => {
    renderBody({
      columns: [{ header: 'Name', key: 'name' }],
      currentData: [{ name: 'Acme', hasActions: false }],
      actions: [{ label: 'View profile', onClick: vi.fn() }],
    });
    expect(screen.getByText('Acme')).not.toHaveClass('table-link-cell');
  });

  it('skips typed and menu columns when looking for the name', () => {
    renderBody({
      columns: [
        { header: 'Status', key: 'status', type: 'status' },
        { header: 'Name', key: 'name' },
      ],
      currentData: [row],
      actions: [{ label: 'View profile', onClick: vi.fn() }],
    });
    expect(screen.getByText('Acme')).toHaveClass('table-link-cell');
    expect(screen.getByText('Open')).toHaveClass('status-label');
  });
});
