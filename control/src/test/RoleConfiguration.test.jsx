import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const showToast = vi.fn();
const showApiError = vi.fn();
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => showToast(...a),
  showApiError: (...a) => showApiError(...a),
}));

const roleApi = vi.hoisted(() => ({
  GetRoleById: vi.fn(),
  CreateRole: vi.fn(),
  UpdateRole: vi.fn(),
}));
vi.mock('../api/roleApis', () => ({ default: roleApi }));

// `params` is reassigned per test so the same module can be rendered in both
// create mode (no roleId) and edit mode.
const { navigate, params } = vi.hoisted(() => ({ navigate: vi.fn(), params: {} }));
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useParams: () => params,
}));

const state = {
  authentication: { accessToken: 'at', refreshToken: 'rt', user: { id: 'admin-1' } },
};
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (fn) => fn(state),
}));

import RoleConfiguration from '../Pages/Settings/SettingsSubs/RoleConfiguration';

/**
 * The role builder, a two-tab wizard that doubles as the create and the edit
 * screen: the presence of a `roleId` route param is the only thing that tells
 * the two apart, so every test here sets or clears `params.roleId` first.
 *
 * Loading an existing role has to map backend module names onto the local
 * `permissionsConfig`, and it accepts three spellings for the same module — the
 * module's `backendKey`, or any of its sections' `key` or `name`. Several tests
 * below feed it each spelling, because only the first is what the API actually
 * sends today and the other two arms would otherwise never run.
 *
 * The tab lives in sessionStorage via `usePersistedTab`, so it is cleared
 * between tests; otherwise a test that ends on the permissions tab hands the
 * next one a page that never renders the basic settings.
 */

const nameInput = () => document.querySelector('input.input-text');
const levelSelect = () => document.querySelector('select.input-select');
const moduleBox = (label) =>
  screen.getByText(label).closest('label').querySelector('input[type="checkbox"]');
const permBox = (label) =>
  screen.getByText(label).closest('label').querySelector('input[type="checkbox"]');
const buttonLabelled = (text) =>
  screen.getAllByText(text).map((n) => n.closest('button')).find(Boolean);

// The shortest legal trip through the basic tab.
const fillBasics = ({ level = 'GLOBAL' } = {}) => {
  fireEvent.change(nameInput(), { target: { value: 'Support Lead' } });
  fireEvent.click(moduleBox('Tenant'));
  fireEvent.change(levelSelect(), { target: { value: level } });
};

const goToPermissions = () => fireEvent.click(buttonLabelled('Next'));

const role = (over = {}) => ({
  name: 'Support Lead',
  dataAccessLevel: 'TEAM',
  roleModuleAccesses: [
    { id: 'ma-tenant', module: 'TENANT', permissions: ['view_pipeline'] },
  ],
  ...over,
});

