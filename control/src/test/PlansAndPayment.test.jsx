import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

/**
 * The plans board: a standard/enterprise tab pair over four requests fired
 * together through `Promise.allSettled`, plus the create, edit, duplicate,
 * status-change and delete flows that all end in a refetch.
 *
 * Every request has its own malformed-payload arm and its own rejected arm, and
 * the plan mapper is a long chain of fallbacks, so most fixtures here differ
 * only in which field is missing. The four modals and both list renderers are
 * probes: each one exposes a button that calls the callback the page handed it
 * with a payload the test set beforehand, which is the only way to reach the
 * save/confirm handlers without driving the real form.
 *
 * Note that `tenants` and `admins` are read from the render closure while the
 * plans are mapped, so tenant and account-manager names only resolve on a
 * second fetch -- the tests below pin that behaviour rather than the intent.
 */

const mocks = vi.hoisted(() => ({
  auth: { accessToken: 'tok', refreshToken: 'ref' },
  hasPermission: vi.fn(() => true),
  navigate: vi.fn(),
  billing: {
    GetPlanByPlanType: vi.fn(),
    CreateBillingPlan: vi.fn(),
    UpdateBillingPlan: vi.fn(),
    DuplicateBillingPlan: vi.fn(),
    TogglePlanActivity: vi.fn(),
    DeleteBillingPlan: vi.fn(),
  },
  featureApi: { GetAllFeatures: vi.fn() },
  tenantApi: { getAllAdmins: vi.fn(), getAllTenants: vi.fn() },
  showToast: vi.fn(),
  // Payloads the modal probes hand back to the page. Reassigned per test.
  savePayload: null,
  password: 'hunter2',
}));

vi.mock('../hooks/useAuth', () => ({ default: () => mocks.auth }));
vi.mock('../hooks/usePermission', () => ({
  default: () => ({ hasPermission: mocks.hasPermission }),
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mocks.navigate };
});
vi.mock('../api/BillingApis', () => ({ default: mocks.billing }));
vi.mock('../api/FeatureApis', () => ({ default: mocks.featureApi }));
vi.mock('../api/TenantApis', () => ({ default: mocks.tenantApi }));
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => mocks.showToast(...a),
  showApiError: vi.fn(),
}));

vi.mock('../Pages/BillingsAndPayment/PlanCard', () => ({
  default: (props) => (
    <div data-testid="plan-card">
      <span data-testid="plan-card-name">{props.plan.name}</span>
      <span data-testid="plan-card-status">{props.plan.status}</span>
      <span data-testid="plan-card-tenant">{props.plan.tenantName}</span>
      <span data-testid="plan-card-admin">{props.plan.accountManagerName}</span>
      <span data-testid="plan-card-colour">{props.plan.colourCode}</span>
      <span data-testid="plan-card-cost">{props.plan.pricing.cost}</span>
      <span data-testid="plan-card-storage">{props.plan.pricing.storage}</span>
      <span data-testid="plan-card-extra">{props.plan.pricing.extra}</span>
      <span data-testid="plan-card-usertype">{props.plan.pricing.userType}</span>
      <span data-testid="plan-card-subs">{props.plan.subscriberCount}</span>
      <span data-testid="plan-card-features">{props.plan.features.join('|')}</span>
      <span data-testid="plan-card-extra-features">
        {props.plan.extraFeatures.map((f) => `${f.id}:${f.name}`).join('|')}
      </span>
      <span data-testid="plan-card-date">{props.plan.dateAdded}</span>
      <button data-testid="plan-card-duplicate" onClick={props.onDuplicate}>
        duplicate
      </button>
      <button
        data-testid="plan-card-activate"
        onClick={() => props.onStatusChange('activate')}
      >
        activate
      </button>
      <button
        data-testid="plan-card-deactivate"
        onClick={() => props.onStatusChange('deactivate')}
      >
        deactivate
      </button>
      <button data-testid="plan-card-edit" onClick={props.onEdit}>
        edit
      </button>
      <button data-testid="plan-card-delete" onClick={props.onDelete}>
        delete
      </button>
    </div>
  ),
}));

vi.mock('../Pages/BillingsAndPayment/EnterpriseTable', () => ({
  default: (props) => (
    <div data-testid="enterprise-table">
      <span data-testid="enterprise-count">{props.plans.length}</span>
      <span data-testid="enterprise-org">{props.plans[0]?.organization}</span>
      <button
        data-testid="enterprise-deactivate"
        onClick={() => props.onStatusChange(props.plans[0], 'deactivate')}
      >
        deactivate
      </button>
      <button
        data-testid="enterprise-activate"
        onClick={() => props.onStatusChange(props.plans[0], 'activate')}
      >
        activate
      </button>
      {/* The table decides which row it hands back, so it can hand back a
          broken one; these three reach the guards that defend against that. */}
      <button
        data-testid="enterprise-status-no-id"
        onClick={() => props.onStatusChange({}, 'activate')}
      >
        status no id
      </button>
      <button data-testid="enterprise-edit-no-id" onClick={() => props.onEdit({})}>
        edit no id
      </button>
      <button data-testid="enterprise-delete-no-id" onClick={() => props.onDelete({})}>
        delete no id
      </button>
      <button
        data-testid="enterprise-edit"
        onClick={() => props.onEdit(props.plans[0])}
      >
        edit
      </button>
      <button
        data-testid="enterprise-delete"
        onClick={() => props.onDelete(props.plans[0])}
      >
        delete
      </button>
      <button
        data-testid="enterprise-profile"
        onClick={() => props.onViewProfile(props.plans[0])}
      >
        profile
      </button>
    </div>
  ),
}));

// The two pricing modals are the same probe twice over: each reports that it is
// open, echoes the lists it was handed, and hands a test-supplied payload back
// through onSave. The factories cannot share a helper -- vi.mock is hoisted
// above every top-level binding in the file.
vi.mock('../Components/ReusableModal/PricingModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="create-modal">
        <span data-testid="create-features">{props.features.length}</span>
        <span data-testid="create-admins">{props.admins.length}</span>
        <span data-testid="create-admin-names">
          {props.admins.map((a) => `${a.id}/${a.name}`).join('|')}
        </span>
        <span data-testid="create-tenants">{props.tenants.length}</span>
        <span data-testid="create-tenant-names">
          {props.tenants.map((t) => `${t.id}/${t.name}`).join('|')}
        </span>
        <span data-testid="create-plan-type">{props.initialPlanType}</span>
        <button
          data-testid="create-save"
          onClick={() => Promise.resolve(props.onSave(mocks.savePayload)).catch(() => {})}
        >
          save
        </button>
        <button data-testid="create-close" onClick={props.onClose}>
          close
        </button>
      </div>
    ) : null,
}));
vi.mock('../Components/ReusableModal/EditPricingModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="edit-modal">
        <span data-testid="edit-features">{props.features.length}</span>
        <span data-testid="edit-plan">{props.plan?.id}</span>
        <button
          data-testid="edit-save"
          onClick={() => Promise.resolve(props.onSave(mocks.savePayload)).catch(() => {})}
        >
          save
        </button>
        <button data-testid="edit-close" onClick={props.onClose}>
          close
        </button>
      </div>
    ) : null,
}));

