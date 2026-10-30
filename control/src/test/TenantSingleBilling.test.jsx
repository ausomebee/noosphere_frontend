import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

/**
 * The tenant billing tab: a plan summary card, a payment-method carousel and a
 * two-level table (Invoices vs Payments, each with its own status sub-tabs,
 * filter modals and row actions).
 *
 * Everything the page loads arrives through `Promise.allSettled`, so each of
 * the four requests has an independent fulfilled/rejected arm; the fixtures
 * below deliberately hand back three different response envelopes because
 * `extractList` unwraps `data.data`, a bare `data`, and a raw array in turn.
 *
 * `CustomTable` is replaced by a probe that prints the mapped cell values and
 * exposes one button per row action and one per filter option -- that is the
 * only way the row mappers, the action handlers and `onFilterTypeSelect` are
 * reachable without driving the real table's search and pagination. The filter
 * modals are probes too; the date modal applies whatever range the test parks
 * on `mocks.dateRange`, since a range cannot be spelled out in JSX.
 *
 * jsPDF and html2canvas are mocked: the download handler is a real code path
 * and an unmocked jsPDF would write a PDF into the repo. `SubscriptionInvoice`
 * is a stub, so the off-screen React root the handler creates is left real --
 * mocking `react-dom/client` would break Testing Library's own root.
 */

