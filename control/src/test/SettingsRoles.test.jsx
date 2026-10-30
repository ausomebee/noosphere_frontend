import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

const showToast = vi.fn();
const showApiError = vi.fn();
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => showToast(...a),
  showApiError: (...a) => showApiError(...a),
}));

const roleApi = vi.hoisted(() => ({
  GetRolesByModule: vi.fn(),
  ActivateRole: vi.fn(),
  DeactivateRole: vi.fn(),
}));
vi.mock('../api/roleApis', () => ({ default: roleApi }));

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

// The real table renders the activation switch only for a column of type
// "active", and Roles declares no such column — so `onToggleActive` can never be
// reached through the real DOM. A probe stands in for the table so the handler,
// the row actions and the filter callback can all be driven directly.
const table = vi.hoisted(() => ({ props: null }));
vi.mock('../Components/Table/CustomTable', () => ({
  default: (props) => {
    table.props = props;
    return (
      <div data-testid="table">
        {props.data.map((row) => (
          <div key={row.id} data-testid="row">{`${row.role}:${row.status}`}</div>
        ))}
      </div>
    );
  },
}));

const state = {
  authentication: { accessToken: 'at', refreshToken: 'rt', user: { id: 'u1' } },
};
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (fn) => fn(state),
}));

import Roles from '../Pages/Settings/SettingsSubs/Roles';

/**
 * The roles tab of Settings.
 *
 * It is a thin mapping layer over one lookup: every role is flattened to a row
 * whose `status` string is derived from `isActive`, and whose activation switch
 * calls one of two different endpoints depending on which way it is being
 * flipped. The optimistic update is what makes the toggle interesting — the row
 * flips in place before anything is refetched, and a refused call leaves the
 * old value standing.
 *
 * Both create and edit are pure navigations, so the assertions below pin the
 * URLs rather than any request.
 */

const role = (over = {}) => ({
  id: 'r1',
  name: 'Support Agent',
  dataAccessLevel: 'Department',
  isActive: true,
  ...over,
});

const renderPage = async () => {
  const view = render(<Roles />);
  await waitFor(() => expect(screen.getByTestId('table')).toBeInTheDocument());
  return view;
};

// A role grant limited to exactly the listed permission keys.
const restrictTo = (permissions) => {
  state.authentication.user.role = {
    roleModuleAccesses: [{ module: 'SETTINGS', permissions }],
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  table.props = null;
  delete state.authentication.user.role;
  roleApi.GetRolesByModule.mockResolvedValue({ data: [role()] });
  roleApi.ActivateRole.mockResolvedValue({});
  roleApi.DeactivateRole.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loading the tab', () => {
  it('shows a skeleton until the roles arrive', async () => {
    let release;
    roleApi.GetRolesByModule.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve({ data: [role()] });
      })
    );
    render(<Roles />);
    expect(document.body.querySelector('.skeleton-table')).toBeInTheDocument();
    await act(async () => { release(); });
    await waitFor(() => expect(screen.getByTestId('table')).toBeInTheDocument());
  });

  it('asks for the roles with the stored tokens', async () => {
    await renderPage();
    expect(roleApi.GetRolesByModule).toHaveBeenCalledWith({
      accessToken: 'at',
      refreshToken: 'rt',
    });
  });

  it('labels an active role Active and an inactive one Inactive', async () => {
    roleApi.GetRolesByModule.mockResolvedValue({
      data: [role(), role({ id: 'r2', name: 'Auditor', isActive: false })],
    });
    await renderPage();
    const rows = screen.getAllByTestId('row').map((r) => r.textContent);
    expect(rows).toEqual(['Support Agent:Active', 'Auditor:Inactive']);
  });

  it('treats a response with no data as an empty list', async () => {
    roleApi.GetRolesByModule.mockResolvedValue({});
    await renderPage();
    expect(screen.queryAllByTestId('row')).toHaveLength(0);
  });

  it('reports a failed lookup and stops the skeleton', async () => {
    roleApi.GetRolesByModule.mockRejectedValue(new Error('offline'));
    await renderPage();
    expect(showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOAD_ROLES');
    expect(document.body.querySelector('.skeleton-table')).toBeNull();
  });
});