vi.mock('../Components/ReusableModal/StatusChangeModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="status-modal">
        <span data-testid="status-action">{props.action}</span>
        <span data-testid="status-plan">{props.plan?.id}</span>
        <button
          data-testid="status-confirm"
          onClick={() =>
            props.onConfirm({
              plan: props.plan,
              action: props.action,
              administratorPassword: mocks.password,
            })
          }
        >
          confirm
        </button>
        <button data-testid="status-close" onClick={props.onClose}>
          close
        </button>
      </div>
    ) : null,
}));

vi.mock('../Components/ReusableModal/DeletePlanModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="delete-modal">
        <span data-testid="delete-plan">{props.plan?.id}</span>
        <button
          data-testid="delete-confirm"
          onClick={() =>
            props.onConfirm({
              plan: props.plan,
              administratorPassword: mocks.password,
            })
          }
        >
          confirm
        </button>
        <button data-testid="delete-close" onClick={props.onClose}>
          close
        </button>
      </div>
    ) : null,
}));

import PlansAndPayment from '../Pages/BillingsAndPayment/PlansAndPayment';

// One fully populated plan and one stripped bare, so a single fixture drives
// both arms of every fallback in the mapper. The third row has no id and is
// dropped before mapping.
const richPlan = {
  id: 'p1',
  name: 'Pro',
  active: true,
  _count: { subscriptions: 3 },
  colourCode: '#123456',
  pricePerMonth: { currency: 'GBP', price: 12 },
  forStorage: 50,
  extraFeaturesWithPrice: [{ pricePerMonth: { price: 7 } }],
  forClient: 10,
  features: [{ name: 'Invoicing' }, {}],
  extraFeatures: [{ id: 'e1', name: 'Extra' }, {}],
  tenantId: 't1',
  adminId: 'a1',
  organization: 'Acme Health',
  createdAt: '2024-01-02T00:00:00.000Z',
};

const barePlan = {
  id: 'p2',
  active: false,
  colourCode: 'not-a-colour',
  forStaff: 4,
  extraFeaturesWithPrice: [],
  features: 'nope',
  extraFeatures: null,
  organization: 'Beta Clinic',
};

const plansOk = { data: [richPlan, barePlan, { name: 'no id' }] };
const featuresOk = {
  data: { data: [{ id: 'f1', name: 'Invoicing' }, { id: 'f2' }] },
};
const adminsOk = {
  data: { data: [{ id: 'a1', firstName: 'Ada', lastName: 'Lovelace' }, { id: 'a2' }] },
};
const tenantsOk = {
  data: { data: [{ id: 't1', companyName: 'Acme Health' }, { id: 't2' }] },
};

const resolveAll = () => {
  mocks.billing.GetPlanByPlanType.mockResolvedValue(plansOk);
  mocks.featureApi.GetAllFeatures.mockResolvedValue(featuresOk);
  mocks.tenantApi.getAllAdmins.mockResolvedValue(adminsOk);
  mocks.tenantApi.getAllTenants.mockResolvedValue(tenantsOk);
};

// `loading` starts false, so waiting only for the loader to disappear would
// return before the first fetch had even begun. Wait for it to appear first.
const renderPage = async () => {
  const view = render(<PlansAndPayment />);
  await waitFor(() =>
    expect(document.body.querySelector('.section-loader')).toBeInTheDocument()
  );
  await waitFor(() =>
    expect(document.body.querySelector('.section-loader')).toBeNull()
  );
  return view;
};

