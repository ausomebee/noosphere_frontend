import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

/**
 * The invoices-and-payments board: three overview cards fed by their own metric
 * requests, an invoice/payment tab pair with status sub-tabs, and the row
 * actions that open an invoice, open a payment, or render one to PDF.
 *
 * The page keeps a `loading` flag it never renders, so there is no spinner to
 * wait on -- assertions wait on the data instead. `formatNumber` abbreviates at
 * a thousand, a million and a billion and trims a trailing ".00", so the metric
 * fixtures below deliberately sit one in each tier.
 *
 * CustomTable is a probe: it prints the rows and columns it was handed and
 * offers a button per row action, which is how the view/download handlers are
 * reached. The download path dynamically imports html2canvas and jspdf -- both
 * are mocked, because an unmocked jsPDF writes a real file into the repo.
 */

const mocks = vi.hoisted(() => ({
  auth: { accessToken: 'tok', refreshToken: 'ref' },
  hasPermission: vi.fn(() => true),
  hasAnyPermission: vi.fn(() => true),
  invoiceApi: {
    GetBillingTotalMetric: vi.fn(),
    GetBillingDueMetric: vi.fn(),
    GetCountForInvoice: vi.fn(),
    GetCountForPayment: vi.fn(),
    GetInvoiceByAllAndStatus: vi.fn(),
    GetPaymentByAllAndStatus: vi.fn(),
    GetInvoiceById: vi.fn(),
    GetPaymentById: vi.fn(),
  },
  tenantApi: { GetTenantCount: vi.fn() },
  showToast: vi.fn(),
  addImage: vi.fn(),
  save: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({ default: () => mocks.auth }));
vi.mock('../hooks/usePermission', () => ({
  default: () => ({
    hasPermission: mocks.hasPermission,
    hasAnyPermission: mocks.hasAnyPermission,
  }),
}));
vi.mock('../api/InvoiceApi', () => ({ default: mocks.invoiceApi }));
vi.mock('../api/TenantApis', () => ({ default: mocks.tenantApi }));
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => mocks.showToast(...a),
  showApiError: vi.fn(),
}));

vi.mock('html2canvas', () => ({
  default: vi.fn(async () => ({
    width: 700,
    height: 990,
    toDataURL: () => 'data:image/png;base64,xxx',
  })),
}));
vi.mock('jspdf', () => ({
  jsPDF: class {
    addImage(...a) {
      mocks.addImage(...a);
    }
    save(...a) {
      mocks.save(...a);
    }
  },
}));

vi.mock('../Components/Invoice/SubscriptionInvoice', () => ({
  default: (props) => (
    <div data-testid="subscription-invoice">
      <span data-testid="invoice-id">{props.invoiceId}</span>
      <span data-testid="invoice-total">{props.total}</span>
      <span data-testid="invoice-due">{props.dueDate}</span>
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
      <span data-testid="payment-card">
        {props.paymentInfo['Payment Method'].number}
      </span>
      <span data-testid="payment-icon">{props.paymentInfo['Payment Method'].icon}</span>
      <span data-testid="payment-invoice-id">{props.paymentInfo.Invoice.id}</span>
      <span data-testid="payment-modal-open">{String(props.showInvoiceModal)}</span>
      <button data-testid="payment-back" onClick={props.onBack}>
        back
      </button>
      <button
        data-testid="payment-view-invoice"
        onClick={() => props.onViewInvoice(null, '99')}
      >
        view invoice
      </button>
      <button
        data-testid="payment-view-invoice-blank"
        onClick={() => props.onViewInvoice('')}
      >
        view invoice with no id
      </button>
    </div>
  ),
}));

vi.mock('../Components/Table/CustomTable', () => ({
  default: (props) => (
    <div data-testid="table">
      <span data-testid="table-name">{props.tableName}</span>
      <span data-testid="table-columns">
        {props.columns.map((c) => c.key).join('|')}
      </span>
      <span data-testid="table-rows">{props.data.length}</span>
      <span data-testid="table-first-row">
        {props.data[0] ? Object.values(props.data[0]).join('|') : ''}
      </span>
      <span data-testid="table-dump">
        {props.data.map((r) => Object.values(r).join('|')).join('#')}
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
          key={`bare-${action.label}`}
          data-testid={`bare-${action.label.replace(/\s+/g, '-').toLowerCase()}`}
          onClick={() => action.onClick({})}
        >
          {action.label} on a bare row
        </button>
      ))}
      <button
        data-testid="table-filter"
        onClick={() => props.onFilterChange('filter_type', 'status')}
      >
        filter
      </button>
    </div>
  ),
}));

import BillingManager from '../Pages/BillingsAndPayment/BillingManager';

