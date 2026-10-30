import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';

const showToast = vi.fn();
const showApiError = vi.fn();
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => showToast(...a),
  showApiError: (...a) => showApiError(...a),
}));

const GetSubscriptionByPlan = vi.fn();
vi.mock('../api/SubcriptionApis', () => ({
  default: { GetSubscriptionByPlan: (...a) => GetSubscriptionByPlan(...a) },
}));

// The table's export menu drags jsPDF in with it; nothing here exercises it.
vi.mock('../utils/TableUtils', () => ({
  exportTableData: vi.fn(),
  exportTableToPDF: vi.fn(),
  printTableData: vi.fn(),
}));

const paymentLinkProps = {};
vi.mock('../Components/ReusableModal/GeneratePaymentLinkModal', () => ({
  default: (props) => {
    Object.assign(paymentLinkProps, props);
    return props.isOpen ? <div data-testid="payment-link-modal" /> : null;
  },
}));

const navigate = vi.fn();
const params = { planId: 'plan-1' };
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useParams: () => params,
}));

const state = {
  authentication: {
    accessToken: 'at',
    refreshToken: 'rt',
    user: { id: 'admin-1' },
  },
};
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (fn) => fn(state),
}));

import SubscriberList from '../Pages/BillingsAndPayment/SubscriberList';

/**
 * The list of tenants subscribed to one plan.
 *
 * Nearly all of its logic is in unpacking the response, which arrives in four
 * different shapes depending on which service answered: the rows may be the
 * body itself, or sit under `subscriptions`, or under a second `data`, and the
 * plan's own name may or may not travel with them. Every row field then has its
 * own fallback, so the table is really a pile of `||` chains over whatever the
 * backend happened to send.
 *
 * The page renders the real CustomTable, so the row menu is reached through its
 * "Row actions" button, and the Change Plan entry only exists for an admin who
 * may modify subscriptions.
 */

const subscription = (over = {}) => ({
  id: 'sub-1',
  planId: 'plan-1',
  status: 'ACTIVE',
  createdAt: '2024-08-01T00:00:00.000Z',
  tenant: { id: 'ten-1', companyName: 'Acme Health' },
  ...over,
});

const renderPage = async (response = { data: [subscription()] }) => {
  GetSubscriptionByPlan.mockResolvedValue(response);
  const utils = render(<SubscriberList />);
  await act(async () => {});
  return utils;
};

const rows = () =>
  Array.from(document.body.querySelectorAll('tbody tr')).filter(
    (tr) => !tr.querySelector('td[colspan]')
  );

const openRowMenu = (index = 0) =>
  fireEvent.click(within(rows()[index]).getByLabelText('Row actions'));