// Tab clicks are ignored while a fetch is in flight, so every switch has to
// wait for the refetch it triggers before the next interaction.
const switchTab = async (label) => {
  fireEvent.click(screen.getByText(label));
  await waitFor(() =>
    expect(document.body.querySelector('.section-loader')).toBeInTheDocument()
  );
  await waitFor(() =>
    expect(document.body.querySelector('.section-loader')).toBeNull()
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mocks.hasPermission.mockReturnValue(true);
  mocks.auth = { accessToken: 'tok', refreshToken: 'ref' };
  mocks.savePayload = null;
  mocks.password = 'hunter2';
  // import.meta.env.DEV is true under Vitest, so every catch logs; keep the
  // reporter readable without hiding a genuine React warning.
  vi.spyOn(console, 'error').mockImplementation(() => {});
  resolveAll();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('permissions', () => {
  it('replaces the whole page when the plans cannot be viewed', () => {
    mocks.hasPermission.mockImplementation((key) => key !== 'view_plans');
    render(<PlansAndPayment />);
    expect(screen.getByText("You don't have permission to view this.")).toBeInTheDocument();
    expect(screen.queryByText('Billing & Payment')).not.toBeInTheDocument();
  });

  it('hides the add button when the plan cannot be created', async () => {
    mocks.hasPermission.mockImplementation((key) => key !== 'create_plan');
    await renderPage();
    expect(screen.queryByText('Add New Plan')).not.toBeInTheDocument();
  });
});

describe('the initial fetch', () => {
  it('asks for standard plans and renders a card per mapped plan', async () => {
    await renderPage();
    expect(mocks.billing.GetPlanByPlanType).toHaveBeenCalledWith(
      expect.objectContaining({ planType: 'STANDARD' })
    );
    expect(screen.getAllByTestId('plan-card')).toHaveLength(2);
  });

  it('maps a fully populated plan', async () => {
    await renderPage();
    const [first] = screen.getAllByTestId('plan-card');
    expect(first.querySelector('[data-testid="plan-card-name"]').textContent).toBe('Pro');
    expect(first.querySelector('[data-testid="plan-card-status"]').textContent).toBe('active');
    expect(first.querySelector('[data-testid="plan-card-colour"]').textContent).toBe('#123456');
    expect(first.querySelector('[data-testid="plan-card-cost"]').textContent).toBe(
      'GBP12 PER MONTH'
    );
    expect(first.querySelector('[data-testid="plan-card-storage"]').textContent).toBe(
      '50 DATA STORAGE'
    );
    expect(first.querySelector('[data-testid="plan-card-extra"]').textContent).toBe(
      '$7 FOR EVERY EXTRA CLIENT'
    );
    expect(first.querySelector('[data-testid="plan-card-usertype"]').textContent).toBe('clients');
    expect(first.querySelector('[data-testid="plan-card-subs"]').textContent).toBe('3');
    // The second feature has no name and the second extra feature no id/name.
    expect(first.querySelector('[data-testid="plan-card-features"]').textContent).toBe(
      'Invoicing|Unnamed Feature'
    );
    expect(
      first.querySelector('[data-testid="plan-card-extra-features"]').textContent
    ).toBe('e1:Extra|:Unnamed Extra Feature');
  });

  it('falls back on every field the bare plan is missing', async () => {
    await renderPage();
    const [, second] = screen.getAllByTestId('plan-card');
    // No name, so the organization stands in for it.
    expect(second.querySelector('[data-testid="plan-card-name"]').textContent).toBe(
      'Beta Clinic'
    );
    expect(second.querySelector('[data-testid="plan-card-status"]').textContent).toBe(
      'inactive'
    );
    expect(second.querySelector('[data-testid="plan-card-subs"]').textContent).toBe('0');
    expect(second.querySelector('[data-testid="plan-card-colour"]').textContent).toBe(
      '#ffffff'
    );
    expect(second.querySelector('[data-testid="plan-card-cost"]').textContent).toBe(
      'USD0 PER MONTH'
    );
    expect(second.querySelector('[data-testid="plan-card-storage"]').textContent).toBe(
      'unlimited DATA STORAGE'
    );
    expect(second.querySelector('[data-testid="plan-card-extra"]').textContent).toBe(
      '$0 FOR EVERY EXTRA CLIENT'
    );
    expect(second.querySelector('[data-testid="plan-card-usertype"]').textContent).toBe(
      'staffs'
    );
    expect(second.querySelector('[data-testid="plan-card-features"]').textContent).toBe('');
    expect(
      second.querySelector('[data-testid="plan-card-extra-features"]').textContent
    ).toBe('');
    // No createdAt, so the mapper stamps today rather than leaving it blank.
    expect(second.querySelector('[data-testid="plan-card-date"]').textContent).not.toBe(
      'N/A'
    );
  });

  it('names an unnamed plan when it has neither name nor organization', async () => {
    mocks.billing.GetPlanByPlanType.mockResolvedValue({ data: [{ id: 'p9' }] });
    await renderPage();
    expect(screen.getByTestId('plan-card-name').textContent).toBe('Unnamed Plan');
  });

  it('falls back to a zero price when the monthly price object is empty', async () => {
    mocks.billing.GetPlanByPlanType.mockResolvedValue({
      data: [{ id: 'p9', name: 'Zero', pricePerMonth: {}, extraFeaturesWithPrice: [{}] }],
    });
    await renderPage();
    expect(screen.getByTestId('plan-card-cost').textContent).toBe('$0 PER MONTH');
    expect(screen.getByTestId('plan-card-extra').textContent).toBe(
      '$0 FOR EVERY EXTRA CLIENT'
    );
  });

  it('leaves tenant and admin unassigned on the first pass and resolves them on the next', async () => {
    await renderPage();
    // tenants/admins are still the empty initial state while these plans map.
    expect(screen.getAllByTestId('plan-card-tenant')[0].textContent).toBe('Unassigned');
    expect(screen.getAllByTestId('plan-card-admin')[0].textContent).toBe('Unassigned');

    await switchTab('Enterprise Plans');
    await switchTab('Standard Plans');
    expect(screen.getAllByTestId('plan-card-tenant')[0].textContent).toBe('Acme Health');
    expect(screen.getAllByTestId('plan-card-admin')[0].textContent).toBe('Ada Lovelace');
    // The bare plan carries no tenantId or adminId at all.
    expect(screen.getAllByTestId('plan-card-tenant')[1].textContent).toBe('Unassigned');
  });

  it('names an admin and a tenant that arrive with almost nothing', async () => {
    mocks.tenantApi.getAllAdmins.mockResolvedValue({
      data: { data: [{ id: 'a1', firstName: 'Grace' }, { id: 'a2' }, {}] },
    });
    mocks.tenantApi.getAllTenants.mockResolvedValue({
      data: { data: [{ id: 't1', companyName: 'Acme Health' }, { id: 't2' }, {}] },
    });
    await renderPage();
    fireEvent.click(screen.getByText('Add New Plan'));

    // Half a name is still a name; no name at all falls back to the id, and a
    // record with neither gets the placeholder and an empty id.
    expect(screen.getByTestId('create-admin-names').textContent).toBe(
      'a1/Grace|a2/a2|/Unnamed Admin'
    );
    expect(screen.getByTestId('create-tenant-names').textContent).toBe(
      't1/Acme Health|t2/t2|/Unnamed Tenant'
    );
  });

  it('reports a failure that never reaches Promise.allSettled', async () => {
    // A synchronous throw escapes before the per-promise catch is attached, so
    // it lands in the outer catch and is reported as a general error.
    mocks.billing.GetPlanByPlanType.mockImplementation(() => {
      throw new Error('sync boom');
    });
    render(<PlansAndPayment />);
    await waitFor(() => expect(screen.getByText('sync boom')).toBeInTheDocument());
    expect(mocks.showToast).toHaveBeenCalledWith('sync boom', 'error');
  });

  it('falls back to a generic message when that failure carries none', async () => {
    mocks.billing.GetPlanByPlanType.mockImplementation(() => {
      throw {};
    });
    render(<PlansAndPayment />);
    await waitFor(() =>
      expect(
        screen.getByText('Unexpected error occurred while fetching data')
      ).toBeInTheDocument()
    );
  });

  it('keeps that failure out of the console outside development', async () => {
    vi.stubEnv('DEV', false);
    mocks.billing.GetPlanByPlanType.mockImplementation(() => {
      throw new Error('sync boom');
    });
    render(<PlansAndPayment />);
    await waitFor(() => expect(screen.getByText('sync boom')).toBeInTheDocument());
    expect(console.error).not.toHaveBeenCalled();
  });

  it('complains when neither token is present instead of fetching', () => {
    mocks.auth = { accessToken: null, refreshToken: null };
    render(<PlansAndPayment />);
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Authentication token is missing',
      'error'
    );
    expect(mocks.billing.GetPlanByPlanType).not.toHaveBeenCalled();
    // The message is stored under an `auth` key that the error panel does not
    // render, so only the empty state reaches the screen.
    expect(screen.queryByText('Authentication token is missing')).not.toBeInTheDocument();
    expect(
      screen.getByText('No standard plans have been created yet.')
    ).toBeInTheDocument();
  });
});

describe('malformed and failing responses', () => {
  it('reports plans that are not an array', async () => {
    mocks.billing.GetPlanByPlanType.mockResolvedValue({ data: { nope: true } });
    await renderPage();
    expect(
      screen.getByText('Invalid plans data received from API')
    ).toBeInTheDocument();
  });

  it('reports a response whose plans all lack an id', async () => {
    mocks.billing.GetPlanByPlanType.mockResolvedValue({ data: [{ name: 'no id' }] });
    await renderPage();
    expect(
      screen.getByText('No valid plans could be mapped from the response')
    ).toBeInTheDocument();
    expect(mocks.showToast).toHaveBeenCalledWith(
      'No valid plans found in the response',
      'error'
    );
  });

  it('reports features that are not a nested array', async () => {
    mocks.featureApi.GetAllFeatures.mockResolvedValue({ data: {} });
    await renderPage();
    expect(
      screen.getByText('Invalid features data received from API')
    ).toBeInTheDocument();
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Failed to load features: Invalid data format',
      'error'
    );
  });

  it('reports a feature list where nothing has both an id and a name', async () => {
    mocks.featureApi.GetAllFeatures.mockResolvedValue({ data: { data: [{ id: 'f1' }] } });
    await renderPage();
    expect(screen.getByText('No valid features found')).toBeInTheDocument();
  });

  it('reports admins and tenants that are not arrays', async () => {
    mocks.tenantApi.getAllAdmins.mockResolvedValue({ data: {} });
    mocks.tenantApi.getAllTenants.mockResolvedValue({ data: {} });
    await renderPage();
    expect(
      screen.getByText('Invalid admins data received from API')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Invalid tenants data received from API')
    ).toBeInTheDocument();
  });

  it('surfaces the wrapped message when a request rejects', async () => {
    mocks.billing.GetPlanByPlanType.mockRejectedValue(new Error('boom'));
    await renderPage();
    expect(screen.getByText('Failed to fetch plans: boom')).toBeInTheDocument();
  });

  it('reports every rejection at once', async () => {
    mocks.billing.GetPlanByPlanType.mockRejectedValue(new Error('a'));
    mocks.featureApi.GetAllFeatures.mockRejectedValue(new Error('b'));
    mocks.tenantApi.getAllAdmins.mockRejectedValue(new Error('c'));
    mocks.tenantApi.getAllTenants.mockRejectedValue(new Error('d'));
    await renderPage();
    expect(screen.getByText('Failed to fetch plans: a')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch features: b')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch admins: c')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch tenants: d')).toBeInTheDocument();
  });

  it('keeps quiet in the console outside development', async () => {
    vi.stubEnv('DEV', false);
    mocks.billing.GetPlanByPlanType.mockRejectedValue(new Error('boom'));
    await renderPage();
    expect(console.error).not.toHaveBeenCalled();
    expect(screen.getByText('Failed to fetch plans: boom')).toBeInTheDocument();
  });

  it('shows the empty-state fallback alongside the errors', async () => {
    mocks.billing.GetPlanByPlanType.mockResolvedValue({ data: [] });
    mocks.featureApi.GetAllFeatures.mockResolvedValue({ data: {} });
    await renderPage();
    expect(
      screen.getByText('No standard plans have been created yet.')
    ).toBeInTheDocument();
  });

  it('leaves the fallback out when the errored tab still has plans', async () => {
    mocks.tenantApi.getAllAdmins.mockResolvedValue({ data: {} });
    await renderPage();
    expect(
      screen.queryByText('No standard plans have been created yet.')
    ).not.toBeInTheDocument();
  });
});

