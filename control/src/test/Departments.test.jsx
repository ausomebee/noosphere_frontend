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

const departmentApi = vi.hoisted(() => ({
  GetAllDepartments: vi.fn(),
  GetAllAdmins: vi.fn(),
  CreateDepartment: vi.fn(),
  UpdateDepartment: vi.fn(),
  DeleteDepartment: vi.fn(),
  ToggleDepartmentActive: vi.fn(),
}));
vi.mock('../api/departmentApis', () => ({ default: departmentApi }));

const state = {
  authentication: { accessToken: 'at', refreshToken: 'rt', user: { id: 'admin-1' } },
};
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (fn) => fn(state),
}));

import Departments from '../Pages/Settings/SettingsSubs/Departments';

/**
 * The departments tab of Settings.
 *
 * The two lookups go out together through `Promise.allSettled`, and only the
 * department list is treated as fatal — a failed admin list is logged and the
 * page carries on with an empty lead picker, which is what the fixtures here
 * pin down.
 *
 * The lead column has three sources in falling order of trust: the embedded
 * `teamLead` object, the admin list looked up by `teamLeadId`, and a dash. Each
 * gets its own row in the fixture so all three render in one table.
 *
 * The modal's primary button runs `handleSubmit`, which returns a promise, so
 * ReusableModal takes its async path and every save is clicked inside an async
 * `act` rather than being stepped with timers.
 */

const admins = [
  { id: 'a1', firstName: 'Ada', lastName: 'Bell' },
  { id: 'a2', firstName: 'Grace', lastName: 'Hopper' },
];

const department = (over = {}) => ({
  id: 'd1',
  name: 'Support',
  teamLeadId: 'a1',
  isActive: true,
  _count: { departmentMembers: 3 },
  ...over,
});

const rowFor = (name) => screen.getByText(name).closest('tr');
const modal = () => document.body.querySelector('.modal-content');
const fieldIn = (label) =>
  within(modal())
    .getAllByText(label)
    .map((n) => n.closest('.input-group'))
    .find(Boolean)
    .querySelector('input, select');
const primary = () => document.body.querySelector('.primary-button');
const secondary = () => document.body.querySelector('.secondary-button');

const save = async () => {
  await act(async () => {
    fireEvent.click(primary());
  });
};

const renderPage = async () => {
  const view = render(<Departments />);
  await waitFor(() => expect(departmentApi.GetAllDepartments).toHaveBeenCalled());
  await waitFor(() => expect(document.querySelector('table')).toBeTruthy());
  return view;
};

const openAdd = async () => {
  await renderPage();
  fireEvent.click(screen.getByText('Add new department'));
  await waitFor(() =>
    expect(screen.getByText('Add a new department')).toBeInTheDocument()
  );
};

