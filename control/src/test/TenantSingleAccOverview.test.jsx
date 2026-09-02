import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

/**
 * The tenant account-overview tab: a status badge, the account officer card,
 * a read-only general-information grid, the plan summary, and the two modals
 * that edit the first two of those.
 *
 * The real `ReusableModal` and the real inputs are used here rather than
 * probes, because most of this file's branching is the edit form's own
 * seeding: `handleOpenEditModal` runs every stored location value through the
 * geo normalisers before it fills the fields, and a stub form would hide that.
 * Neither input associates its label with its control, so fields are found by
 * walking up to the surrounding `.input-group`.
 *
 * `handleViewInvoice`'s "no invoice available" guard sits behind a button that
 * is disabled under exactly the same condition, so the disabled state is what
 * gets asserted; the toast inside it cannot fire from the UI.
 */

const mocks = vi.hoisted(() => ({
  params: { tenantId: 'tenant-1' },
  state: {},
  navigate: vi.fn(),
  tenantApi: {
    GetSingleTenant: vi.fn(),
    getAllAdmins: vi.fn(),
    ChangeAccountOfficer: vi.fn(),
    UpdateTenantInfo: vi.fn(),
  },
  invoiceApi: { GetInvoiceById: vi.fn() },
  showToast: vi.fn(),
  showApiError: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => mocks.params, useNavigate: () => mocks.navigate };
});

vi.mock('react-redux', () => ({
  useSelector: (selector) => selector(mocks.state),
}));

vi.mock('../api/TenantApis', () => ({ default: mocks.tenantApi }));
vi.mock('../api/InvoiceApi', () => ({ default: mocks.invoiceApi }));
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => mocks.showToast(...a),
  showApiError: (...a) => mocks.showApiError(...a),
}));

vi.mock('../Components/Invoice/SubscriptionInvoice', () => ({
  default: (props) => (
    <div data-testid="subscription-invoice">
      <span data-testid="invoice-id">{props.invoiceId}</span>
      <span data-testid="invoice-due">{props.dueDate}</span>
      <span data-testid="invoice-total">{props.total}</span>
      {(props.items || []).map((item) => (
        <span key={item.id} data-testid={`invoice-item-${item.id}`}>
          {item.description}|{item.rate}|{item.quantity}|{item.price}
        </span>
      ))}
    </div>
  ),
}));

vi.mock('../Components/ReusableModal/GeneratePaymentLinkModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="payment-link-modal">
        <span data-testid="payment-link-tenant">{props.tenantId}</span>
        <button data-testid="payment-link-close" onClick={props.onClose}>
          close
        </button>
      </div>
    ) : null,
}));

import TenantSingleAccOverview from '../Pages/Tenant/TenantSingle/TenantSingleAccOverview';

const TENANT = {
  id: 'tenant-1',
  companyName: 'Acme Health',
  contactPerson: 'Alan T',
  email: 'alan@acme.test',
  phoneNumber: '0800',
  organizationType: 'ABA Clinic or Center',
  companySize: '50-100',
  subdomain: 'acme',
  active: true,
  assignToAdmin: 'a1',
  accountOfficer: { firstName: 'Ada', lastName: 'Lovelace' },
  // A stored ISO country code and a state abbreviation: the seeding path runs
  // both through the normalisers before the form sees them.
  location: { address: '1 High St', city: 'Lagos', stateProvince: 'CA', zip: '10001', country: 'US' },
  _count: { clientLinks: 3 },
  Subscription: [{ endDate: '2026-03-15T12:00:00Z', plan: { planType: 'ENTERPRISE', name: 'Growth', forClient: 10 } }],
  Invoice: [{ id: 'inv-1' }],
};

const ADMINS = [
  { id: 'a1', firstName: 'Ada', lastName: 'Lovelace' },
  { id: 'a2', fullName: 'Bo Kim' },
  { id: 'a3', email: 'cleo@acme.test' },
];

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