const renderEditing = async (data = role()) => {
  params.roleId = 'role-1';
  roleApi.GetRoleById.mockResolvedValue({ data });
  const view = render(<RoleConfiguration />);
  await waitFor(() => expect(roleApi.GetRoleById).toHaveBeenCalled());
  await waitFor(() => expect(nameInput()).toBeTruthy());
  return view;
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  delete params.roleId;
  roleApi.CreateRole.mockResolvedValue({});
  roleApi.UpdateRole.mockResolvedValue({});
  roleApi.GetRoleById.mockResolvedValue({ data: role() });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('creating a role', () => {
  it('opens on an empty basic settings tab and fetches nothing', () => {
    render(<RoleConfiguration />);
    expect(nameInput().value).toBe('');
    expect(levelSelect().value).toBe('');
    expect(roleApi.GetRoleById).not.toHaveBeenCalled();
  });

  it('offers every configured module as a checkbox', () => {
    render(<RoleConfiguration />);
    expect(moduleBox('Tenant').checked).toBe(false);
    expect(moduleBox('Billing & Payments')).toBeTruthy();
    expect(moduleBox('Settings')).toBeTruthy();
  });

  it('drops the placeholder entry from the access level list', () => {
    render(<RoleConfiguration />);
    // The config carries a { value: "" } row that SelectInput filters out in
    // favour of its own placeholder, so "Select Data Access Level" must not
    // appear twice.
    const labels = [...levelSelect().options].map((o) => o.textContent);
    expect(labels).toEqual([
      '-- Select Select Data Access Level --',
      'Global',
      'Team',
      'Individual',
    ]);
  });

  it('ticks and unticks a module', () => {
    render(<RoleConfiguration />);
    fireEvent.click(moduleBox('Tenant'));
    expect(moduleBox('Tenant').checked).toBe(true);
    fireEvent.click(moduleBox('Tenant'));
    expect(moduleBox('Tenant').checked).toBe(false);
  });

  it('labels the final button Create Role', () => {
    render(<RoleConfiguration />);
    fillBasics();
    goToPermissions();
    expect(screen.getByText('Create Role')).toBeInTheDocument();
  });

  it('sends the built module accesses and returns to the role list', async () => {
    render(<RoleConfiguration />);
    fillBasics();
    goToPermissions();

    fireEvent.click(screen.getByText('TENANT'));
    fireEvent.click(permBox('View pipeline'));
    await act(async () => {
      fireEvent.click(buttonLabelled('Create Role'));
    });

    expect(roleApi.CreateRole).toHaveBeenCalledWith({
      name: 'Support Lead',
      dataAccessLevel: 'GLOBAL',
      createdByAdminId: 'admin-1',
      moduleAccesses: [{ module: 'TENANT', permissions: ['view_pipeline'] }],
      accessToken: 'at',
      refreshToken: 'rt',
    });
    expect(showToast).toHaveBeenCalledWith('Role created successfully', 'success');
    expect(navigate).toHaveBeenCalledWith('/settings/roles-permissions');
  });

  it('saves straight away without asking for confirmation', async () => {
    render(<RoleConfiguration />);
    fillBasics();
    goToPermissions();
    fireEvent.click(screen.getByText('TENANT'));
    fireEvent.click(permBox('View pipeline'));
    await act(async () => {
      fireEvent.click(buttonLabelled('Create Role'));
    });
    expect(screen.queryByText('Update role')).not.toBeInTheDocument();
  });

  it('omits a selected module that was granted no permissions', async () => {
    render(<RoleConfiguration />);
    fillBasics();
    fireEvent.click(moduleBox('Settings'));
    goToPermissions();
    fireEvent.click(screen.getByText('TENANT'));
    fireEvent.click(permBox('View pipeline'));

    await act(async () => {
      fireEvent.click(buttonLabelled('Create Role'));
    });
    expect(roleApi.CreateRole).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleAccesses: [{ module: 'TENANT', permissions: ['view_pipeline'] }],
      })
    );
  });

  it('trims the role name before sending it', async () => {
    render(<RoleConfiguration />);
    fireEvent.change(nameInput(), { target: { value: '  Support Lead  ' } });
    fireEvent.click(moduleBox('Tenant'));
    fireEvent.change(levelSelect(), { target: { value: 'INDIVIDUAL' } });
    goToPermissions();
    fireEvent.click(screen.getByText('TENANT'));
    fireEvent.click(permBox('View pipeline'));
    await act(async () => {
      fireEvent.click(buttonLabelled('Create Role'));
    });
    expect(roleApi.CreateRole).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Support Lead' })
    );
  });

  it('reports a refused save and stays on the page', async () => {
    roleApi.CreateRole.mockRejectedValue(new Error('duplicate name'));
    render(<RoleConfiguration />);
    fillBasics();
    goToPermissions();
    fireEvent.click(screen.getByText('TENANT'));
    fireEvent.click(permBox('View pipeline'));
    await act(async () => {
      fireEvent.click(buttonLabelled('Create Role'));
    });
    expect(showApiError).toHaveBeenCalledWith(expect.any(Error), 'SAVE_ROLE');
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('the basic settings guards', () => {
  it('refuses a blank role name', () => {
    render(<RoleConfiguration />);
    fireEvent.click(moduleBox('Tenant'));
    fireEvent.change(levelSelect(), { target: { value: 'GLOBAL' } });
    goToPermissions();
    expect(showToast).toHaveBeenCalledWith('Role name is required', 'error');
    expect(screen.getByText('Select Module Access')).toBeInTheDocument();
  });

  it('refuses a role name that is only whitespace', () => {
    render(<RoleConfiguration />);
    fireEvent.change(nameInput(), { target: { value: '   ' } });
    goToPermissions();
    expect(showToast).toHaveBeenCalledWith('Role name is required', 'error');
  });

  it('refuses a role with no module selected', () => {
    render(<RoleConfiguration />);
    fireEvent.change(nameInput(), { target: { value: 'Support Lead' } });
    fireEvent.change(levelSelect(), { target: { value: 'GLOBAL' } });
    goToPermissions();
    expect(showToast).toHaveBeenCalledWith(
      'Please select at least one module',
      'error'
    );
  });

  it('refuses a role with no data access level', () => {
    render(<RoleConfiguration />);
    fireEvent.change(nameInput(), { target: { value: 'Support Lead' } });
    fireEvent.click(moduleBox('Tenant'));
    goToPermissions();
    expect(showToast).toHaveBeenCalledWith(
      'Please select a data access level',
      'error'
    );
  });

  it('moves on once all three are supplied', () => {
    render(<RoleConfiguration />);
    fillBasics();
    goToPermissions();
    expect(screen.getByText('Set permissions for this role')).toBeInTheDocument();
    expect(showToast).not.toHaveBeenCalled();
  });
});

describe('the permissions tab', () => {
  const openTenant = () => {
    render(<RoleConfiguration />);
    fillBasics();
    goToPermissions();
    fireEvent.click(screen.getByText('TENANT'));
  };

  it('lists only the modules that were ticked', () => {
    render(<RoleConfiguration />);
    fillBasics();
    goToPermissions();
    expect(screen.getByText('TENANT')).toBeInTheDocument();
    expect(screen.queryByText('SETTINGS')).not.toBeInTheDocument();
  });

  it('starts every accordion closed', () => {
    render(<RoleConfiguration />);
    fillBasics();
    goToPermissions();
    expect(screen.getByText('TENANT').closest('[role="button"]')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.queryByText('View pipeline')).not.toBeInTheDocument();
  });

  it('opens and closes an accordion', () => {
    openTenant();
    expect(screen.getByText('View pipeline')).toBeInTheDocument();
    fireEvent.click(screen.getByText('TENANT'));
    expect(screen.queryByText('View pipeline')).not.toBeInTheDocument();
  });

  it('toggles a single permission on and off', () => {
    openTenant();
    fireEvent.click(permBox('View pipeline'));
    expect(permBox('View pipeline').checked).toBe(true);
    fireEvent.click(permBox('View pipeline'));
    expect(permBox('View pipeline').checked).toBe(false);
  });

  it('grants every permission in a section at once', () => {
    openTenant();
    const grantAll = screen
      .getAllByText('Grant all permissions')[0]
      .closest('label')
      .querySelector('input');
    fireEvent.click(grantAll);
    expect(permBox('View pipeline').checked).toBe(true);
    expect(permBox('Generate payment link').checked).toBe(true);
    // The header checkbox is derived, so it now reads as ticked too.
    expect(grantAll.checked).toBe(true);
  });

  it('revokes a whole section again', () => {
    openTenant();
    const grantAll = screen
      .getAllByText('Grant all permissions')[0]
      .closest('label')
      .querySelector('input');
    fireEvent.click(grantAll);
    fireEvent.click(grantAll);
    expect(permBox('View pipeline').checked).toBe(false);
  });

  it('unticks grant-all as soon as one permission is revoked', () => {
    openTenant();
    const grantAll = screen
      .getAllByText('Grant all permissions')[0]
      .closest('label')
      .querySelector('input');
    fireEvent.click(grantAll);
    fireEvent.click(permBox('View pipeline'));
    expect(grantAll.checked).toBe(false);
  });

  it('goes back to basic settings with Previous', () => {
    openTenant();
    fireEvent.click(buttonLabelled('Previous'));
    expect(screen.getByText('Select Module Access')).toBeInTheDocument();
  });

  it('is reachable directly from the tab bar', () => {
    render(<RoleConfiguration />);
    fireEvent.click(screen.getByText('Permissions'));
    expect(screen.getByText('Set permissions for this role')).toBeInTheDocument();
    // Nothing was selected, so the list is empty rather than absent.
    expect(document.querySelector('.role-accordion')).toBeNull();
  });

  it('returns to basic settings from the tab bar', () => {
    render(<RoleConfiguration />);
    fireEvent.click(screen.getByText('Permissions'));
    fireEvent.click(screen.getByText('Basic Settings'));
    expect(screen.getByText('Select Module Access')).toBeInTheDocument();
  });
});

describe('the save guards', () => {
  it('refuses to save a role whose name was cleared', () => {
    render(<RoleConfiguration />);
    fillBasics();
    goToPermissions();
    fireEvent.click(buttonLabelled('Previous'));
    fireEvent.change(nameInput(), { target: { value: '' } });
    fireEvent.click(screen.getByText('Permissions'));

    fireEvent.click(buttonLabelled('Create Role'));
    expect(showToast).toHaveBeenCalledWith('Role name is required', 'error');
    expect(roleApi.CreateRole).not.toHaveBeenCalled();
  });

  it('refuses to save a role whose access level was cleared', () => {
    render(<RoleConfiguration />);
    fillBasics();
    goToPermissions();
    fireEvent.click(buttonLabelled('Previous'));
    fireEvent.change(levelSelect(), { target: { value: '' } });
    fireEvent.click(screen.getByText('Permissions'));

    fireEvent.click(buttonLabelled('Create Role'));
    expect(showToast).toHaveBeenCalledWith('Data access level is required', 'error');
    expect(roleApi.CreateRole).not.toHaveBeenCalled();
  });
});

describe('loading an existing role', () => {
  it('shows skeletons until the role arrives', async () => {
    params.roleId = 'role-1';
    let release;
    roleApi.GetRoleById.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve({ data: role() });
      })
    );
    render(<RoleConfiguration />);
    expect(document.querySelectorAll('.skeleton-shimmer').length).toBe(4);
    expect(nameInput()).toBeNull();

    await act(async () => {
      release();
    });
    await waitFor(() => expect(nameInput()).toBeTruthy());
    expect(document.querySelector('.skeleton-shimmer')).toBeNull();
  });

  it('fills the form from the fetched role', async () => {
    await renderEditing();
    expect(roleApi.GetRoleById).toHaveBeenCalledWith({
      id: 'role-1',
      accessToken: 'at',
      refreshToken: 'rt',
    });
    expect(nameInput().value).toBe('Support Lead');
    expect(levelSelect().value).toBe('TEAM');
    expect(moduleBox('Tenant').checked).toBe(true);
  });

  it('blanks a role that carries neither a name nor a level', async () => {
    await renderEditing(role({ name: null, dataAccessLevel: null }));
    expect(nameInput().value).toBe('');
    expect(levelSelect().value).toBe('');
  });

  it('matches a module named by one of its section keys', async () => {
    await renderEditing(
      role({
        roleModuleAccesses: [
          { id: 'ma-1', module: 'pipeline', permissions: ['view_pipeline'] },
        ],
      })
    );
    expect(moduleBox('Tenant').checked).toBe(true);
  });

  it('matches a module named by one of its section names', async () => {
    await renderEditing(
      role({
        roleModuleAccesses: [
          { id: 'ma-1', module: 'Tenant List', permissions: ['view_tenant_list'] },
        ],
      })
    );
    expect(moduleBox('Tenant').checked).toBe(true);
  });

  it('ticks a module only once when two accesses map onto it', async () => {
    await renderEditing(
      role({
        roleModuleAccesses: [
          { id: 'ma-1', module: 'TENANT', permissions: ['view_pipeline'] },
          { id: 'ma-2', module: 'pipeline', permissions: ['add_prospect'] },
        ],
      })
    );
    const ticked = [...document.querySelectorAll('.role-module-item input')].filter(
      (box) => box.checked
    );
    expect(ticked.length).toBe(1);
  });

  it('keeps the permissions of a module it cannot place', async () => {
    await renderEditing(
      role({
        roleModuleAccesses: [
          { id: 'ma-1', module: 'REPORTING', permissions: ['view_pipeline'] },
        ],
      })
    );
    // No module matched, so nothing is ticked, but the permission was still
    // recorded and shows up once its module is ticked by hand.
    expect(moduleBox('Tenant').checked).toBe(false);
    fireEvent.click(moduleBox('Tenant'));
    fireEvent.click(screen.getByText('Permissions'));
    fireEvent.click(screen.getByText('TENANT'));
    expect(permBox('View pipeline').checked).toBe(true);
  });

  it('copes with an access that lists no permissions', async () => {
    await renderEditing(
      role({ roleModuleAccesses: [{ id: 'ma-1', module: 'TENANT' }] })
    );
    fireEvent.click(screen.getByText('Permissions'));
    fireEvent.click(screen.getByText('TENANT'));
    expect(permBox('View pipeline').checked).toBe(false);
  });

  it('copes with a role that has no module accesses at all', async () => {
    await renderEditing(role({ roleModuleAccesses: [] }));
    expect(moduleBox('Tenant').checked).toBe(false);
  });

  it('copes with a role missing the module access field', async () => {
    await renderEditing(role({ roleModuleAccesses: undefined }));
    expect(moduleBox('Tenant').checked).toBe(false);
  });

  it('reports a failed fetch and leaves the form empty', async () => {
    params.roleId = 'role-1';
    roleApi.GetRoleById.mockRejectedValue(new Error('gone'));
    render(<RoleConfiguration />);
    await waitFor(() =>
      expect(showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOAD_ROLE')
    );
    await waitFor(() => expect(nameInput()).toBeTruthy());
    expect(nameInput().value).toBe('');
  });
});