const mocks = vi.hoisted(() => ({
  params: { tenantId: 'tenant-1' },
  state: {},
  dateRange: null,
  tenantApi: {
    GetSingleTenant: vi.fn(),
    GetTenantInvoices: vi.fn(),
    GetTenantPayments: vi.fn(),
    GetTenantPaymentMethods: vi.fn(),
    GetTenantInvoicesByStatus: vi.fn(),
    GetTenantPaymentsByStatus: vi.fn(),
  },
  invoiceApi: {
    GetInvoiceById: vi.fn(),
    GetPaymentById: vi.fn(),
  },
  showToast: vi.fn(),
  showApiError: vi.fn(),
  html2canvas: vi.fn(),
  pdfSave: vi.fn(),
  pdfAddImage: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => mocks.params };
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

vi.mock('html2canvas', () => ({ default: (...a) => mocks.html2canvas(...a) }));
vi.mock('jspdf', () => ({
  jsPDF: class {
    addImage(...a) {
      mocks.pdfAddImage(...a);
    }
    save(...a) {
      mocks.pdfSave(...a);
    }
  },
}));

// Prints every mapped cell so the row mappers can be asserted, and turns each
// action and each filter option into its own button.
vi.mock('../Components/Table/CustomTable', () => ({
  default: (props) => (
    <div data-testid={`table-${props.tableName}`}>
      <span data-testid="table-rows">{props.data.length}</span>
      {props.loading ? <span data-testid="table-loading" /> : null}
      {props.filters[0].options.map((opt) => (
        <button
          key={opt.value || 'blank'}
          data-testid={`pick-${opt.value || 'blank'}`}
          onClick={() => props.onFilterTypeSelect(opt.value)}
        >
          {opt.label}
        </button>
      ))}
      {props.data.map((row, i) => (
        <div key={row.id ?? i} data-testid={`row-${i}`}>
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

vi.mock('../Components/ReusableModal/TableFilterModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="value-filter-modal">
        <span data-testid="value-filter-title">{props.title}</span>
        <span data-testid="value-filter-label">{props.label}</span>
        {props.options.map((opt) => (
          <button
            key={opt.value || 'blank'}
            data-testid={`apply-${opt.value || 'blank'}`}
            onClick={() => props.onApply(opt.value)}
          >
            {opt.label}
          </button>
        ))}
        <button data-testid="value-filter-close" onClick={props.onClose}>
          close
        </button>
      </div>
    ) : null,
}));

vi.mock('../Components/ReusableModal/TableFilterDateModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="date-filter-modal">
        <span data-testid="date-filter-title">{props.title}</span>
        <button data-testid="date-filter-apply" onClick={() => props.onApply(mocks.dateRange)}>
          apply
        </button>
        <button data-testid="date-filter-close" onClick={props.onClose}>
          close
        </button>
      </div>
    ) : null,
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

vi.mock('../Pages/Tenant/TenantList/TenantListViewPayment', () => ({
  default: (props) => (
    <div data-testid="payment-view">
      <span data-testid="payment-plan">{props.paymentInfo.Plan}</span>
      <span data-testid="payment-period">{props.paymentInfo.Period}</span>
      <span data-testid="payment-ref">{props.paymentInfo['Payment ID']}</span>
      <span data-testid="payment-amount">{props.paymentInfo['Payment Amount']}</span>
      <span data-testid="payment-card">{props.paymentInfo['Payment Method'].number}</span>
      <span data-testid="payment-invoice">{props.paymentInfo.Invoice.id}</span>
      <button data-testid="payment-back" onClick={props.onBack}>
        back
      </button>
      <button data-testid="payment-open-invoice" onClick={() => props.onViewInvoice('linked-inv')}>
        open invoice
      </button>
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

import TenantSingleBilling from '../Pages/Tenant/TenantSingle/TenantSingleBilling';

// Midday UTC keeps every formatted date on the same calendar day whatever the
// runner's timezone is.
const TENANT = {
  id: 'tenant-1',
  _count: { clientLinks: 3 },
  Subscription: [{ endDate: '2026-03-15T12:00:00Z', plan: { planType: 'ENTERPRISE', forClient: 10 } }],
  Invoice: [{ id: 'inv-fallback' }],
};

const INVOICES = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-0001',
    createdAt: '2026-01-10T12:00:00Z',
    dueDate: '2026-02-10T12:00:00Z',
    total: 120,
    status: 'Paid',
  },
  {
    invoiceId: 'inv-2',
    dateCreated: '2026-01-20T12:00:00Z',
    due_date: '2026-02-20T12:00:00Z',
    amount: 55.5,
    status: 'Overdue',
  },
];

const PAYMENTS = [
  {
    id: 'pay-1',
    invoice: { id: 'inv-1' },
    transactionRef: 'TRX-1',
    amount: 120,
    gateway: 'Stripe',
    paymentDate: '2026-01-11T12:00:00Z',
    status: 'Successful',
  },
  {
    paymentId: 'pay-2',
    invoiceId: 'inv-2',
    transactionId: 'TRX-2',
    amount: 55.5,
    method: 'Paypal',
    createdAt: '2026-01-21T12:00:00Z',
    status: 'Failed',
  },
];

const CARDS = [
  { id: 'c1', cardType: 'visa', lastFourDigits: '4242', holderName: 'Ada L', createdAt: '2026-01-05T12:00:00Z' },
  { id: 'c2', cardType: 'mastercard', lastFourDigits: '1111', holderName: 'Bo K' },
];

const settle = (value) => Promise.resolve(value);

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

const renderBilling = async ({ permissions = ['generate_payment_link'] } = {}) => {
  mocks.state = buildState(permissions);
  const view = render(<TenantSingleBilling />);
  await act(async () => {});
  return view;
};

const cell = (row, key) => screen.getByTestId(`cell-${row}-${key}`).textContent;

// Sub-tab labels collide with the status values printed in the table probe, so
// the tabs are always reached through their own class.
const subTab = (label) =>
  Array.from(document.body.querySelectorAll('.tenants-tab')).find((b) =>
    b.textContent.startsWith(label)
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.params = { tenantId: 'tenant-1' };
  mocks.dateRange = null;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  // jsdom implements no scrolling at all, and the carousel arrows call both.
  Element.prototype.scrollBy = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  mocks.tenantApi.GetSingleTenant.mockImplementation(() => settle({ data: TENANT }));
  // Three different envelopes on purpose: `extractList` has a branch for each.
  mocks.tenantApi.GetTenantInvoices.mockImplementation(() => settle({ data: { data: INVOICES } }));
  mocks.tenantApi.GetTenantPayments.mockImplementation(() => settle({ data: PAYMENTS }));
  mocks.tenantApi.GetTenantPaymentMethods.mockImplementation(() => settle(CARDS));
  mocks.tenantApi.GetTenantInvoicesByStatus.mockResolvedValue({ data: { data: [] } });
  mocks.tenantApi.GetTenantPaymentsByStatus.mockResolvedValue({ data: [] });
  mocks.html2canvas.mockResolvedValue({
    width: 700,
    height: 1400,
    toDataURL: () => 'data:image/png;base64,zzz',
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loading and initial fetch', () => {
  it('shows a section loader until the four requests settle', async () => {
    mocks.state = buildState([]);
    render(<TenantSingleBilling />);
    expect(document.body.querySelector('.section-loader')).toBeInTheDocument();
    await act(async () => {});
    expect(document.body.querySelector('.section-loader')).toBeNull();
  });

  it('unwraps each of the three response envelopes', async () => {
    await renderBilling();
    expect(screen.getByTestId('table-rows')).toHaveTextContent('2');
    expect(screen.getByText('•••• •••• •••• 4242')).toBeInTheDocument();
    expect(screen.getByText('3 out of 10 used')).toBeInTheDocument();
  });

  it('reads a tenant response that is not wrapped in data', async () => {
    mocks.tenantApi.GetSingleTenant.mockImplementation(() => settle({ ...TENANT }));
    await renderBilling();
    expect(screen.getByText('3 out of 10 used')).toBeInTheDocument();
  });

  it('keeps the page usable when every request rejects', async () => {
    mocks.tenantApi.GetSingleTenant.mockRejectedValue(new Error('a'));
    mocks.tenantApi.GetTenantInvoices.mockRejectedValue(new Error('b'));
    mocks.tenantApi.GetTenantPayments.mockRejectedValue(new Error('c'));
    mocks.tenantApi.GetTenantPaymentMethods.mockRejectedValue(new Error('d'));
    await renderBilling();
    expect(screen.getByText('No payment methods on file.')).toBeInTheDocument();
    expect(screen.getByTestId('table-rows')).toHaveTextContent('0');
    expect(screen.getByText('0 out of 0 used')).toBeInTheDocument();
  });

  it('treats a response with neither data nor an array as an empty list', async () => {
    mocks.tenantApi.GetTenantPaymentMethods.mockImplementation(() => settle({}));
    await renderBilling();
    expect(screen.getByText('No payment methods on file.')).toBeInTheDocument();
  });

  it('falls back to a null tenant when the response body is empty', async () => {
    mocks.tenantApi.GetSingleTenant.mockImplementation(() => settle({ data: null }));
    await renderBilling();
    expect(document.body.querySelector('.plan-badge-billing')).toHaveTextContent('—');
    expect(document.body.querySelector('.plan-info-col-date')).toHaveTextContent('—');
    expect(screen.getByText('0 out of 0 used')).toBeInTheDocument();
  });
});

describe('plan summary', () => {
  it('title-cases the plan type badge', async () => {
    await renderBilling();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });

  it('shows a dash when the subscription carries no plan type', async () => {
    mocks.tenantApi.GetSingleTenant.mockImplementation(() =>
      settle({ data: { ...TENANT, Subscription: [{ endDate: null, plan: {} }] } })
    );
    await renderBilling();
    expect(document.body.querySelector('.plan-badge-billing')).toHaveTextContent('—');
  });

  it('formats the next payment date from the subscription end date', async () => {
    await renderBilling();
    expect(screen.getByText('Mar 15, 2026')).toBeInTheDocument();
  });

  it('leaves the usage bar empty when the plan has no seat allowance', async () => {
    mocks.tenantApi.GetSingleTenant.mockImplementation(() =>
      settle({ data: { ...TENANT, Subscription: [{ plan: { planType: 'BASIC' } }] } })
    );
    await renderBilling();
    expect(document.body.querySelector('.usage-filled')).toHaveStyle({ width: '0%' });
    expect(screen.getByText('3 out of 0 used')).toBeInTheDocument();
  });

  it('clamps the usage bar at a hundred percent when seats are oversubscribed', async () => {
    mocks.tenantApi.GetSingleTenant.mockImplementation(() =>
      settle({ data: { ...TENANT, _count: { clientLinks: 40 }, Subscription: [{ plan: { forClient: 10 } }] } })
    );
    await renderBilling();
    expect(document.body.querySelector('.usage-filled')).toHaveStyle({ width: '100%' });
  });

  it('disables the invoice button when the tenant has no invoice on record', async () => {
    mocks.tenantApi.GetSingleTenant.mockImplementation(() =>
      settle({ data: { ...TENANT, Invoice: [] } })
    );
    await renderBilling();
    expect(screen.getByText('View invoice').closest('button')).toBeDisabled();
  });

  it('hides the change-plan button from a role without the permission', async () => {
    await renderBilling({ permissions: ['view_tenant_details'] });
    expect(screen.queryByText('Change plan')).toBeNull();
  });

  it('opens the payment link modal for a permitted role', async () => {
    await renderBilling();
    fireEvent.click(screen.getByText('Change plan'));
    expect(screen.getByTestId('payment-link-tenant')).toHaveTextContent('tenant-1');
    fireEvent.click(screen.getByTestId('payment-link-close'));
    expect(screen.queryByTestId('payment-link-modal')).toBeNull();
  });
});

describe('payment method carousel', () => {
  it('renders one card per method with its added month', async () => {
    await renderBilling();
    expect(screen.getByText('January 2026')).toBeInTheDocument();
    expect(screen.getByText('Ada L')).toBeInTheDocument();
  });

  it('dashes the added date when the card has no creation timestamp', async () => {
    await renderBilling();
    const cards = document.body.querySelectorAll('.payment-method-card');
    expect(cards[1]).toHaveTextContent('—');
  });

  it('scrolls the carousel in both directions when more than one card is on file', async () => {
    await renderBilling();
    fireEvent.click(document.body.querySelector('.carousel-arrow-left'));
    fireEvent.click(document.body.querySelector('.carousel-arrow-right'));
    expect(Element.prototype.scrollBy).toHaveBeenCalledTimes(2);
    expect(Element.prototype.scrollBy).toHaveBeenLastCalledWith({ left: 320, behavior: 'smooth' });
  });

  it('hides the arrows when there is a single card', async () => {
    mocks.tenantApi.GetTenantPaymentMethods.mockImplementation(() => settle([CARDS[0]]));
    await renderBilling();
    expect(document.body.querySelector('.carousel-arrow')).toBeNull();
  });

  it('renders a brand icon for each recognised card type and a visa otherwise', async () => {
    mocks.tenantApi.GetTenantPaymentMethods.mockImplementation(() =>
      settle([
        { id: 'a', cardType: 'amex' },
        { id: 'b', cardType: 'American Express' },
        { id: 'c', cardType: 'mastercard' },
        { id: 'd', cardType: 'paypal' },
        { id: 'e', cardType: 'discover' },
        { id: 'f' },
      ])
    );
    await renderBilling();
    expect(document.body.querySelectorAll('.payment-method-card')).toHaveLength(6);
    expect(document.body.querySelectorAll('.payment-card-top svg')).toHaveLength(6);
  });
});

describe('invoice rows', () => {
  it('maps the primary field of every column', async () => {
    await renderBilling();
    expect(cell(0, 'document')).toBe('INV-0001');
    expect(cell(0, 'date_created')).toBe('01/10/2026');
    expect(cell(0, 'due_date')).toBe('02/10/2026');
    expect(cell(0, 'status')).toBe('Paid');
  });

  it('falls back through the alternative field names', async () => {
    await renderBilling();
    expect(cell(1, 'document')).toBe('inv-2');
    expect(cell(1, 'date_created')).toBe('01/20/2026');
    expect(cell(1, 'due_date')).toBe('02/20/2026');
  });

  it('dashes every field an invoice omits', async () => {
    mocks.tenantApi.GetTenantInvoices.mockImplementation(() => settle({ data: { data: [{ id: 'bare' }] } }));
    await renderBilling();
    expect(cell(0, 'document')).toBe('bare');
    expect(cell(0, 'date_created')).toBe('—');
    expect(cell(0, 'due_date')).toBe('—');
    expect(cell(0, 'status')).toBe('—');
  });

  it('dashes a date the parser cannot read', async () => {
    mocks.tenantApi.GetTenantInvoices.mockImplementation(() =>
      settle({ data: { data: [{ id: 'x', createdAt: 'not a date' }] } })
    );
    await renderBilling();
    expect(cell(0, 'date_created')).toBe('—');
  });

  it('uses the issue date and the amount when total is absent', async () => {
    mocks.tenantApi.GetTenantInvoices.mockImplementation(() =>
      settle({ data: { data: [{ issueDate: '2026-04-01T12:00:00Z', amount: 9 }] } })
    );
    await renderBilling();
    expect(cell(0, 'date_created')).toBe('04/01/2026');
  });

  it('ignores an invoice list that is not an array', async () => {
    // Only the per-tab response can be a non-array without taking the counts
    // memo down with it, so the guard is reached through a status tab.
    mocks.tenantApi.GetTenantInvoicesByStatus.mockResolvedValue({ data: { data: 'nope' } });
    await renderBilling();
    await act(async () => {
      fireEvent.click(subTab('Paid'));
    });
    expect(screen.getByTestId('table-rows')).toHaveTextContent('0');
  });
});

describe('payment rows', () => {
  const openPayments = async () => {
    await renderBilling();
    fireEvent.click(screen.getByText('Payments'));
  };

  it('maps the primary field of every column', async () => {
    await openPayments();
    expect(cell(0, 'reference')).toBe('TRX-1');
    expect(cell(0, 'amount')).toBe('$120.00');
    expect(cell(0, 'method')).toBe('Stripe');
    expect(cell(0, 'date')).toBe('01/11/2026');
    expect(cell(0, 'status')).toBe('Successful');
  });

  it('falls back through the alternative field names', async () => {
    await openPayments();
    expect(cell(1, 'reference')).toBe('TRX-2');
    expect(cell(1, 'method')).toBe('Paypal');
    expect(cell(1, 'date')).toBe('01/21/2026');
  });

  it('dashes every field a payment omits', async () => {
    mocks.tenantApi.GetTenantPayments.mockImplementation(() => settle({ data: [{ id: 'bare' }] }));
    await openPayments();
    expect(cell(0, 'reference')).toBe('bare');
    expect(cell(0, 'amount')).toBe('—');
    expect(cell(0, 'method')).toBe('—');
    expect(cell(0, 'status')).toBe('—');
  });

  it('reads the payment method name when neither gateway nor method is set', async () => {
    mocks.tenantApi.GetTenantPayments.mockImplementation(() =>
      settle({ data: [{ id: 'p', paymentMethod: 'Bank transfer', paidAt: '2026-05-02T12:00:00Z' }] })
    );
    await openPayments();
    expect(cell(0, 'method')).toBe('Bank transfer');
    expect(cell(0, 'date')).toBe('05/02/2026');
  });

  it('ignores a payment list that is not an array', async () => {
    mocks.tenantApi.GetTenantPaymentsByStatus.mockResolvedValue({ data: 'nope' });
    await openPayments();
    await act(async () => {
      fireEvent.click(subTab('Failed'));
    });
    expect(screen.getByTestId('table-rows')).toHaveTextContent('0');
  });
});

describe('sub tabs', () => {
  it('badges each status with its count from the full list', async () => {
    await renderBilling();
    const tabs = document.body.querySelectorAll('.tenants-tab');
    expect(tabs[0]).toHaveTextContent('2');
    expect(tabs[1]).toHaveTextContent('Paid1');
    expect(tabs[2]).toHaveTextContent('Upcoming');
  });

  it('counts an invoice with no status under the empty key', async () => {
    mocks.tenantApi.GetTenantInvoices.mockImplementation(() => settle({ data: { data: [{ id: 'a' }] } }));
    await renderBilling();
    expect(document.body.querySelectorAll('.tab-count')).toHaveLength(1);
  });

  it('refetches the invoices for a status tab', async () => {
    mocks.tenantApi.GetTenantInvoicesByStatus.mockResolvedValue({ data: { data: [INVOICES[0]] } });
    await renderBilling();
    await act(async () => {
      fireEvent.click(subTab('Paid'));
    });
    expect(mocks.tenantApi.GetTenantInvoicesByStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Paid', tenantId: 'tenant-1' })
    );
    expect(screen.getByTestId('table-rows')).toHaveTextContent('1');
  });

  it('empties the invoice table when the status request fails', async () => {
    mocks.tenantApi.GetTenantInvoicesByStatus.mockRejectedValue(new Error('x'));
    await renderBilling();
    await act(async () => {
      fireEvent.click(subTab('Overdue'));
    });
    expect(screen.getByTestId('table-rows')).toHaveTextContent('0');
  });

  it('restores the full invoice list on the All tab without refetching', async () => {
    await renderBilling();
    await act(async () => {
      fireEvent.click(subTab('Due/Unpaid'));
    });
    mocks.tenantApi.GetTenantInvoicesByStatus.mockClear();
    fireEvent.click(subTab('All'));
    expect(mocks.tenantApi.GetTenantInvoicesByStatus).not.toHaveBeenCalled();
    expect(screen.getByTestId('table-rows')).toHaveTextContent('2');
  });

  it('refetches the payments for a status tab', async () => {
    mocks.tenantApi.GetTenantPaymentsByStatus.mockResolvedValue({ data: [PAYMENTS[1]] });
    await renderBilling();
    fireEvent.click(screen.getByText('Payments'));
    await act(async () => {
      fireEvent.click(subTab('Failed'));
    });
    expect(mocks.tenantApi.GetTenantPaymentsByStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Failed' })
    );
    expect(screen.getByTestId('table-rows')).toHaveTextContent('1');
  });

  it('empties the payment table when the status request fails', async () => {
    mocks.tenantApi.GetTenantPaymentsByStatus.mockRejectedValue(new Error('x'));
    await renderBilling();
    fireEvent.click(screen.getByText('Payments'));
    await act(async () => {
      fireEvent.click(subTab('In Progress'));
    });
    expect(screen.getByTestId('table-rows')).toHaveTextContent('0');
  });

  it('restores the full payment list on the All tab', async () => {
    await renderBilling();
    fireEvent.click(screen.getByText('Payments'));
    await act(async () => {
      fireEvent.click(subTab('Successful'));
    });
    fireEvent.click(subTab('All'));
    expect(screen.getByTestId('table-rows')).toHaveTextContent('2');
  });

  it('swaps a section loader in for the payment table while a tab is in flight', async () => {
    let release;
    mocks.tenantApi.GetTenantPaymentsByStatus.mockImplementation(
      () => new Promise((resolve) => { release = () => resolve({ data: [] }); })
    );
    await renderBilling();
    fireEvent.click(screen.getByText('Payments'));
    fireEvent.click(subTab('Failed'));
    await waitFor(() => expect(document.body.querySelector('.section-loader')).toBeInTheDocument());
    expect(screen.queryByTestId('table-Payments')).toBeNull();
    await act(async () => {
      release();
    });
    expect(screen.getByTestId('table-Payments')).toBeInTheDocument();
  });

  it('marks the invoice table loading rather than replacing it', async () => {
    let release;
    mocks.tenantApi.GetTenantInvoicesByStatus.mockImplementation(
      () => new Promise((resolve) => { release = () => resolve({ data: { data: [] } }); })
    );
    await renderBilling();
    fireEvent.click(subTab('Paid'));
    await waitFor(() => expect(screen.getByTestId('table-loading')).toBeInTheDocument());
    await act(async () => {
      release();
    });
    expect(screen.queryByTestId('table-loading')).toBeNull();
  });
});

describe('invoice filters', () => {
  it('offers every distinct status plus an all-statuses entry', async () => {
    await renderBilling();
    fireEvent.click(screen.getByText('Status'));
    expect(screen.getByTestId('value-filter-title')).toHaveTextContent('Filter by Status');
    expect(screen.getByTestId('apply-Paid')).toBeInTheDocument();
    expect(screen.getByTestId('apply-Overdue')).toBeInTheDocument();
  });

  it('narrows the table to the chosen status', async () => {
    await renderBilling();
    fireEvent.click(screen.getByText('Status'));
    fireEvent.click(screen.getByTestId('apply-Paid'));
    expect(screen.getByTestId('table-rows')).toHaveTextContent('1');
    expect(screen.queryByTestId('value-filter-modal')).toBeNull();
  });

  it('closes the status modal without filtering', async () => {
    await renderBilling();
    fireEvent.click(screen.getByText('Status'));
    fireEvent.click(screen.getByTestId('value-filter-close'));
    expect(screen.queryByTestId('value-filter-modal')).toBeNull();
    expect(screen.getByTestId('table-rows')).toHaveTextContent('2');
  });

  it('filters created dates to a single day', async () => {
    mocks.dateRange = { start: new Date(2026, 0, 10), end: new Date(2026, 0, 10) };
    await renderBilling();
    fireEvent.click(screen.getByText('Date Created'));
    expect(screen.getByTestId('date-filter-title')).toHaveTextContent('Filter by Date Created');
    fireEvent.click(screen.getByTestId('date-filter-apply'));
    expect(screen.getByTestId('table-rows')).toHaveTextContent('1');
  });

  it('filters created dates to a range', async () => {
    mocks.dateRange = { start: new Date(2026, 0, 1), end: new Date(2026, 0, 15) };
    await renderBilling();
    fireEvent.click(screen.getByText('Date Created'));
    fireEvent.click(screen.getByTestId('date-filter-apply'));
    expect(screen.getByTestId('table-rows')).toHaveTextContent('1');
  });

  it('drops rows whose created date is unparseable', async () => {
    mocks.tenantApi.GetTenantInvoices.mockImplementation(() => settle({ data: { data: [{ id: 'a' }] } }));
    mocks.dateRange = { start: new Date(2026, 0, 1), end: new Date(2026, 0, 15) };
    await renderBilling();
    fireEvent.click(screen.getByText('Date Created'));
    fireEvent.click(screen.getByTestId('date-filter-apply'));
    expect(screen.getByTestId('table-rows')).toHaveTextContent('0');
  });

  it('filters due dates to a range', async () => {
    mocks.dateRange = { start: new Date(2026, 1, 15), end: new Date(2026, 1, 25) };
    await renderBilling();
    fireEvent.click(screen.getByText('Due Date'));
    expect(screen.getByTestId('date-filter-title')).toHaveTextContent('Filter by Due Date');
    fireEvent.click(screen.getByTestId('date-filter-apply'));
    expect(screen.getByTestId('table-rows')).toHaveTextContent('1');
  });

  it('filters due dates to a single day', async () => {
    mocks.dateRange = { start: new Date(2026, 1, 10), end: null };
    await renderBilling();
    fireEvent.click(screen.getByText('Due Date'));
    fireEvent.click(screen.getByTestId('date-filter-apply'));
    expect(screen.getByTestId('table-rows')).toHaveTextContent('1');
  });

  it('drops rows whose due date is unparseable', async () => {
    mocks.tenantApi.GetTenantInvoices.mockImplementation(() =>
      settle({ data: { data: [{ id: 'a', createdAt: '2026-02-10T12:00:00Z' }] } })
    );
    mocks.dateRange = { start: new Date(2026, 1, 10), end: null };
    await renderBilling();
    fireEvent.click(screen.getByText('Due Date'));
    fireEvent.click(screen.getByTestId('date-filter-apply'));
    expect(screen.getByTestId('table-rows')).toHaveTextContent('0');
  });

  it('clears every invoice filter at once', async () => {
    mocks.dateRange = { start: new Date(2026, 0, 10), end: new Date(2026, 0, 10) };
    await renderBilling();
    fireEvent.click(screen.getByText('Date Created'));
    fireEvent.click(screen.getByTestId('date-filter-apply'));
    fireEvent.click(screen.getByText('Clear Filters'));
    expect(screen.getByTestId('table-rows')).toHaveTextContent('2');
  });

  it('closes the date modal without filtering', async () => {
    await renderBilling();
    fireEvent.click(screen.getByText('Date Created'));
    fireEvent.click(screen.getByTestId('date-filter-close'));
    expect(screen.queryByTestId('date-filter-modal')).toBeNull();
  });

  it('opens nothing for the blank filter entry', async () => {
    await renderBilling();
    fireEvent.click(screen.getByTestId('pick-blank'));
    expect(screen.queryByTestId('value-filter-modal')).toBeNull();
    expect(screen.queryByTestId('date-filter-modal')).toBeNull();
  });
});

describe('payment filters', () => {
  const openPaymentFilters = async () => {
    await renderBilling();
    fireEvent.click(screen.getByText('Payments'));
  };

  it('narrows the table to the chosen status', async () => {
    await openPaymentFilters();
    fireEvent.click(screen.getByText('Status'));
    fireEvent.click(screen.getByTestId('apply-Failed'));
    expect(screen.getByTestId('table-rows')).toHaveTextContent('1');
  });

  it('offers only the methods present on the raw payments', async () => {
    await openPaymentFilters();
    fireEvent.click(screen.getByText('Method'));
    expect(screen.getByTestId('value-filter-label')).toHaveTextContent('Select method');
    // `gateway` is not one of the fields the option list is derived from, so
    // only the row that carries `method` contributes an entry.
    expect(screen.getByTestId('apply-Paypal')).toBeInTheDocument();
    expect(screen.queryByTestId('apply-Stripe')).toBeNull();
  });

  it('narrows the table to the chosen method', async () => {
    await openPaymentFilters();
    fireEvent.click(screen.getByText('Method'));
    fireEvent.click(screen.getByTestId('apply-Paypal'));
    expect(screen.getByTestId('table-rows')).toHaveTextContent('1');
  });

  it('clears every payment filter at once', async () => {
    await openPaymentFilters();
    fireEvent.click(screen.getByText('Status'));
    fireEvent.click(screen.getByTestId('apply-Failed'));
    fireEvent.click(screen.getByText('Clear Filters'));
    expect(screen.getByTestId('table-rows')).toHaveTextContent('2');
  });
});

describe('viewing an invoice', () => {
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

  it('opens the invoice modal from the plan card', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue(invoiceBody);
    await renderBilling();
    await act(async () => {
      fireEvent.click(screen.getByText('View invoice'));
    });
    expect(mocks.invoiceApi.GetInvoiceById).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'inv-fallback' })
    );
    expect(screen.getByTestId('invoice-id')).toHaveTextContent('INV-77');
    expect(screen.getByTestId('invoice-total')).toHaveTextContent('$1,500');
  });

  it('prices an add-on per month for a monthly invoice', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue(invoiceBody);
    await renderBilling();
    await act(async () => {
      fireEvent.click(screen.getByTestId('act-0-View Invoice'));
    });
    expect(screen.getByTestId('invoice-item-1')).toHaveTextContent('Seats|$100|2|$200');
    expect(screen.getByTestId('invoice-item-2')).toHaveTextContent('Add-on Feature|$25|2|$50');
  });

  it('prices an add-on per year for a yearly invoice', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({
      data: { ...invoiceBody.data, billingFrequency: 'Yearly' },
    });
    await renderBilling();
    await act(async () => {
      fireEvent.click(screen.getByTestId('act-0-View Invoice'));
    });
    expect(screen.getByTestId('invoice-item-2')).toHaveTextContent('Add-on Feature|$250|2|$500');
  });

  it('zeroes an add-on with no price and defaults the quantity to one', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({
      data: {
        invoiceId: 'INV-78',
        items: [{ description: 'Base', extraFeaturesWithPrice: [{}] }],
      },
    });
    await renderBilling();
    await act(async () => {
      fireEvent.click(screen.getByTestId('act-0-View Invoice'));
    });
    expect(screen.getByTestId('invoice-item-1')).toHaveTextContent('Base|$0||$0');
    expect(screen.getByTestId('invoice-item-2')).toHaveTextContent('Add-on Feature|$0|1|$0');
  });

  it('renders no line items when the invoice carries none', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({ data: { invoiceId: 'INV-79' } });
    await renderBilling();
    await act(async () => {
      fireEvent.click(screen.getByTestId('act-0-View Invoice'));
    });
    expect(screen.getByTestId('invoice-total')).toHaveTextContent('$0');
    expect(screen.queryByTestId('invoice-item-1')).toBeNull();
  });

  it('falls back to the requested id when the response body is empty', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({});
    await renderBilling();
    await act(async () => {
      fireEvent.click(screen.getByTestId('act-0-View Invoice'));
    });
    expect(screen.getByTestId('invoice-id')).toHaveTextContent('inv-1');
    expect(screen.getByTestId('invoice-due')).toHaveTextContent('—');
  });

  it('refuses to open an invoice when neither a row nor the tenant has one', async () => {
    // The plan-card button is disabled without an invoice, so the guard is only
    // reachable from a row whose own id is missing.
    mocks.tenantApi.GetSingleTenant.mockImplementation(() => settle({ data: { ...TENANT, Invoice: [] } }));
    mocks.tenantApi.GetTenantInvoices.mockImplementation(() =>
      settle({ data: { data: [{ invoiceNumber: 'INV-orphan' }] } })
    );
    await renderBilling();
    await act(async () => {
      fireEvent.click(screen.getByTestId('act-0-View Invoice'));
    });
    expect(mocks.showToast).toHaveBeenCalledWith('No invoice available', 'error');
    expect(mocks.invoiceApi.GetInvoiceById).not.toHaveBeenCalled();
  });

  it('surfaces a failed invoice load', async () => {
    mocks.invoiceApi.GetInvoiceById.mockRejectedValue(new Error('x'));
    await renderBilling();
    await act(async () => {
      fireEvent.click(screen.getByTestId('act-0-View Invoice'));
    });
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOAD_INVOICE');
    expect(screen.queryByTestId('subscription-invoice')).toBeNull();
  });

  it('closes the invoice modal from the backdrop and from the cross', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue(invoiceBody);
    await renderBilling();
    await act(async () => {
      fireEvent.click(screen.getByTestId('act-0-View Invoice'));
    });
    // Clicking the inner panel must not bubble the close through.
    fireEvent.click(screen.getByTestId('subscription-invoice').parentElement);
    expect(screen.getByTestId('subscription-invoice')).toBeInTheDocument();
    fireEvent.click(screen.getByText('✕'));
    expect(screen.queryByTestId('subscription-invoice')).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByTestId('act-0-View Invoice'));
    });
    fireEvent.click(screen.getByTestId('subscription-invoice').parentElement.parentElement);
    expect(screen.queryByTestId('subscription-invoice')).toBeNull();
  });
});