const ALL_PERMS = ['change_account_officer', 'edit_tenant', 'generate_payment_link'];

const renderOverview = async ({ permissions = ALL_PERMS } = {}) => {
  mocks.state = buildState(permissions);
  const view = render(<TenantSingleAccOverview />);
  await act(async () => {});
  return view;
};

// Neither TextInput nor SelectInput pairs its label with its control, so the
// field is reached through the `.input-group` that wraps both.
const field = (label) => {
  const group = Array.from(document.body.querySelectorAll('.input-group')).find(
    (g) => g.querySelector('.input-label')?.textContent === label
  );
  return group?.querySelector('input, select, textarea');
};

const infoValue = (label) =>
  Array.from(document.body.querySelectorAll('.info-item'))
    .find((item) => item.querySelector('label')?.textContent === label)
    ?.querySelector('p').textContent;

const modalTitle = () => document.body.querySelector('.modal-title')?.textContent;
const primaryButton = () => document.body.querySelector('.primary-button');
const secondaryButton = () => document.body.querySelector('.secondary-button');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.params = { tenantId: 'tenant-1' };
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.tenantApi.GetSingleTenant.mockResolvedValue({ data: TENANT });
  mocks.tenantApi.getAllAdmins.mockResolvedValue({ data: { data: ADMINS } });
  mocks.tenantApi.ChangeAccountOfficer.mockResolvedValue({});
  mocks.tenantApi.UpdateTenantInfo.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loading the tenant', () => {
  it('shows a section loader until both requests settle', async () => {
    mocks.state = buildState(ALL_PERMS);
    render(<TenantSingleAccOverview />);
    expect(document.body.querySelector('.section-loader')).toBeInTheDocument();
    await act(async () => {});
    expect(document.body.querySelector('.section-loader')).toBeNull();
  });

  it('reads a tenant response that is not wrapped in data', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({ ...TENANT });
    await renderOverview();
    expect(document.body.querySelector('.tenant-org-name')).toHaveTextContent('Acme Health');
  });

  it('reports a failed tenant load and shows the not-found placeholder', async () => {
    mocks.tenantApi.GetSingleTenant.mockRejectedValue(new Error('x'));
    await renderOverview();
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOAD_TENANT');
    expect(screen.getByText('Tenant not found.')).toBeInTheDocument();
  });

  it('reports an error thrown while unpacking the settled responses', async () => {
    // A fulfilled-but-empty response makes the unpacking itself throw, which is
    // the only way into the outer catch.
    mocks.tenantApi.GetSingleTenant.mockResolvedValue(undefined);
    await renderOverview();
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(TypeError), 'LOAD_TENANT_DATA');
    expect(screen.getByText('Tenant not found.')).toBeInTheDocument();
  });

  it('survives an admin list that never arrives', async () => {
    mocks.tenantApi.getAllAdmins.mockRejectedValue(new Error('x'));
    await renderOverview();
    fireEvent.click(screen.getByText('Change'));
    expect(
      screen.getAllByText('No account officers found. Create one in Settings → Staff.').length
    ).toBe(2);
  });

  it('accepts an admin list that is not nested under data', async () => {
    mocks.tenantApi.getAllAdmins.mockResolvedValue({ data: ADMINS });
    await renderOverview();
    fireEvent.click(screen.getByText('Change'));
    expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(0);
  });

  it('ignores an admin payload that is not a list', async () => {
    mocks.tenantApi.getAllAdmins.mockResolvedValue({ data: { data: 'nope' } });
    await renderOverview();
    fireEvent.click(screen.getByText('Change'));
    expect(field('Change to').querySelectorAll('option')).toHaveLength(1);
  });

  it('falls back to an empty admin list when the response has no body', async () => {
    mocks.tenantApi.getAllAdmins.mockResolvedValue({});
    await renderOverview();
    fireEvent.click(screen.getByText('Change'));
    expect(field('Change to').querySelectorAll('option')).toHaveLength(1);
  });
});