// One figure per abbreviation tier so a single fixture covers every arm of
// formatNumber, including the ".00" trim on an exact million.
const totalMetric = {
  data: {
    allTime: { _sum: { total: 1_500_000_000 } },
    thisWeek: { _sum: { total: 2_000_000 } },
    thisMonth: { _sum: { total: 1500 } },
    thisYear: { _sum: { total: 999 } },
  },
};
const dueMetric = {
  data: {
    allTime: { _sum: { total: 12 } },
    thisWeek: { _sum: { total: 0 } },
    thisMonth: {},
    thisYear: { _sum: { total: 3400 } },
  },
};

const invoiceRows = {
  data: [
    {
      invoiceId: 'INV77',
      tenant: 'Acme Health',
      createdAt: '2024-01-02T00:00:00.000Z',
      dueDate: '2024-02-02T00:00:00.000Z',
      status: 'Paid',
    },
  ],
};

const paymentRows = {
  data: [
    {
      id: '42',
      invoiceId: '77',
      tenant: { companyName: 'Acme Health' },
      createdAt: '2024-01-02T00:00:00.000Z',
      amount: null,
      status: 'Successful',
    },
    {
      id: '43',
      invoiceId: '78',
      tenant: {},
      createdAt: '2024-01-03T00:00:00.000Z',
      amount: 250,
      status: 'Failed',
    },
  ],
};

const invoiceCounts = {
  data: {
    All: { _count: { _all: 9 } },
    Paid: { _count: { _all: 4 } },
    Upcoming: { _count: { _all: 3 } },
    Due: { _count: { _all: 1 } },
    Overdue: { _count: { _all: 1 } },
  },
};
const paymentCounts = {
  data: {
    All: { _count: { _all: 6 } },
    Successful: { _count: { _all: 4 } },
    InProgress: { _count: { _all: 1 } },
    Failed: { _count: { _all: 1 } },
  },
};

const resolveAll = () => {
  mocks.tenantApi.GetTenantCount.mockResolvedValue({ data: 2400 });
  mocks.invoiceApi.GetBillingTotalMetric.mockResolvedValue(totalMetric);
  mocks.invoiceApi.GetBillingDueMetric.mockResolvedValue(dueMetric);
  mocks.invoiceApi.GetCountForInvoice.mockResolvedValue(invoiceCounts);
  mocks.invoiceApi.GetCountForPayment.mockResolvedValue(paymentCounts);
  mocks.invoiceApi.GetInvoiceByAllAndStatus.mockResolvedValue(invoiceRows);
  mocks.invoiceApi.GetPaymentByAllAndStatus.mockResolvedValue(paymentRows);
  mocks.invoiceApi.GetInvoiceById.mockResolvedValue({ data: {} });
  mocks.invoiceApi.GetPaymentById.mockResolvedValue({ data: {} });
};

// Both effects settle without ever touching the DOM, so wait on the counts the
// second one writes rather than on a spinner the page does not render.
const renderPage = async () => {
  const view = render(<BillingManager />);
  await waitFor(() => expect(mocks.invoiceApi.GetCountForInvoice).toHaveBeenCalled());
  await waitFor(() => expect(screen.getByTestId('table-rows')).toBeInTheDocument());
  return view;
};

// The table probe also prints the tab name, so the tab itself is addressed by
// role rather than by text.
const tabButton = (name) => screen.getByRole('button', { name });

const overviewSelects = () =>
  Array.from(document.body.querySelectorAll('.overview-select-input'));

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mocks.auth = { accessToken: 'tok', refreshToken: 'ref' };
  mocks.hasPermission.mockReturnValue(true);
  mocks.hasAnyPermission.mockReturnValue(true);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  resolveAll();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('permissions', () => {
  it('replaces the page when neither invoices nor payments may be seen', () => {
    mocks.hasAnyPermission.mockReturnValue(false);
    render(<BillingManager />);
    expect(screen.getByText("You don't have permission to view this.")).toBeInTheDocument();
    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
  });

  it('offers only the tab the user is allowed', async () => {
    mocks.hasPermission.mockImplementation((key) => key === 'view_payments');
    await renderPage();
    const tabs = Array.from(document.body.querySelectorAll('.invoice-tab'));
    expect(tabs.map((t) => t.textContent)).toEqual(['Payments']);
  });
});