describe('editing an existing role', () => {
  const openSave = async (data) => {
    await renderEditing(data);
    fireEvent.click(screen.getByText('Permissions'));
    fireEvent.click(buttonLabelled('Save Changes'));
    await waitFor(() => expect(screen.getByText('Update role')).toBeInTheDocument());
  };

  it('labels the final button Save Changes', async () => {
    await renderEditing();
    fireEvent.click(screen.getByText('Permissions'));
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.queryByText('Create Role')).not.toBeInTheDocument();
  });

  it('asks for confirmation before saving', async () => {
    await openSave();
    expect(
      screen.getByText('Are you sure you want to save changes to this role?')
    ).toBeInTheDocument();
    expect(roleApi.UpdateRole).not.toHaveBeenCalled();
  });

  it('sends the update, carrying the existing module access id', async () => {
    await openSave();
    await act(async () => {
      fireEvent.click(document.body.querySelector('.primary-button'));
    });

    expect(roleApi.UpdateRole).toHaveBeenCalledWith({
      id: 'role-1',
      name: 'Support Lead',
      dataAccessLevel: 'TEAM',
      moduleAccesses: [
        { module: 'TENANT', permissions: ['view_pipeline'], id: 'ma-tenant' },
      ],
      accessToken: 'at',
      refreshToken: 'rt',
    });
    expect(showToast).toHaveBeenCalledWith('Role updated successfully', 'success');
    expect(navigate).toHaveBeenCalledWith('/settings/roles-permissions');
  });

  it('omits the access id for a module that had none before', async () => {
    // The module was matched through a section key, so the map is keyed by
    // TENANT and this second module never got an id.
    await openSave(
      role({
        roleModuleAccesses: [
          { id: 'ma-1', module: 'SETTINGS', permissions: ['view_roles'] },
        ],
      })
    );
    await act(async () => {
      fireEvent.click(document.body.querySelector('.primary-button'));
    });
    expect(roleApi.UpdateRole).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleAccesses: [
          { module: 'SETTINGS', permissions: ['view_roles'], id: 'ma-1' },
        ],
      })
    );
  });

  it('sends a newly ticked module with no id of its own', async () => {
    // The fetched role only knew about TENANT, so SETTINGS is ticked here for
    // the first time and has no row in the access map to carry an id from.
    await renderEditing();
    fireEvent.click(moduleBox('Settings'));
    fireEvent.click(screen.getByText('Permissions'));
    fireEvent.click(screen.getByText('SETTINGS'));
    fireEvent.click(permBox('View roles'));
    fireEvent.click(buttonLabelled('Save Changes'));
    await waitFor(() => expect(screen.getByText('Update role')).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(document.body.querySelector('.primary-button'));
    });

    expect(roleApi.UpdateRole).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleAccesses: [
          { module: 'TENANT', permissions: ['view_pipeline'], id: 'ma-tenant' },
          { module: 'SETTINGS', permissions: ['view_roles'] },
        ],
      })
    );
  });

  it('abandons the save when the confirmation is cancelled', async () => {
    await openSave();
    fireEvent.click(document.body.querySelector('.secondary-button'));
    await waitFor(() => expect(screen.queryByText('Update role')).toBeNull());
    expect(roleApi.UpdateRole).not.toHaveBeenCalled();
  });

  it('reports a refused update', async () => {
    roleApi.UpdateRole.mockRejectedValue(new Error('conflict'));
    await openSave();
    await act(async () => {
      fireEvent.click(document.body.querySelector('.primary-button'));
    });
    expect(showApiError).toHaveBeenCalledWith(expect.any(Error), 'SAVE_ROLE');
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('leaving the page', () => {
  it('goes back from the back arrow', () => {
    render(<RoleConfiguration />);
    fireEvent.click(screen.getByText('Back'));
    expect(navigate).toHaveBeenCalledWith('/settings/roles-permissions');
  });

  it('goes back from Cancel on the basic tab', () => {
    render(<RoleConfiguration />);
    fireEvent.click(buttonLabelled('Cancel'));
    expect(navigate).toHaveBeenCalledWith('/settings/roles-permissions');
  });
});

describe('the remembered tab', () => {
  it('reopens on the tab that was last used', () => {
    sessionStorage.setItem('tab:control:roleConfig', 'permissions');
    render(<RoleConfiguration />);
    expect(screen.getByText('Set permissions for this role')).toBeInTheDocument();
  });

  it('records the tab it moves to', () => {
    render(<RoleConfiguration />);
    fireEvent.click(screen.getByText('Permissions'));
    expect(sessionStorage.getItem('tab:control:roleConfig')).toBe('permissions');
  });
});