describe('header and status', () => {
  it('navigates back a step', async () => {
    await renderOverview();
    fireEvent.click(screen.getByLabelText('Go back'));
    expect(mocks.navigate).toHaveBeenCalledWith(-1);
  });

  it('breadcrumbs the company name', async () => {
    await renderOverview();
    expect(document.body.querySelector('.tenant-title-breadcrumbs-org')).toHaveTextContent('Acme Health');
  });

  it('breadcrumbs the contact person when there is no company name', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({ data: { ...TENANT, companyName: '' } });
    await renderOverview();
    expect(document.body.querySelector('.tenant-title-breadcrumbs-org')).toHaveTextContent('Alan T');
  });

  it('badges an active account', async () => {
    await renderOverview();
    expect(document.body.querySelector('.tenant-status-badge')).toHaveClass('active');
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('badges an inactive account', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({ data: { ...TENANT, active: false } });
    await renderOverview();
    expect(document.body.querySelector('.tenant-status-badge')).toHaveClass('inactive');
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });
});

describe('account officer card', () => {
  it('builds the avatar from the officer first and last name', async () => {
    await renderOverview();
    expect(document.body.querySelector('.officer-avatar')).toHaveTextContent('AL');
    expect(document.body.querySelector('.officer-name')).toHaveTextContent('Ada Lovelace');
  });

  it('takes two letters from a single-word officer name', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({
      data: { ...TENANT, accountOfficer: { firstName: 'Cher' } },
    });
    await renderOverview();
    expect(document.body.querySelector('.officer-avatar')).toHaveTextContent('CH');
  });

  it('shows a question mark when nobody is assigned', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({
      data: { ...TENANT, accountOfficer: { firstName: '', lastName: '' } },
    });
    await renderOverview();
    expect(document.body.querySelector('.officer-avatar')).toHaveTextContent('?');
  });

  it('reads Unassigned when the tenant has no officer', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({ data: { ...TENANT, accountOfficer: null } });
    await renderOverview();
    expect(document.body.querySelector('.officer-name')).toHaveTextContent('Unassigned');
    expect(document.body.querySelector('.officer-avatar')).toHaveTextContent('UN');
  });

  it('hides the change button from a role without the permission', async () => {
    await renderOverview({ permissions: ['edit_tenant'] });
    expect(screen.queryByText('Change')).toBeNull();
  });
});

describe('general information grid', () => {
  it('lists every stored value, resolving the country code to a name', async () => {
    await renderOverview();
    expect(infoValue('Contact Person')).toBe('Alan T');
    expect(infoValue('Email')).toBe('alan@acme.test');
    expect(infoValue('Phone')).toBe('0800');
    expect(infoValue('Org Type')).toBe('ABA Clinic or Center');
    expect(infoValue('Company Size')).toBe('50-100');
    expect(infoValue('Street Address')).toBe('1 High St');
    expect(infoValue('City')).toBe('Lagos');
    expect(infoValue('State/Province')).toBe('CA');
    expect(infoValue('ZIP')).toBe('10001');
    expect(infoValue('Country')).toBe('United States');
    expect(infoValue('Subdomain')).toBe('acme');
  });

  it('falls back to the legacy state field', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({
      data: { ...TENANT, location: { state: 'Lagos State' } },
    });
    await renderOverview();
    expect(infoValue('State/Province')).toBe('Lagos State');
  });

  it('dashes every field the tenant leaves out', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({ data: { id: 't', companyName: 'Bare Co' } });
    await renderOverview();
    for (const label of [
      'Contact Person',
      'Email',
      'Phone',
      'Org Type',
      'Company Size',
      'Street Address',
      'City',
      'State/Province',
      'ZIP',
      'Country',
      'Subdomain',
    ]) {
      expect(infoValue(label)).toBe('—');
    }
  });
});

