import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';

const showToast = vi.fn();
const showApiError = vi.fn();
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => showToast(...a),
  showApiError: (...a) => showApiError(...a),
}));

const showValidationErrors = vi.fn();
vi.mock('../Helper/formErrors', () => ({
  showValidationErrors: (...a) => showValidationErrors(...a),
}));

const staffApi = vi.hoisted(() => ({
  GetAllAdmins: vi.fn(),
  CreateAdmin: vi.fn(),
  UpdateAdmin: vi.fn(),
  ToggleAdminActive: vi.fn(),
}));
vi.mock('../api/staffApis', () => ({ default: staffApi }));

const departmentApi = vi.hoisted(() => ({ GetAllDepartments: vi.fn() }));
vi.mock('../api/departmentApis', () => ({ default: departmentApi }));

const roleApi = vi.hoisted(() => ({ GetRolesByModule: vi.fn() }));
vi.mock('../api/roleApis', () => ({ default: roleApi }));

const state = {
  authentication: { accessToken: 'at', refreshToken: 'rt', user: { id: 'u1' } },
};
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (fn) => fn(state),
}));

import Staff from '../Pages/Settings/SettingsSubs/Staff';

/**
 * The staff tab of Settings.
 *
 * The three lookups load with `Promise.allSettled`, and only the staff list is
 * treated as fatal: a failed departments or roles call is logged and the page
 * carries on with an empty picker, which is what the tests below pin.
 *
 * Saving deliberately omits the optional fields rather than sending empty
 * strings for them, because the backend rejects a blank department id. Both
 * ids are validated as UUIDs, so the fixtures use real-shaped ones.
 */

const DEPT_ID = '11111111-1111-4111-8111-111111111111';
const ROLE_ID = '22222222-2222-4222-8222-222222222222';

const admin = (over = {}) => ({
  id: 'a1',
  firstName: 'Ada',
  lastName: 'Bell',
  email: 'ada@example.com',
  phoneNumber: '08012345678',
  roleId: ROLE_ID,
  active: true,
  createdAt: '2026-01-05',
  departmentMembers: [{ departmentId: DEPT_ID }],
  ...over,
});

const renderPage = async () => {
  const view = render(<Staff />);
  await waitFor(() => expect(staffApi.GetAllAdmins).toHaveBeenCalled());
  return view;
};

// "Role" is both a column header and a form label, so fields are looked up
// inside the modal rather than across the whole page.
const inputFor = (label) => {
  const modal = document.body.querySelector('.modal-content');
  const group = within(modal)
    .getAllByText(label)
    .map((n) => n.closest('.input-group'))
    .find(Boolean);
  return group.querySelector('input, select');
};
const primary = () => document.body.querySelector('.primary-button');

const fillValid = () => {
  fireEvent.change(inputFor('First name'), { target: { value: 'Grace' } });
  fireEvent.change(inputFor('Last name'), { target: { value: 'Hopper' } });
  fireEvent.change(inputFor('Email'), { target: { value: 'grace@example.com' } });
  fireEvent.change(inputFor('Role'), { target: { value: ROLE_ID } });
};

const save = async () => {
  await act(async () => { fireEvent.click(primary()); });
};

