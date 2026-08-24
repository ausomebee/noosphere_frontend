import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPost = vi.fn();
const mockGet = vi.fn();
const mockPatch = vi.fn();

vi.mock('../Helper/AxiosInterceptor', () => ({
  default: () => ({
    post: mockPost,
    get: mockGet,
    patch: mockPatch,
  }),
}));

import InvoiceApi from '../api/InvoiceApi';

const tokens = { accessToken: 'at', refreshToken: 'rt' };

describe('InvoiceApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GetInvoiceById', () => {
    it('fetches invoice by id', async () => {
      mockGet.mockResolvedValueOnce({ data: { invoiceId: 'INV1' } });
      const result = await InvoiceApi.GetInvoiceById({ id: '1', ...tokens });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/invoice/1'));
      expect(result).toEqual({ invoiceId: 'INV1' });
    });

    it('throws on failure', async () => {
      mockGet.mockRejectedValueOnce({ response: { data: { message: 'Not found' } } });
      await expect(InvoiceApi.GetInvoiceById({ id: 'x', ...tokens })).rejects.toThrow('Not found');
    });
  });

  describe('GetPaymentById', () => {
    it('fetches payment by id', async () => {
      mockGet.mockResolvedValueOnce({ data: { id: 11 } });
      const result = await InvoiceApi.GetPaymentById({ id: 11, ...tokens });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/billing/payment/11'));
      expect(result).toEqual({ id: 11 });
    });
  });

  describe('GetInvoiceByAllAndStatus', () => {
    it('fetches invoices by status', async () => {
      mockGet.mockResolvedValueOnce({ data: [] });
      await InvoiceApi.GetInvoiceByAllAndStatus({ status: 'Paid', ...tokens });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/invoice/status/Paid'));
    });
  });

  describe('GetPaymentByAllAndStatus', () => {
    it('fetches payments by status', async () => {
      mockGet.mockResolvedValueOnce({ data: [] });
      await InvoiceApi.GetPaymentByAllAndStatus({ status: 'SUCCESS', ...tokens });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/billing/payment/status/SUCCESS'));
    });
  });

  describe('GetCountForInvoice', () => {
    it('fetches invoice counts', async () => {
      mockGet.mockResolvedValueOnce({ data: { total: 5 } });
      const result = await InvoiceApi.GetCountForInvoice(tokens);
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/invoice/total/status'));
      expect(result).toEqual({ total: 5 });
    });
  });

  describe('GetCountForPayment', () => {
    it('fetches payment counts', async () => {
      mockGet.mockResolvedValueOnce({ data: { total: 3 } });
      const result = await InvoiceApi.GetCountForPayment(tokens);
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/billing/countpayment'));
      expect(result).toEqual({ total: 3 });
    });
  });

  describe('GeneratePaymentLink', () => {
    it('sends correct payload', async () => {
      mockPost.mockResolvedValueOnce({ data: 'https://pay.link' });
      const result = await InvoiceApi.GeneratePaymentLink({
        tenantId: 't1',
        planId: 'p1',
        billingFrequency: 'Monthly',
        quantity: 1,
        ...tokens,
      });
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining('/invoice/payment-link'),
        { tenantId: 't1', planId: 'p1', billingFrequency: 'Monthly', quantity: 1 }
      );
      expect(result).toEqual('https://pay.link');
    });

    it('throws on failure', async () => {
      mockPost.mockRejectedValueOnce({ response: { data: { message: 'No plan' } } });
      await expect(
        InvoiceApi.GeneratePaymentLink({ tenantId: 't1', planId: 'p1', billingFrequency: 'Monthly', quantity: 1, ...tokens })
      ).rejects.toThrow('No plan');
    });
  });

  describe('RegeneratePaymentLink', () => {
    it('calls PATCH with tenantId in URL', async () => {
      mockPatch.mockResolvedValueOnce({ data: 'https://new.link' });
      await InvoiceApi.RegeneratePaymentLink({ tenantId: 't1', ...tokens });
      expect(mockPatch).toHaveBeenCalledWith(expect.stringContaining('/invoice/regenerate/t1'));
    });
  });

  describe('GetInvoiceHistory', () => {
    it('fetches history by tenant', async () => {
      mockGet.mockResolvedValueOnce({ data: [{ event: 'GENERATED' }] });
      const result = await InvoiceApi.GetInvoiceHistory({ tenantId: 't1', ...tokens });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/invoice/history/t1'));
      expect(result).toEqual([{ event: 'GENERATED' }]);
    });
  });

  describe('GetReportPayments', () => {
    it('uses query string pagination', async () => {
      mockGet.mockResolvedValueOnce({ data: [] });
      await InvoiceApi.GetReportPayments({ page: 1, pageSize: 10, ...tokens });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('page=1'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('pageSize=10'));
    });
  });

  describe('GetReportInvoices', () => {
    it('uses query string pagination', async () => {
      mockGet.mockResolvedValueOnce({ data: [] });
      await InvoiceApi.GetReportInvoices({ page: 2, pageSize: 50, ...tokens });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('page=2'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('pageSize=50'));
    });
  });

  describe('GetDeactivationLogs', () => {
    it('fetches deactivation logs', async () => {
      mockGet.mockResolvedValueOnce({ data: [] });
      await InvoiceApi.GetDeactivationLogs(tokens);
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/tenant/deactivation-logs'));
    });
  });

  describe('GetActivationLogs', () => {
    it('fetches activation logs', async () => {
      mockGet.mockResolvedValueOnce({ data: [] });
      await InvoiceApi.GetActivationLogs(tokens);
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/tenant/activation-logs'));
    });
    it('throws on error', async () => {
      mockGet.mockRejectedValueOnce({ response: { data: { message: 'Logs fail' } } });
      await expect(InvoiceApi.GetActivationLogs(tokens)).rejects.toThrow('Logs fail');
    });
  });

  describe('GetBillingTotalMetric', () => {
    it('fetches billing total metric', async () => {
      mockGet.mockResolvedValueOnce({ data: { total: 1000 } });
      const result = await InvoiceApi.GetBillingTotalMetric({ from: '2026-01-01', to: '2026-12-31', ...tokens });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/invoice/billed/total/'));
      expect(result).toEqual({ total: 1000 });
    });
    it('throws on error', async () => {
      mockGet.mockRejectedValueOnce({ response: { data: { message: 'Metric fail' } } });
      await expect(InvoiceApi.GetBillingTotalMetric({ from: 'a', to: 'b', ...tokens })).rejects.toThrow('Metric fail');
    });
  });

  describe('GetBillingDueMetric', () => {
    it('fetches billing due metric', async () => {
      mockGet.mockResolvedValueOnce({ data: { due: 500 } });
      const result = await InvoiceApi.GetBillingDueMetric({ from: '2026-01-01', to: '2026-12-31', ...tokens });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/invoice/billed/due/'));
      expect(result).toEqual({ due: 500 });
    });
  });

  describe('RecordPayment', () => {
    it('records payment via fetch', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) });
      const result = await InvoiceApi.RecordPayment({
        tenantId: 't1', invoiceId: 'inv1', planId: 'p1', billingCycle: 'Monthly',
        endDate: '2026-12-31', transactionId: 'tx1', transactionRef: 'ref1',
        amount: 100, cardType: 'Visa', lastFourDigits: '1234', gatewayToken: 'gt1',
        holderName: 'John', paymentStatus: 'SUCCESS', gateway: 'stripe',
      });
      expect(result).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/billing/pay-payment-link'), expect.objectContaining({ method: 'POST' }));
    });
    it('throws on non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ message: 'Payment failed' }) });
      await expect(InvoiceApi.RecordPayment({ tenantId: 't1' })).rejects.toThrow('Payment failed');
    });
    it('throws on fetch error', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network'));
      await expect(InvoiceApi.RecordPayment({ tenantId: 't1' })).rejects.toThrow('Network');
    });
  });

  describe('CreateStripePaymentIntent', () => {
    it('returns the client secret', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ clientSecret: 'pi_1_secret_x', paymentIntentId: 'pi_1' }) });
      const result = await InvoiceApi.CreateStripePaymentIntent({ token: 'tok' });
      expect(result.clientSecret).toBe('pi_1_secret_x');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/billing/stripe/create-payment-intent'),
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ token: 'tok' }) })
      );
    });
    it('throws the server message on non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ message: 'Invoice already paid' }) });
      await expect(InvoiceApi.CreateStripePaymentIntent({ token: 'tok' })).rejects.toThrow('Invoice already paid');
    });
    it('throws rather than returning a secretless body', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
      await expect(InvoiceApi.CreateStripePaymentIntent({ token: 'tok' })).rejects.toThrow(/client secret/i);
    });
    it('survives a non-JSON error page from an undeployed route', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false, json: () => Promise.reject(new SyntaxError('Unexpected token <')) });
      await expect(InvoiceApi.CreateStripePaymentIntent({ token: 'tok' })).rejects.toThrow(/could not start/i);
    });
  });

  describe('ConfirmPayment', () => {
    it('posts the payment intent id for server-side verification', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ status: 'ok', data: { id: 1 } }) });
      const result = await InvoiceApi.ConfirmPayment({ token: 'tok', paymentIntentId: 'pi_1' });
      expect(result).toEqual({ status: 'ok', data: { id: 1 } });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/billing/stripe/confirm-payment'),
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ token: 'tok', paymentIntentId: 'pi_1' }) })
      );
    });
    it('throws the server message on non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ message: 'PaymentIntent not succeeded' }) });
      await expect(InvoiceApi.ConfirmPayment({ token: 'tok', paymentIntentId: 'pi_1' })).rejects.toThrow('PaymentIntent not succeeded');
    });
  });

  describe('ValidatePaymentToken', () => {
    it('validates token via fetch', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ valid: true }) });
      const result = await InvoiceApi.ValidatePaymentToken({ token: 'abc' });
      expect(result).toEqual({ valid: true });
    });
    it('throws on invalid token', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ message: 'Expired' }) });
      await expect(InvoiceApi.ValidatePaymentToken({ token: 'bad' })).rejects.toThrow('Expired');
    });
    it('throws on fetch error', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network'));
      await expect(InvoiceApi.ValidatePaymentToken({ token: 'x' })).rejects.toThrow('Network');
    });
  });

  describe('error paths with default messages', () => {
    it('GetPaymentById throws default message', async () => {
      mockGet.mockRejectedValueOnce({});
      await expect(InvoiceApi.GetPaymentById({ id: '1', ...tokens })).rejects.toThrow('Failed to fetch payment by ID');
    });
    it('GetInvoiceByAllAndStatus throws default message', async () => {
      mockGet.mockRejectedValueOnce({});
      await expect(InvoiceApi.GetInvoiceByAllAndStatus({ status: 'x', ...tokens })).rejects.toThrow('Failed to fetch invoices by status');
    });
    it('GetPaymentByAllAndStatus throws default message', async () => {
      mockGet.mockRejectedValueOnce({});
      await expect(InvoiceApi.GetPaymentByAllAndStatus({ status: 'x', ...tokens })).rejects.toThrow('Failed to fetch payments by status');
    });
    it('GetCountForInvoice throws default message', async () => {
      mockGet.mockRejectedValueOnce({});
      await expect(InvoiceApi.GetCountForInvoice(tokens)).rejects.toThrow('Failed to fetch invoice counts');
    });
    it('GetCountForPayment throws default message', async () => {
      mockGet.mockRejectedValueOnce({});
      await expect(InvoiceApi.GetCountForPayment(tokens)).rejects.toThrow('Failed to fetch payment counts');
    });
    it('RegeneratePaymentLink throws default message', async () => {
      mockPatch.mockRejectedValueOnce({});
      await expect(InvoiceApi.RegeneratePaymentLink({ tenantId: 't1', ...tokens })).rejects.toThrow('Failed to regenerate payment link');
    });
    it('GetInvoiceHistory throws default message', async () => {
      mockGet.mockRejectedValueOnce({});
      await expect(InvoiceApi.GetInvoiceHistory({ tenantId: 't1', ...tokens })).rejects.toThrow('Failed to fetch invoice history');
    });
    it('GetReportPayments throws default message', async () => {
      mockGet.mockRejectedValueOnce({});
      await expect(InvoiceApi.GetReportPayments(tokens)).rejects.toThrow('Failed to fetch payment activity report');
    });
    it('GetReportInvoices throws default message', async () => {
      mockGet.mockRejectedValueOnce({});
      await expect(InvoiceApi.GetReportInvoices(tokens)).rejects.toThrow('Failed to fetch invoice activity report');
    });
    it('GetDeactivationLogs throws default message', async () => {
      mockGet.mockRejectedValueOnce({});
      await expect(InvoiceApi.GetDeactivationLogs(tokens)).rejects.toThrow('Failed to fetch deactivation logs');
    });
  });
});