describe('tabs, search and filtering', () => {
  it('refetches as enterprise and renders the table instead of cards', async () => {
    await renderPage();
    await switchTab('Enterprise Plans');
    expect(mocks.billing.GetPlanByPlanType).toHaveBeenCalledWith(
      expect.objectContaining({ planType: 'ENTERPRISE' })
    );
    expect(screen.getByTestId('enterprise-table')).toBeInTheDocument();
    expect(screen.getByTestId('enterprise-count').textContent).toBe('2');
  });

  it('narrows standard plans by name and enterprise plans by organization', async () => {
    await renderPage();
    fireEvent.change(screen.getByPlaceholderText('Search plans'), {
      target: { value: 'pro' },
    });
    expect(screen.getAllByTestId('plan-card')).toHaveLength(1);

    await switchTab('Enterprise Plans');
    fireEvent.change(screen.getByPlaceholderText('Search enterprise plans'), {
      target: { value: 'beta' },
    });
    expect(screen.getByTestId('enterprise-count').textContent).toBe('1');
  });

  it('filters by status in both directions', async () => {
    await renderPage();
    const select = document.body.querySelector('.plan-filter-select-input');
    fireEvent.change(select, { target: { value: 'active' } });
    expect(screen.getAllByTestId('plan-card')).toHaveLength(1);
    expect(screen.getByTestId('plan-card-name').textContent).toBe('Pro');

    fireEvent.change(select, { target: { value: 'inactive' } });
    expect(screen.getByTestId('plan-card-name').textContent).toBe('Beta Clinic');

    fireEvent.change(select, { target: { value: 'all' } });
    expect(screen.getAllByTestId('plan-card')).toHaveLength(2);
  });

  it('shows the fallback when a search matches nothing', async () => {
    await renderPage();
    fireEvent.change(screen.getByPlaceholderText('Search plans'), {
      target: { value: 'zzz' },
    });
    expect(
      screen.getByText('No standard plans have been created yet.')
    ).toBeInTheDocument();
  });

  it('filters enterprise plans by status in both directions', async () => {
    await renderPage();
    await switchTab('Enterprise Plans');
    const select = document.body.querySelector('.plan-filter-select-input');

    fireEvent.change(select, { target: { value: 'active' } });
    expect(screen.getByTestId('enterprise-count').textContent).toBe('1');
    expect(screen.getByTestId('enterprise-org').textContent).toBe('Acme Health');

    fireEvent.change(select, { target: { value: 'inactive' } });
    expect(screen.getByTestId('enterprise-org').textContent).toBe('Beta Clinic');
  });

  it('shows the enterprise fallback when the errored tab has no plans', async () => {
    mocks.billing.GetPlanByPlanType.mockResolvedValue({ data: [] });
    mocks.featureApi.GetAllFeatures.mockResolvedValue({ data: {} });
    await renderPage();
    await switchTab('Enterprise Plans');
    expect(
      screen.getByText('No enterprise plans have been created yet.')
    ).toBeInTheDocument();
  });

  it('shows the enterprise fallback when its search matches nothing', async () => {
    await renderPage();
    await switchTab('Enterprise Plans');
    fireEvent.change(screen.getByPlaceholderText('Search enterprise plans'), {
      target: { value: 'zzz' },
    });
    expect(
      screen.getByText('No enterprise plans have been created yet.')
    ).toBeInTheDocument();
    expect(document.body.querySelector('.fallback-active')).toBeInTheDocument();
  });
});