describe('plan summary', () => {
  it('shows the plan name beside a title-cased type badge', async () => {
    await renderOverview();
    expect(document.body.querySelector('.plan-badge')).toHaveTextContent('Enterprise');
    expect(screen.getByText(/Growth/)).toBeInTheDocument();
  });

  it('dashes the badge and the name when there is no subscription', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({ data: { id: 't', Subscription: [] } });
    await renderOverview();
    expect(document.body.querySelector('.plan-badge')).toHaveTextContent('—');
    expect(screen.getByText('0 out of 0 used')).toBeInTheDocument();
  });

  it('fills the usage bar in proportion to the seats used', async () => {
    await renderOverview();
    expect(document.body.querySelector('.usage-filled')).toHaveStyle({ width: '30%' });
    expect(screen.getByText('3 out of 10 used')).toBeInTheDocument();
  });

  it('clamps the usage bar at a hundred percent', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({
      data: { ...TENANT, _count: { clientLinks: 99 }, Subscription: [{ plan: { forClient: 10 } }] },
    });
    await renderOverview();
    expect(document.body.querySelector('.usage-filled')).toHaveStyle({ width: '100%' });
  });

  it('formats the next payment date', async () => {
    await renderOverview();
    expect(screen.getByText('Mar 15, 2026')).toBeInTheDocument();
  });

  it('disables the invoice button when the tenant has no invoice', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({ data: { ...TENANT, Invoice: [] } });
    await renderOverview();
    expect(screen.getByText('View invoice').closest('button')).toBeDisabled();
  });

  it('opens and closes the payment link modal for a permitted role', async () => {
    await renderOverview();
    fireEvent.click(screen.getByText('Change plan'));
    expect(screen.getByTestId('payment-link-tenant')).toHaveTextContent('tenant-1');
    fireEvent.click(screen.getByTestId('payment-link-close'));
    expect(screen.queryByTestId('payment-link-modal')).toBeNull();
  });

  it('hides the change-plan button from a role without the permission', async () => {
    await renderOverview({ permissions: ['edit_tenant'] });
    expect(screen.queryByText('Change plan')).toBeNull();
  });
});

describe('changing the account officer', () => {
  const openOfficerModal = async (over = {}) => {
    await renderOverview(over);
    fireEvent.click(screen.getByText('Change'));
  };

  it('seeds the from-field with the currently assigned admin', async () => {
    await openOfficerModal();
    expect(modalTitle()).toBe('Change account officer');
    expect(field('Change from')).toHaveValue('a1');
    expect(field('Change to')).toHaveValue('');
  });

  it('leaves the from-field blank when no admin is assigned', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({ data: { ...TENANT, assignToAdmin: null } });
    await openOfficerModal();
    expect(field('Change from')).toHaveValue('');
  });

  it('labels each admin by name, full name or email in turn', async () => {
    await openOfficerModal();
    const labels = Array.from(field('Change to').querySelectorAll('option')).map((o) => o.textContent);
    expect(labels).toContain('Ada Lovelace');
    expect(labels).toContain('Bo Kim');
    expect(labels).toContain('cleo@acme.test');
  });

  it('refuses to save without a target admin', async () => {
    await openOfficerModal();
    await act(async () => {
      fireEvent.click(primaryButton());
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Please select an admin to assign', 'error');
    expect(mocks.tenantApi.ChangeAccountOfficer).not.toHaveBeenCalled();
  });

  it('saves the new officer and reloads the tenant', async () => {
    await openOfficerModal();
    fireEvent.change(field('Change to'), { target: { value: 'a2' } });
    await act(async () => {
      fireEvent.click(primaryButton());
    });
    expect(mocks.tenantApi.ChangeAccountOfficer).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', adminId: 'a2' })
    );
    expect(mocks.showToast).toHaveBeenCalledWith('Account officer changed successfully', 'success');
    expect(modalTitle()).toBeUndefined();
    expect(mocks.tenantApi.GetSingleTenant).toHaveBeenCalledTimes(2);
  });

  it('keeps the modal open when the change is rejected', async () => {
    mocks.tenantApi.ChangeAccountOfficer.mockRejectedValue(new Error('x'));
    await openOfficerModal();
    fireEvent.change(field('Change to'), { target: { value: 'a2' } });
    await act(async () => {
      fireEvent.click(primaryButton());
    });
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'CHANGE_ACCOUNT_OFFICER');
    expect(modalTitle()).toBe('Change account officer');
  });

  it('clears the picked admin on cancel', async () => {
    await openOfficerModal();
    fireEvent.change(field('Change to'), { target: { value: 'a2' } });
    fireEvent.click(secondaryButton());
    expect(modalTitle()).toBeUndefined();
    fireEvent.click(screen.getByText('Change'));
    expect(field('Change to')).toHaveValue('');
  });
});

