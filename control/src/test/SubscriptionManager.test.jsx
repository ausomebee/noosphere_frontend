import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

/**
 * The subscriptions board: a status tab bar over one list request and one count
 * request, a per-tab row-action menu, a bulk-action bar that depends on which
 * statuses are selected, and three modals that all funnel into a single
 * `handleSave` dispatching on which of resumption/pause/cancellation type the
 * modal put in the payload.
 *
 * Payment and invoice lookups memoise into a ref-held Map, so a second request
 * for the same id must not reach the API -- the tests below assert the call
 * count rather than the rendered result for that.
 *
 * CustomTable is a probe that prints its rows and exposes one button per row
 * action plus buttons that fire `onSelectionChange` with a chosen set of rows;
 * that is the only way to reach the bulk-action bar, which has no other trigger.
 */

const mocks = vi.hoisted(() => ({
  auth: { accessToken: 'tok', refreshToken: 'ref', userId: 'admin-1' },
  hasPermission: vi.fn(() => true),
  navigate: vi.fn(),
  subApi: {
    GetSubscriptionByStatus: vi.fn(),
    GetCountForSubscription: vi.fn(),
    ResumeSubscriptionNow: vi.fn(),
    ResumeSubscriptionLater: vi.fn(),
    PauseSubscriptionNow: vi.fn(),
    PauseSubscriptionUntil: vi.fn(),
    PauseSubscriptionSchedule: vi.fn(),
    CancelSubscriptionNow: vi.fn(),
    CancelSubscriptionLater: vi.fn(),
  },
  invoiceApi: { GetPaymentById: vi.fn(), GetInvoiceById: vi.fn() },
  showToast: vi.fn(),
  showApiError: vi.fn(),
  // Extra fields the modal probes merge into the payload they save.
  saveExtras: {},
}));

vi.mock('../hooks/useAuth', () => ({ default: () => mocks.auth }));
vi.mock('../hooks/usePermission', () => ({
  default: () => ({ hasPermission: mocks.hasPermission }),
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mocks.navigate };
});
vi.mock('../api/SubcriptionApis', () => ({ default: mocks.subApi }));
vi.mock('../api/InvoiceApi', () => ({ default: mocks.invoiceApi }));
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => mocks.showToast(...a),
  showApiError: (...a) => mocks.showApiError(...a),
}));

vi.mock('../Components/Invoice/SubscriptionInvoice', () => ({
  default: (props) => (
    <div data-testid="subscription-invoice">
      <span data-testid="invoice-id">{props.invoiceId}</span>
      <span data-testid="invoice-total">{props.total}</span>
      <span data-testid="invoice-items">
        {(props.items || [])
          .map((i) => `${i.id}:${i.description}:${i.rate}:${i.quantity}:${i.price}`)
          .join('|')}
      </span>
    </div>
  ),
}));

vi.mock('../Pages/Tenant/TenantList/TenantListViewPayment', () => ({
  default: (props) => (
    <div data-testid="payment-view">
      <span data-testid="payment-plan">{props.paymentInfo.Plan}</span>
      <span data-testid="payment-period">{props.paymentInfo.Period}</span>
      <span data-testid="payment-id">{props.paymentInfo['Payment ID']}</span>
      <span data-testid="payment-amount">{props.paymentInfo['Payment Amount']}</span>
      <span data-testid="payment-card">{props.paymentInfo['Payment Method'].number}</span>
      <span data-testid="payment-icon">{props.paymentInfo['Payment Method'].icon}</span>
      <span data-testid="payment-invoice-id">{props.paymentInfo.Invoice.id}</span>
      <button data-testid="payment-back" onClick={props.onBack}>
        back
      </button>
      <button
        data-testid="payment-view-invoice"
        onClick={() => props.onViewInvoice({ invoiceId: 'INV77' })}
      >
        view invoice
      </button>
      <button
        data-testid="payment-view-invoice-blank"
        onClick={() => props.onViewInvoice('')}
      >
        view invoice with no id
      </button>
      <button data-testid="payment-close-invoice" onClick={props.closeInvoiceModal}>
        close invoice
      </button>
    </div>
  ),
}));