describe('the overview cards', () => {
  it('abbreviates each metric tier and trims a whole million', async () => {
    await renderPage();
    expect(screen.getByText('2.40k')).toBeInTheDocument();
    expect(screen.getByText('$1.50b')).toBeInTheDocument();

    const [totalSelect, dueSelect] = overviewSelects();
    fireEvent.change(totalSelect, { target: { value: 'this_week' } });
    expect(screen.getByText('$2m')).toBeInTheDocument();
    fireEvent.change(totalSelect, { target: { value: 'this_month' } });
    expect(screen.getByText('$1.50k')).toBeInTheDocument();
    fireEvent.change(totalSelect, { target: { value: 'this_year' } });
    expect(screen.getByText('$999')).toBeInTheDocument();

    // The due card has no currency prefix and a missing _sum falls back to zero.
    fireEvent.change(dueSelect, { target: { value: 'this_month' } });
    expect(screen.getByText('0')).toBeInTheDocument();
    fireEvent.change(dueSelect, { target: { value: 'this_year' } });
    expect(screen.getByText('3.40k')).toBeInTheDocument();
  });

  it('zeroes every metric when the requests reject', async () => {
    mocks.tenantApi.GetTenantCount.mockRejectedValue(new Error('down'));
    mocks.invoiceApi.GetBillingTotalMetric.mockRejectedValue(new Error('down'));
    mocks.invoiceApi.GetBillingDueMetric.mockRejectedValue(new Error('down'));
    await renderPage();
    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('treats a missing tenant count as zero', async () => {
    mocks.tenantApi.GetTenantCount.mockResolvedValue({});
    await renderPage();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('treats a metric response with no periods as zero', async () => {
    mocks.invoiceApi.GetBillingTotalMetric.mockResolvedValue({ data: {} });
    mocks.invoiceApi.GetBillingDueMetric.mockResolvedValue({ data: {} });
    await renderPage();
    const [totalSelect, dueSelect] = overviewSelects();
    for (const period of ['this_week', 'this_month', 'this_year']) {
      fireEvent.change(totalSelect, { target: { value: period } });
      expect(screen.getByText('$0')).toBeInTheDocument();
      fireEvent.change(dueSelect, { target: { value: period } });
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    }
  });

  it('survives a metrics request that throws before it returns a promise', async () => {
    mocks.tenantApi.GetTenantCount.mockImplementation(() => {
      throw new Error('sync boom');
    });
    await renderPage();
    // The whole metrics block is abandoned, so the cards keep their defaults.
    expect(screen.getAllByText('$0').length).toBeGreaterThan(0);
    expect(console.error).toHaveBeenCalled();
  });

  it('keeps that metrics failure out of the console outside development', async () => {
    vi.stubEnv('DEV', false);
    mocks.tenantApi.GetTenantCount.mockImplementation(() => {
      throw new Error('sync boom');
    });
    await renderPage();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('only queries the custom range once both dates are set', async () => {
    await renderPage();
    const [totalSelect] = overviewSelects();
    fireEvent.change(totalSelect, { target: { value: 'custom' } });
    const inputs = document.body.querySelectorAll('.date-filter-input-small');

    fireEvent.change(inputs[0], { target: { value: '2024-01-01' } });
    // One end of the range is not enough to fire the custom request.
    expect(mocks.invoiceApi.GetBillingTotalMetric).toHaveBeenCalledTimes(1);

    mocks.invoiceApi.GetBillingTotalMetric.mockResolvedValue({
      data: { _sum: { total: 4200 } },
    });
    fireEvent.change(inputs[1], { target: { value: '2024-01-31' } });
    await waitFor(() =>
      expect(mocks.invoiceApi.GetBillingTotalMetric).toHaveBeenCalledWith(
        expect.objectContaining({ from: '2024-01-01', to: '2024-01-31' })
      )
    );
    expect(await screen.findByText('$4.20k')).toBeInTheDocument();
  });

  it('zeroes a custom total whose request rejects', async () => {
    await renderPage();
    const [totalSelect] = overviewSelects();
    fireEvent.change(totalSelect, { target: { value: 'custom' } });
    const inputs = document.body.querySelectorAll('.date-filter-input-small');
    mocks.invoiceApi.GetBillingTotalMetric.mockRejectedValue(new Error('down'));
    fireEvent.change(inputs[0], { target: { value: '2024-01-01' } });
    fireEvent.change(inputs[1], { target: { value: '2024-01-31' } });
    await waitFor(() =>
      expect(mocks.invoiceApi.GetBillingTotalMetric).toHaveBeenCalledWith(
        expect.objectContaining({ from: '2024-01-01' })
      )
    );
    expect(screen.getByText('$0')).toBeInTheDocument();
  });

  it('zeroes a custom range the backend answers with no sum', async () => {
    await renderPage();
    const [totalSelect, dueSelect] = overviewSelects();
    fireEvent.change(totalSelect, { target: { value: 'custom' } });
    fireEvent.change(dueSelect, { target: { value: 'custom' } });
    mocks.invoiceApi.GetBillingTotalMetric.mockResolvedValue({ data: {} });
    mocks.invoiceApi.GetBillingDueMetric.mockResolvedValue({ data: {} });
    const inputs = document.body.querySelectorAll('.date-filter-input-small');
    // Both cards are on a custom range, so both custom requests go out.
    fireEvent.change(inputs[0], { target: { value: '2024-01-01' } });
    fireEvent.change(inputs[1], { target: { value: '2024-01-31' } });
    fireEvent.change(inputs[2], { target: { value: '2024-02-01' } });
    fireEvent.change(inputs[3], { target: { value: '2024-02-28' } });
    await waitFor(() =>
      expect(mocks.invoiceApi.GetBillingDueMetric).toHaveBeenCalledWith(
        expect.objectContaining({ from: '2024-02-01' })
      )
    );
    expect(screen.getByText('$0')).toBeInTheDocument();
  });

  it('abandons the custom range when a request throws outright', async () => {
    await renderPage();
    const [totalSelect] = overviewSelects();
    fireEvent.change(totalSelect, { target: { value: 'custom' } });
    const inputs = document.body.querySelectorAll('.date-filter-input-small');
    mocks.invoiceApi.GetBillingTotalMetric.mockImplementation(() => {
      throw new Error('sync boom');
    });
    fireEvent.change(inputs[0], { target: { value: '2024-01-01' } });
    fireEvent.change(inputs[1], { target: { value: '2024-01-31' } });
    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(screen.getByText('$0')).toBeInTheDocument();
  });

  it('zeroes the custom figure when its request rejects', async () => {
    await renderPage();
    const [, dueSelect] = overviewSelects();
    fireEvent.change(dueSelect, { target: { value: 'custom' } });
    const inputs = document.body.querySelectorAll('.date-filter-input-small');
    mocks.invoiceApi.GetBillingDueMetric.mockRejectedValue(new Error('down'));
    fireEvent.change(inputs[0], { target: { value: '2024-01-01' } });
    fireEvent.change(inputs[1], { target: { value: '2024-01-31' } });
    await waitFor(() =>
      expect(mocks.invoiceApi.GetBillingDueMetric).toHaveBeenCalledWith(
        expect.objectContaining({ from: '2024-01-01', to: '2024-01-31' })
      )
    );
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });
});

describe('the invoice tab', () => {
  it('maps invoice rows and shows the status column on the All sub-tab', async () => {
    await renderPage();
    expect(screen.getByTestId('table-name').textContent).toBe('Invoices');
    expect(screen.getByTestId('table-columns').textContent).toBe(
      'invoice_id|tenant|date_created|due_date|status'
    );
    expect(screen.getByTestId('table-first-row').textContent).toContain('INV77');
    expect(screen.getByTestId('table-first-row').textContent).toContain('Acme Health');
  });

  it('carries the sub-tab through to the request and drops the status column', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('Overdue'));
    await waitFor(() =>
      expect(mocks.invoiceApi.GetInvoiceByAllAndStatus).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'Overdue' })
      )
    );
    expect(screen.getByTestId('table-columns').textContent).toBe(
      'invoice_id|tenant|date_created|due_date'
    );
  });

  it('shows each sub-tab count', async () => {
    await renderPage();
    expect(screen.getByText('Paid').parentElement.textContent).toContain('4');
    expect(screen.getByText('Due/Unpaid').parentElement.textContent).toContain('1');
  });

  it('falls back to zeroes when the counts reject', async () => {
    mocks.invoiceApi.GetCountForInvoice.mockRejectedValue(new Error('down'));
    await renderPage();
    expect(screen.getByText('Paid').parentElement.textContent).toContain('0');
  });

  it('falls back to zeroes when the counts come back empty', async () => {
    mocks.invoiceApi.GetCountForInvoice.mockResolvedValue({ data: {} });
    await renderPage();
    expect(screen.getByText('Upcoming').parentElement.textContent).toContain('0');
  });

  it('renders an empty table when the invoice list rejects', async () => {
    mocks.invoiceApi.GetInvoiceByAllAndStatus.mockRejectedValue(new Error('down'));
    await renderPage();
    expect(screen.getByTestId('table-rows').textContent).toBe('0');
  });

  it('shows an empty table when the invoice response carries no data', async () => {
    mocks.invoiceApi.GetInvoiceByAllAndStatus.mockResolvedValue({});
    await renderPage();
    expect(screen.getByTestId('table-rows').textContent).toBe('0');
  });

  it('keeps a failed list fetch out of the console outside development', async () => {
    vi.stubEnv('DEV', false);
    mocks.invoiceApi.GetInvoiceByAllAndStatus.mockRejectedValue(new Error('down'));
    await renderPage();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('resets the sub-tab when the table reports a filter change', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('Overdue'));
    await waitFor(() =>
      expect(mocks.invoiceApi.GetInvoiceByAllAndStatus).toHaveBeenCalledTimes(2)
    );
    fireEvent.click(screen.getByTestId('table-filter'));
    await waitFor(() =>
      expect(mocks.invoiceApi.GetInvoiceByAllAndStatus).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'all' })
      )
    );
  });
});

