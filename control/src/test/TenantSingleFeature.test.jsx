import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

const { api, showApiError, navigate } = vi.hoisted(() => ({
  api: { GetTenantFeatures: vi.fn() },
  showApiError: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('../api/TenantApis', () => ({ default: api }));
vi.mock('../Helper/ShowToast', () => ({ showApiError, showToast: vi.fn() }));
vi.mock('react-router-dom', () => ({
  useParams: () => ({ tenantId: 't1' }),
  useNavigate: () => navigate,
}));

// The payment-link modal has its own suite; here it only needs to say whether
// the tab opened it and with which tenant.
const { modalProps } = vi.hoisted(() => ({ modalProps: {} }));
vi.mock('../Components/ReusableModal/GeneratePaymentLinkModal', () => ({
  default: (props) => {
    Object.assign(modalProps, props);
    return props.isOpen ? <div data-testid="payment-link-modal" /> : null;
  },
}));
vi.mock('../Components/SectionLoader', () => ({
  default: () => <div data-testid="section-loader" />,
}));

import TenantSingleFeature from '../Pages/Tenant/TenantSingle/TenantSingleFeature';

/**
 * The Features tab of a single tenant.
 *
 * The subscription endpoint is inconsistent about how deeply it nests its
 * payload -- it may answer `{ data: { data: ... } }`, `{ data: ... }`, an array
 * of subscriptions, or a bare object -- so the tab unwraps three levels and
 * then takes the first element if what it found was a list. Every field it
 * displays afterwards is defended with a fallback, which is most of the branch
 * surface in the file.
 *
 * The seat meter is the one piece of arithmetic: it divides by the plan's seat
 * allowance, guards against a zero allowance, and caps the bar at 100% for an
 * over-subscribed tenant.
 */

const makeStore = (user) =>
  configureStore({
    reducer: {
      // useAuth reads the tokens off the slice itself, not off the user.
      authentication: (state = { user, accessToken: 'at', refreshToken: 'rt' }) => state,
    },
  });

// An admin with an explicit role grant; anything not listed is denied.
const restricted = (permissions) => ({
  id: 'u1',
  role: { roleModuleAccesses: [{ module: 'TENANT', permissions }] },
});

const superAdmin = { id: 'u1' };

const renderTab = async (user = superAdmin) => {
  const result = render(
    <Provider store={makeStore(user)}>
      <TenantSingleFeature />
    </Provider>
  );
  await waitFor(() => expect(screen.queryByTestId('section-loader')).toBeNull());
  return result;
};

// The plan shape the tab actually reads: a subscription wrapping a plan that
// wraps two independent feature lists.
const subscription = ({ plan, ...over } = {}) => ({
  clientCount: 4,
  ...over,
  plan: plan === null ? null : {
    name: 'Team Plus',
    planType: 'ENTERPRISE',
    forClient: 10,
    features: [{ id: 'f1', name: 'Invoicing', active: true }],
    extraFeatures: [],
    ...plan,
  },
});

const usageBar = () => document.body.querySelector('.usage-filled');

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(modalProps).forEach((k) => delete modalProps[k]);
  api.GetTenantFeatures.mockResolvedValue({ data: [subscription()] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loading the subscription', () => {
  it('shows a loader until the request settles', async () => {
    api.GetTenantFeatures.mockReturnValue(new Promise(() => {}));
    render(
      <Provider store={makeStore(superAdmin)}>
        <TenantSingleFeature />
      </Provider>
    );
    expect(screen.getByTestId('section-loader')).toBeInTheDocument();
    expect(screen.queryByText('Plan Info')).not.toBeInTheDocument();
  });

  it('asks for the tenant named in the route, with the credentials on the auth slice', async () => {
    await renderTab();
    expect(api.GetTenantFeatures).toHaveBeenCalledWith({
      accessToken: 'at',
      refreshToken: 'rt',
      tenantId: 't1',
    });
  });

  it('unwraps a doubly nested payload', async () => {
    api.GetTenantFeatures.mockResolvedValue({
      data: { data: [subscription({ plan: { name: 'Deep Plan' } })] },
    });
    await renderTab();
    expect(screen.getByText('Deep Plan')).toBeInTheDocument();
  });

  it('accepts a subscription handed back as a bare object rather than a list', async () => {
    api.GetTenantFeatures.mockResolvedValue({
      data: subscription({ plan: { name: 'Solo Plan' } }),
    });
    await renderTab();
    expect(screen.getByText('Solo Plan')).toBeInTheDocument();
  });

  it('falls back to an empty list when the response has no data at all', async () => {
    api.GetTenantFeatures.mockResolvedValue(undefined);
    await renderTab();
    // Nothing to show, but the placeholders still render.
    expect(screen.getByText('No features found for this plan.')).toBeInTheDocument();
  });

  it('treats an empty list of subscriptions as none at all', async () => {
    api.GetTenantFeatures.mockResolvedValue({ data: [] });
    await renderTab();
    // One dash for the plan type badge, one for the plan name.
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.getByText('0 out of 0 used')).toBeInTheDocument();
  });

  it('reports a failed request and stops loading', async () => {
    api.GetTenantFeatures.mockRejectedValue(new Error('gone'));
    await renderTab();
    expect(showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOAD_FEATURES');
    expect(screen.getByText('Plan Info')).toBeInTheDocument();
  });
});

describe('the plan summary', () => {
  it('names the plan and title-cases its type', async () => {
    await renderTab();
    expect(screen.getByText('Team Plus')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });

  it('dashes out the name and type when the subscription carries no plan', async () => {
    api.GetTenantFeatures.mockResolvedValue({ data: [{ clientCount: 2, plan: null }] });
    await renderTab();
    expect(document.body.querySelector('.plan-badge').textContent).toBe('—');
  });

  it('dashes out the type when the plan has a name but no type', async () => {
    api.GetTenantFeatures.mockResolvedValue({
      data: [subscription({ plan: { name: 'Untyped', planType: null } })],
    });
    await renderTab();
    expect(screen.getByText('Untyped')).toBeInTheDocument();
    expect(document.body.querySelector('.plan-badge').textContent).toBe('—');
  });
});

describe('the client seat meter', () => {
  it('fills in proportion to the seats used', async () => {
    await renderTab();
    expect(screen.getByText('4 out of 10 used')).toBeInTheDocument();
    expect(usageBar()).toHaveStyle({ width: '40%' });
  });

  it('stays empty when the plan allows no client seats', async () => {
    api.GetTenantFeatures.mockResolvedValue({
      data: [subscription({ plan: { forClient: 0 } })],
    });
    await renderTab();
    expect(usageBar()).toHaveStyle({ width: '0%' });
  });

  it('caps the bar at full for an over-subscribed tenant', async () => {
    api.GetTenantFeatures.mockResolvedValue({
      data: [subscription({ clientCount: 25, plan: { forClient: 10 } })],
    });
    await renderTab();
    expect(screen.getByText('25 out of 10 used')).toBeInTheDocument();
    expect(usageBar()).toHaveStyle({ width: '100%' });
  });

  it('reads a missing seat count as zero, but keeps a genuine zero', async () => {
    api.GetTenantFeatures.mockResolvedValue({
      data: [subscription({ clientCount: null, plan: { forClient: null } })],
    });
    await renderTab();
    expect(screen.getByText('0 out of 0 used')).toBeInTheDocument();
  });
});

describe('the feature tables', () => {
  it('lists the plan features and their active state', async () => {
    api.GetTenantFeatures.mockResolvedValue({
      data: [
        subscription({
          plan: {
            features: [
              { id: 'f1', name: 'Invoicing', active: true },
              { id: 'f2', name: 'Scheduling', active: false },
            ],
          },
        }),
      ],
    });
    await renderTab();
    expect(screen.getByText('Invoicing')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('Scheduling')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('dashes out a feature with no name, and keys the row by its index', async () => {
    api.GetTenantFeatures.mockResolvedValue({
      data: [subscription({ plan: { features: [{ active: false }] } })],
    });
    await renderTab();
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('says so when the plan lists no features', async () => {
    api.GetTenantFeatures.mockResolvedValue({
      data: [subscription({ plan: { features: [] } })],
    });
    await renderTab();
    expect(screen.getByText('No features found for this plan.')).toBeInTheDocument();
  });

  it('says so just the same when the plan omits the feature list entirely', async () => {
    api.GetTenantFeatures.mockResolvedValue({
      data: [subscription({ plan: { features: undefined } })],
    });
    await renderTab();
    expect(screen.getByText('No features found for this plan.')).toBeInTheDocument();
  });

  it('hides the extra-features table when there are none', async () => {
    await renderTab();
    expect(screen.queryByText('Extra Features')).not.toBeInTheDocument();
  });

  it('adds a second table when the plan carries extra features', async () => {
    api.GetTenantFeatures.mockResolvedValue({
      data: [
        subscription({
          plan: { extraFeatures: [{ id: 'x1', name: 'White labelling', active: true }] },
        }),
      ],
    });
    await renderTab();
    expect(screen.getByText('Extra Features')).toBeInTheDocument();
    expect(screen.getByText('White labelling')).toBeInTheDocument();
  });

  it('hides it too when the plan omits the extra list entirely', async () => {
    api.GetTenantFeatures.mockResolvedValue({
      data: [subscription({ plan: { extraFeatures: undefined } })],
    });
    await renderTab();
    expect(screen.queryByText('Extra Features')).not.toBeInTheDocument();
  });

  it('sends the usage button to the statistics route for this tenant', async () => {
    await renderTab();
    fireEvent.click(screen.getByText('View usage statistics'));
    expect(navigate).toHaveBeenCalledWith('/tenants/tenant-lists/usage-statistics/t1');
  });
});

describe('changing the plan', () => {
  it('hides the change-plan button from an admin without the permission', async () => {
    await renderTab(restricted(['view_tenant']));
    expect(screen.queryByText('Change plan')).not.toBeInTheDocument();
  });

  it('offers it to an admin who may generate a payment link', async () => {
    await renderTab(restricted(['generate_payment_link']));
    expect(screen.getByText('Change plan')).toBeInTheDocument();
  });

  it('opens the payment-link modal for this tenant', async () => {
    await renderTab();
    expect(screen.queryByTestId('payment-link-modal')).toBeNull();

    fireEvent.click(screen.getByText('Change plan'));
    expect(screen.getByTestId('payment-link-modal')).toBeInTheDocument();
    expect(modalProps.tenantId).toBe('t1');
  });

  it('closes again on request', async () => {
    await renderTab();
    fireEvent.click(screen.getByText('Change plan'));
    modalProps.onClose();
    await waitFor(() => expect(screen.queryByTestId('payment-link-modal')).toBeNull());
  });
});