describe('viewing a payment', () => {
  const openPaymentRow = async (body) => {
    mocks.invoiceApi.GetPaymentById.mockResolvedValue(body);
    await renderBilling();
    fireEvent.click(screen.getByText('Payments'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('act-0-View Payment'));
    });
  };

  it('formats a period given as a start and stop pair', async () => {
    await openPaymentRow({
      data: {
        Plan: 'Growth',
        Period: { start: '2026-01-01T12:00:00Z', stop: '2026-02-01T12:00:00Z' },
        paymentDate: '2026-01-11T12:00:00Z',
        amount: 120,
        paymentMethod: { name: 'mastercard', code: '**** 1111' },
        invoice: { invoiceId: 'INV0042' },
      },
    });
    expect(screen.getByTestId('payment-period')).toHaveTextContent('Jan 1, 2026 - Feb 1, 2026');
    expect(screen.getByTestId('payment-ref')).toHaveTextContent('PAY00pay-1');
    expect(screen.getByTestId('payment-amount')).toHaveTextContent('$120');
    expect(screen.getByTestId('payment-card')).toHaveTextContent('**** 1111');
    expect(screen.getByTestId('payment-invoice')).toHaveTextContent('0042');
  });

  it('passes a period that is already a string straight through', async () => {
    await openPaymentRow({ data: { Period: 'Q1 2026' } });
    expect(screen.getByTestId('payment-period')).toHaveTextContent('Q1 2026');
  });

  it('substitutes placeholders for everything the payment omits', async () => {
    await openPaymentRow({});
    expect(screen.getByTestId('payment-plan')).toHaveTextContent('N/A');
    expect(screen.getByTestId('payment-period')).toHaveTextContent('N/A');
    expect(screen.getByTestId('payment-amount')).toHaveTextContent('N/A');
    expect(screen.getByTestId('payment-card')).toHaveTextContent('N/A');
    expect(screen.getByTestId('payment-invoice')).toHaveTextContent('N/A');
  });

  it('renders a brand icon for each recognised payment method', async () => {
    for (const name of ['amex', 'American Express', 'paypal', 'visa', undefined]) {
      const view = await (async () => {
        mocks.invoiceApi.GetPaymentById.mockResolvedValue({ data: { paymentMethod: { name } } });
        return renderBilling();
      })();
      fireEvent.click(screen.getByText('Payments'));
      await act(async () => {
        fireEvent.click(screen.getByTestId('act-0-View Payment'));
      });
      expect(screen.getByTestId('payment-view')).toBeInTheDocument();
      view.unmount();
    }
  });

  it('surfaces a failed payment load', async () => {
    mocks.invoiceApi.GetPaymentById.mockRejectedValue(new Error('x'));
    await renderBilling();
    fireEvent.click(screen.getByText('Payments'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('act-0-View Payment'));
    });
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOAD_PAYMENT_DETAILS');
    expect(screen.queryByTestId('payment-view')).toBeNull();
  });

  it('closes the payment view from its back button and from the backdrop', async () => {
    await openPaymentRow({ data: {} });
    fireEvent.click(screen.getByTestId('payment-back'));
    expect(screen.queryByTestId('payment-view')).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByTestId('act-0-View Payment'));
    });
    fireEvent.click(screen.getByTestId('payment-view').parentElement);
    expect(screen.getByTestId('payment-view')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('payment-view').parentElement.parentElement);
    expect(screen.queryByTestId('payment-view')).toBeNull();
  });

  it('swaps the payment view for the linked invoice', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({ data: { invoiceId: 'INV-linked' } });
    await openPaymentRow({ data: {} });
    await act(async () => {
      fireEvent.click(screen.getByTestId('payment-open-invoice'));
    });
    expect(screen.queryByTestId('payment-view')).toBeNull();
    expect(screen.getByTestId('invoice-id')).toHaveTextContent('INV-linked');
  });
});