// An admin whose role grants exactly the listed permissions and nothing else.
const restrictTo = (permissions) => {
  state.authentication.user.role = {
    roleModuleAccesses: [{ module: 'SETTINGS', permissions }],
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  delete state.authentication.user.role;
  staffApi.GetAllAdmins.mockResolvedValue({ data: [admin()] });
  staffApi.CreateAdmin.mockResolvedValue({});
  staffApi.UpdateAdmin.mockResolvedValue({});
  staffApi.ToggleAdminActive.mockResolvedValue({});
  departmentApi.GetAllDepartments.mockResolvedValue({
    data: [{ id: DEPT_ID, name: 'Support' }],
  });
  roleApi.GetRolesByModule.mockResolvedValue({
    data: [{ id: ROLE_ID, name: 'Administrator' }],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loading the tab', () => {
  it('fetches staff, departments and roles together', async () => {
    await renderPage();
    expect(staffApi.GetAllAdmins).toHaveBeenCalledWith({
      accessToken: 'at',
      refreshToken: 'rt',
    });
    await waitFor(() => expect(roleApi.GetRolesByModule).toHaveBeenCalled());
    expect(departmentApi.GetAllDepartments).toHaveBeenCalled();
  });

  it('renders a row per admin, with the role name resolved', async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText('Ada Bell')).toBeInTheDocument());
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
  });

  it('falls back to the embedded role name when the roles call gave none', async () => {
    roleApi.GetRolesByModule.mockRejectedValue(new Error('offline'));
    staffApi.GetAllAdmins.mockResolvedValue({
      data: [admin({ roles: { name: 'Embedded Role' } })],
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText('Embedded Role')).toBeInTheDocument());
  });

  it('dashes a role it cannot resolve at all', async () => {
    staffApi.GetAllAdmins.mockResolvedValue({ data: [admin({ roleId: 'unknown' })] });
    await renderPage();
    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThan(0));
  });

  it('names an admin from their full name when the parts are missing', async () => {
    staffApi.GetAllAdmins.mockResolvedValue({
      data: [admin({ firstName: '', lastName: '', fullName: 'Ada B' })],
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText('Ada B')).toBeInTheDocument());
  });

  it('falls back to the email when there is no name at all', async () => {
    staffApi.GetAllAdmins.mockResolvedValue({
      data: [admin({ firstName: '', lastName: '', fullName: '' })],
    });
    await renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('ada@example.com').length).toBeGreaterThan(0)
    );
  });

  it('dashes an admin with no recorded join date', async () => {
    staffApi.GetAllAdmins.mockResolvedValue({ data: [admin({ createdAt: null })] });
    await renderPage();
    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThan(0));
  });

  it('reports a failed staff fetch', async () => {
    staffApi.GetAllAdmins.mockRejectedValue(new Error('offline'));
    await renderPage();
    await waitFor(() =>
      expect(showApiError).toHaveBeenCalledWith(expect.anything(), 'LOAD_STAFF')
    );
  });

  it('carries on with an empty picker when departments fail', async () => {
    departmentApi.GetAllDepartments.mockRejectedValue(new Error('offline'));
    await renderPage();
    await waitFor(() => expect(screen.getByText('Ada Bell')).toBeInTheDocument());
    expect(showApiError).not.toHaveBeenCalled();
  });

  it('copes with responses that carry no data at all', async () => {
    staffApi.GetAllAdmins.mockResolvedValue({});
    departmentApi.GetAllDepartments.mockResolvedValue({});
    roleApi.GetRolesByModule.mockResolvedValue({});
    await renderPage();
    await waitFor(() => expect(screen.queryByText('Ada Bell')).not.toBeInTheDocument());
  });
});

describe('permissions', () => {
  it('offers the add button to an admin who may create', async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText('Add new staff')).toBeInTheDocument());
  });

  it('hides the add button from an admin who may not', async () => {
    restrictTo(['view_staff']);
    await renderPage();
    await waitFor(() => expect(screen.getByText('Ada Bell')).toBeInTheDocument());
    expect(screen.queryByText('Add new staff')).not.toBeInTheDocument();
  });
});

describe('adding a member of staff', () => {
  const open = async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText('Add new staff')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Add new staff'));
    await waitFor(() => expect(screen.getByText('Add a new staff')).toBeInTheDocument());
  };

  it('opens an empty form', async () => {
    await open();
    expect(inputFor('First name').value).toBe('');
    expect(inputFor('Role').value).toBe('');
  });

  it('offers the departments and roles it loaded', async () => {
    await open();
    expect(within(inputFor('Department')).getByText('Support')).toBeInTheDocument();
    expect(within(inputFor('Role')).getByText('Administrator')).toBeInTheDocument();
  });

  it('sends only the fields that were filled in', async () => {
    await open();
    fillValid();
    await save();

    expect(staffApi.CreateAdmin).toHaveBeenCalledWith({
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@example.com',
      roleId: ROLE_ID,
      accessToken: 'at',
      refreshToken: 'rt',
    });
    expect(showToast).toHaveBeenCalledWith('Staff added successfully', 'success');
  });

  it('includes the optional fields when they are filled in', async () => {
    await open();
    fillValid();
    fireEvent.change(inputFor('Phone'), { target: { value: '08012345678' } });
    fireEvent.change(inputFor('Department'), { target: { value: DEPT_ID } });
    await save();

    expect(staffApi.CreateAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ phoneNumber: '08012345678', departmentId: DEPT_ID })
    );
  });

  it('reloads the list once the save lands', async () => {
    await open();
    const before = staffApi.GetAllAdmins.mock.calls.length;
    fillValid();
    await save();
    await waitFor(() =>
      expect(staffApi.GetAllAdmins.mock.calls.length).toBe(before + 1)
    );
  });

  it('reports a refused save and stays open', async () => {
    staffApi.CreateAdmin.mockRejectedValue(new Error('email already used'));
    await open();
    fillValid();
    await save();
    expect(showApiError).toHaveBeenCalledWith(expect.any(Error), 'SAVE_STAFF');
    expect(screen.getByText('Add a new staff')).toBeInTheDocument();
  });

  it('closes and empties the form on cancel', async () => {
    await open();
    fireEvent.change(inputFor('First name'), { target: { value: 'Grace' } });
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => expect(screen.queryByText('Add a new staff')).toBeNull());
  });
});