describe('creating a plan', () => {
  it('refuses to open the modal while features are missing', async () => {
    mocks.featureApi.GetAllFeatures.mockResolvedValue({ data: { data: [] } });
    await renderPage();
    fireEvent.click(screen.getByText('Add New Plan'));
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Cannot add plan: Features are not loaded or invalid.',
      'error'
    );
    expect(screen.queryByTestId('create-modal')).not.toBeInTheDocument();
  });

  it('opens the modal with the loaded lists once features are valid', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('Add New Plan'));
    expect(screen.getByTestId('create-modal')).toBeInTheDocument();
    // Only the feature with both an id and a name survives the mapper.
    expect(screen.getByTestId('create-features').textContent).toBe('1');
    expect(screen.getByTestId('create-admins').textContent).toBe('2');
    expect(screen.getByTestId('create-tenants').textContent).toBe('2');
    expect(screen.getByTestId('create-plan-type').textContent).toBe('Standard');
  });

  it('offers the enterprise plan type on the enterprise tab', async () => {
    await renderPage();
    await switchTab('Enterprise Plans');
    fireEvent.click(screen.getByText('Add New Plan'));
    expect(screen.getByTestId('create-plan-type').textContent).toBe('Enterprise');
  });

  it('rejects a payload with no name or pricing', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('Add New Plan'));
    mocks.savePayload = { name: '' };
    fireEvent.click(screen.getByTestId('create-save'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Invalid plan data provided.', 'error')
    );
    expect(mocks.billing.CreateBillingPlan).not.toHaveBeenCalled();
  });

  it('builds a payload with extra features and refetches', async () => {
    mocks.billing.CreateBillingPlan.mockResolvedValue({});
    await renderPage();
    fireEvent.click(screen.getByText('Add New Plan'));
    mocks.savePayload = {
      name: 'Pro',
      type: 'Standard',
      colourCode: '#112233',
      features: [{ id: 'f1' }],
      accountManager: 'a1',
      pricing: {
        pricePerMonth: { amount: '10', currency: 'USD' },
        pricePerYear: { amount: '100', currency: 'EUR' },
        clients: '25',
        storage: '50',
        userOption: 'clients',
      },
      extraPricing: [
        { id: 'e1', pricePerMonth: { price: '2', currency: 'GBP' }, pricePerYear: { price: '20' } },
      ],
    };
    fireEvent.click(screen.getByTestId('create-save'));

    await waitFor(() => expect(mocks.billing.CreateBillingPlan).toHaveBeenCalled());
    const [payload] = mocks.billing.CreateBillingPlan.mock.calls[0];
    expect(payload).toEqual(
      expect.objectContaining({
        name: 'Pro',
        description: 'Includes all features for Pro',
        planType: 'STANDARD',
        colourCode: '#112233',
        forClient: 25,
        forStaff: 0,
        forStorage: 50,
        extraFeaturesEnabled: true,
        adminId: 'a1',
      })
    );
    expect(payload.pricePerMonth).toEqual({ price: 10, currency: 'USD' });
    expect(payload.pricePerYear).toEqual({ price: 100, currency: 'EUR' });
    expect(payload.features.connect).toEqual([{ id: 'f1' }]);
    expect(payload.extraFeatures.connect).toEqual([{ id: 'e1' }]);
    expect(payload.extraFeaturesWithPrice[0]).toEqual({
      id: 'e1',
      pricePerMonth: { price: 2, currency: 'GBP' },
      pricePerYear: { price: 20, currency: 'USD' },
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Plan created successfully', 'success');
    expect(screen.queryByTestId('create-modal')).not.toBeInTheDocument();
    expect(mocks.billing.GetPlanByPlanType).toHaveBeenCalledTimes(2);
  });

  it('defaults everything the payload leaves out', async () => {
    mocks.billing.CreateBillingPlan.mockResolvedValue({});
    await renderPage();
    fireEvent.click(screen.getByText('Add New Plan'));
    mocks.savePayload = {
      name: 'Bare',
      type: 'Enterprise',
      pricing: { userOption: 'staffs', clients: 'unlimited', storage: 'unlimited' },
    };
    fireEvent.click(screen.getByTestId('create-save'));

    await waitFor(() => expect(mocks.billing.CreateBillingPlan).toHaveBeenCalled());
    const [payload] = mocks.billing.CreateBillingPlan.mock.calls[0];
    expect(payload.pricePerMonth).toEqual({ price: 0, currency: 'USD' });
    expect(payload.planType).toBe('ENTERPRISE');
    expect(payload.colourCode).toBe('#ffffff');
    expect(payload.features.connect).toEqual([]);
    expect(payload.forClient).toBe(0);
    expect(payload.forStaff).toBe(0);
    expect(payload.forStorage).toBe(0);
    expect(payload.extraFeaturesEnabled).toBe(false);
    expect(payload.extraFeatures).toBeUndefined();
    expect(payload.adminId).toBeNull();
  });

  it('counts staff rather than clients when the plan is staff-based', async () => {
    mocks.billing.CreateBillingPlan.mockResolvedValue({});
    await renderPage();
    fireEvent.click(screen.getByText('Add New Plan'));
    mocks.savePayload = {
      name: 'Staffed',
      type: 'Standard',
      pricing: { userOption: 'staffs', clients: '7', storage: 'oops' },
    };
    fireEvent.click(screen.getByTestId('create-save'));

    await waitFor(() => expect(mocks.billing.CreateBillingPlan).toHaveBeenCalled());
    const [payload] = mocks.billing.CreateBillingPlan.mock.calls[0];
    expect(payload.forStaff).toBe(7);
    expect(payload.forClient).toBe(0);
    // An unparseable storage figure collapses to zero rather than NaN.
    expect(payload.forStorage).toBe(0);
  });

  it('keeps the modal open and reports the error when the create fails', async () => {
    mocks.billing.CreateBillingPlan.mockRejectedValue(new Error('server said no'));
    await renderPage();
    fireEvent.click(screen.getByText('Add New Plan'));
    mocks.savePayload = { name: 'Pro', pricing: {} };
    fireEvent.click(screen.getByTestId('create-save'));

    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('server said no', 'error')
    );
    expect(screen.getByTestId('create-modal')).toBeInTheDocument();
  });

  it('falls back to a generic message when the failure carries none', async () => {
    mocks.billing.CreateBillingPlan.mockRejectedValue({});
    await renderPage();
    fireEvent.click(screen.getByText('Add New Plan'));
    mocks.savePayload = { name: 'Pro', pricing: {} };
    fireEvent.click(screen.getByTestId('create-save'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Failed to create plan', 'error')
    );
  });

  it('collapses an unparseable client count to zero on both counters', async () => {
    mocks.billing.CreateBillingPlan.mockResolvedValue({});
    await renderPage();
    fireEvent.click(screen.getByText('Add New Plan'));
    mocks.savePayload = {
      name: 'Nonsense',
      type: 'Standard',
      pricing: { userOption: 'clients', clients: 'many', storage: '5' },
    };
    fireEvent.click(screen.getByTestId('create-save'));
    await waitFor(() => expect(mocks.billing.CreateBillingPlan).toHaveBeenCalled());
    expect(mocks.billing.CreateBillingPlan.mock.calls[0][0].forClient).toBe(0);

    mocks.savePayload = {
      name: 'Nonsense',
      type: 'Standard',
      pricing: { userOption: 'staffs', clients: 'many', storage: '5' },
    };
    fireEvent.click(screen.getByText('Add New Plan'));
    fireEvent.click(screen.getByTestId('create-save'));
    await waitFor(() =>
      expect(mocks.billing.CreateBillingPlan).toHaveBeenCalledTimes(2)
    );
    expect(mocks.billing.CreateBillingPlan.mock.calls[1][0].forStaff).toBe(0);
  });

  it('prices an extra row that arrives with no prices at all', async () => {
    mocks.billing.CreateBillingPlan.mockResolvedValue({});
    await renderPage();
    fireEvent.click(screen.getByText('Add New Plan'));
    mocks.savePayload = {
      name: 'Pro',
      type: 'Standard',
      pricing: {},
      extraPricing: [{ id: 'e1' }],
    };
    fireEvent.click(screen.getByTestId('create-save'));

    await waitFor(() => expect(mocks.billing.CreateBillingPlan).toHaveBeenCalled());
    expect(mocks.billing.CreateBillingPlan.mock.calls[0][0].extraFeaturesWithPrice[0]).toEqual({
      id: 'e1',
      pricePerMonth: { price: 0, currency: 'USD' },
      pricePerYear: { price: 0, currency: 'USD' },
    });
  });

  it('keeps a failed create out of the console outside development', async () => {
    vi.stubEnv('DEV', false);
    mocks.billing.CreateBillingPlan.mockRejectedValue(new Error('server said no'));
    await renderPage();
    fireEvent.click(screen.getByText('Add New Plan'));
    mocks.savePayload = { name: 'Pro', pricing: {} };
    fireEvent.click(screen.getByTestId('create-save'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('server said no', 'error')
    );
    expect(console.error).not.toHaveBeenCalled();
  });

  it('closes on request', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('Add New Plan'));
    fireEvent.click(screen.getByTestId('create-close'));
    expect(screen.queryByTestId('create-modal')).not.toBeInTheDocument();
  });
});

