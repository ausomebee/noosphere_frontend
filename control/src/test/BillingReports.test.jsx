import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

/**
 * The billing reports index: a list of four logs, each of which swaps the page
 * for one table fed by its own endpoint and its own row mapper.
 *
 * Almost all of the branching lives in those mappers, which reconcile two
 * shapes of the same record -- the documented one and the one the backend
 * actually sends -- through chains of `||` and `??`. The fixtures below
 * therefore come in pairs: one row in the shape the mapper prefers, one
 * stripped down to whatever it has to fall back on.
 *
 * CustomTable is a probe that prints its rows as JSON, which is the only way to
 * see a mapped row without also testing the table.
 */

const mocks = vi.hoisted(() => ({
  auth: { accessToken: 'tok', refreshToken: 'ref' },
  hasPermission: vi.fn(() => true),
  api: {
    GetReportPayments: vi.fn(),
    GetReportInvoices: vi.fn(),
    GetDeactivationLogs: vi.fn(),
    GetActivationLogs: vi.fn(),
  },
  showApiError: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({ default: () => mocks.auth }));
vi.mock('../hooks/usePermission', () => ({
  default: () => ({ hasPermission: mocks.hasPermission }),
}));
vi.mock('../api/InvoiceApi', () => ({ default: mocks.api }));
vi.mock('../Helper/ShowToast', () => ({
  showToast: vi.fn(),
  showApiError: (...a) => mocks.showApiError(...a),
}));

vi.mock('../Components/Table/CustomTable', () => ({
  default: (props) => (
    <div data-testid="table">
      <span data-testid="table-name">{props.tableName}</span>
      <span data-testid="table-columns">{props.columns.map((c) => c.key).join('|')}</span>
      <span data-testid="table-loading">{String(props.loading)}</span>
      <span data-testid="table-actions">
        {props.actions ? props.actions.map((a) => a.label).join('|') : 'none'}
      </span>
      <span data-testid="table-dump">{JSON.stringify(props.data)}</span>
    </div>
  ),
}));

import BillingReports from '../Pages/BillingsAndPayment/BillingReports';

const rows = () => JSON.parse(screen.getByTestId('table-dump').textContent);

const openReport = async (title) => {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(title) }));
  await waitFor(() => expect(screen.getByTestId('table-loading').textContent).toBe('false'));
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth = { accessToken: 'tok', refreshToken: 'ref' };
  mocks.hasPermission.mockReturnValue(true);
  Object.values(mocks.api).forEach((fn) => fn.mockResolvedValue({ data: [] }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('permissions', () => {
  it('replaces the page when the reports may not be viewed', () => {
    mocks.hasPermission.mockReturnValue(false);
    render(<BillingReports />);
    expect(screen.getByText("You don't have permission to view this.")).toBeInTheDocument();
    expect(screen.queryByText('Payment Activity Log')).not.toBeInTheDocument();
  });
});

describe('the report index', () => {
  it('lists every report behind its own button', () => {
    render(<BillingReports />);
    expect(
      Array.from(document.body.querySelectorAll('.billing-reports-button')).map(
        (b) => b.textContent
      )
    ).toEqual([
      'Payment Activity Log',
      'Invoice Activity Log',
      'Account Suspension Log',
      'Account Reactivation Log',
    ]);
    expect(screen.getByText('Billing & Payment')).toBeInTheDocument();
    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
  });

  it('swaps the header for a breadcrumb and comes back again', async () => {
    render(<BillingReports />);
    await openReport('Payment Activity Log');
    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(screen.queryByText('Billing & Payment')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Go back'));
    expect(screen.getByText('Billing & Payment')).toBeInTheDocument();
    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
  });
});

describe('the payment activity log', () => {
  it('prefers the record id and the tenant company name', async () => {
    mocks.api.GetReportPayments.mockResolvedValue({
      data: [
        {
          id: '42',
          invoiceId: '77',
          tenant: { companyName: 'Acme Health' },
          attemptNo: 2,
          createdAt: '2024-01-02T09:30:00.000Z',
          amount: 5000,
          status: 'Failed',
        },
      ],
    });
    render(<BillingReports />);
    await openReport('Payment Activity Log');

    expect(mocks.api.GetReportPayments).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'tok', refreshToken: 'ref' })
    );
    expect(screen.getByTestId('table-name').textContent).toBe('Payment Activity Log');
    expect(screen.getByTestId('table-actions').textContent).toBe('none');
    const [row] = rows();
    expect(row).toEqual(
      expect.objectContaining({
        payment_id: 'PAY42',
        invoice_id: 'INV77',
        tenant: 'Acme Health',
        attempt: 2,
        amount: '$5,000',
        status: 'Failed',
        hasCheckbox: false,
        hasActions: false,
      })
    );
    expect(row.day_time.date).toBe('1/2/2024');
    expect(row.date_created).toBe('1/2/2024');
  });

  it('falls back through every alternative spelling of a payment', async () => {
    mocks.api.GetReportPayments.mockResolvedValue({
      data: [
        { paymentId: 'PAY001', tenantId: 't1', attempt: 5, amount: null },
        {},
      ],
    });
    render(<BillingReports />);
    await openReport('Payment Activity Log');

    const [documented, empty] = rows();
    expect(documented).toEqual(
      expect.objectContaining({
        payment_id: 'PAY001',
        invoice_id: 'N/A',
        tenant: 't1',
        attempt: 5,
        amount: 'N/A',
        status: 'N/A',
      })
    );
    expect(empty.payment_id).toBe('N/A');
    expect(empty.attempt).toBe('N/A');
    // No timestamp at all still renders a cell rather than crashing.
    expect(empty.day_time.date).toBe('N/A');
  });

  it('shows an empty table when the response carries no data', async () => {
    mocks.api.GetReportPayments.mockResolvedValue({});
    render(<BillingReports />);
    await openReport('Payment Activity Log');
    expect(rows()).toEqual([]);
  });
});