describe('the payment tab', () => {
  const openPayments = async () => {
    await renderPage();
    fireEvent.click(tabButton('Payments'));
    await waitFor(() =>
      expect(mocks.invoiceApi.GetPaymentByAllAndStatus).toHaveBeenCalled()
    );
  };

  it('maps payment rows, prefixing both ids', async () => {
    await openPayments();
    expect(screen.getByTestId('table-name').textContent).toBe('Payments');
    const row = screen.getByTestId('table-first-row').textContent;
    expect(row).toContain('PAY0042');
    expect(row).toContain('invoice_77');
    // A null amount formats as $0 rather than NaN.
    expect(row).toContain('$0');
  });

  it('leaves the tenant cell empty when the company name is missing', async () => {
    await openPayments();
    const [, second] = screen.getByTestId('table-dump').textContent.split('#');
    expect(second).toBe('PAY0043|invoice_78||1/3/2024|$250|Failed|true');
  });

  it('filters the rows client-side on a status sub-tab', async () => {
    await openPayments();
    fireEvent.click(screen.getByText('Failed'));
    await waitFor(() =>
      expect(mocks.invoiceApi.GetPaymentByAllAndStatus).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'Failed' })
      )
    );
    expect(screen.getByTestId('table-rows').textContent).toBe('1');
    expect(screen.getByTestId('table-first-row').textContent).toContain('PAY0043');
  });

  it('passes an unmapped sub-tab key straight through', async () => {
    await openPayments();
    fireEvent.click(screen.getByText('Payment in Progress'));
    await waitFor(() =>
      expect(mocks.invoiceApi.GetPaymentByAllAndStatus).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'InProgress' })
      )
    );
  });

  it('shows an empty table when the payment response carries no data', async () => {
    mocks.invoiceApi.GetPaymentByAllAndStatus.mockResolvedValue({});
    await openPayments();
    expect(screen.getByTestId('table-rows').textContent).toBe('0');
  });

  it('formats a payment with no amount field at all as zero', async () => {
    mocks.invoiceApi.GetPaymentByAllAndStatus.mockResolvedValue({
      data: [{ id: '44', invoiceId: '79', status: 'Successful' }],
    });
    await openPayments();
    expect(screen.getByTestId('table-first-row').textContent).toContain('$0');
  });

  it('falls back to zeroes when the payment counts come back empty', async () => {
    mocks.invoiceApi.GetCountForPayment.mockResolvedValue({ data: {} });
    await openPayments();
    expect(screen.getByText('Successful').parentElement.textContent).toContain('0');
    expect(screen.getByText('Payment in Progress').parentElement.textContent).toContain('0');
  });

  it('returns to the All sub-tab from the payments side too', async () => {
    await openPayments();
    fireEvent.click(screen.getByText('Failed'));
    await waitFor(() =>
      expect(mocks.invoiceApi.GetPaymentByAllAndStatus).toHaveBeenCalledTimes(2)
    );
    fireEvent.click(screen.getByTestId('table-filter'));
    await waitFor(() =>
      expect(mocks.invoiceApi.GetPaymentByAllAndStatus).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'all' })
      )
    );
  });

  it('renders an empty table when the payment list rejects', async () => {
    mocks.invoiceApi.GetPaymentByAllAndStatus.mockRejectedValue(new Error('down'));
    await openPayments();
    expect(screen.getByTestId('table-rows').textContent).toBe('0');
  });

  it('falls back to zeroes when the payment counts reject', async () => {
    mocks.invoiceApi.GetCountForPayment.mockRejectedValue(new Error('down'));
    await openPayments();
    expect(screen.getByText('Successful').parentElement.textContent).toContain('0');
  });
});