describe('editing tenant information', () => {
  const openEditModal = async (tenant) => {
    if (tenant) mocks.tenantApi.GetSingleTenant.mockResolvedValue({ data: tenant });
    await renderOverview();
    fireEvent.click(screen.getByText('Edit'));
  };

  it('seeds every field, resolving the stored country and state codes', async () => {
    await openEditModal();
    expect(modalTitle()).toBe('Edit tenant information');
    expect(field('Company Name')).toHaveValue('Acme Health');
    expect(field('Contact Person')).toHaveValue('Alan T');
    expect(field('Email')).toHaveValue('alan@acme.test');
    expect(field('Phone')).toHaveValue('0800');
    expect(field('Company Size')).toHaveValue('50-100');
    expect(field('Organization Type')).toHaveValue('ABA Clinic or Center');
    expect(field('Subdomain')).toHaveValue('acme');
    expect(field('Street Address')).toHaveValue('1 High St');
    expect(field('City')).toHaveValue('Lagos');
    expect(field('Country')).toHaveValue('United States');
    expect(field('State/Province')).toHaveValue('California');
    expect(field('ZIP')).toHaveValue('10001');
  });

  it('keeps a free-text state the geo data has never heard of', async () => {
    await openEditModal({ ...TENANT, location: { country: 'Other', state: 'Lagos State' } });
    // "Other" normalises to no country at all, so the state cannot be resolved
    // and is offered back as its own option instead of being dropped.
    expect(field('Country')).toHaveValue('');
    expect(field('State/Province')).toHaveValue('Lagos State');
    expect(field('State/Province')).toBeDisabled();
  });

  it('hints that a country is needed when the tenant has no location', async () => {
    await openEditModal({ id: 't', companyName: 'Bare Co' });
    expect(screen.getByText('Select a country first.')).toBeInTheDocument();
    expect(field('State/Province')).toBeDisabled();
  });

  it('clears the state when the country changes', async () => {
    await openEditModal();
    fireEvent.change(field('Country'), { target: { value: 'Canada' } });
    expect(field('State/Province')).toHaveValue('');
    expect(field('State/Province')).not.toBeDisabled();
    const provinces = Array.from(field('State/Province').querySelectorAll('option')).map(
      (o) => o.textContent
    );
    expect(provinces).toContain('Ontario');
    expect(provinces).not.toContain('California');
  });

  it('strips digits and punctuation from the subdomain', async () => {
    await openEditModal();
    fireEvent.change(field('Subdomain'), { target: { value: 'My.Co-42' } });
    expect(field('Subdomain')).toHaveValue('myco-');
  });

  it('refuses to save without a company name', async () => {
    await openEditModal();
    fireEvent.change(field('Company Name'), { target: { value: '' } });
    await act(async () => {
      fireEvent.click(primaryButton());
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Company name is required', 'error');
    expect(mocks.tenantApi.UpdateTenantInfo).not.toHaveBeenCalled();
  });

  it('sends the edited tenant and reloads it', async () => {
    await openEditModal();
    fireEvent.change(field('Company Name'), { target: { value: 'Acme Health Ltd' } });
    fireEvent.change(field('City'), { target: { value: 'Abuja' } });
    fireEvent.change(field('ZIP'), { target: { value: '90210' } });
    fireEvent.change(field('Street Address'), { target: { value: '2 Low St' } });
    await act(async () => {
      fireEvent.click(primaryButton());
    });
    expect(mocks.tenantApi.UpdateTenantInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          id: 'tenant-1',
          companyName: 'Acme Health Ltd',
          location: expect.objectContaining({
            address: '2 Low St',
            city: 'Abuja',
            zip: '90210',
            country: 'United States',
            stateProvince: 'California',
          }),
        }),
      })
    );
    expect(mocks.showToast).toHaveBeenCalledWith('Tenant information updated successfully', 'success');
    expect(modalTitle()).toBeUndefined();
  });

  it('keeps the modal open when the update is rejected', async () => {
    mocks.tenantApi.UpdateTenantInfo.mockRejectedValue(new Error('x'));
    await openEditModal();
    await act(async () => {
      fireEvent.click(primaryButton());
    });
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'UPDATE_TENANT');
    expect(modalTitle()).toBe('Edit tenant information');
  });

  it('empties the form on cancel', async () => {
    await openEditModal();
    fireEvent.click(secondaryButton());
    expect(modalTitle()).toBeUndefined();
  });

  it('hides the edit button from a role without the permission', async () => {
    await renderOverview({ permissions: ['change_account_officer'] });
    expect(screen.queryByText('Edit')).toBeNull();
  });

  it('accepts every other contact field being blank', async () => {
    await openEditModal({ id: 't', companyName: 'Bare Co' });
    expect(field('Contact Person')).toHaveValue('');
    expect(field('Email')).toHaveValue('');
    expect(field('Phone')).toHaveValue('');
    expect(field('Company Size')).toHaveValue('');
    expect(field('Organization Type')).toHaveValue('');
    expect(field('Subdomain')).toHaveValue('');
    expect(field('Street Address')).toHaveValue('');
    expect(field('City')).toHaveValue('');
    expect(field('ZIP')).toHaveValue('');
  });
});