describe('the invoice activity log', () => {
  it('prefixes the record id and prefers the total over the amount', async () => {
    mocks.api.GetReportInvoices.mockResolvedValue({
      data: [
        {
          id: '77',
          tenant: { companyName: 'Acme Health' },
          createdAt: '2024-01-02T09:30:00.000Z',
          dueDate: '2024-02-02T00:00:00.000Z',
          total: 1200,
          amount: 99,
          status: 'Paid',
        },
      ],
    });
    render(<BillingReports />);
    await openReport('Invoice Activity Log');

    expect(screen.getByTestId('table-columns').textContent).toBe(
      'invoice_id|tenant|day_time|due_date|amount|status'
    );
    const [row] = rows();
    expect(row).toEqual(
      expect.objectContaining({
        invoice_id: 'INV77',
        tenant: 'Acme Health',
        due_date: '2/2/2024',
        amount: '$1,200',
        status: 'Paid',
        hasCheckbox: false,
      })
    );
  });

  it('falls back to the documented spelling and to the amount', async () => {
    mocks.api.GetReportInvoices.mockResolvedValue({
      data: [{ invoiceId: 'Invoice_32408', tenantId: 't2', amount: 500 }, {}],
    });
    render(<BillingReports />);
    await openReport('Invoice Activity Log');

    const [documented, empty] = rows();
    expect(documented).toEqual(
      expect.objectContaining({
        invoice_id: 'Invoice_32408',
        tenant: 't2',
        amount: '$500',
        status: 'N/A',
      })
    );
    expect(empty.invoice_id).toBe('N/A');
    expect(empty.amount).toBe('N/A');
    expect(empty.due_date).toBe('N/A');
  });
});

describe('the account suspension log', () => {
  it('names whoever deactivated the tenant', async () => {
    mocks.api.GetDeactivationLogs.mockResolvedValue({
      data: {
        data: [
          {
            tenant: { companyName: 'Acme Health' },
            deactivatedAt: '2024-01-02T09:30:00.000Z',
            reason: 'Payment Failure',
            deactivatedBy: { firstName: 'Ada', lastName: 'Lovelace' },
          },
        ],
      },
    });
    render(<BillingReports />);
    await openReport('Account Suspension Log');

    expect(screen.getByTestId('table-columns').textContent).toBe(
      'tenant|day_time|reason|deactivated_by'
    );
    expect(rows()[0]).toEqual(
      expect.objectContaining({
        tenant: 'Acme Health',
        reason: 'Payment Failure',
        deactivated_by: 'Ada Lovelace',
      })
    );
  });

  it('falls back to the details, the tenant name and the creation time', async () => {
    mocks.api.GetDeactivationLogs.mockResolvedValue({
      data: {
        data: [
          {
            tenantName: 'Beta Clinic',
            createdAt: '2024-03-04T00:00:00.000Z',
            details: 'Automated',
            // A record with only half a name still produces a usable string.
            deactivatedBy: { firstName: 'Grace' },
          },
          { tenantId: 't3', details: 'System' },
          {},
        ],
      },
    });
    render(<BillingReports />);
    await openReport('Account Suspension Log');

    const [halfName, detailsOnly, empty] = rows();
    expect(halfName.tenant).toBe('Beta Clinic');
    expect(halfName.day_time.date).toBe('3/4/2024');
    expect(halfName.deactivated_by).toBe('Grace');
    expect(detailsOnly.tenant).toBe('t3');
    expect(detailsOnly.deactivated_by).toBe('System');
    expect(empty.tenant).toBe('N/A');
    expect(empty.reason).toBe('N/A');
    expect(empty.deactivated_by).toBe('N/A');
  });

  it('shows an empty table when the nested list is missing', async () => {
    mocks.api.GetDeactivationLogs.mockResolvedValue({ data: {} });
    render(<BillingReports />);
    await openReport('Account Suspension Log');
    expect(rows()).toEqual([]);
  });
});

