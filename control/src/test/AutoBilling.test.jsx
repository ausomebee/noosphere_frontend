import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Both panels are code-split and each loads a page's worth of data; only which
// one is mounted matters here.
const stub = vi.hoisted(
  () => (name) => ({ default: () => <div data-testid={name} /> })
);
vi.mock(
  '../Pages/BillingsAndPayment/BillingReport/AutoBilling/InvoiceManagement',
  () => stub('invoice-panel')
);
vi.mock(
  '../Pages/BillingsAndPayment/BillingReport/AutoBilling/PaymentManagement',
  () => stub('payment-panel')
);

const state = {
  authentication: { accessToken: 'at', refreshToken: 'rt', user: { id: 'u1' } },
};
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (fn) => fn(state),
}));

import AutoBilling from '../Pages/BillingsAndPayment/BillingReport/AutoBilling/AutoBilling';

/**
 * The auto-billing shell: a two-tab wrapper over two lazily loaded panels.
 *
 * The whole page sits behind a single permission, so an admin without it never
 * sees the tab bar at all. The panels arrive through `React.lazy`, which means
 * the first render of each shows the Suspense fallback and the panel itself
 * only appears on a later tick — every panel assertion below therefore waits.
 *
 * The active tab is remembered in sessionStorage, so each test starts from a
 * cleared store.
 */

const tabNames = () =>
  [...document.body.querySelectorAll('.subscription-tab')].map((b) => b.textContent);
const activeTab = () =>
  document.body.querySelector('.subscription-tab.active')?.textContent;

// A role grant limited to exactly the listed permission keys.
const restrictTo = (permissions) => {
  state.authentication.user.role = {
    roleModuleAccesses: [{ module: 'BILLING', permissions }],
  };
};

beforeEach(() => {
  sessionStorage.clear();
  delete state.authentication.user.role;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('permission', () => {
  it('turns an admin without the permission away', () => {
    restrictTo(['view_billing']);
    render(<AutoBilling />);
    expect(document.body.querySelectorAll('.subscription-tab')).toHaveLength(0);
    expect(screen.queryByText('Billing & Payment')).not.toBeInTheDocument();
  });

  it('lets an admin holding it through', () => {
    restrictTo(['view_auto_billing']);
    render(<AutoBilling />);
    expect(screen.getByText('Billing & Payment')).toBeInTheDocument();
  });
});

describe('the tab bar', () => {
  it('offers both tabs under the page heading', () => {
    render(<AutoBilling />);
    expect(tabNames()).toEqual(['INVOICE MANAGEMENT', 'PAYMENT & ACCOUNT ACCESS']);
    expect(
      screen.getByText('Manage all billing and payment related activities')
    ).toBeInTheDocument();
  });

  it('opens on invoices with only that tab marked active', async () => {
    render(<AutoBilling />);
    expect(activeTab()).toBe('INVOICE MANAGEMENT');
    expect(document.body.querySelectorAll('.subscription-tab.active')).toHaveLength(1);
    await waitFor(() =>
      expect(screen.getByTestId('invoice-panel')).toBeInTheDocument()
    );
  });

  it('swaps in the payments panel', async () => {
    render(<AutoBilling />);
    fireEvent.click(screen.getByText('PAYMENT & ACCOUNT ACCESS'));
    await waitFor(() =>
      expect(screen.getByTestId('payment-panel')).toBeInTheDocument()
    );
    expect(screen.queryByTestId('invoice-panel')).toBeNull();
    expect(activeTab()).toBe('PAYMENT & ACCOUNT ACCESS');
  });

  it('swaps back to invoices again', async () => {
    render(<AutoBilling />);
    fireEvent.click(screen.getByText('PAYMENT & ACCOUNT ACCESS'));
    await waitFor(() =>
      expect(screen.getByTestId('payment-panel')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText('INVOICE MANAGEMENT'));
    await waitFor(() =>
      expect(screen.getByTestId('invoice-panel')).toBeInTheDocument()
    );
    expect(screen.queryByTestId('payment-panel')).toBeNull();
  });
});

describe('the remembered tab', () => {
  it('reopens on the tab that was last used', async () => {
    sessionStorage.setItem('tab:control:autoBilling', 'payment');
    render(<AutoBilling />);
    expect(activeTab()).toBe('PAYMENT & ACCOUNT ACCESS');
    await waitFor(() =>
      expect(screen.getByTestId('payment-panel')).toBeInTheDocument()
    );
  });

  it('writes the choice back to storage', async () => {
    render(<AutoBilling />);
    fireEvent.click(screen.getByText('PAYMENT & ACCOUNT ACCESS'));
    await waitFor(() =>
      expect(sessionStorage.getItem('tab:control:autoBilling')).toBe('payment')
    );
  });

  it('marks no tab active for a stored name it does not recognise', async () => {
    // A stale key from an older build survives storage but matches no tab, so
    // the bar renders with nothing highlighted and no panel under it.
    sessionStorage.setItem('tab:control:autoBilling', 'reports');
    render(<AutoBilling />);
    expect(activeTab()).toBeUndefined();
    expect(screen.queryByTestId('invoice-panel')).toBeNull();
    expect(screen.queryByTestId('payment-panel')).toBeNull();
  });
});