describe('the form rules', () => {
  const open = async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText('Add new staff')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Add new staff'));
    await waitFor(() => expect(screen.getByText('Add a new staff')).toBeInTheDocument());
  };

  it('refuses an entirely blank form', async () => {
    await open();
    await save();
    await waitFor(() => expect(showValidationErrors).toHaveBeenCalled());
    expect(staffApi.CreateAdmin).not.toHaveBeenCalled();
  });

  it.each([
    ['a first name that is too short', 'First name', 'Gr', 'First name must be at least 3 characters'],
    ['a last name that is too short', 'Last name', 'Ho', 'Last name must be at least 3 characters'],
  ])('refuses %s', async (_case, label, value, message) => {
    await open();
    fillValid();
    fireEvent.change(inputFor(label), { target: { value } });
    await save();
    await waitFor(() => expect(screen.getByText(message)).toBeInTheDocument());
    expect(staffApi.CreateAdmin).not.toHaveBeenCalled();
  });

  it('refuses a first name that is too long', async () => {
    await open();
    fillValid();
    fireEvent.change(inputFor('First name'), { target: { value: 'G'.repeat(21) } });
    await save();
    await waitFor(() =>
      expect(screen.getByText('First name must be at most 20 characters')).toBeInTheDocument()
    );
  });

  it('refuses an address that does not end in .com or .net', async () => {
    await open();
    fillValid();
    fireEvent.change(inputFor('Email'), { target: { value: 'grace@example.org' } });
    await save();
    await waitFor(() =>
      expect(screen.getByText('Email must end in .com or .net')).toBeInTheDocument()
    );
  });

  it('refuses a phone number of the wrong length', async () => {
    await open();
    fillValid();
    fireEvent.change(inputFor('Phone'), { target: { value: '0801' } });
    await save();
    await waitFor(() =>
      expect(
        screen.getByText('Phone number must be between 10 and 15 characters')
      ).toBeInTheDocument()
    );
  });

  it('accepts a blank phone number', async () => {
    await open();
    fillValid();
    fireEvent.change(inputFor('Phone'), { target: { value: '' } });
    await save();
    expect(staffApi.CreateAdmin).toHaveBeenCalled();
  });
});

describe('editing a member of staff', () => {
  const openEdit = async (name = 'Ada Bell') => {
    await renderPage();
    await waitFor(() => expect(screen.getByText(name)).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Row actions'));
    fireEvent.click(await screen.findByText('Edit Staff'));
    await waitFor(() => expect(screen.getByText('Edit staff')).toBeInTheDocument());
  };

  it('opens pre-filled from the row', async () => {
    await openEdit();
    expect(inputFor('First name').value).toBe('Ada');
    expect(inputFor('Email').value).toBe('ada@example.com');
    expect(inputFor('Department').value).toBe(DEPT_ID);
  });

  it('opens with a blank department for an admin in none', async () => {
    staffApi.GetAllAdmins.mockResolvedValue({
      data: [admin({ departmentMembers: [] })],
    });
    await openEdit();
    expect(inputFor('Department').value).toBe('');
  });

  it('opens with blanks for a record full of nulls', async () => {
    staffApi.GetAllAdmins.mockResolvedValue({
      data: [
        admin({
          firstName: null,
          lastName: null,
          phoneNumber: null,
          roleId: null,
          departmentMembers: null,
          fullName: 'Ada B',
        }),
      ],
    });
    await openEdit('Ada B');
    expect(inputFor('First name').value).toBe('');
    expect(inputFor('Role').value).toBe('');
  });

  it('updates rather than creating', async () => {
    await openEdit();
    fireEvent.change(inputFor('First name'), { target: { value: 'Adaeze' } });
    await save();

    expect(staffApi.UpdateAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a1', firstName: 'Adaeze' })
    );
    expect(staffApi.CreateAdmin).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Staff updated successfully', 'success');
  });

  it('forgets which record it was editing once closed', async () => {
    await openEdit();
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => expect(screen.queryByText('Edit staff')).toBeNull());

    fireEvent.click(screen.getByText('Add new staff'));
    await waitFor(() => expect(screen.getByText('Add a new staff')).toBeInTheDocument());
    expect(inputFor('First name').value).toBe('');
  });
});