vi.mock('../Components/Table/CustomTable', () => ({
  default: (props) => (
    <div data-testid="table">
      <span data-testid="table-columns">{props.columns.map((c) => c.key).join('|')}</span>
      <span data-testid="table-rows">{props.data.length}</span>
      <span data-testid="table-dump">
        {props.data.map((r) => `${r.companyName}:${r.status}:${r.plan}:${r.amount}`).join('#')}
      </span>
      <span data-testid="table-actions">
        {props.actions.map((a) => a.label).join('|')}
      </span>
      {props.actions.map((action) => (
        <button
          key={action.label}
          data-testid={`action-${action.label.replace(/\s+/g, '-').toLowerCase()}`}
          onClick={() => action.onClick(props.data[0])}
        >
          {action.label}
        </button>
      ))}
      {props.actions.map((action) => (
        <button
          key={`second-${action.label}`}
          data-testid={`second-${action.label.replace(/\s+/g, '-').toLowerCase()}`}
          onClick={() => action.onClick(props.data[1])}
        >
          {action.label} on the second row
        </button>
      ))}
      <button
        data-testid="table-filter"
        onClick={() => props.onFilterChange('filter_type', 'plan')}
      >
        filter
      </button>
      {props.data.map((row, index) => (
        <button
          key={row.id}
          data-testid={`select-row-${index}`}
          onClick={() => props.onSelectionChange([index], [row])}
        >
          select {index}
        </button>
      ))}
      <button
        data-testid="select-two"
        onClick={() => props.onSelectionChange([0, 1], [props.data[0], props.data[1]])}
      >
        select two
      </button>
      <button
        data-testid="select-with-hole"
        onClick={() => props.onSelectionChange([0], [props.data[0], undefined])}
      >
        select with hole
      </button>
      <button
        data-testid="select-none"
        onClick={() => props.onSelectionChange([], [])}
      >
        select none
      </button>
    </div>
  ),
}));

// The three action modals differ only in the payload they save, which the test
// supplies through mocks.saveExtras; each merges in the rows it was handed.
vi.mock('../Components/ReusableModal/SubcriptionModals/ResumeSubscriptionModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="resume-modal">
        <span data-testid="resume-items">{props.selectedItems.length}</span>
        <button
          data-testid="resume-save"
          onClick={() => props.onSave({ items: props.selectedItems, ...mocks.saveExtras })}
        >
          save
        </button>
        <button data-testid="resume-close" onClick={props.onClose}>
          close
        </button>
      </div>
    ) : null,
}));
vi.mock('../Components/ReusableModal/SubcriptionModals/CancelSubscriptionModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="cancel-modal">
        <span data-testid="cancel-items">{props.selectedItems.length}</span>
        <button
          data-testid="cancel-save"
          onClick={() => props.onSave({ items: props.selectedItems, ...mocks.saveExtras })}
        >
          save
        </button>
        <button data-testid="cancel-close" onClick={props.onClose}>
          close
        </button>
      </div>
    ) : null,
}));
vi.mock('../Components/ReusableModal/SubcriptionModals/PauseSubscriptionModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="pause-modal">
        <span data-testid="pause-items">{props.selectedItems.length}</span>
        <button
          data-testid="pause-save"
          onClick={() => props.onSave({ items: props.selectedItems, ...mocks.saveExtras })}
        >
          save
        </button>
        <button data-testid="pause-close" onClick={props.onClose}>
          close
        </button>
      </div>
    ) : null,
}));
vi.mock('../Components/ReusableModal/GeneratePaymentLinkModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="link-modal">
        <span data-testid="link-tenant">{props.tenantId}</span>
        <button data-testid="link-close" onClick={props.onClose}>
          close
        </button>
      </div>
    ) : null,
}));

import SubscriptionManager from '../Pages/BillingsAndPayment/BillingReport/SubscriptionManager/SubscriptionManager';

// One subscription per status the bulk bar cares about, plus one stripped of
// every optional field so the "N/A" fallbacks are exercised in the same pass.
const subscriptions = {
  data: [
    {
      id: 's1',
      tenantId: 't1',
      tenant: { companyName: 'Acme Health' },
      plan: { name: 'Pro' },
      status: 'ACTIVE',
      endDate: '2024-02-02T00:00:00.000Z',
      billingCycle: 'Monthly',
      payment: { amount: 4500, status: 'Successful', id: 'pay-1', invoiceId: 'INV77' },
    },
    {
      id: 's2',
      tenantId: 't2',
      tenant: {},
      plan: {},
      status: 'PAUSED',
      payment: {},
    },
    {
      id: 's3',
      tenantId: 't3',
      status: 'PENDING',
    },
    {
      id: 's4',
      tenantId: 't4',
      status: 'CANCELLED',
    },
  ],
};

const counts = {
  data: {
    All: { _count: { _all: 4 } },
    ACTIVE: { _count: { _all: 1 } },
    PAUSED: { _count: { _all: 1 } },
    PENDING: { _count: { _all: 1 } },
    CANCELLED: { _count: { _all: 1 } },
  },
};

const resolveAll = () => {
  mocks.subApi.GetSubscriptionByStatus.mockResolvedValue(subscriptions);
  mocks.subApi.GetCountForSubscription.mockResolvedValue(counts);
  mocks.invoiceApi.GetPaymentById.mockResolvedValue({ data: {} });
  mocks.invoiceApi.GetInvoiceById.mockResolvedValue({ data: {} });
};

