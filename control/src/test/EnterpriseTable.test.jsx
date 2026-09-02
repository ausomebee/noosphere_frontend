import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

// A probe stands in for the table so the flattened rows, the row actions and
// the activation callback can all be inspected directly — including the
// out-of-range index that the real table would never produce.
const table = vi.hoisted(() => ({ props: null }));
vi.mock('../Components/Table/CustomTable', () => ({
  default: (props) => {
    table.props = props;
    return <div data-testid="table" />;
  },
}));

const state = {
  authentication: { accessToken: 'at', refreshToken: 'rt', user: { id: 'u1' } },
};
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (fn) => fn(state),
}));

import EnterpriseTable from '../Pages/BillingsAndPayment/EnterpriseTable';

/**
 * The enterprise half of the plans page.
 *
 * It is a flattening layer: each plan is copied into a row with a display name
 * assembled from whichever of `name` or `organization` the record happens to
 * carry, and the original plan is tucked under `_raw` so every callback hands
 * the untouched record back up rather than the flattened row. The activation
 * switch is a single callback that decides between "activate" and "deactivate"
 * from the row's own state, so both directions run through one handler.
 */

const plan = (over = {}) => ({
  id: 'p1',
  name: 'Acme Corp',
  dateAdded: '2026-01-04',
  accountManagerName: 'Ada Bell',
  status: 'active',
  ...over,
});

let handlers;

const renderTable = (plans = [plan()]) => {
  handlers = {
    onStatusChange: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };
  return render(<EnterpriseTable plans={plans} {...handlers} />);
};

const rows = () => table.props.data;
const labels = () => table.props.actions.map((a) => a.label);

// A role grant limited to exactly the listed permission keys.
const restrictTo = (permissions) => {
  state.authentication.user.role = {
    roleModuleAccesses: [{ module: 'BILLING', permissions }],
  };
};

beforeEach(() => {
  table.props = null;
  delete state.authentication.user.role;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('flattening the plans', () => {
  it('names a plan from its own name', () => {
    renderTable();
    expect(rows()[0].enterpriseName).toBe('Acme Corp');
    expect(rows()[0].accountManager).toBe('Ada Bell');
    expect(rows()[0].active).toBe(true);
  });

  it('falls back to the organization when there is no plan name', () => {
    renderTable([plan({ name: '', organization: 'Acme Holdings' })]);
    expect(rows()[0].enterpriseName).toBe('Acme Holdings');
  });

  it('dashes a plan with neither a name nor an organization', () => {
    renderTable([plan({ name: null, organization: null })]);
    expect(rows()[0].enterpriseName).toBe('—');
  });

  it('dashes a plan with no account manager', () => {
    renderTable([plan({ accountManagerName: '' })]);
    expect(rows()[0].accountManager).toBe('—');
  });

  it('treats any status other than active as inactive', () => {
    renderTable([plan({ status: 'suspended' })]);
    expect(rows()[0].active).toBe(false);
  });

  it('keeps the untouched plan alongside the flattened row', () => {
    const original = plan();
    renderTable([original]);
    expect(rows()[0]._raw).toBe(original);
    expect(rows()[0].hasActions).toBe(true);
  });

  it('hands the table an empty list when there are no plans', () => {
    renderTable([]);
    expect(rows()).toEqual([]);
    expect(table.props.tableName).toBe('Enterprise Plans');
  });
});

describe('the row actions', () => {
  it('offers both actions to an unrestricted admin', () => {
    renderTable();
    expect(labels()).toEqual(['Edit Plan', 'Remove Plan']);
  });

  it('edits with the original plan and the enterprise scope', () => {
    const original = plan();
    renderTable([original]);
    act(() => { table.props.actions[0].onClick(rows()[0]); });
    expect(handlers.onEdit).toHaveBeenCalledWith(original, 'enterprise');
  });

  it('deletes with the original plan and the enterprise scope', () => {
    const original = plan();
    renderTable([original]);
    act(() => { table.props.actions[1].onClick(rows()[0]); });
    expect(handlers.onDelete).toHaveBeenCalledWith(original, 'enterprise');
  });

  it('drops the edit entry for an admin who may only delete', () => {
    restrictTo(['view_plan', 'delete_plan']);
    renderTable();
    expect(labels()).toEqual(['Remove Plan']);
  });

  it('drops the delete entry for an admin who may only edit', () => {
    restrictTo(['view_plan', 'edit_plan']);
    renderTable();
    expect(labels()).toEqual(['Edit Plan']);
  });

  it('leaves the menu empty for an admin who may do neither', () => {
    restrictTo(['view_plan']);
    renderTable();
    expect(labels()).toEqual([]);
  });
});

describe('the activation switch', () => {
  it('asks to deactivate a plan that is currently active', () => {
    const original = plan();
    renderTable([original]);
    act(() => { table.props.onToggleActive(0); });
    expect(handlers.onStatusChange).toHaveBeenCalledWith(
      original,
      'deactivate',
      'enterprise'
    );
  });

  it('asks to activate a plan that is currently off', () => {
    const original = plan({ status: 'inactive' });
    renderTable([original]);
    act(() => { table.props.onToggleActive(0); });
    expect(handlers.onStatusChange).toHaveBeenCalledWith(
      original,
      'activate',
      'enterprise'
    );
  });

  it('does nothing for a row index past the end of the list', () => {
    renderTable();
    act(() => { table.props.onToggleActive(9); });
    expect(handlers.onStatusChange).not.toHaveBeenCalled();
  });

  it('is wired only when both halves of the permission are granted', () => {
    restrictTo(['view_plan', 'activate_plan', 'deactivate_plan']);
    renderTable();
    expect(table.props.onToggleActive).toBeInstanceOf(Function);
  });

  it('is withheld from an admin granted only one half of it', () => {
    restrictTo(['view_plan', 'deactivate_plan']);
    renderTable();
    expect(table.props.onToggleActive).toBeUndefined();
  });
});
