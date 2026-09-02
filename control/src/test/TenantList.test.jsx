import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

/**
 * The tenant index: three overview tiles, the tenant table, and the three-step
 * deactivation modal reached from a row action.
 *
 * The whole page is gated on `view_tenant_list`, and the two row actions are
 * each gated on their own permission, so the action list the table receives is
 * assembled per role -- the table probe prints one button per surviving action,
 * which is how that is checked. The tiles and the overview request are
 * independent: a failed overview only logs (and only under `import.meta.env.DEV`,
 * true by default here), while a failed tenant request surfaces a toast.
 *
 * The real `ReusableModal` drives the deactivation steps; the step is read back
 * from its title.
 */

const mocks = vi.hoisted(() => ({
  state: {},
  navigate: vi.fn(),
  tenantApi: {
    GetActiveTenants: vi.fn(),
    GetManagementOverview: vi.fn(),
    DeactivateTenant: vi.fn(),
  },
  showToast: vi.fn(),
  showApiError: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock('react-redux', () => ({
  useSelector: (selector) => selector(mocks.state),
}));

vi.mock('../api/TenantApis', () => ({ default: mocks.tenantApi }));
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => mocks.showToast(...a),
  showApiError: (...a) => mocks.showApiError(...a),
}));

vi.mock('../Components/Table/CustomTable', () => ({
  default: (props) => (
    <div data-testid="tenant-table">
      <span data-testid="table-rows">{props.data.length}</span>
      <span data-testid="table-actions">{props.actions.map((a) => a.label).join('|')}</span>
      <span data-testid="filter-value">{props.filters[0].value}</span>
      <button
        data-testid="change-filter"
        onClick={() => props.onFilterChange('filter_type', 'plan')}
      >
        set filter
      </button>
      {props.data.map((row, i) => (
        <div key={row.tenantId ?? i} data-testid={`row-${i}`}>
          {props.columns.map((col) => (
            <span key={col.key} data-testid={`cell-${i}-${col.key}`}>
              {row[col.key]}
            </span>
          ))}
          {props.actions.map((action) => (
            <button
              key={action.label}
              data-testid={`act-${i}-${action.label}`}
              onClick={() => action.onClick(row)}
            >
              {action.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  ),
}));

import TenantList from '../Pages/Tenant/TenantList/TenantList';

const TENANTS = [
  {
    id: 't1',
    companyName: 'Acme Health',
    createdAt: '2026-01-10T12:00:00Z',
    active: true,
    accountOfficer: { firstName: 'Ada', lastName: 'Lovelace' },
    Subscription: [{ status: 'ACTIVE', plan: { name: 'Growth' } }],
  },
  {
    // No subscription, so the plan comes off the legacy billing-plan array, and
    // the officer record carries no name at all.
    id: 't2',
    contactPerson: 'Alan T',
    active: false,
    accountOfficer: {},
    BillingPlan: [{ name: 'Legacy' }],
  },
  { id: 't3', email: 'solo@acme.test', active: false },
];

const OVERVIEW = { totalTenants: 12, totalStaffs: 34, totalClients: 5600 };

const buildState = (permissions) => ({
  authentication: {
    isAuthenticated: true,
    loading: false,
    error: null,
    accessToken: 'token',
    refreshToken: 'refresh',
    user: {
      id: 'u1',
      role: { roleModuleAccesses: [{ module: 'TENANT', permissions }] },
    },
  },
});

const ALL_PERMS = ['view_tenant_list', 'view_tenant_details', 'deactivate_tenant'];

const renderList = async ({ permissions = ALL_PERMS } = {}) => {
  mocks.state = buildState(permissions);
  const view = render(<TenantList />);
  await act(async () => {});
  return view;
};

const cell = (row, key) => screen.getByTestId(`cell-${row}-${key}`).textContent;
const tileValue = (label) =>
  Array.from(document.body.querySelectorAll('.overview-card'))
    .find((card) => card.querySelector('label')?.textContent === label)
    .querySelector('p').textContent;
const modalTitle = () => document.body.querySelector('.modal-title')?.textContent;
const primaryButton = () => document.body.querySelector('.primary-button');
const secondaryButton = () => document.body.querySelector('.secondary-button');
const field = (label) => {
  const group = Array.from(document.body.querySelectorAll('.input-group')).find(
    (g) => g.querySelector('.input-label')?.textContent === label
  );
  return group?.querySelector('input, select, textarea');
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.tenantApi.GetActiveTenants.mockResolvedValue({ data: TENANTS });
  mocks.tenantApi.GetManagementOverview.mockResolvedValue({ data: OVERVIEW });
  mocks.tenantApi.DeactivateTenant.mockResolvedValue({});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('page gating', () => {
  it('refuses the page to a role without the list permission', async () => {
    await renderList({ permissions: ['view_tenant_details'] });
    expect(screen.getByText("You don't have permission to view this.")).toBeInTheDocument();
    // The gate is on the render, not the effect, so the data is still fetched.
    expect(screen.queryByTestId('tenant-table')).toBeNull();
  });

  it('shows a section loader until both requests settle', async () => {
    mocks.state = buildState(ALL_PERMS);
    render(<TenantList />);
    expect(document.body.querySelector('.section-loader')).toBeInTheDocument();
    await act(async () => {});
    expect(screen.getByTestId('tenant-table')).toBeInTheDocument();
  });

  it('titles the browser tab', async () => {
    await renderList();
    expect(document.title).toBe('Tenants | Noosphere');
  });
});

describe('overview tiles', () => {
  it('formats each total with thousands separators', async () => {
    await renderList();
    expect(tileValue('Total Tenants')).toBe('12');
    expect(tileValue('Total No of Tenant Clients')).toBe('5,600');
    expect(tileValue('Total No of Tenant Staff')).toBe('34');
  });

  it('zeroes the tiles when the overview body is empty', async () => {
    mocks.tenantApi.GetManagementOverview.mockResolvedValue({});
    await renderList();
    expect(tileValue('Total Tenants')).toBe('0');
    expect(tileValue('Total No of Tenant Clients')).toBe('0');
  });

  it('zeroes a tile the overview leaves out', async () => {
    mocks.tenantApi.GetManagementOverview.mockResolvedValue({ data: { totalTenants: 7 } });
    await renderList();
    expect(tileValue('Total Tenants')).toBe('7');
    expect(tileValue('Total No of Tenant Staff')).toBe('0');
  });

  it('warns about a failed overview in development without blocking the table', async () => {
    mocks.tenantApi.GetManagementOverview.mockRejectedValue(new Error('down'));
    await renderList();
    expect(console.warn).toHaveBeenCalledWith('Overview unavailable:', 'down');
    expect(tileValue('Total Tenants')).toBe('0');
    expect(screen.getByTestId('table-rows')).toHaveTextContent('3');
  });

  it('stays silent about a failed overview in production', async () => {
    vi.stubEnv('DEV', false);
    mocks.tenantApi.GetManagementOverview.mockRejectedValue(new Error('down'));
    await renderList();
    expect(console.warn).not.toHaveBeenCalled();
  });
});

describe('the tenant table', () => {
  it('maps a fully populated tenant', async () => {
    await renderList();
    expect(cell(0, 'name')).toBe('Acme Health');
    expect(cell(0, 'date_created')).toBe('1/10/2026');
    expect(cell(0, 'plan')).toBe('Growth');
    expect(cell(0, 'status')).toBe('Active');
    expect(cell(0, 'subscription_status')).toBe('ACTIVE');
    expect(cell(0, 'account_officer')).toBe('Ada Lovelace');
  });

  it('falls back to the billing plan and dashes an unnamed officer', async () => {
    await renderList();
    expect(cell(1, 'name')).toBe('Alan T');
    expect(cell(1, 'plan')).toBe('Legacy');
    expect(cell(1, 'status')).toBe('Inactive');
    expect(cell(1, 'subscription_status')).toBe('—');
    expect(cell(1, 'account_officer')).toBe('');
  });

  it('dashes every field a bare tenant omits', async () => {
    await renderList();
    expect(cell(2, 'name')).toBe('solo@acme.test');
    expect(cell(2, 'date_created')).toBe('—');
    expect(cell(2, 'plan')).toBe('—');
    expect(cell(2, 'account_officer')).toBe('—');
  });

  it('surfaces a failed tenant load', async () => {
    mocks.tenantApi.GetActiveTenants.mockRejectedValue(new Error('x'));
    await renderList();
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOAD_TENANTS');
    expect(screen.getByTestId('table-rows')).toHaveTextContent('0');
  });

  it('falls back to an empty list when the response has no body', async () => {
    mocks.tenantApi.GetActiveTenants.mockResolvedValue({});
    await renderList();
    expect(screen.getByTestId('table-rows')).toHaveTextContent('0');
  });

  it('reports an error thrown while unpacking the settled responses', async () => {
    // A fulfilled-but-empty response makes the unpacking itself throw, which is
    // the only way into the outer catch.
    mocks.tenantApi.GetActiveTenants.mockResolvedValue(undefined);
    await renderList();
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(TypeError), 'LOAD_TENANT_DATA');
  });

  it('leaves the rows alone when a filter type is picked', async () => {
    // The page records the choice in state it never reads back, so the only
    // observable contract is that the table survives it.
    await renderList();
    fireEvent.click(screen.getByTestId('change-filter'));
    expect(screen.getByTestId('table-rows')).toHaveTextContent('3');
  });
});

describe('row actions', () => {
  it('offers both actions to a fully privileged role', async () => {
    await renderList();
    expect(screen.getByTestId('table-actions')).toHaveTextContent('View Tenant|Deactivate Tenant');
  });

  it('drops the actions a role has no permission for', async () => {
    await renderList({ permissions: ['view_tenant_list'] });
    expect(screen.getByTestId('table-actions')).toBeEmptyDOMElement();
  });

  it('keeps only the view action for a read-only role', async () => {
    await renderList({ permissions: ['view_tenant_list', 'view_tenant_details'] });
    expect(screen.getByTestId('table-actions')).toHaveTextContent('View Tenant');
  });

  it('routes to the tenant overview', async () => {
    await renderList();
    fireEvent.click(screen.getByTestId('act-0-View Tenant'));
    expect(mocks.navigate).toHaveBeenCalledWith('/tenants/tenant-lists/overview/t1');
  });
});

describe('deactivating a tenant', () => {
  const openDeactivate = async (rowIndex = 0) => {
    await renderList();
    fireEvent.click(screen.getByTestId(`act-${rowIndex}-Deactivate Tenant`));
  };

  const advance = async () => {
    await act(async () => {
      fireEvent.click(primaryButton());
    });
  };

  it('refuses to leave the first step without a reason', async () => {
    await openDeactivate();
    expect(modalTitle()).toBe('Deactivate tenant account');
    expect(primaryButton()).toHaveTextContent('Deactivate account');
    await advance();
    expect(mocks.showToast).toHaveBeenCalledWith('Please select a deactivation reason', 'error');
    expect(modalTitle()).toBe('Deactivate tenant account');
  });

  it('walks through the warning and the password step', async () => {
    await openDeactivate();
    fireEvent.change(field('Deactivation reason'), { target: { value: 'Security Risks' } });
    await advance();
    expect(modalTitle()).toBe('Are you sure?');
    expect(primaryButton()).toHaveTextContent('I am sure');
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    await advance();
    expect(modalTitle()).toBe('Enter password');
    expect(screen.getByText('Please provide your account password to continue')).toBeInTheDocument();
  });

  it('refuses to deactivate without a password', async () => {
    await openDeactivate();
    fireEvent.change(field('Deactivation reason'), { target: { value: 'Security Risks' } });
    await advance();
    await advance();
    await advance();
    expect(mocks.showToast).toHaveBeenCalledWith('Please enter your password', 'error');
    expect(mocks.tenantApi.DeactivateTenant).not.toHaveBeenCalled();
  });

  it('sends the chosen tenant, reason, details and password', async () => {
    await openDeactivate(1);
    fireEvent.change(field('Deactivation reason'), { target: { value: 'Fraudulent Activity' } });
    fireEvent.change(field('Provide details'), { target: { value: 'Chargebacks' } });
    await advance();
    await advance();
    fireEvent.change(screen.getByPlaceholderText('Enter password'), { target: { value: 'hunter2' } });
    await advance();
    expect(mocks.tenantApi.DeactivateTenant).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 't2',
        active: false,
        deactivatedById: 'u1',
        password: 'hunter2',
        reason: 'Fraudulent Activity',
        details: 'Chargebacks',
      })
    );
    expect(mocks.showToast).toHaveBeenCalledWith('Tenant deactivated successfully', 'success');
    expect(modalTitle()).toBeUndefined();
    expect(mocks.tenantApi.GetActiveTenants).toHaveBeenCalledTimes(2);
  });

  it('keeps the modal on the password step when the request is rejected', async () => {
    mocks.tenantApi.DeactivateTenant.mockRejectedValue(new Error('x'));
    await openDeactivate();
    fireEvent.change(field('Deactivation reason'), { target: { value: 'Security Risks' } });
    await advance();
    await advance();
    fireEvent.change(screen.getByPlaceholderText('Enter password'), { target: { value: 'hunter2' } });
    await advance();
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'DEACTIVATE_TENANT');
    expect(modalTitle()).toBe('Enter password');
  });

  it('resets the flow when it is cancelled and reopened', async () => {
    await openDeactivate();
    fireEvent.change(field('Deactivation reason'), { target: { value: 'Security Risks' } });
    fireEvent.change(field('Provide details'), { target: { value: 'Some notes' } });
    await advance();
    fireEvent.click(secondaryButton());
    expect(modalTitle()).toBeUndefined();
    fireEvent.click(screen.getByTestId('act-0-Deactivate Tenant'));
    expect(modalTitle()).toBe('Deactivate tenant account');
    expect(field('Deactivation reason')).toHaveValue('');
    expect(field('Provide details')).toHaveValue('');
  });
});

describe('an overview missing its headline figure', () => {
  it('zeroes the tenant count when only the other totals arrive', async () => {
    mocks.tenantApi.GetManagementOverview.mockResolvedValue({
      data: { totalClients: 5600, totalStaffs: 34 },
    });
    await renderList();
    expect(tileValue('Total Tenants')).toBe('0');
    expect(tileValue('Total No of Tenant Clients')).toBe('5,600');
  });
});