const renderPage = async () => {
  const view = render(<SubscriptionManager />);
  await waitFor(() =>
    expect(document.body.querySelector('.section-loader')).toBeNull()
  );
  return view;
};

// The row-action set is decided by a memo that omits `activeTab`, so it is
// fixed at mount. Seeding the persisted tab is the only way to see the other
// action sets -- see the stale-menu test below.
const renderPageOnTab = async (tab) => {
  sessionStorage.setItem('tab:control:subscriptionManager', tab);
  return renderPage();
};

// Every tab click refires both requests, so wait for the loader to come and go.
const switchTab = async (label) => {
  // The target only exists once the data behind it has rendered, so it has
  // to be waited for rather than assumed present.
  await waitFor(() => expect(screen.getByRole('button', { name: new RegExp(`^${label}`) })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${label}`) }));
  await waitFor(() =>
    expect(document.body.querySelector('.section-loader')).toBeNull()
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mocks.auth = { accessToken: 'tok', refreshToken: 'ref', userId: 'admin-1' };
  mocks.hasPermission.mockReturnValue(true);
  mocks.saveExtras = {};
  vi.spyOn(console, 'error').mockImplementation(() => {});
  resolveAll();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('permissions', () => {
  it('replaces the page when subscriptions may not be viewed', () => {
    mocks.hasPermission.mockImplementation((key) => key !== 'view_subscriptions');
    render(<SubscriptionManager />);
    expect(screen.getByText("You don't have permission to view this.")).toBeInTheDocument();
    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
  });

  it('drops every gated row action for a read-only user', async () => {
    mocks.hasPermission.mockImplementation((key) => key === 'view_subscriptions');
    await renderPage();
    expect(screen.getByTestId('table-actions').textContent).toBe(
      'View Payment History|View Tenant Profile'
    );
  });
});

describe('the subscription list', () => {
  it('maps every subscription and shows the status column on the All tab', async () => {
    await renderPage();
    expect(mocks.subApi.GetSubscriptionByStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'all' })
    );
    expect(screen.getByTestId('table-rows').textContent).toBe('4');
    expect(screen.getByTestId('table-columns').textContent).toContain('status');
    const [first, second] = screen.getByTestId('table-dump').textContent.split('#');
    expect(first).toBe('Acme Health:active:Pro:4500');
    // No company name, plan or payment on the second row.
    expect(second).toBe('N/A:paused:N/A:0');
  });

  it('shows each tab count', async () => {
    await renderPage();
    expect(screen.getByRole('button', { name: /^All/ }).textContent).toContain('4');
    expect(screen.getByRole('button', { name: /^Canceled/ }).textContent).toContain('1');
  });

  it('queries a status tab with the spelling the backend expects', async () => {
    await renderPage();
    await switchTab('Canceled');
    expect(mocks.subApi.GetSubscriptionByStatus).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'CANCELLED' })
    );
    expect(screen.getByTestId('table-columns').textContent).not.toContain('status');
    expect(screen.getByTestId('table-rows').textContent).toBe('1');
  });

  it('narrows the rows to the active tab', async () => {
    await renderPage();
    await switchTab('Active');
    expect(screen.getByTestId('table-dump').textContent).toBe('Acme Health:active:Pro:4500');
  });

  it('falls back to zero counts when the count request rejects', async () => {
    mocks.subApi.GetCountForSubscription.mockRejectedValue(new Error('down'));
    await renderPage();
    expect(screen.getByRole('button', { name: /^All/ }).textContent).toContain('0');
  });

  it('falls back to zero counts when the count response is empty', async () => {
    mocks.subApi.GetCountForSubscription.mockResolvedValue({ data: {} });
    await renderPage();
    expect(screen.getByRole('button', { name: /^Paused/ }).textContent).toContain('0');
  });

  it('renders an empty table when the list request rejects', async () => {
    mocks.subApi.GetSubscriptionByStatus.mockRejectedValue(new Error('down'));
    await renderPage();
    expect(screen.getByTestId('table-rows').textContent).toBe('0');
  });

  it('shows an empty table when the list response carries no data', async () => {
    mocks.subApi.GetSubscriptionByStatus.mockResolvedValue({});
    await renderPage();
    expect(screen.getByTestId('table-rows').textContent).toBe('0');
  });

  it('stays silent in the console outside development', async () => {
    vi.stubEnv('DEV', false);
    mocks.subApi.GetSubscriptionByStatus.mockRejectedValue(new Error('down'));
    await renderPage();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('returns to the All tab when the table reports a filter change', async () => {
    await renderPage();
    await switchTab('Paused');
    fireEvent.click(screen.getByTestId('table-filter'));
    await waitFor(() =>
      expect(mocks.subApi.GetSubscriptionByStatus).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'all' })
      )
    );
  });
});

describe('the row action menu', () => {
  it('offers pause and change-plan when it opens on the active tab', async () => {
    await renderPageOnTab('active');
    expect(screen.getByTestId('table-actions').textContent).toBe(
      'Pause Subscription|Cancel Subscription|View Payment History|View Tenant Profile|Change Plan'
    );
  });

  it('offers resume rather than pause when it opens on the paused tab', async () => {
    await renderPageOnTab('paused');
    expect(screen.getByTestId('table-actions').textContent).toBe(
      'Resume Subscription|Cancel Subscription|View Payment History|View Tenant Profile|Change Plan'
    );
  });

  it('offers only a new plan when it opens on the canceled tab', async () => {
    await renderPageOnTab('canceled');
    expect(screen.getByTestId('table-actions').textContent).toBe(
      'View Payment History|View Tenant Profile|Assign a New Plan'
    );
  });

  it('keeps the menu it mounted with when the tab changes', async () => {
    await renderPageOnTab('active');
    await switchTab('Canceled');
    // getActionsForTab memoises without `activeTab` in its dependency list, so
    // the menu stays on the set chosen at mount.
    expect(screen.getByTestId('table-actions').textContent).toBe(
      'Pause Subscription|Cancel Subscription|View Payment History|View Tenant Profile|Change Plan'
    );
  });

  it('offers all three state changes on the All tab', async () => {
    await renderPage();
    expect(screen.getByTestId('table-actions').textContent).toBe(
      'Pause Subscription|Cancel Subscription|Resume Subscription|View Payment History|View Tenant Profile|Change Plan'
    );
  });

  it('opens each modal with the row it was fired from', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('action-pause-subscription'));
    expect(screen.getByTestId('pause-items').textContent).toBe('1');
    fireEvent.click(screen.getByTestId('pause-close'));

    fireEvent.click(screen.getByTestId('action-cancel-subscription'));
    expect(screen.getByTestId('cancel-items').textContent).toBe('1');
    fireEvent.click(screen.getByTestId('cancel-close'));

    fireEvent.click(screen.getByTestId('action-resume-subscription'));
    expect(screen.getByTestId('resume-items').textContent).toBe('1');
  });

  it('opens the payment-link modal for the row tenant', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('action-change-plan'));
    expect(screen.getByTestId('link-tenant').textContent).toBe('t1');
    fireEvent.click(screen.getByTestId('link-close'));
    expect(screen.queryByTestId('link-modal')).not.toBeInTheDocument();
  });

  it('navigates to the tenant profile', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('action-view-tenant-profile'));
    expect(mocks.navigate).toHaveBeenCalledWith('/tenants/tenant-lists/overview/t1');
  });
});

describe('the bulk action bar', () => {
  const barLabels = () =>
    Array.from(document.body.querySelectorAll('.bulk-actions button')).map(
      (b) => b.textContent
    );

  it('stays hidden until something is selected', async () => {
    await renderPage();
    expect(document.body.querySelector('.bulk-actions')).toBeNull();
  });

  it('offers pause and cancel for an all-active selection', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('select-row-0'));
    expect(barLabels()).toEqual(['Pause Subscription', 'Cancel Subscription']);
  });

  it('offers resume and cancel for an all-paused selection', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('select-row-1'));
    expect(barLabels()).toEqual(['Resume Subscription', 'Cancel Subscription']);
  });

  it('offers only cancel when active and paused rows are mixed', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('select-two'));
    expect(barLabels()).toEqual(['Cancel Subscription']);
  });

  it('offers nothing for a status with no bulk action of its own', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('select-row-2'));
    expect(document.body.querySelector('.bulk-actions')).toBeNull();
  });

  it('drops the holes out of the selection the table reports', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('select-with-hole'));
    expect(barLabels()).toEqual(['Pause Subscription', 'Cancel Subscription']);
  });

  it('clears itself when the selection is emptied', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('select-row-0'));
    fireEvent.click(screen.getByTestId('select-none'));
    expect(document.body.querySelector('.bulk-actions')).toBeNull();
  });

  it('hides the buttons the user is not allowed to press', async () => {
    mocks.hasPermission.mockImplementation(
      (key) => key === 'view_subscriptions' || key === 'cancel_subscription'
    );
    await renderPage();
    fireEvent.click(screen.getByTestId('select-row-0'));
    expect(barLabels()).toEqual(['Cancel Subscription']);
    fireEvent.click(screen.getByTestId('select-row-1'));
    expect(barLabels()).toEqual(['Cancel Subscription']);
  });

  it('opens the cancel modal with the whole selection', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('select-two'));
    fireEvent.click(document.body.querySelector('.bulk-actions button'));
    expect(screen.getByTestId('cancel-items').textContent).toBe('2');
  });
});

describe('saving a subscription action', () => {
  const openResume = async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('action-resume-subscription'));
  };

  it('resumes now with a single subscription id', async () => {
    mocks.subApi.ResumeSubscriptionNow.mockResolvedValue({});
    mocks.saveExtras = { resumptionType: 'now', reason: 'asked', notifyTenant: true };
    await openResume();
    fireEvent.click(screen.getByTestId('resume-save'));

    await waitFor(() => expect(mocks.subApi.ResumeSubscriptionNow).toHaveBeenCalled());
    const [payload] = mocks.subApi.ResumeSubscriptionNow.mock.calls[0];
    expect(payload).toEqual(
      expect.objectContaining({
        subscriptionId: 's1',
        adminId: 'admin-1',
        comment: '',
        reason: 'asked',
        mailNotification: true,
        status: 'ACTIVE',
      })
    );
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Subscription resumed successfully',
      'success'
    );
    // A successful save refetches the list.
    expect(mocks.subApi.GetSubscriptionByStatus).toHaveBeenCalledTimes(2);
  });

  it('sends an array of ids when several rows are selected', async () => {
    mocks.subApi.CancelSubscriptionNow.mockResolvedValue({});
    mocks.saveExtras = { cancellationType: 'immediately' };
    await renderPage();
    // Only the bulk bar keeps more than one row; a row action replaces the
    // selection with the row it was fired from.
    fireEvent.click(screen.getByTestId('select-two'));
    fireEvent.click(document.body.querySelector('.bulk-actions button'));
    fireEvent.click(screen.getByTestId('cancel-save'));

    await waitFor(() => expect(mocks.subApi.CancelSubscriptionNow).toHaveBeenCalled());
    const [payload] = mocks.subApi.CancelSubscriptionNow.mock.calls[0];
    expect(payload.subscriptionId).toEqual(['s1', 's2']);
  });

  it('schedules a later resumption', async () => {
    mocks.subApi.ResumeSubscriptionLater.mockResolvedValue({});
    mocks.saveExtras = {
      resumptionType: 'specificDate',
      specificDate: '2024-03-01',
      comment: 'later please',
    };
    await openResume();
    fireEvent.click(screen.getByTestId('resume-save'));

    await waitFor(() => expect(mocks.subApi.ResumeSubscriptionLater).toHaveBeenCalled());
    const [payload] = mocks.subApi.ResumeSubscriptionLater.mock.calls[0];
    expect(payload.resumeShedule).toBe('2024-03-01');
    expect(payload.comment).toBe('later please');
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Subscription scheduled to resume successfully',
      'success'
    );
  });

  it('does nothing when the resumption type is unrecognised', async () => {
    mocks.saveExtras = { resumptionType: 'whenever' };
    await openResume();
    fireEvent.click(screen.getByTestId('resume-save'));
    await waitFor(() =>
      expect(document.body.querySelector('.section-loader')).toBeNull()
    );
    expect(mocks.subApi.ResumeSubscriptionNow).not.toHaveBeenCalled();
    expect(mocks.subApi.ResumeSubscriptionLater).not.toHaveBeenCalled();
    // No response means no refetch, so the modal stays as it was.
    expect(mocks.subApi.GetSubscriptionByStatus).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['indefinitely', 'PauseSubscriptionNow', 'Subscription paused successfully'],
    ['until', 'PauseSubscriptionUntil', 'Subscription paused until specified date'],
    [
      'specificDate',
      'PauseSubscriptionSchedule',
      'Subscription pause scheduled successfully',
    ],
  ])('pauses %s', async (pauseType, method, message) => {
    mocks.subApi[method].mockResolvedValue({});
    mocks.saveExtras = { pauseType, untilDate: '2024-04-01', specificDate: '2024-05-01' };
    await renderPage();
    fireEvent.click(screen.getByTestId('action-pause-subscription'));
    fireEvent.click(screen.getByTestId('pause-save'));

    await waitFor(() => expect(mocks.subApi[method]).toHaveBeenCalled());
    expect(mocks.showToast).toHaveBeenCalledWith(message, 'success');
  });

  it.each([
    ['immediately', 'CancelSubscriptionNow', 'Subscription cancelled successfully'],
    ['endOfCycle', 'CancelSubscriptionLater', 'Subscription scheduled for cancellation'],
  ])('cancels %s', async (cancellationType, method, message) => {
    mocks.subApi[method].mockResolvedValue({});
    mocks.saveExtras = { cancellationType };
    await renderPage();
    fireEvent.click(screen.getByTestId('action-cancel-subscription'));
    fireEvent.click(screen.getByTestId('cancel-save'));

    await waitFor(() => expect(mocks.subApi[method]).toHaveBeenCalled());
    expect(mocks.showToast).toHaveBeenCalledWith(message, 'success');
  });

  it('does nothing when the pause type is unrecognised', async () => {
    mocks.saveExtras = { pauseType: 'whenever' };
    await renderPage();
    fireEvent.click(screen.getByTestId('action-pause-subscription'));
    fireEvent.click(screen.getByTestId('pause-save'));
    await waitFor(() =>
      expect(document.body.querySelector('.section-loader')).toBeNull()
    );
    expect(mocks.subApi.PauseSubscriptionNow).not.toHaveBeenCalled();
    expect(mocks.subApi.PauseSubscriptionSchedule).not.toHaveBeenCalled();
  });

  it('does nothing when the cancellation type is unrecognised', async () => {
    mocks.saveExtras = { cancellationType: 'someday' };
    await renderPage();
    fireEvent.click(screen.getByTestId('action-cancel-subscription'));
    fireEvent.click(screen.getByTestId('cancel-save'));
    await waitFor(() =>
      expect(document.body.querySelector('.section-loader')).toBeNull()
    );
    expect(mocks.subApi.CancelSubscriptionNow).not.toHaveBeenCalled();
    expect(mocks.subApi.CancelSubscriptionLater).not.toHaveBeenCalled();
  });

  it('does nothing for a payload that names no action at all', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('action-cancel-subscription'));
    fireEvent.click(screen.getByTestId('cancel-save'));
    await waitFor(() =>
      expect(document.body.querySelector('.section-loader')).toBeNull()
    );
    expect(mocks.subApi.GetSubscriptionByStatus).toHaveBeenCalledTimes(1);
    expect(mocks.showToast).not.toHaveBeenCalled();
  });

  it('keeps a failed action out of the console outside development', async () => {
    vi.stubEnv('DEV', false);
    mocks.subApi.CancelSubscriptionNow.mockRejectedValue(new Error('server said no'));
    mocks.saveExtras = { cancellationType: 'immediately' };
    await renderPage();
    fireEvent.click(screen.getByTestId('action-cancel-subscription'));
    fireEvent.click(screen.getByTestId('cancel-save'));
    await waitFor(() => expect(mocks.showApiError).toHaveBeenCalled());
    expect(console.error).not.toHaveBeenCalled();
  });

  it('reports a failed action', async () => {
    mocks.subApi.CancelSubscriptionNow.mockRejectedValue(new Error('server said no'));
    mocks.saveExtras = { cancellationType: 'immediately' };
    await renderPage();
    fireEvent.click(screen.getByTestId('action-cancel-subscription'));
    fireEvent.click(screen.getByTestId('cancel-save'));

    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith(
        'Failed to perform subscription action.',
        'error'
      )
    );
    expect(mocks.showApiError).toHaveBeenCalledWith(
      expect.any(Error),
      'UPDATE_SUBSCRIPTION'
    );
  });
});

describe('viewing a payment', () => {
  const openPayment = async () => {
    const view = await renderPage();
    fireEvent.click(screen.getByTestId('action-view-payment-history'));
    await waitFor(() => expect(screen.getByTestId('payment-view')).toBeInTheDocument());
    return view;
  };

  it('renders a fully populated payment', async () => {
    mocks.invoiceApi.GetPaymentById.mockResolvedValue({
      data: {
        Plan: 'Enterprise',
        Period: { start: '2024-01-01T00:00:00.000Z', stop: '2024-01-31T00:00:00.000Z' },
        amount: 1200,
        paymentMethod: { name: 'paypal', code: '9999' },
        invoice: { invoiceId: 'INV77' },
      },
    });
    await openPayment();
    expect(mocks.invoiceApi.GetPaymentById).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pay-1' })
    );
    expect(screen.getByTestId('payment-plan').textContent).toBe('Enterprise');
    expect(screen.getByTestId('payment-period').textContent).toBe('1/1/2024 - 1/31/2024');
    expect(screen.getByTestId('payment-id').textContent).toBe('PAY00pay-1');
    expect(screen.getByTestId('payment-amount').textContent).toBe('$1.20k');
    expect(screen.getByTestId('payment-card').textContent).toBe('9999');
    expect(screen.getByTestId('payment-invoice-id').textContent).toBe('77');
  });

  it('falls back to the row when the payment response is empty', async () => {
    await openPayment();
    expect(screen.getByTestId('payment-plan').textContent).toBe('Pro');
    expect(screen.getByTestId('payment-period').textContent).toBe('N/A');
    expect(screen.getByTestId('payment-amount').textContent).toBe('$4.50k');
    expect(screen.getByTestId('payment-card').textContent).toBe('N/A');
    expect(screen.getByTestId('payment-invoice-id').textContent).toBe('INV77');
  });

  it('keeps a period that is already a string', async () => {
    mocks.invoiceApi.GetPaymentById.mockResolvedValue({ data: { Period: 'Q1' } });
    await openPayment();
    expect(screen.getByTestId('payment-period').textContent).toBe('Q1');
  });

  it('abbreviates a very large payment amount', async () => {
    mocks.invoiceApi.GetPaymentById.mockResolvedValue({ data: { amount: 1_500_000_000 } });
    await openPayment();
    expect(screen.getByTestId('payment-amount').textContent).toBe('$1.50b');
  });

  it('trims the decimals off a whole million', async () => {
    mocks.invoiceApi.GetPaymentById.mockResolvedValue({ data: { amount: 2_000_000 } });
    await openPayment();
    expect(screen.getByTestId('payment-amount').textContent).toBe('$2m');
  });

  it('copes with a payment response that has no data at all', async () => {
    mocks.invoiceApi.GetPaymentById.mockResolvedValue({});
    await openPayment();
    expect(screen.getByTestId('payment-plan').textContent).toBe('Pro');
  });

  it('shows N/A when neither the response nor the row names an invoice', async () => {
    await renderPage();
    // The second subscription has no payment, so no invoice id either.
    fireEvent.click(screen.getByTestId('second-view-payment-history'));
    await waitFor(() => expect(screen.getByTestId('payment-view')).toBeInTheDocument());
    expect(screen.getByTestId('payment-invoice-id').textContent).toBe('N/A');
  });

  it('picks a brand mark per payment method and falls back to Visa', async () => {
    // The icons carry no accessible name, so they are told apart by their path
    // data; each brand needs its own mount.
    const marks = {};
    for (const name of ['amex', 'american express', 'mastercard', 'discover']) {
      mocks.invoiceApi.GetPaymentById.mockResolvedValue({
        data: { paymentMethod: { name } },
      });
      const view = await openPayment();
      marks[name] = screen
        .getByTestId('payment-icon')
        .querySelector('path')
        .getAttribute('d');
      view.unmount();
    }
    expect(marks.amex).toBe(marks['american express']);
    expect(new Set(Object.values(marks)).size).toBe(3);
  });

  it('keeps a failed payment fetch out of the console outside development', async () => {
    vi.stubEnv('DEV', false);
    mocks.invoiceApi.GetPaymentById.mockRejectedValue(new Error('gone'));
    await renderPage();
    fireEvent.click(screen.getByTestId('action-view-payment-history'));
    await waitFor(() => expect(mocks.invoiceApi.GetPaymentById).toHaveBeenCalled());
    expect(console.error).not.toHaveBeenCalled();
  });

  it('serves a second look at the same payment from the cache', async () => {
    await openPayment();
    fireEvent.click(screen.getByTestId('payment-back'));
    fireEvent.click(screen.getByTestId('action-view-payment-history'));
    expect(screen.getByTestId('payment-view')).toBeInTheDocument();
    expect(mocks.invoiceApi.GetPaymentById).toHaveBeenCalledTimes(1);
  });

  it('stays on the table when the payment request rejects', async () => {
    mocks.invoiceApi.GetPaymentById.mockRejectedValue(new Error('gone'));
    await renderPage();
    fireEvent.click(screen.getByTestId('action-view-payment-history'));
    await waitFor(() => expect(mocks.invoiceApi.GetPaymentById).toHaveBeenCalled());
    expect(screen.queryByTestId('payment-view')).not.toBeInTheDocument();
  });
});

describe('viewing an invoice', () => {
  const openInvoiceFromPayment = async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('action-view-payment-history'));
    await waitFor(() => expect(screen.getByTestId('payment-view')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('payment-view-invoice'));
    await waitFor(() => expect(mocks.invoiceApi.GetInvoiceById).toHaveBeenCalled());
  };

  it('strips the id prefix and maps the line items', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({
      data: {
        invoiceId: 'INV77',
        total: 900,
        items: [{ description: 'Plan', rate: { price: 100 }, quantity: 2, price: 200 }],
      },
    });
    await openInvoiceFromPayment();
    expect(mocks.invoiceApi.GetInvoiceById).toHaveBeenCalledWith(
      expect.objectContaining({ id: '77' })
    );
    expect(screen.getByTestId('invoice-items').textContent).toBe('1:Plan:$100:2:$200');
    expect(screen.getByTestId('invoice-total').textContent).toBe('$900');
  });

  it('falls back through an empty invoice', async () => {
    await openInvoiceFromPayment();
    expect(screen.getByTestId('invoice-id').textContent).toBe('77');
    expect(screen.getByTestId('invoice-total').textContent).toBe('$0');
    expect(screen.getByTestId('invoice-items').textContent).toBe('');
  });

  it('prices a line item that carries neither a rate nor a price', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({
      data: { items: [{ description: 'Plan' }] },
    });
    await openInvoiceFromPayment();
    expect(screen.getByTestId('invoice-items').textContent).toBe(
      '1:Plan:$0:undefined:$0'
    );
  });

  it('copes with an invoice response that has no data at all', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({});
    await openInvoiceFromPayment();
    expect(screen.getByTestId('invoice-total').textContent).toBe('$0');
  });

  it('asks for an invoice the payment view could not name', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('action-view-payment-history'));
    await waitFor(() => expect(screen.getByTestId('payment-view')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('payment-view-invoice-blank'));
    await waitFor(() =>
      expect(mocks.invoiceApi.GetInvoiceById).toHaveBeenCalledWith(
        expect.objectContaining({ id: '' })
      )
    );
  });

  it('keeps a failed invoice fetch out of the console outside development', async () => {
    vi.stubEnv('DEV', false);
    mocks.invoiceApi.GetInvoiceById.mockRejectedValue(new Error('gone'));
    await renderPage();
    fireEvent.click(screen.getByTestId('action-view-payment-history'));
    await waitFor(() => expect(screen.getByTestId('payment-view')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('payment-view-invoice'));
    await waitFor(() => expect(mocks.invoiceApi.GetInvoiceById).toHaveBeenCalled());
    expect(console.error).not.toHaveBeenCalled();
  });

  it('serves a second look at the same invoice from the cache', async () => {
    await openInvoiceFromPayment();
    fireEvent.click(screen.getByTestId('payment-close-invoice'));
    fireEvent.click(screen.getByTestId('payment-view-invoice'));
    expect(mocks.invoiceApi.GetInvoiceById).toHaveBeenCalledTimes(1);
  });

  it('shows the standalone invoice modal and closes it from the backdrop', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('action-view-payment-history'));
    await waitFor(() => expect(screen.getByTestId('payment-view')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('payment-view-invoice'));
    await waitFor(() =>
      expect(screen.getByTestId('subscription-invoice')).toBeInTheDocument()
    );

    // The panel swallows its own clicks; the backdrop behind it closes.
    fireEvent.click(screen.getByTestId('subscription-invoice').parentElement);
    expect(screen.getByTestId('subscription-invoice')).toBeInTheDocument();
    fireEvent.click(
      screen.getByTestId('subscription-invoice').parentElement.parentElement
    );
    expect(screen.queryByTestId('subscription-invoice')).not.toBeInTheDocument();
  });

  it('closes the standalone invoice modal from its button', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('action-view-payment-history'));
    await waitFor(() => expect(screen.getByTestId('payment-view')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('payment-view-invoice'));
    await waitFor(() =>
      expect(screen.getByTestId('subscription-invoice')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText('✕'));
    expect(screen.queryByTestId('subscription-invoice')).not.toBeInTheDocument();
  });

  it('stays shut when the invoice request rejects', async () => {
    mocks.invoiceApi.GetInvoiceById.mockRejectedValue(new Error('gone'));
    await renderPage();
    fireEvent.click(screen.getByTestId('action-view-payment-history'));
    await waitFor(() => expect(screen.getByTestId('payment-view')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('payment-view-invoice'));
    await waitFor(() => expect(mocks.invoiceApi.GetInvoiceById).toHaveBeenCalled());
    expect(screen.queryByTestId('subscription-invoice')).not.toBeInTheDocument();
  });
});

describe('a payment with no amount anywhere', () => {
  it('shows zero when neither the response nor the row carries an amount', async () => {
    // The row mapper defaults a missing `payment.amount` to 0, so the payment
    // panel still has a number to format rather than falling through to the
    // formatter's null guard.
    mocks.subApi.GetSubscriptionByStatus.mockResolvedValue({
      data: [
        {
          id: 's9',
          tenantId: 't9',
          tenant: { companyName: 'Acme Health' },
          plan: { name: 'Pro' },
          status: 'ACTIVE',
          payment: { status: 'Successful', id: 'pay-9' },
        },
      ],
    });
    await renderPage();
    fireEvent.click(screen.getByTestId('action-view-payment-history'));
    await waitFor(() => expect(screen.getByTestId('payment-view')).toBeInTheDocument());
    expect(screen.getByTestId('payment-amount').textContent).toBe('$0');
  });
});