const openEdit = async (name = 'Support') => {
  await renderPage();
  fireEvent.click(within(rowFor(name)).getByLabelText('Row actions'));
  fireEvent.click(await screen.findByText('Edit Department'));
  await waitFor(() => expect(screen.getByText('Edit department')).toBeInTheDocument());
};

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  departmentApi.GetAllDepartments.mockResolvedValue({ data: [department()] });
  departmentApi.GetAllAdmins.mockResolvedValue({ data: admins });
  departmentApi.CreateDepartment.mockResolvedValue({});
  departmentApi.UpdateDepartment.mockResolvedValue({});
  departmentApi.DeleteDepartment.mockResolvedValue({});
  departmentApi.ToggleDepartmentActive.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('loading the tab', () => {
  it('shows a skeleton table until both lookups land', async () => {
    let release;
    departmentApi.GetAllDepartments.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve({ data: [department()] });
      })
    );
    render(<Departments />);
    expect(document.querySelector('.skeleton-table')).toBeTruthy();

    await act(async () => {
      release();
    });
    await waitFor(() => expect(document.querySelector('.skeleton-table')).toBeNull());
  });

  it('asks for departments and admins with the stored tokens', async () => {
    await renderPage();
    expect(departmentApi.GetAllDepartments).toHaveBeenCalledWith({
      accessToken: 'at',
      refreshToken: 'rt',
    });
    expect(departmentApi.GetAllAdmins).toHaveBeenCalledWith({
      accessToken: 'at',
      refreshToken: 'rt',
    });
  });

  it('names the lead from the embedded record when there is one', async () => {
    departmentApi.GetAllDepartments.mockResolvedValue({
      data: [department({ teamLead: { firstName: 'Grace', lastName: 'Hopper' } })],
    });
    await renderPage();
    expect(within(rowFor('Support')).getByText('Grace Hopper')).toBeInTheDocument();
  });

  it('looks the lead up in the admin list when only an id is stored', async () => {
    await renderPage();
    expect(within(rowFor('Support')).getByText('Ada Bell')).toBeInTheDocument();
  });

  it('dashes a lead it cannot resolve at all', async () => {
    departmentApi.GetAllDepartments.mockResolvedValue({
      data: [department({ teamLeadId: 'gone' })],
    });
    await renderPage();
    expect(within(rowFor('Support')).getByText('—')).toBeInTheDocument();
  });

  it('counts zero members when the server sent no count', async () => {
    departmentApi.GetAllDepartments.mockResolvedValue({
      data: [department({ _count: undefined })],
    });
    await renderPage();
    expect(within(rowFor('Support')).getByText('0')).toBeInTheDocument();
  });

  it('counts zero members when the count object is empty', async () => {
    // `_count` exists but carries no department tally, which is a different
    // fallback from the object being absent altogether.
    departmentApi.GetAllDepartments.mockResolvedValue({
      data: [department({ _count: {} })],
    });
    await renderPage();
    expect(within(rowFor('Support')).getByText('0')).toBeInTheDocument();
  });

  it('reports a failed department fetch', async () => {
    departmentApi.GetAllDepartments.mockRejectedValue(new Error('offline'));
    await renderPage();
    await waitFor(() =>
      expect(showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOAD_DEPARTMENTS')
    );
  });

  it('shows an empty table for a response with no data', async () => {
    departmentApi.GetAllDepartments.mockResolvedValue({});
    await renderPage();
    expect(screen.queryByText('Support')).not.toBeInTheDocument();
  });

  it('carries on with an empty lead picker when the admin list fails', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    departmentApi.GetAllAdmins.mockRejectedValue(new Error('offline'));
    await renderPage();
    expect(spy).toHaveBeenCalledWith('Admin list unavailable:', 'offline');
    expect(showApiError).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Add new department'));
    await waitFor(() => expect(modal()).toBeTruthy());
    expect(
      screen.getByText('No staff found. Create one in Settings → Staff.')
    ).toBeInTheDocument();
  });

  it('logs an admin list rejection that carries no reason', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    departmentApi.GetAllAdmins.mockRejectedValue(undefined);
    await renderPage();
    expect(spy).toHaveBeenCalledWith('Admin list unavailable:', undefined);
    expect(screen.getByText('Support')).toBeInTheDocument();
  });

  it('keeps the admin list failure out of the production console', async () => {
    vi.stubEnv('DEV', false);
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    departmentApi.GetAllAdmins.mockRejectedValue(new Error('offline'));
    await renderPage();
    expect(spy).not.toHaveBeenCalled();
  });

  it('copes with an admin list response carrying no data', async () => {
    departmentApi.GetAllAdmins.mockResolvedValue({});
    await renderPage();
    expect(within(rowFor('Support')).getByText('—')).toBeInTheDocument();
  });
});