describe('activating and deactivating', () => {
  const openMenu = async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText('Ada Bell')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Row actions'));
  };

  it('flips the flag from the row menu and says so', async () => {
    await openMenu();
    await act(async () => {
      fireEvent.click(await screen.findByText('Deactivate Staff'));
    });
    expect(staffApi.ToggleAdminActive).toHaveBeenCalledWith({
      id: 'a1',
      active: false,
      accessToken: 'at',
      refreshToken: 'rt',
    });
    expect(showToast).toHaveBeenCalledWith('Ada Bell deactivated', 'success');
  });

  it('says activated when turning one back on', async () => {
    staffApi.GetAllAdmins.mockResolvedValue({ data: [admin({ active: false })] });
    await openMenu();
    await act(async () => {
      fireEvent.click(await screen.findByText('Deactivate Staff'));
    });
    expect(showToast).toHaveBeenCalledWith('Ada Bell activated', 'success');
  });

  it('reports a refused change', async () => {
    staffApi.ToggleAdminActive.mockRejectedValue(new Error('locked'));
    await openMenu();
    await act(async () => {
      fireEvent.click(await screen.findByText('Deactivate Staff'));
    });
    expect(showApiError).toHaveBeenCalledWith(expect.any(Error), 'UPDATE_STATUS');
  });

  it('leaves an admin with no row permissions an empty menu', async () => {
    restrictTo(['view_staff']);
    await renderPage();
    await waitFor(() => expect(screen.getByText('Ada Bell')).toBeInTheDocument());

    // The table renders its trigger for an empty actions array as readily as a
    // populated one, so the menu opens with nothing in it.
    fireEvent.click(screen.getByLabelText('Row actions'));
    expect(screen.queryByText('Edit Staff')).not.toBeInTheDocument();
    expect(screen.queryByText('Deactivate Staff')).not.toBeInTheDocument();
  });
});

describe('the Active switch on a row', () => {
  // Two records, because the state update behind the switch rebuilds the whole
  // list with a map: one row matches the id and one has to survive untouched.
  const pair = () => [
    admin(),
    admin({
      id: 'a2',
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@example.com',
      active: false,
    }),
  ];

  const switches = () =>
    document.body.querySelectorAll('.switch input[type="checkbox"]');

  const renderPair = async () => {
    staffApi.GetAllAdmins.mockResolvedValue({ data: pair() });
    await renderPage();
    await waitFor(() =>
      expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
    );
  };

  it('turns a deactivated admin back on', async () => {
    await renderPair();
    await act(async () => {
      fireEvent.click(switches()[1]);
    });

    expect(staffApi.ToggleAdminActive).toHaveBeenCalledWith({
      id: 'a2',
      active: true,
      accessToken: 'at',
      refreshToken: 'rt',
    });
    await waitFor(() => expect(switches()[1].checked).toBe(true));
    expect(switches()[0].checked).toBe(true);
  });

  it('turns an active admin off and leaves the other row alone', async () => {
    await renderPair();
    await act(async () => {
      fireEvent.click(switches()[0]);
    });

    expect(staffApi.ToggleAdminActive).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a1', active: false })
    );
    await waitFor(() => expect(switches()[0].checked).toBe(false));
    expect(switches()[1].checked).toBe(false);
  });

  it('reports a switch the server refuses and leaves the row as it was', async () => {
    staffApi.ToggleAdminActive.mockRejectedValue(new Error('locked'));
    await renderPair();
    await act(async () => {
      fireEvent.click(switches()[0]);
    });

    expect(showApiError).toHaveBeenCalledWith(expect.any(Error), 'UPDATE_STATUS');
    expect(switches()[0].checked).toBe(true);
  });

  it('renders an inert switch for an admin who may not deactivate', async () => {
    // Without delete_staff the page hands the table no onToggleActive at all,
    // so the switch still draws but clicking it reaches nothing.
    restrictTo(['view_staff']);
    staffApi.GetAllAdmins.mockResolvedValue({ data: pair() });
    await renderPage();
    await waitFor(() =>
      expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
    );

    await act(async () => {
      fireEvent.click(switches()[0]);
    });
    expect(staffApi.ToggleAdminActive).not.toHaveBeenCalled();
  });

  it('leaves the other row alone when deactivating from the row menu', async () => {
    await renderPair();
    fireEvent.click(screen.getAllByLabelText('Row actions')[1]);
    await act(async () => {
      fireEvent.click(await screen.findByText('Deactivate Staff'));
    });

    expect(staffApi.ToggleAdminActive).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a2', active: true })
    );
    await waitFor(() => expect(switches()[1].checked).toBe(true));
    expect(switches()[0].checked).toBe(true);
  });
});