describe('the account reactivation log', () => {
  it('names whoever reactivated the tenant and offers a row action', async () => {
    mocks.api.GetActivationLogs.mockResolvedValue({
      data: {
        data: [
          {
            tenant: { companyName: 'Acme Health' },
            reactivatedAt: '2024-01-02T09:30:00.000Z',
            reason: 'New subscription',
            reactivatedBy: { firstName: 'Ada', lastName: 'Lovelace' },
          },
        ],
      },
    });
    render(<BillingReports />);
    await openReport('Account Reactivation Log');

    expect(screen.getByTestId('table-actions').textContent).toBe('View Details');
    expect(rows()[0]).toEqual(
      expect.objectContaining({
        tenant: 'Acme Health',
        reason: 'New subscription',
        reactivated_by: 'Ada Lovelace',
        hasActions: true,
      })
    );
  });

  it('falls back to the activation time and then to the creation time', async () => {
    mocks.api.GetActivationLogs.mockResolvedValue({
      data: {
        data: [
          { tenantName: 'Beta Clinic', activatedAt: '2024-03-04T00:00:00.000Z' },
          { tenantId: 't3', createdAt: '2024-05-06T00:00:00.000Z' },
          {},
        ],
      },
    });
    render(<BillingReports />);
    await openReport('Account Reactivation Log');

    const [activated, created, empty] = rows();
    expect(activated.day_time.date).toBe('3/4/2024');
    expect(activated.reactivated_by).toBe('N/A');
    expect(created.tenant).toBe('t3');
    expect(created.day_time.date).toBe('5/6/2024');
    expect(empty.tenant).toBe('N/A');
    expect(empty.day_time.date).toBe('N/A');
  });
});

describe('a failing report', () => {
  it('reports the error and empties the table', async () => {
    mocks.api.GetReportPayments.mockRejectedValue(new Error('down'));
    render(<BillingReports />);
    await openReport('Payment Activity Log');
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOAD_REPORT');
    expect(rows()).toEqual([]);
  });

  it('clears the rows of the previous report before fetching the next', async () => {
    mocks.api.GetReportPayments.mockResolvedValue({
      data: [{ id: '42', amount: 10 }],
    });
    render(<BillingReports />);
    await openReport('Payment Activity Log');
    expect(rows()).toHaveLength(1);

    fireEvent.click(screen.getByLabelText('Go back'));
    mocks.api.GetReportInvoices.mockRejectedValue(new Error('down'));
    await openReport('Invoice Activity Log');
    expect(rows()).toEqual([]);
  });
});

describe('half-written names and bodyless responses', () => {
  it('names a deactivating admin who has only a surname on file', async () => {
    mocks.api.GetDeactivationLogs.mockResolvedValue({
      data: { data: [{ tenantName: 'Beta Clinic', deactivatedBy: { lastName: 'Hopper' } }] },
    });
    render(<BillingReports />);
    await openReport('Account Suspension Log');
    expect(rows()[0].deactivated_by).toBe('Hopper');
  });

  it('names a reactivating admin from whichever half of the name exists', async () => {
    mocks.api.GetActivationLogs.mockResolvedValue({
      data: {
        data: [
          { tenantName: 'Beta Clinic', reactivatedBy: { lastName: 'Hopper' } },
          { tenantName: 'Gamma Care', reactivatedBy: { firstName: 'Grace' } },
        ],
      },
    });
    render(<BillingReports />);
    await openReport('Account Reactivation Log');
    const [surnameOnly, forenameOnly] = rows();
    expect(surnameOnly.reactivated_by).toBe('Hopper');
    expect(forenameOnly.reactivated_by).toBe('Grace');
  });

  it('shows an empty invoice report when the response carries no body', async () => {
    mocks.api.GetReportInvoices.mockResolvedValue({});
    render(<BillingReports />);
    await openReport('Invoice Activity Log');
    expect(rows()).toEqual([]);
  });

  it('shows an empty reactivation log when the response carries no body', async () => {
    mocks.api.GetActivationLogs.mockResolvedValue({});
    render(<BillingReports />);
    await openReport('Account Reactivation Log');
    expect(rows()).toEqual([]);
  });
});