describe('editing a plan', () => {
  const openEditor = async () => {
    await renderPage();
    fireEvent.click(screen.getAllByTestId('plan-card-edit')[0]);
    expect(screen.getByTestId('edit-modal')).toBeInTheDocument();
  };

  it('sends the selected plan id with the update', async () => {
    mocks.billing.UpdateBillingPlan.mockResolvedValue({});
    await openEditor();
    mocks.savePayload = {
      name: 'Pro+',
      type: 'Enterprise',
      pricing: { userOption: 'clients', clients: '3', storage: '9' },
      extraPricing: [{ id: 'e1' }],
    };
    fireEvent.click(screen.getByTestId('edit-save'));

    await waitFor(() => expect(mocks.billing.UpdateBillingPlan).toHaveBeenCalled());
    const [payload] = mocks.billing.UpdateBillingPlan.mock.calls[0];
    expect(payload.id).toBe('p1');
    expect(payload.planType).toBe('ENTERPRISE');
    expect(payload.forClient).toBe(3);
    expect(payload.extraFeaturesWithPrice[0].pricePerMonth).toEqual({
      price: 0,
      currency: 'USD',
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Plan updated successfully', 'success');
    expect(screen.queryByTestId('edit-modal')).not.toBeInTheDocument();
  });

  it('rejects an update with no pricing', async () => {
    await openEditor();
    mocks.savePayload = { name: 'Pro+' };
    fireEvent.click(screen.getByTestId('edit-save'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith(
        'Invalid plan data or missing plan ID.',
        'error'
      )
    );
    expect(mocks.billing.UpdateBillingPlan).not.toHaveBeenCalled();
  });

  it('keeps the modal open when the update fails', async () => {
    mocks.billing.UpdateBillingPlan.mockRejectedValue(new Error('nope'));
    await openEditor();
    mocks.savePayload = { name: 'Pro+', pricing: {} };
    fireEvent.click(screen.getByTestId('edit-save'));
    await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith('nope', 'error'));
    expect(screen.getByTestId('edit-modal')).toBeInTheDocument();
  });

  it('falls back to a generic message when the update failure carries none', async () => {
    mocks.billing.UpdateBillingPlan.mockRejectedValue({});
    await openEditor();
    mocks.savePayload = { name: 'Pro+', pricing: {} };
    fireEvent.click(screen.getByTestId('edit-save'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Failed to update plan', 'error')
    );
  });

  it('shapes a standard update with staff, unlimited storage and a feature list', async () => {
    mocks.billing.UpdateBillingPlan.mockResolvedValue({});
    await openEditor();
    mocks.savePayload = {
      name: 'Pro',
      type: 'Standard',
      features: [{ id: 'f1' }, { id: 'f2' }],
      pricing: { userOption: 'staffs', clients: '8', storage: 'unlimited' },
    };
    fireEvent.click(screen.getByTestId('edit-save'));

    await waitFor(() => expect(mocks.billing.UpdateBillingPlan).toHaveBeenCalled());
    const [payload] = mocks.billing.UpdateBillingPlan.mock.calls[0];
    expect(payload.planType).toBe('STANDARD');
    expect(payload.features.connect).toEqual([{ id: 'f1' }, { id: 'f2' }]);
    expect(payload.forStaff).toBe(8);
    expect(payload.forClient).toBe(0);
    expect(payload.forStorage).toBe(0);
  });

  it('collapses an unparseable client count to zero on an update', async () => {
    mocks.billing.UpdateBillingPlan.mockResolvedValue({});
    await openEditor();
    mocks.savePayload = {
      name: 'Pro',
      type: 'Standard',
      pricing: { userOption: 'clients', clients: 'many', storage: '5' },
    };
    fireEvent.click(screen.getByTestId('edit-save'));
    await waitFor(() => expect(mocks.billing.UpdateBillingPlan).toHaveBeenCalled());
    expect(mocks.billing.UpdateBillingPlan.mock.calls[0][0].forClient).toBe(0);
  });

  it('collapses an unparseable staff count to zero on an update', async () => {
    mocks.billing.UpdateBillingPlan.mockResolvedValue({});
    await openEditor();
    mocks.savePayload = {
      name: 'Pro',
      type: 'Standard',
      pricing: { userOption: 'staffs', clients: 'many', storage: '5' },
    };
    fireEvent.click(screen.getByTestId('edit-save'));
    await waitFor(() => expect(mocks.billing.UpdateBillingPlan).toHaveBeenCalled());
    expect(mocks.billing.UpdateBillingPlan.mock.calls[0][0].forStaff).toBe(0);
  });

  it('keeps a failed update out of the console outside development', async () => {
    vi.stubEnv('DEV', false);
    mocks.billing.UpdateBillingPlan.mockRejectedValue(new Error('nope'));
    await openEditor();
    mocks.savePayload = { name: 'Pro+', pricing: {} };
    fireEvent.click(screen.getByTestId('edit-save'));
    await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith('nope', 'error'));
    expect(console.error).not.toHaveBeenCalled();
  });

  it('refuses a row the table hands back without an id', async () => {
    await renderPage();
    await switchTab('Enterprise Plans');
    fireEvent.click(screen.getByTestId('enterprise-edit-no-id'));
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Invalid plan selected for editing.',
      'error'
    );
    expect(screen.queryByTestId('edit-modal')).not.toBeInTheDocument();
  });

  it('opens from the enterprise table too', async () => {
    await renderPage();
    await switchTab('Enterprise Plans');
    fireEvent.click(screen.getByTestId('enterprise-edit'));
    expect(screen.getByTestId('edit-modal')).toBeInTheDocument();
  });
});

describe('duplicating a plan', () => {
  it('appends the copy to the standard list and refetches', async () => {
    mocks.billing.DuplicateBillingPlan.mockResolvedValue({
      data: { id: 'p1-copy', active: true },
    });
    await renderPage();
    fireEvent.click(screen.getAllByTestId('plan-card-duplicate')[0]);
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Plan duplicated successfully', 'success')
    );
    expect(mocks.billing.DuplicateBillingPlan).toHaveBeenCalledWith(
      expect.objectContaining({ planId: 'p1' })
    );
    expect(mocks.billing.GetPlanByPlanType).toHaveBeenCalledTimes(2);
  });

  it('reports a failed duplication', async () => {
    mocks.billing.DuplicateBillingPlan.mockRejectedValue(new Error('cannot copy'));
    await renderPage();
    fireEvent.click(screen.getAllByTestId('plan-card-duplicate')[0]);
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('cannot copy', 'error')
    );
  });

  it('marks the copy inactive when the backend says so', async () => {
    mocks.billing.DuplicateBillingPlan.mockResolvedValue({
      data: { id: 'p1-copy', active: false },
    });
    await renderPage();
    fireEvent.click(screen.getAllByTestId('plan-card-duplicate')[0]);
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Plan duplicated successfully', 'success')
    );
  });

  it('keeps a failed duplication out of the console outside development', async () => {
    vi.stubEnv('DEV', false);
    mocks.billing.DuplicateBillingPlan.mockRejectedValue(new Error('cannot copy'));
    await renderPage();
    fireEvent.click(screen.getAllByTestId('plan-card-duplicate')[0]);
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('cannot copy', 'error')
    );
    expect(console.error).not.toHaveBeenCalled();
  });

  it('falls back to a generic message when the duplication failure carries none', async () => {
    mocks.billing.DuplicateBillingPlan.mockRejectedValue({});
    await renderPage();
    fireEvent.click(screen.getAllByTestId('plan-card-duplicate')[0]);
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Failed to duplicate plan', 'error')
    );
  });
});