describe('permissions', () => {
  it('offers the add button and the edit action to an unrestricted admin', async () => {
    await renderPage();
    expect(screen.getByText('Add new role')).toBeInTheDocument();
    expect(table.props.actions.map((a) => a.label)).toEqual(['Edit Role']);
  });

  it('hides the add button from an admin who may not create', async () => {
    restrictTo(['view_role', 'edit_role']);
    await renderPage();
    expect(screen.queryByText('Add new role')).not.toBeInTheDocument();
  });

  it('leaves the row menu empty for an admin who may not edit', async () => {
    restrictTo(['view_role']);
    await renderPage();
    expect(table.props.actions).toEqual([]);
  });

  it('wires the switch only when both activate and deactivate are granted', async () => {
    restrictTo(['view_role', 'activate_role', 'deactivate_role']);
    await renderPage();
    expect(table.props.onToggleActive).toBeInstanceOf(Function);
  });

  it('withholds the switch from an admin granted only one half of it', async () => {
    restrictTo(['view_role', 'activate_role']);
    await renderPage();
    expect(table.props.onToggleActive).toBeUndefined();
  });
});

describe('navigating', () => {
  it('opens a blank configuration screen from the add button', async () => {
    await renderPage();
    act(() => { screen.getByText('Add new role').click(); });
    expect(navigate).toHaveBeenCalledWith('/settings/roles-permissions/configure');
  });

  it('opens the configuration screen for the row that was picked', async () => {
    await renderPage();
    act(() => { table.props.actions[0].onClick({ id: 'r1' }); });
    expect(navigate).toHaveBeenCalledWith('/settings/roles-permissions/configure/r1');
  });
});

describe('flipping a role on and off', () => {
  it('deactivates an active role and flips only that row', async () => {
    roleApi.GetRolesByModule.mockResolvedValue({
      data: [role(), role({ id: 'r2', name: 'Auditor', isActive: true })],
    });
    await renderPage();
    await act(async () => { await table.props.onToggleActive(0); });

    expect(roleApi.DeactivateRole).toHaveBeenCalledWith({
      id: 'r1',
      accessToken: 'at',
      refreshToken: 'rt',
    });
    expect(roleApi.ActivateRole).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Role deactivated', 'success');
    expect(screen.getAllByTestId('row').map((r) => r.textContent)).toEqual([
      'Support Agent:Inactive',
      'Auditor:Active',
    ]);
  });

  it('activates an inactive role through the other endpoint', async () => {
    roleApi.GetRolesByModule.mockResolvedValue({
      data: [role({ isActive: false })],
    });
    await renderPage();
    await act(async () => { await table.props.onToggleActive(0); });

    expect(roleApi.ActivateRole).toHaveBeenCalledWith({
      id: 'r1',
      accessToken: 'at',
      refreshToken: 'rt',
    });
    expect(showToast).toHaveBeenCalledWith('Role activated', 'success');
    expect(screen.getByTestId('row').textContent).toBe('Support Agent:Active');
  });

  it('does nothing for a row index that is past the end of the list', async () => {
    await renderPage();
    await act(async () => { await table.props.onToggleActive(7); });
    expect(roleApi.DeactivateRole).not.toHaveBeenCalled();
    expect(roleApi.ActivateRole).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it('leaves the row as it was when the call is refused', async () => {
    roleApi.DeactivateRole.mockRejectedValue(new Error('role is in use'));
    await renderPage();
    await act(async () => { await table.props.onToggleActive(0); });

    expect(showApiError).toHaveBeenCalledWith(expect.any(Error), 'UPDATE_ROLE_STATUS');
    expect(showToast).not.toHaveBeenCalled();
    expect(screen.getByTestId('row').textContent).toBe('Support Agent:Active');
  });
});

describe('the filter picker', () => {
  it('starts on the empty option', async () => {
    await renderPage();
    expect(table.props.filters[0].value).toBe('');
  });

  it('remembers the option the table reports back', async () => {
    await renderPage();
    await act(async () => { table.props.onFilterChange('filter_type', 'active'); });
    await waitFor(() => expect(table.props.filters[0].value).toBe('active'));
  });
});