describe('adding a department', () => {
  it('opens an empty form offering every admin as a lead', async () => {
    await openAdd();
    expect(fieldIn('Department name').value).toBe('');
    const lead = fieldIn('Department Lead');
    expect(lead.value).toBe('');
    // The hand-written blank option is dropped in favour of the placeholder.
    expect([...lead.options].map((o) => o.textContent)).toEqual([
      '-- Select Department Lead --',
      'Ada Bell',
      'Grace Hopper',
    ]);
  });

  it('refuses a form with no name and no lead', async () => {
    await openAdd();
    await save();
    await waitFor(() => expect(showValidationErrors).toHaveBeenCalled());
    expect(departmentApi.CreateDepartment).not.toHaveBeenCalled();
  });

  it('refuses a department with no lead', async () => {
    await openAdd();
    fireEvent.change(fieldIn('Department name'), { target: { value: 'Billing' } });
    await save();
    await waitFor(() =>
      expect(screen.getByText('Department lead is required')).toBeInTheDocument()
    );
    expect(departmentApi.CreateDepartment).not.toHaveBeenCalled();
  });

  it('refuses a department with no name', async () => {
    await openAdd();
    fireEvent.change(fieldIn('Department Lead'), { target: { value: 'a1' } });
    await save();
    await waitFor(() =>
      expect(screen.getByText('Department name is required')).toBeInTheDocument()
    );
  });

  it('creates the department against the signed-in admin', async () => {
    await openAdd();
    fireEvent.change(fieldIn('Department name'), { target: { value: 'Billing' } });
    fireEvent.change(fieldIn('Department Lead'), { target: { value: 'a2' } });
    await save();

    expect(departmentApi.CreateDepartment).toHaveBeenCalledWith({
      name: 'Billing',
      createdByAdminId: 'admin-1',
      teamLeadId: 'a2',
      members: [],
      accessToken: 'at',
      refreshToken: 'rt',
    });
    expect(showToast).toHaveBeenCalledWith('Department added successfully', 'success');
  });

  it('sends the members that were ticked', async () => {
    await openAdd();
    fireEvent.change(fieldIn('Department name'), { target: { value: 'Billing' } });
    fireEvent.change(fieldIn('Department Lead'), { target: { value: 'a2' } });
    fireEvent.click(screen.getByText('Select members...'));
    fireEvent.click(
      document.body.querySelectorAll('.multi-select-dropdown input')[0]
    );
    await save();

    expect(departmentApi.CreateDepartment).toHaveBeenCalledWith(
      expect.objectContaining({ members: ['a1'] })
    );
  });

  it('reloads the list once the save lands', async () => {
    await openAdd();
    const before = departmentApi.GetAllDepartments.mock.calls.length;
    fireEvent.change(fieldIn('Department name'), { target: { value: 'Billing' } });
    fireEvent.change(fieldIn('Department Lead'), { target: { value: 'a1' } });
    await save();
    await waitFor(() =>
      expect(departmentApi.GetAllDepartments.mock.calls.length).toBe(before + 1)
    );
    expect(document.body.querySelector('.modal-content')).toBeNull();
  });

  it('reports a refused save and stays open', async () => {
    departmentApi.CreateDepartment.mockRejectedValue(new Error('duplicate'));
    await openAdd();
    fireEvent.change(fieldIn('Department name'), { target: { value: 'Billing' } });
    fireEvent.change(fieldIn('Department Lead'), { target: { value: 'a1' } });
    await save();
    expect(showApiError).toHaveBeenCalledWith(expect.any(Error), 'SAVE_DEPARTMENT');
    expect(screen.getByText('Add a new department')).toBeInTheDocument();
  });

  it('empties the form on cancel', async () => {
    await openAdd();
    fireEvent.change(fieldIn('Department name'), { target: { value: 'Billing' } });
    fireEvent.click(secondary());
    await waitFor(() => expect(document.body.querySelector('.modal-content')).toBeNull());

    fireEvent.click(screen.getByText('Add new department'));
    await waitFor(() => expect(modal()).toBeTruthy());
    expect(fieldIn('Department name').value).toBe('');
  });
});

describe('editing a department', () => {
  it('opens pre-filled from the row', async () => {
    await openEdit();
    expect(fieldIn('Department name').value).toBe('Support');
    expect(fieldIn('Department Lead').value).toBe('a1');
  });

  it('opens with blanks for a record missing its optional fields', async () => {
    departmentApi.GetAllDepartments.mockResolvedValue({
      data: [department({ teamLeadId: null, members: null })],
    });
    await openEdit();
    expect(fieldIn('Department Lead').value).toBe('');
    expect(screen.getByText('Select members...')).toBeInTheDocument();
  });

  it('shows the members already on the department as tags', async () => {
    departmentApi.GetAllDepartments.mockResolvedValue({
      data: [department({ members: ['a2'] })],
    });
    await openEdit();
    // The name is also an option in the lead picker, so the tag is looked up
    // inside the multi-select itself.
    expect(
      modal().querySelector('.multi-select-tag').textContent
    ).toContain('Grace Hopper');
  });

  it('updates rather than creating', async () => {
    await openEdit();
    fireEvent.change(fieldIn('Department name'), { target: { value: 'Customer Care' } });
    await save();

    expect(departmentApi.UpdateDepartment).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'd1', name: 'Customer Care' })
    );
    expect(departmentApi.CreateDepartment).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Department updated successfully', 'success');
  });

  it('forgets which record it was editing once closed', async () => {
    await openEdit();
    fireEvent.click(secondary());
    await waitFor(() => expect(document.body.querySelector('.modal-content')).toBeNull());

    fireEvent.click(screen.getByText('Add new department'));
    await waitFor(() =>
      expect(screen.getByText('Add a new department')).toBeInTheDocument()
    );
  });
});