describe('viewing the invoice', () => {
  const invoiceBody = {
    data: {
      invoiceId: 'INV-77',
      dueDate: '2026-06-01T12:00:00Z',
      billingFrequency: 'Monthly',
      total: 1500,
      items: [
        {
          description: 'Seats',
          rate: { price: 100 },
          quantity: 2,
          price: 200,
          extraFeaturesWithPrice: [{ pricePerMonth: { price: 25 }, pricePerYear: { price: 250 } }],
        },
      ],
    },
  };

  const openInvoice = async () => {
    await renderOverview();
    await act(async () => {
      fireEvent.click(screen.getByText('View invoice'));
    });
  };

  it('opens the invoice with its monthly add-on pricing', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue(invoiceBody);
    await openInvoice();
    expect(screen.getByTestId('invoice-id')).toHaveTextContent('INV-77');
    expect(screen.getByTestId('invoice-total')).toHaveTextContent('$1,500');
    expect(screen.getByTestId('invoice-item-1')).toHaveTextContent('Seats|$100|2|$200');
    expect(screen.getByTestId('invoice-item-2')).toHaveTextContent('Add-on Feature|$25|2|$50');
  });

  it('prices an add-on per year for a yearly invoice', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({
      data: { ...invoiceBody.data, billingFrequency: 'Yearly' },
    });
    await openInvoice();
    expect(screen.getByTestId('invoice-item-2')).toHaveTextContent('Add-on Feature|$250|2|$500');
  });

  it('zeroes an add-on with no price and defaults its quantity to one', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({
      data: { invoiceId: 'INV-78', items: [{ description: 'Base', extraFeaturesWithPrice: [{}] }] },
    });
    await openInvoice();
    expect(screen.getByTestId('invoice-item-1')).toHaveTextContent('Base|$0||$0');
    expect(screen.getByTestId('invoice-item-2')).toHaveTextContent('Add-on Feature|$0|1|$0');
  });

  it('falls back to the requested id and a zero total for an empty body', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({});
    await openInvoice();
    expect(screen.getByTestId('invoice-id')).toHaveTextContent('inv-1');
    expect(screen.getByTestId('invoice-due')).toHaveTextContent('—');
    expect(screen.getByTestId('invoice-total')).toHaveTextContent('$0');
    expect(screen.queryByTestId('invoice-item-1')).toBeNull();
  });

  it('surfaces a failed invoice load', async () => {
    mocks.invoiceApi.GetInvoiceById.mockRejectedValue(new Error('x'));
    await openInvoice();
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOAD_INVOICE');
    expect(screen.queryByTestId('subscription-invoice')).toBeNull();
  });

  it('closes from the cross but not from a click inside the panel', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue(invoiceBody);
    await openInvoice();
    fireEvent.click(screen.getByTestId('subscription-invoice').parentElement);
    expect(screen.getByTestId('subscription-invoice')).toBeInTheDocument();
    fireEvent.click(screen.getByText('✕'));
    expect(screen.queryByTestId('subscription-invoice')).toBeNull();
  });

  it('closes from the backdrop', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue(invoiceBody);
    await openInvoice();
    fireEvent.click(screen.getByTestId('subscription-invoice').parentElement.parentElement);
    expect(screen.queryByTestId('subscription-invoice')).toBeNull();
  });
});