describe('downloading an invoice', () => {
  it('rasterises the invoice and saves a pdf named after the row', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({ data: { invoiceId: 'INV-77', total: 10 } });
    await renderBilling();
    await act(async () => {
      fireEvent.click(screen.getByTestId('act-0-Download Invoice'));
    });
    await waitFor(() => expect(mocks.pdfSave).toHaveBeenCalledWith('invoice_inv-1.pdf'));
    expect(mocks.html2canvas).toHaveBeenCalledWith(expect.anything(), { scale: 2 });
    expect(mocks.pdfAddImage).toHaveBeenCalledWith(
      'data:image/png;base64,zzz',
      'PNG',
      0,
      0,
      210,
      420
    );
    // The off-screen container the handler mounted is torn down again.
    expect(document.body.querySelectorAll('div[style*="-9999px"]')).toHaveLength(0);
  });

  it('surfaces a failed download', async () => {
    mocks.invoiceApi.GetInvoiceById.mockRejectedValue(new Error('x'));
    await renderBilling();
    await act(async () => {
      fireEvent.click(screen.getByTestId('act-0-Download Invoice'));
    });
    await waitFor(() =>
      expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'DOWNLOAD_INVOICE')
    );
  });

  it('downloads straight from the invoice id the payment row carries', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({ data: { invoiceId: 'INV-77' } });
    await renderBilling();
    fireEvent.click(screen.getByText('Payments'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('act-0-Download Invoice'));
    });
    await waitFor(() => expect(mocks.pdfSave).toHaveBeenCalledWith('invoice_inv-1.pdf'));
    expect(mocks.invoiceApi.GetPaymentById).not.toHaveBeenCalled();
  });

  it('looks the invoice up when the payment row has no link to one', async () => {
    mocks.tenantApi.GetTenantPayments.mockImplementation(() =>
      settle({ data: [{ id: 'pay-9', status: 'Successful' }] })
    );
    mocks.invoiceApi.GetPaymentById.mockResolvedValue({ data: { invoice: { id: 'inv-9' } } });
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({ data: { invoiceId: 'INV-9' } });
    await renderBilling();
    fireEvent.click(screen.getByText('Payments'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('act-0-Download Invoice'));
    });
    await waitFor(() => expect(mocks.pdfSave).toHaveBeenCalledWith('invoice_inv-9.pdf'));
  });

  it('accepts a flat invoice id on the looked-up payment', async () => {
    mocks.tenantApi.GetTenantPayments.mockImplementation(() =>
      settle({ data: [{ id: 'pay-9', status: 'Successful' }] })
    );
    mocks.invoiceApi.GetPaymentById.mockResolvedValue({ data: { invoiceId: 'inv-flat' } });
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({ data: {} });
    await renderBilling();
    fireEvent.click(screen.getByText('Payments'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('act-0-Download Invoice'));
    });
    await waitFor(() => expect(mocks.pdfSave).toHaveBeenCalledWith('invoice_inv-flat.pdf'));
  });

  it('warns when the payment has no invoice at all', async () => {
    mocks.tenantApi.GetTenantPayments.mockImplementation(() =>
      settle({ data: [{ id: 'pay-9', status: 'Successful' }] })
    );
    mocks.invoiceApi.GetPaymentById.mockResolvedValue({ data: {} });
    await renderBilling();
    fireEvent.click(screen.getByText('Payments'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('act-0-Download Invoice'));
    });
    expect(mocks.showToast).toHaveBeenCalledWith('No invoice found for this payment', 'error');
    expect(mocks.pdfSave).not.toHaveBeenCalled();
  });

  it('surfaces a failed payment lookup', async () => {
    mocks.tenantApi.GetTenantPayments.mockImplementation(() =>
      settle({ data: [{ id: 'pay-9', status: 'Successful' }] })
    );
    mocks.invoiceApi.GetPaymentById.mockRejectedValue(new Error('x'));
    await renderBilling();
    fireEvent.click(screen.getByText('Payments'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('act-0-Download Invoice'));
    });
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOAD_PAYMENT_INVOICE');
  });
});