describe('the filter select', () => {
  const filterSelect = () =>
    document.body.querySelector('.table-filter-select');
  const valueSelect = () => document.body.querySelector('.filter-value-select');

  const renderTwoRoles = async () => {
    staffApi.GetAllAdmins.mockResolvedValue({
      data: [
        admin(),
        admin({
          id: 'a2',
          firstName: 'Grace',
          lastName: 'Hopper',
          email: 'grace@example.com',
          roleId: 'unmapped',
          roles: { name: 'Auditor' },
        }),
      ],
    });
    await renderPage();
    await waitFor(() =>
      expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
    );
  };

  it('narrows the list to the role that was picked', async () => {
    await renderTwoRoles();
    fireEvent.change(filterSelect(), { target: { value: 'role' } });
    await waitFor(() => expect(valueSelect()).toBeInTheDocument());
    fireEvent.change(valueSelect(), { target: { value: 'Auditor' } });

    await waitFor(() =>
      expect(screen.queryByText('Ada Bell')).not.toBeInTheDocument()
    );
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
  });

  it('puts every row back when the filters are cleared', async () => {
    await renderTwoRoles();
    fireEvent.change(filterSelect(), { target: { value: 'role' } });
    await waitFor(() => expect(valueSelect()).toBeInTheDocument());
    fireEvent.change(valueSelect(), { target: { value: 'Auditor' } });
    await waitFor(() =>
      expect(screen.queryByText('Ada Bell')).not.toBeInTheDocument()
    );

    fireEvent.change(filterSelect(), { target: { value: 'clear_filters' } });
    await waitFor(() => expect(screen.getByText('Ada Bell')).toBeInTheDocument());
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
  });
});

describe('editing a record with holes in it', () => {
  it('opens with a blank email for an admin who has none', async () => {
    // The name column falls back to the email, so the record keeps its name
    // parts; only the address is missing.
    staffApi.GetAllAdmins.mockResolvedValue({ data: [admin({ email: null })] });
    await renderPage();
    await waitFor(() => expect(screen.getByText('Ada Bell')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Row actions'));
    fireEvent.click(await screen.findByText('Edit Staff'));
    await waitFor(() => expect(screen.getByText('Edit staff')).toBeInTheDocument());

    expect(inputFor('Email').value).toBe('');
  });
});

describe('the shipped build', () => {
  // import.meta.env.DEV is true under Vitest, so the two "unavailable" console
  // warnings always fire; stubbing it false reaches the silent arm instead.
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('says nothing to the console when the optional lookups fail', async () => {
    vi.stubEnv('DEV', false);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    departmentApi.GetAllDepartments.mockRejectedValue(new Error('offline'));
    roleApi.GetRolesByModule.mockRejectedValue(new Error('offline'));

    await renderPage();
    await waitFor(() => expect(screen.getByText('Ada Bell')).toBeInTheDocument());

    expect(warn).not.toHaveBeenCalled();
    expect(showApiError).not.toHaveBeenCalled();
  });
});
