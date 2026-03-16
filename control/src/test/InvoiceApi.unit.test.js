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
  });
});