describe('removing a department', () => {
  const remove = async () => {
    await renderPage();
    fireEvent.click(within(rowFor('Support')).getByLabelText('Row actions'));
    await act(async () => {
      fireEvent.click(await screen.findByText('Remove Department'));
    });
  };

  it('drops the row without refetching', async () => {
    await remove();
    expect(departmentApi.DeleteDepartment).toHaveBeenCalledWith({
      id: 'd1',
      accessToken: 'at',
      refreshToken: 'rt',
    });
    expect(showToast).toHaveBeenCalledWith('Department removed', 'success');
    await waitFor(() => expect(screen.queryByText('Support')).not.toBeInTheDocument());
  });

  it('keeps the row when the removal is refused', async () => {
    departmentApi.DeleteDepartment.mockRejectedValue(new Error('in use'));
    await remove();
    expect(showApiError).toHaveBeenCalledWith(expect.any(Error), 'DELETE_DEPARTMENT');
    expect(screen.getByText('Support')).toBeInTheDocument();
  });
});

describe('activating and deactivating', () => {
  const flip = async () => {
    await renderPage();
    await act(async () => {
      fireEvent.click(rowFor('Support').querySelector('.switch input'));
    });
  };

  it('turns a department off from the row switch', async () => {
    await flip();
    expect(departmentApi.ToggleDepartmentActive).toHaveBeenCalledWith({
      id: 'd1',
      active: false,
      accessToken: 'at',
      refreshToken: 'rt',
    });
    await waitFor(() =>
      expect(rowFor('Support').querySelector('.switch input').checked).toBe(false)
    );
  });

  it('turns one back on', async () => {
    departmentApi.GetAllDepartments.mockResolvedValue({
      data: [department({ isActive: false })],
    });
    await flip();
    expect(departmentApi.ToggleDepartmentActive).toHaveBeenCalledWith(
      expect.objectContaining({ active: true })
    );
  });

  it('flips the wrong department while a filter is narrowing the table', async () => {
    // DEFECT, pinned as-is: CustomTable reports the row's index within its
    // *filtered* list, but handleToggleActive indexes the unfiltered tableData.
    // With Support filtered out, the only visible row is Billing at index 0,
    // which resolves back to Support.
    departmentApi.GetAllDepartments.mockResolvedValue({
      data: [department(), department({ id: 'd2', name: 'Billing', teamLeadId: 'a2' })],
    });
    await renderPage();
    fireEvent.change(document.querySelector('.table-filter-select'), {
      target: { value: 'teamLead' },
    });
    fireEvent.change(document.querySelector('.filter-value-select'), {
      target: { value: 'Grace Hopper' },
    });
    await waitFor(() => expect(screen.queryByText('Support')).not.toBeInTheDocument());

    await act(async () => {
      fireEvent.click(rowFor('Billing').querySelector('.switch input'));
    });
    expect(departmentApi.ToggleDepartmentActive).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'd1' })
    );
  });

  it('leaves the switch alone when the change is refused', async () => {
    departmentApi.ToggleDepartmentActive.mockRejectedValue(new Error('locked'));
    await flip();
    expect(showApiError).toHaveBeenCalledWith(expect.any(Error), 'UPDATE_STATUS');
    expect(rowFor('Support').querySelector('.switch input').checked).toBe(true);
  });
});

describe('the filter bar', () => {
  const filterSelect = () => document.querySelector('.table-filter-select');

  it('remembers the column that was picked', async () => {
    await renderPage();
    fireEvent.change(filterSelect(), { target: { value: 'teamLead' } });
    expect(filterSelect().value).toBe('teamLead');
    // Picking a column reveals the second select, listing the values present.
    expect(document.querySelector('.filter-value-select')).toBeTruthy();
  });

  it('narrows the table to the chosen lead', async () => {
    departmentApi.GetAllDepartments.mockResolvedValue({
      data: [department(), department({ id: 'd2', name: 'Billing', teamLeadId: 'a2' })],
    });
    await renderPage();
    fireEvent.change(filterSelect(), { target: { value: 'teamLead' } });
    fireEvent.change(document.querySelector('.filter-value-select'), {
      target: { value: 'Ada Bell' },
    });
    await waitFor(() => expect(screen.queryByText('Billing')).not.toBeInTheDocument());
    expect(screen.getByText('Support')).toBeInTheDocument();
  });

  it('puts every row back when the filters are cleared', async () => {
    departmentApi.GetAllDepartments.mockResolvedValue({
      data: [department(), department({ id: 'd2', name: 'Billing', teamLeadId: 'a2' })],
    });
    await renderPage();
    fireEvent.change(filterSelect(), { target: { value: 'teamLead' } });
    fireEvent.change(document.querySelector('.filter-value-select'), {
      target: { value: 'Ada Bell' },
    });
    await waitFor(() => expect(screen.queryByText('Billing')).not.toBeInTheDocument());

    fireEvent.change(filterSelect(), { target: { value: 'clear_filters' } });
    await waitFor(() => expect(screen.getByText('Billing')).toBeInTheDocument());
  });
});
