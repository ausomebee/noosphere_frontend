import { describe, it, expect, vi, beforeEach } from 'vitest';

const verbs = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../Helper/AxiosInterceptor', () => ({ default: () => verbs }));

import api from '../api/InvoiceApi.js';

/**
 * Every wrapper in InvoiceApi.js follows one shape: build an authenticated client,
 * make the call, and on failure rethrow as `new Error(body.message || <its own
 * copy>)`. This drives all three arms of each -- success, a backend message,
 * and the fallback when the backend sends none -- from one table.
 */

const tokens = { accessToken: 'at', refreshToken: 'rt' };

// [ method name, HTTP verb, minimal args, fallback message, where the
//   wrapper reads the backend message from: the response body or error.message ]
const WRAPPERS = [
  ['GetBillingTotalMetric', 'get', { from: "from", to: "to" }, 'Failed to fetch billing total metric', 'body'],
  ['GetBillingDueMetric', 'get', { from: "from", to: "to" }, 'Failed to fetch billing due metric', 'body'],
  ['GetInvoiceById', 'get', { id: "id" }, 'Failed to fetch invoice by ID', 'body'],
  ['GetInvoiceByAllAndStatus', 'get', { status: "status" }, 'Failed to fetch invoices by status', 'body'],
  ['GetPaymentById', 'get', { id: "id" }, 'Failed to fetch payment by ID', 'body'],
  ['GeneratePaymentLink', 'post', { tenantId: "tenantId", planId: "planId", billingFrequency: "billingFrequency", quantity: "quantity" }, 'Failed to generate payment link', 'body'],
  ['RegeneratePaymentLink', 'patch', { tenantId: "tenantId" }, 'Failed to regenerate payment link', 'body'],
  ['GetInvoiceHistory', 'get', { tenantId: "tenantId" }, 'Failed to fetch invoice history', 'body'],
  ['GetReportPayments', 'get', { page: 1, pageSize: 1 }, 'Failed to fetch payment activity report', 'body'],
  ['GetReportInvoices', 'get', { page: 1, pageSize: 1 }, 'Failed to fetch invoice activity report', 'body'],
  ['GetDeactivationLogs', 'get', {  }, 'Failed to fetch deactivation logs', 'body'],
  ['GetActivationLogs', 'get', {  }, 'Failed to fetch activation logs', 'body'],
];

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(verbs).forEach((v) => v.mockReset());
});

describe('InvoiceApi.js', () => {
  it.each(WRAPPERS)('%s resolves on success', async (name, verb, args) => {
    // Not every wrapper returns a value -- some await and discard -- so assert
    // that the call went out rather than on what came back.
    verbs[verb].mockResolvedValue({ data: { ok: true } });
    await expect(api[name]({ ...args, ...tokens })).resolves.not.toThrow();
    expect(verbs[verb]).toHaveBeenCalled();
  });

  it.each(WRAPPERS)('%s surfaces the message the backend returned', async (name, verb, args, _fb, accessor) => {
    verbs[verb].mockRejectedValue(
      accessor === 'body'
        ? { response: { data: { message: 'backend said so' } } }
        : new Error('backend said so')
    );
    await expect(api[name]({ ...args, ...tokens })).rejects.toThrow('backend said so');
  });

  it.each(WRAPPERS)('%s falls back to its own copy', async (name, verb, args, fallback, accessor) => {
    // A rejection carrying nothing the wrapper can read: no body for the ones
    // that look there, and no message for the ones that read error.message.
    verbs[verb].mockRejectedValue(accessor === 'body' ? new Error('') : {});
    await expect(api[name]({ ...args, ...tokens })).rejects.toThrow(fallback);
  });
});