describe('fallbacks the happy path never reaches', () => {
  it('stores a null tenant when the response body is empty', async () => {
    // `tenantRes.value?.data || tenantRes.value` must land on something falsy
    // for `setTenant(d || null)` to take its right-hand arm; an empty string is
    // the only envelope that survives the property read and stays falsy.
    mocks.tenantApi.GetSingleTenant.mockImplementation(() => settle(''));
    await renderBilling();
    expect(screen.queryByText('3 out of 10 used')).toBeNull();
  });

  it('dashes the reference of a payment with no identifier of any kind', async () => {
    mocks.tenantApi.GetTenantPayments.mockImplementation(() =>
      settle({ data: [{ amount: 12, status: 'Successful' }] })
    );
    await renderBilling();
    fireEvent.click(screen.getByText('Payments'));
    expect(cell(0, 'reference')).toBe('—');
  });

  it('lists an invoice line that carries no add-on features at all', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({
      data: { invoiceId: 'INV-80', items: [{ description: 'Seats', quantity: 1, price: 10 }] },
    });
    await renderBilling();
    await act(async () => {
      fireEvent.click(screen.getByTestId('act-0-View Invoice'));
    });
    expect(screen.getByTestId('invoice-item-1')).toHaveTextContent('Seats|$0|1|$10');
    expect(screen.queryByTestId('invoice-item-2')).toBeNull();
  });

  it('zeroes a yearly add-on that has no yearly price', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({
      data: {
        invoiceId: 'INV-81',
        billingFrequency: 'Yearly',
        items: [{ description: 'Seats', quantity: 2, extraFeaturesWithPrice: [{}] }],
      },
    });
    await renderBilling();
    await act(async () => {
      fireEvent.click(screen.getByTestId('act-0-View Invoice'));
    });
    expect(screen.getByTestId('invoice-item-2')).toHaveTextContent('Add-on Feature|$0|2|$0');
  });

  it('downloads an invoice whose response has no body', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({});
    await renderBilling();
    await act(async () => {
      fireEvent.click(screen.getByTestId('act-0-Download Invoice'));
    });
    await waitFor(() => expect(mocks.pdfSave).toHaveBeenCalledWith('invoice_inv-1.pdf'));
  });
});