describe('viewing an invoice', () => {
  it('builds the invoice, including per-item add-on rows', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({
      data: {
        invoiceId: 'INV77',
        dueDate: '2024-02-02T00:00:00.000Z',
        billingFrequency: 'Monthly',
        total: 1200,
        items: [
          {
            description: 'Plan',
            rate: { price: 100 },
            quantity: 2,
            price: 200,
            extraFeaturesWithPrice: [
              { pricePerMonth: { price: 50 }, pricePerYear: { price: 500 } },
            ],
          },
        ],
      },
    });
    await renderPage();
    fireEvent.click(screen.getByTestId('action-view-invoice'));

    await waitFor(() =>
      expect(screen.getByTestId('subscription-invoice')).toBeInTheDocument()
    );
    expect(mocks.invoiceApi.GetInvoiceById).toHaveBeenCalledWith(
      expect.objectContaining({ id: '77' })
    );
    expect(screen.getByTestId('invoice-total').textContent).toBe('$1.20k');
    // Row two is the add-on, priced monthly at the item's quantity.
    expect(screen.getByTestId('invoice-items').textContent).toBe(
      '1:Plan:$100:2:$200|2:Add-on Feature:$50:2:$100'
    );
  });

  it('prices an add-on yearly when the invoice is billed yearly', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({
      data: {
        billingFrequency: 'Yearly',
        items: [
          {
            description: 'Plan',
            extraFeaturesWithPrice: [{ pricePerYear: { price: 500 } }],
          },
        ],
      },
    });
    await renderPage();
    fireEvent.click(screen.getByTestId('action-view-invoice'));
    await waitFor(() =>
      expect(screen.getByTestId('subscription-invoice')).toBeInTheDocument()
    );
    // No quantity on the item, so the add-on falls back to one.
    expect(screen.getByTestId('invoice-items').textContent).toContain(
      '2:Add-on Feature:$500:1:$500'
    );
  });

  it('falls back through every empty field of an invoice', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({});
    await renderPage();
    fireEvent.click(screen.getByTestId('action-view-invoice'));
    await waitFor(() =>
      expect(screen.getByTestId('subscription-invoice')).toBeInTheDocument()
    );
    // With no invoiceId in the response the extracted row id stands in.
    expect(screen.getByTestId('invoice-id').textContent).toBe('77');
    expect(screen.getByTestId('invoice-total').textContent).toBe('$0');
    expect(screen.getByTestId('invoice-items').textContent).toBe('');
    expect(screen.getByTestId('invoice-due').textContent).toBe('N/A');
  });

  it('leaves an item with no add-ons as a single row, priced from nothing', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({
      data: {
        billingFrequency: 'Monthly',
        items: [
          { description: 'Plan' },
          { description: 'Add-on parent', extraFeaturesWithPrice: [{}] },
        ],
      },
    });
    await renderPage();
    fireEvent.click(screen.getByTestId('action-view-invoice'));
    await waitFor(() =>
      expect(screen.getByTestId('subscription-invoice')).toBeInTheDocument()
    );
    // Row one has no add-ons; row three is an add-on with no monthly price.
    expect(screen.getByTestId('invoice-items').textContent).toBe(
      '1:Plan:$0:undefined:$0|2:Add-on parent:$0:undefined:$0|3:Add-on Feature:$0:1:$0'
    );
  });

  it('prices a yearly add-on that carries no yearly figure', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({
      data: {
        billingFrequency: 'Yearly',
        items: [{ description: 'Plan', extraFeaturesWithPrice: [{}] }],
      },
    });
    await renderPage();
    fireEvent.click(screen.getByTestId('action-view-invoice'));
    await waitFor(() =>
      expect(screen.getByTestId('subscription-invoice')).toBeInTheDocument()
    );
    expect(screen.getByTestId('invoice-items').textContent).toContain(
      '2:Add-on Feature:$0:1:$0'
    );
  });

  it('downloads an invoice for a row that carries no invoice id', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({});
    await renderPage();
    fireEvent.click(screen.getByTestId('bare-download-invoice'));
    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith('invoice_undefined.pdf')
    );
  });

  it('keeps a failed invoice fetch out of the console outside development', async () => {
    vi.stubEnv('DEV', false);
    mocks.invoiceApi.GetInvoiceById.mockRejectedValue(new Error('gone'));
    await renderPage();
    fireEvent.click(screen.getByTestId('action-view-invoice'));
    await waitFor(() => expect(mocks.invoiceApi.GetInvoiceById).toHaveBeenCalled());
    expect(console.error).not.toHaveBeenCalled();
  });

  it('closes from the backdrop and from the button', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('action-view-invoice'));
    await waitFor(() =>
      expect(screen.getByTestId('subscription-invoice')).toBeInTheDocument()
    );

    // Clicking the panel itself must not close the modal.
    fireEvent.click(screen.getByTestId('subscription-invoice').parentElement);
    expect(screen.getByTestId('subscription-invoice')).toBeInTheDocument();

    fireEvent.click(screen.getByText('✕'));
    expect(screen.queryByTestId('subscription-invoice')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('action-view-invoice'));
    await waitFor(() =>
      expect(screen.getByTestId('subscription-invoice')).toBeInTheDocument()
    );
    fireEvent.click(
      screen.getByTestId('subscription-invoice').parentElement.parentElement
    );
    expect(screen.queryByTestId('subscription-invoice')).not.toBeInTheDocument();
  });

  it('leaves the modal shut when the invoice request rejects', async () => {
    mocks.invoiceApi.GetInvoiceById.mockRejectedValue(new Error('gone'));
    await renderPage();
    fireEvent.click(screen.getByTestId('action-view-invoice'));
    await waitFor(() => expect(mocks.invoiceApi.GetInvoiceById).toHaveBeenCalled());
    expect(screen.queryByTestId('subscription-invoice')).not.toBeInTheDocument();
  });
});