describe('activating and deactivating', () => {
  it('confirms an activation with the administrator password', async () => {
    mocks.billing.TogglePlanActivity.mockResolvedValue({});
    await renderPage();
    fireEvent.click(screen.getAllByTestId('plan-card-activate')[0]);
    expect(screen.getByTestId('status-action').textContent).toBe('activate');

    fireEvent.click(screen.getByTestId('status-confirm'));
    await waitFor(() =>
      expect(mocks.billing.TogglePlanActivity).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1', active: true, administratorPassword: 'hunter2' })
      )
    );
    expect(mocks.showToast).toHaveBeenCalledWith('Plan activated successfully', 'success');
    expect(screen.queryByTestId('status-modal')).not.toBeInTheDocument();
  });

  it('deactivates an enterprise plan', async () => {
    mocks.billing.TogglePlanActivity.mockResolvedValue({});
    await renderPage();
    await switchTab('Enterprise Plans');
    fireEvent.click(screen.getByTestId('enterprise-deactivate'));
    fireEvent.click(screen.getByTestId('status-confirm'));
    await waitFor(() =>
      expect(mocks.billing.TogglePlanActivity).toHaveBeenCalledWith(
        expect.objectContaining({ active: false })
      )
    );
  });

  it('refuses a confirmation with no password', async () => {
    mocks.password = '';
    await renderPage();
    fireEvent.click(screen.getAllByTestId('plan-card-activate')[0]);
    fireEvent.click(screen.getByTestId('status-confirm'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith(
        'Missing plan ID or administrator password.',
        'error'
      )
    );
    expect(mocks.billing.TogglePlanActivity).not.toHaveBeenCalled();
  });

  it('reports a rejected status change and leaves the modal open', async () => {
    mocks.billing.TogglePlanActivity.mockRejectedValue(new Error('wrong password'));
    await renderPage();
    fireEvent.click(screen.getAllByTestId('plan-card-activate')[0]);
    fireEvent.click(screen.getByTestId('status-confirm'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('wrong password', 'error')
    );
    expect(screen.getByTestId('status-modal')).toBeInTheDocument();
  });

  it('deactivates a standard plan', async () => {
    mocks.billing.TogglePlanActivity.mockResolvedValue({});
    await renderPage();
    fireEvent.click(screen.getAllByTestId('plan-card-deactivate')[0]);
    expect(screen.getByTestId('status-action').textContent).toBe('deactivate');
    fireEvent.click(screen.getByTestId('status-confirm'));
    await waitFor(() =>
      expect(mocks.billing.TogglePlanActivity).toHaveBeenCalledWith(
        expect.objectContaining({ active: false })
      )
    );
    expect(mocks.showToast).toHaveBeenCalledWith('Plan deactivated successfully', 'success');
  });

  it('activates an enterprise plan', async () => {
    mocks.billing.TogglePlanActivity.mockResolvedValue({});
    await renderPage();
    await switchTab('Enterprise Plans');
    fireEvent.click(screen.getByTestId('enterprise-activate'));
    fireEvent.click(screen.getByTestId('status-confirm'));
    await waitFor(() =>
      expect(mocks.billing.TogglePlanActivity).toHaveBeenCalledWith(
        expect.objectContaining({ active: true })
      )
    );
  });

  it('refuses a row the table hands back without an id', async () => {
    await renderPage();
    await switchTab('Enterprise Plans');
    fireEvent.click(screen.getByTestId('enterprise-status-no-id'));
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Invalid plan selected for status change.',
      'error'
    );
    expect(screen.queryByTestId('status-modal')).not.toBeInTheDocument();
  });

  it('keeps a rejected status change out of the console outside development', async () => {
    vi.stubEnv('DEV', false);
    mocks.billing.TogglePlanActivity.mockRejectedValue(new Error('wrong password'));
    await renderPage();
    fireEvent.click(screen.getAllByTestId('plan-card-activate')[0]);
    fireEvent.click(screen.getByTestId('status-confirm'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('wrong password', 'error')
    );
    expect(console.error).not.toHaveBeenCalled();
  });

  it('falls back to the password message when the rejection carries none', async () => {
    mocks.billing.TogglePlanActivity.mockRejectedValue({});
    await renderPage();
    fireEvent.click(screen.getAllByTestId('plan-card-activate')[0]);
    fireEvent.click(screen.getByTestId('status-confirm'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Invalid administrator password', 'error')
    );
  });
});

describe('deleting a plan', () => {
  it('deletes the selected standard plan', async () => {
    mocks.billing.DeleteBillingPlan.mockResolvedValue({});
    await renderPage();
    fireEvent.click(screen.getAllByTestId('plan-card-delete')[0]);
    expect(screen.getByTestId('delete-plan').textContent).toBe('p1');

    fireEvent.click(screen.getByTestId('delete-confirm'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Plan deleted successfully', 'success')
    );
    expect(mocks.billing.DeleteBillingPlan).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p1', administratorPassword: 'hunter2' })
    );
  });

  it('deletes from the enterprise table', async () => {
    mocks.billing.DeleteBillingPlan.mockResolvedValue({});
    await renderPage();
    await switchTab('Enterprise Plans');
    fireEvent.click(screen.getByTestId('enterprise-delete'));
    fireEvent.click(screen.getByTestId('delete-confirm'));
    await waitFor(() => expect(mocks.billing.DeleteBillingPlan).toHaveBeenCalled());
  });

  it('refuses a deletion with no password', async () => {
    mocks.password = '';
    await renderPage();
    fireEvent.click(screen.getAllByTestId('plan-card-delete')[0]);
    fireEvent.click(screen.getByTestId('delete-confirm'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith(
        'Missing plan ID or administrator password.',
        'error'
      )
    );
    expect(mocks.billing.DeleteBillingPlan).not.toHaveBeenCalled();
  });

  it('reports a rejected deletion', async () => {
    mocks.billing.DeleteBillingPlan.mockRejectedValue(new Error('locked'));
    await renderPage();
    fireEvent.click(screen.getAllByTestId('plan-card-delete')[0]);
    fireEvent.click(screen.getByTestId('delete-confirm'));
    await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith('locked', 'error'));
  });

  it('refuses a row the table hands back without an id', async () => {
    await renderPage();
    await switchTab('Enterprise Plans');
    fireEvent.click(screen.getByTestId('enterprise-delete-no-id'));
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Invalid plan selected for deletion.',
      'error'
    );
    expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument();
  });

  it('keeps a rejected deletion out of the console outside development', async () => {
    vi.stubEnv('DEV', false);
    mocks.billing.DeleteBillingPlan.mockRejectedValue(new Error('locked'));
    await renderPage();
    fireEvent.click(screen.getAllByTestId('plan-card-delete')[0]);
    fireEvent.click(screen.getByTestId('delete-confirm'));
    await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith('locked', 'error'));
    expect(console.error).not.toHaveBeenCalled();
  });

  it('falls back to the password message when the deletion rejection carries none', async () => {
    mocks.billing.DeleteBillingPlan.mockRejectedValue({});
    await renderPage();
    fireEvent.click(screen.getAllByTestId('plan-card-delete')[0]);
    fireEvent.click(screen.getByTestId('delete-confirm'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Invalid administrator password', 'error')
    );
  });
});

describe('the organization profile link', () => {
  it('navigates to the tenant overview', async () => {
    await renderPage();
    await switchTab('Enterprise Plans');
    fireEvent.click(screen.getByTestId('enterprise-profile'));
    expect(mocks.navigate).toHaveBeenCalledWith('/tenants/tenant-lists/overview/t1');
  });

  it('complains when the plan has no tenant', async () => {
    mocks.billing.GetPlanByPlanType.mockResolvedValue({
      data: [{ id: 'p1', organization: 'Orphan' }],
    });
    await renderPage();
    await switchTab('Enterprise Plans');
    fireEvent.click(screen.getByTestId('enterprise-profile'));
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Tenant ID not found for this organization.',
      'error'
    );
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});

describe('dismissing the remaining modals', () => {
  it('closes the status-change modal without confirming', async () => {
    await renderPage();
    fireEvent.click(screen.getAllByTestId('plan-card-activate')[0]);
    expect(screen.getByTestId('status-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('status-close'));
    expect(screen.queryByTestId('status-modal')).not.toBeInTheDocument();
    expect(mocks.billing.TogglePlanActivity).not.toHaveBeenCalled();
  });

  it('closes the edit modal without saving', async () => {
    await renderPage();
    fireEvent.click(screen.getAllByTestId('plan-card-edit')[0]);
    expect(screen.getByTestId('edit-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('edit-close'));
    expect(screen.queryByTestId('edit-modal')).not.toBeInTheDocument();
    expect(mocks.billing.UpdateBillingPlan).not.toHaveBeenCalled();
  });

  it('closes the delete modal without deleting', async () => {
    await renderPage();
    fireEvent.click(screen.getAllByTestId('plan-card-delete')[0]);
    expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('delete-close'));
    expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument();
    expect(mocks.billing.DeleteBillingPlan).not.toHaveBeenCalled();
  });
});

describe('the controls locked during a fetch', () => {
  // The resolved fixtures settle in a microtask, which is far too fast to click
  // against, so these two hold the plans request open by hand and release it at
  // the end. handleAddNewPlan opens with a `loading` guard that would warn
  // instead of opening the modal, but every button carrying that handler is
  // itself disabled={loading}: the guard is unreachable and the lock is what is
  // assertable.
  let release;
  const holdThePlansFetch = () => {
    mocks.billing.GetPlanByPlanType.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve(plansOk);
      })
    );
  };

  it('disables the add button while the four requests are in flight', async () => {
    holdThePlansFetch();
    render(<PlansAndPayment />);
    await waitFor(() =>
      expect(document.body.querySelector('.section-loader')).toBeInTheDocument()
    );

    const add = screen.getByLabelText('Add a new billing plan');
    expect(add).toBeDisabled();
    fireEvent.click(add);
    expect(screen.queryByTestId('create-modal')).not.toBeInTheDocument();
    expect(mocks.showToast).not.toHaveBeenCalled();

    release();
    await waitFor(() =>
      expect(document.body.querySelector('.section-loader')).toBeNull()
    );
    expect(screen.getByLabelText('Add a new billing plan')).toBeEnabled();
  });

  // The tab strip is guarded with a bare `!loading &&` inside the click handler
  // rather than a disabled attribute, so here the click really does land and is
  // swallowed by the guard.
  it('swallows a tab click while a fetch is in flight', async () => {
    holdThePlansFetch();
    render(<PlansAndPayment />);
    await waitFor(() =>
      expect(document.body.querySelector('.section-loader')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText('Enterprise Plans'));
    expect(screen.queryByTestId('enterprise-table')).not.toBeInTheDocument();

    release();
    await waitFor(() =>
      expect(document.body.querySelector('.section-loader')).toBeNull()
    );
    expect(screen.getAllByTestId('plan-card').length).toBeGreaterThan(0);
  });
});