// An admin whose role grants exactly the listed permission keys.
const grant = (...permissions) => {
  state.authentication.user.role = {
    roleModuleAccesses: [{ module: 'BILLING', permissions }],
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  params.planId = 'plan-1';
  state.authentication.accessToken = 'at';
  delete state.authentication.user.role;
  Object.keys(paymentLinkProps).forEach((k) => delete paymentLinkProps[k]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('who may see the page', () => {
  it('shows the table to an admin who may view subscribers', async () => {
    grant('view_subscribers');
    await renderPage();
    expect(screen.getByText('Subscriber List')).toBeInTheDocument();
  });

  it('refuses an admin who may not', async () => {
    grant('view_billing');
    await renderPage();
    expect(
      screen.getByText("You don't have permission to view this.")
    ).toBeInTheDocument();
    expect(screen.queryByText('Subscriber List')).not.toBeInTheDocument();
  });
});

describe('fetching the subscribers', () => {
  it('asks for the plan named in the route', async () => {
    await renderPage();
    expect(GetSubscriptionByPlan).toHaveBeenCalledWith({
      planId: 'plan-1',
      accessToken: 'at',
      refreshToken: 'rt',
    });
  });

  it('asks for nothing when the route carries no plan', async () => {
    params.planId = undefined;
    await renderPage();
    expect(GetSubscriptionByPlan).not.toHaveBeenCalled();
  });

  it('asks for nothing before there is a token to ask with', async () => {
    state.authentication.accessToken = undefined;
    await renderPage();
    expect(GetSubscriptionByPlan).not.toHaveBeenCalled();
  });

  it('shows a skeleton until the answer arrives', () => {
    GetSubscriptionByPlan.mockReturnValue(new Promise(() => {}));
    render(<SubscriberList />);
    expect(document.querySelector('.skeleton-table')).toBeInTheDocument();
  });

  it('reports a refused fetch and shows an empty table', async () => {
    GetSubscriptionByPlan.mockRejectedValue(new Error('nope'));
    render(<SubscriberList />);
    await act(async () => {});

    expect(showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOAD_SUBSCRIBERS');
    expect(rows()).toHaveLength(0);
  });
});

describe('unpacking the four response shapes', () => {
  it('reads rows sent as the body of a data envelope', async () => {
    await renderPage({ data: [subscription()] });
    expect(screen.getByText('Acme Health')).toBeInTheDocument();
  });

  it('reads rows sent as the response itself', async () => {
    await renderPage([subscription()]);
    expect(screen.getByText('Acme Health')).toBeInTheDocument();
  });

  it('reads rows sent under a subscriptions key', async () => {
    await renderPage({ data: { subscriptions: [subscription()] } });
    expect(screen.getByText('Acme Health')).toBeInTheDocument();
  });

  it('reads rows sent under a second data key', async () => {
    await renderPage({ data: { data: [subscription()] } });
    expect(screen.getByText('Acme Health')).toBeInTheDocument();
  });

  it('shows an empty table for an envelope with no rows anywhere in it', async () => {
    await renderPage({ data: {} });
    expect(rows()).toHaveLength(0);
  });

  it('shows an empty table for no response at all', async () => {
    await renderPage(null);
    expect(rows()).toHaveLength(0);
  });
});

describe('the plan name in the breadcrumb', () => {
  it('says "Plan" until the response names one', async () => {
    await renderPage({ data: [subscription()] });
    expect(screen.getByText('/ Plan')).toBeInTheDocument();
  });

  it('uses the name that travelled with the rows', async () => {
    await renderPage({
      data: { plan: { name: 'Enterprise' }, subscriptions: [subscription()] },
    });
    expect(screen.getByText('/ Enterprise')).toBeInTheDocument();
  });

  it('falls back to "Plan" for a plan that arrived unnamed', async () => {
    await renderPage({ data: { plan: { id: 'p1' }, subscriptions: [] } });
    expect(screen.getByText('/ Plan')).toBeInTheDocument();
  });
});

describe('the row fields', () => {
  const cellsOf = async (over) => {
    await renderPage({ data: [subscription(over)] });
    return Array.from(rows()[0].querySelectorAll('td')).map((td) => td.textContent);
  };

  it('names the tenant by its company name', async () => {
    expect(await cellsOf({})).toContain('Acme Health');
  });

  it('falls back to the tenant name when there is no company name', async () => {
    expect(await cellsOf({ tenant: { id: 't', name: 'Beta Clinic' } })).toContain(
      'Beta Clinic'
    );
  });

  it('says N/A for a subscription with no tenant at all', async () => {
    expect(await cellsOf({ tenant: undefined })).toContain('N/A');
  });

  it('title-cases the status the backend shouted', async () => {
    await renderPage({ data: [subscription({ status: 'ACTIVE' })] });
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('calls a subscription with no status Inactive', async () => {
    await renderPage({ data: [subscription({ status: null })] });
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('dates the row from its creation date', async () => {
    expect(await cellsOf({})).toContain('8/1/2024');
  });

  it('falls back to the start date when there is no creation date', async () => {
    expect(
      await cellsOf({ createdAt: undefined, startDate: '2024-09-15T00:00:00.000Z' })
    ).toContain('9/15/2024');
  });

  it('says N/A for a row with no date of any kind', async () => {
    expect(await cellsOf({ createdAt: undefined, startDate: undefined })).toContain(
      'N/A'
    );
  });
});

describe('the row menu', () => {
  it('opens the tenant behind the row', async () => {
    await renderPage();
    openRowMenu();
    fireEvent.click(screen.getByText('View Tenant Details'));
    expect(navigate).toHaveBeenCalledWith('/tenants/tenant-lists/overview/ten-1');
  });

  it('reads the tenant id off the subscription when the tenant object has none', async () => {
    await renderPage({
      data: [subscription({ tenant: { companyName: 'Acme Health' }, tenantId: 'ten-9' })],
    });
    openRowMenu();
    fireEvent.click(screen.getByText('View Tenant Details'));
    expect(navigate).toHaveBeenCalledWith('/tenants/tenant-lists/overview/ten-9');
  });

  it('complains rather than navigating for a row with no tenant id', async () => {
    await renderPage({ data: [subscription({ tenant: undefined, tenantId: undefined })] });
    openRowMenu();
    fireEvent.click(screen.getByText('View Tenant Details'));

    expect(navigate).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      'Tenant ID not found for this subscriber',
      'error'
    );
  });

  it('opens the payment link modal against the row tenant', async () => {
    await renderPage();
    openRowMenu();
    fireEvent.click(screen.getByText('Change Plan'));

    expect(screen.getByTestId('payment-link-modal')).toBeInTheDocument();
    expect(paymentLinkProps.tenantId).toBe('ten-1');
  });

  it('complains rather than opening the modal for a row with no tenant id', async () => {
    await renderPage({ data: [subscription({ tenant: undefined, tenantId: undefined })] });
    openRowMenu();
    fireEvent.click(screen.getByText('Change Plan'));

    expect(screen.queryByTestId('payment-link-modal')).not.toBeInTheDocument();
    expect(showToast).toHaveBeenCalledWith(
      'Tenant ID not available for this subscriber',
      'error'
    );
  });

  it('closes the payment link modal again', async () => {
    await renderPage();
    openRowMenu();
    fireEvent.click(screen.getByText('Change Plan'));
    act(() => paymentLinkProps.onClose());
    expect(screen.queryByTestId('payment-link-modal')).not.toBeInTheDocument();
  });

  it('offers no Change Plan entry to an admin who may not modify subscriptions', async () => {
    grant('view_subscribers');
    await renderPage();
    openRowMenu();

    expect(screen.getByText('View Tenant Details')).toBeInTheDocument();
    expect(screen.queryByText('Change Plan')).not.toBeInTheDocument();
  });
});

describe('the back button', () => {
  it('returns to the plans board', async () => {
    await renderPage();
    fireEvent.click(screen.getAllByText('Back')[0].closest('button'));
    expect(navigate).toHaveBeenCalledWith('/billing-payments/plans-pricing');
  });
});

describe('a subscription that names its plan only through the nested object', () => {
  it('reads the plan id off the nested plan when the flat one is missing', async () => {
    await renderPage({
      data: [subscription({ planId: undefined, plan: { id: 'plan-1', name: 'Pro' } })],
    });
    expect(rows()).toHaveLength(1);
    expect(rows()[0].textContent).toContain('Acme Health');
  });
});