describe('viewing a payment', () => {
  const openPaymentView = async () => {
    const view = await renderPage();
    fireEvent.click(tabButton('Payments'));
    await waitFor(() =>
      expect(mocks.invoiceApi.GetPaymentByAllAndStatus).toHaveBeenCalled()
    );
    fireEvent.click(screen.getByTestId('action-view-payment'));
    await waitFor(() => expect(screen.getByTestId('payment-view')).toBeInTheDocument());
    return view;
  };

  it('renders a fully populated payment', async () => {
    mocks.invoiceApi.GetPaymentById.mockResolvedValue({
      data: {
        Plan: 'Pro',
        Period: { start: '2024-01-01T00:00:00.000Z', stop: '2024-01-31T00:00:00.000Z' },
        paymentDate: '2024-01-05T00:00:00.000Z',
        amount: 4500,
        paymentMethod: { name: 'mastercard', code: '4242' },
        invoice: { invoiceId: 'INV77' },
      },
    });
    await openPaymentView();
    expect(screen.getByTestId('payment-plan').textContent).toBe('Pro');
    expect(screen.getByTestId('payment-period').textContent).toBe('1/1/2024 - 1/31/2024');
    expect(screen.getByTestId('payment-id').textContent).toBe('PAY0042');
    expect(screen.getByTestId('payment-amount').textContent).toBe('$4.50k');
    expect(screen.getByTestId('payment-card').textContent).toBe('4242');
    expect(screen.getByTestId('payment-invoice-id').textContent).toBe('77');
  });

  it('falls back to N/A on an empty payment', async () => {
    await openPaymentView();
    expect(screen.getByTestId('payment-plan').textContent).toBe('N/A');
    expect(screen.getByTestId('payment-period').textContent).toBe('N/A');
    expect(screen.getByTestId('payment-card').textContent).toBe('N/A');
    expect(screen.getByTestId('payment-invoice-id').textContent).toBe('N/A');
  });

  it('keeps a period that is already a string', async () => {
    mocks.invoiceApi.GetPaymentById.mockResolvedValue({
      data: { Period: 'Jan 2024' },
    });
    await openPaymentView();
    expect(screen.getByTestId('payment-period').textContent).toBe('Jan 2024');
  });

  it('picks a brand mark per payment method and falls back to Visa', async () => {
    // The icons carry no accessible name, so they are told apart by their path
    // data. Each brand needs its own mount, hence the explicit unmount.
    const marks = {};
    for (const name of ['amex', 'american express', 'mastercard', 'paypal', 'discover', '']) {
      mocks.invoiceApi.GetPaymentById.mockResolvedValue({
        data: { paymentMethod: { name } },
      });
      const view = await openPaymentView();
      marks[name] = screen
        .getByTestId('payment-icon')
        .querySelector('path')
        .getAttribute('d');
      view.unmount();
    }
    expect(marks.amex).toBe(marks['american express']);
    // Anything unrecognised, an empty name included, lands on the Visa mark.
    expect(marks.discover).toBe(marks['']);
    expect(
      new Set([marks.amex, marks.mastercard, marks.paypal, marks.discover]).size
    ).toBe(4);
  });

  it('goes back to the table', async () => {
    await openPaymentView();
    fireEvent.click(screen.getByTestId('payment-back'));
    expect(screen.queryByTestId('payment-view')).not.toBeInTheDocument();
    expect(screen.getByTestId('table')).toBeInTheDocument();
  });

  it('asks for an invoice the payment view could not name', async () => {
    await openPaymentView();
    fireEvent.click(screen.getByTestId('payment-view-invoice-blank'));
    await waitFor(() =>
      expect(mocks.invoiceApi.GetInvoiceById).toHaveBeenCalledWith(
        expect.objectContaining({ id: '' })
      )
    );
    expect(screen.getByTestId('payment-modal-open').textContent).toBe('true');
  });

  it('opens an invoice from inside the payment view by explicit id', async () => {
    await openPaymentView();
    fireEvent.click(screen.getByTestId('payment-view-invoice'));
    await waitFor(() =>
      expect(mocks.invoiceApi.GetInvoiceById).toHaveBeenCalledWith(
        expect.objectContaining({ id: '99' })
      )
    );
    expect(screen.getByTestId('payment-modal-open').textContent).toBe('true');
  });

  it('copes with a payment response that has no data at all', async () => {
    mocks.invoiceApi.GetPaymentById.mockResolvedValue({});
    await openPaymentView();
    expect(screen.getByTestId('payment-plan').textContent).toBe('N/A');
  });

  it('looks up a payment for a row that carries no payment id', async () => {
    await renderPage();
    fireEvent.click(tabButton('Payments'));
    await waitFor(() =>
      expect(mocks.invoiceApi.GetPaymentByAllAndStatus).toHaveBeenCalled()
    );
    fireEvent.click(screen.getByTestId('bare-view-payment'));
    await waitFor(() => expect(screen.getByTestId('payment-view')).toBeInTheDocument());
    expect(mocks.invoiceApi.GetPaymentById).toHaveBeenCalledWith(
      expect.objectContaining({ id: undefined })
    );
  });

  it('keeps a failed payment fetch out of the console outside development', async () => {
    vi.stubEnv('DEV', false);
    mocks.invoiceApi.GetPaymentById.mockRejectedValue(new Error('gone'));
    await renderPage();
    fireEvent.click(tabButton('Payments'));
    await waitFor(() =>
      expect(mocks.invoiceApi.GetPaymentByAllAndStatus).toHaveBeenCalled()
    );
    fireEvent.click(screen.getByTestId('action-view-payment'));
    await waitFor(() => expect(mocks.invoiceApi.GetPaymentById).toHaveBeenCalled());
    expect(console.error).not.toHaveBeenCalled();
  });

  it('stays on the table when the payment request rejects', async () => {
    mocks.invoiceApi.GetPaymentById.mockRejectedValue(new Error('gone'));
    await renderPage();
    fireEvent.click(tabButton('Payments'));
    await waitFor(() =>
      expect(mocks.invoiceApi.GetPaymentByAllAndStatus).toHaveBeenCalled()
    );
    fireEvent.click(screen.getByTestId('action-view-payment'));
    await waitFor(() => expect(mocks.invoiceApi.GetPaymentById).toHaveBeenCalled());
    expect(screen.queryByTestId('payment-view')).not.toBeInTheDocument();
  });
});