describe('fallbacks the happy path never reaches', () => {
  it('stores a null tenant when the response body is empty', async () => {
    // `tenantRes.value.data || tenantRes.value` has to land on something falsy
    // for `setTenant(data || null)` to take its right-hand arm, and an empty
    // string is the only shape that survives the property read and stays falsy.
    mocks.tenantApi.GetSingleTenant.mockResolvedValue('');
    await renderOverview();
    expect(screen.getByText('Tenant not found.')).toBeInTheDocument();
  });

  it('seeds a blank company name for a tenant that has none', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({ data: { id: 't' } });
    await renderOverview();
    fireEvent.click(screen.getByText('Edit'));
    expect(field('Company Name')).toHaveValue('');
  });

  it('strips a cleared subdomain back to an empty string', async () => {
    await renderOverview();
    fireEvent.click(screen.getByText('Edit'));
    // React reports a cleared native input as '', which is what the `|| ""`
    // guard in the change handler exists to absorb.
    fireEvent.change(field('Subdomain'), { target: { value: '' } });
    expect(field('Subdomain')).toHaveValue('');
  });

  it('lists an invoice line that carries no add-on features at all', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({
      data: { invoiceId: 'INV-90', items: [{ description: 'Seats', quantity: 1, price: 10 }] },
    });
    await renderOverview();
    await act(async () => {
      fireEvent.click(screen.getByText('View invoice'));
    });
    expect(screen.getByTestId('invoice-item-1')).toHaveTextContent('Seats|$0|1|$10');
    expect(screen.queryByTestId('invoice-item-2')).toBeNull();
  });

  it('zeroes a yearly add-on that has no yearly price', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({
      data: {
        invoiceId: 'INV-91',
        billingFrequency: 'Yearly',
        items: [{ description: 'Seats', quantity: 2, extraFeaturesWithPrice: [{}] }],
      },
    });
    await renderOverview();
    await act(async () => {
      fireEvent.click(screen.getByText('View invoice'));
    });
    expect(screen.getByTestId('invoice-item-2')).toHaveTextContent('Add-on Feature|$0|2|$0');
  });
});