describe('downloading an invoice', () => {
  it('renders the invoice off-screen and saves a PDF', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({
      data: { invoiceId: 'INV77', total: 500, items: [] },
    });
    await renderPage();
    fireEvent.click(screen.getByTestId('action-download-invoice'));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith('invoice_77.pdf'));
    expect(mocks.addImage).toHaveBeenCalled();
    // The off-screen container is torn down again.
    expect(document.body.querySelectorAll('div[style*="-9999px"]')).toHaveLength(0);
  });

  it('names the file from the row when the invoice response is empty', async () => {
    mocks.invoiceApi.GetInvoiceById.mockResolvedValue({});
    await renderPage();
    fireEvent.click(screen.getByTestId('action-download-invoice'));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith('invoice_77.pdf'));
    // The rendered document falls back to the row id and a zero total.
    expect(mocks.addImage).toHaveBeenCalled();
  });

  it('warns when the PDF cannot be produced', async () => {
    mocks.invoiceApi.GetInvoiceById.mockRejectedValue(new Error('gone'));
    await renderPage();
    fireEvent.click(screen.getByTestId('action-download-invoice'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith(
        'Failed to download invoice. Please try again.',
        'error'
      )
    );
  });

  it('stays silent in the console outside development', async () => {
    vi.stubEnv('DEV', false);
    mocks.invoiceApi.GetInvoiceById.mockRejectedValue(new Error('gone'));
    await renderPage();
    fireEvent.click(screen.getByTestId('action-download-invoice'));
    await waitFor(() => expect(mocks.showToast).toHaveBeenCalled());
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe('the custom-range failure outside development', () => {
  it('keeps a custom-range crash out of the production console', async () => {
    vi.stubEnv('DEV', false);
    await renderPage();
    const [totalSelect] = overviewSelects();
    fireEvent.change(totalSelect, { target: { value: 'custom' } });
    const inputs = document.body.querySelectorAll('.date-filter-input-small');
    // A synchronous throw escapes the per-promise catch and lands in the
    // block's own catch, which is where the dev-only log sits.
    mocks.invoiceApi.GetBillingTotalMetric.mockImplementation(() => {
      throw new Error('sync boom');
    });
    fireEvent.change(inputs[0], { target: { value: '2024-01-01' } });
    fireEvent.change(inputs[1], { target: { value: '2024-01-31' } });
    await waitFor(() => expect(screen.getByText('$0')).toBeInTheDocument());
    expect(console.error).not.toHaveBeenCalled();
  });
});
