import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();

vi.mock('../Helper/AxiosInterceptor', () => ({
  default: () => ({
    post: mockPost,
    patch: mockPatch,
    get: mockGet,
    delete: mockDelete,
  }),
}));

import BillingApis from '../api/BillingApis';

const tokens = { accessToken: 'at', refreshToken: 'rt' };

describe('BillingApis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CreateBillingPlan', () => {
    it('sends correct payload and returns data', async () => {
      mockPost.mockResolvedValueOnce({ data: { id: 'plan-1' } });

      const result = await BillingApis.CreateBillingPlan({
        name: 'Basic',
        planType: 'STANDARD',
        pricePerMonth: { price: 10, currency: 'USD' },
        pricePerYear: { price: 100, currency: 'USD' },
        ...tokens,
      });

      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining('/plan'),
        expect.objectContaining({
          name: 'Basic',
          planType: 'STANDARD',
          pricePerMonth: { price: 10, currency: 'USD' },
          pricePerYear: { price: 100, currency: 'USD' },
        })
      );
      expect(result).toEqual({ id: 'plan-1' });
    });

    it('defaults pricePerMonth to 0/USD when not provided', async () => {
      mockPost.mockResolvedValueOnce({ data: {} });

      await BillingApis.CreateBillingPlan({ name: 'Test', ...tokens });

      const payload = mockPost.mock.calls[0][1];
      expect(payload.pricePerMonth).toEqual({ price: 0, currency: 'USD' });
      expect(payload.pricePerYear).toEqual({ price: 0, currency: 'USD' });
    });

    it('defaults extraFeatures to { connect: [] }', async () => {
      mockPost.mockResolvedValueOnce({ data: {} });

      await BillingApis.CreateBillingPlan({ name: 'Test', ...tokens });

      const payload = mockPost.mock.calls[0][1];
      expect(payload.extraFeatures).toEqual({ connect: [] });
    });

    it('throws with API error message on failure', async () => {
      mockPost.mockRejectedValueOnce({
        response: { data: { message: 'Duplicate name' } },
      });

      await expect(
        BillingApis.CreateBillingPlan({ name: 'Dup', ...tokens })
      ).rejects.toThrow('Duplicate name');
    });

    it('throws fallback message when no API message', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        BillingApis.CreateBillingPlan({ name: 'Test', ...tokens })
      ).rejects.toThrow('Billing plan creation failed');
    });
  });

  describe('UpdateBillingPlan', () => {
    it('sends PATCH with id in payload', async () => {
      mockPatch.mockResolvedValueOnce({ data: { id: 'plan-1' } });

      await BillingApis.UpdateBillingPlan({ id: 'plan-1', name: 'Updated', ...tokens });

      expect(mockPatch).toHaveBeenCalledWith(
        expect.stringContaining('/plan'),
        expect.objectContaining({ id: 'plan-1', name: 'Updated' })
      );
    });

    it('throws on failure', async () => {
      mockPatch.mockRejectedValueOnce({
        response: { data: { message: 'Not found' } },
      });

      await expect(
        BillingApis.UpdateBillingPlan({ id: 'x', ...tokens })
      ).rejects.toThrow('Not found');
    });
  });

  describe('TogglePlanActivity', () => {
    it('posts to /plan/active', async () => {
      mockPost.mockResolvedValueOnce({ data: 'ok' });

      await BillingApis.TogglePlanActivity({
        id: 'p1',
        active: true,
        administratorPassword: 'pass',
        ...tokens,
      });

      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining('/plan/active'),
        { id: 'p1', active: true, administratorPassword: 'pass' }
      );
    });
  });

  describe('DeleteBillingPlan', () => {
    it('sends DELETE with data body', async () => {
      mockDelete.mockResolvedValueOnce({ data: 'ok' });

      await BillingApis.DeleteBillingPlan({
        id: 'p1',
        administratorPassword: 'pass',
        ...tokens,
      });

      expect(mockDelete).toHaveBeenCalledWith(
        expect.stringContaining('/plan'),
        { data: { id: 'p1', administratorPassword: 'pass' } }
      );
    });
  });

  describe('GetAllPlans', () => {
    it('returns data on success', async () => {
      mockGet.mockResolvedValueOnce({ data: { data: [{ id: '1' }] } });
      const result = await BillingApis.GetAllPlans(tokens);
      expect(result).toEqual({ data: [{ id: '1' }] });
    });

    it('throws on failure', async () => {
      mockGet.mockRejectedValueOnce(new Error());
      await expect(BillingApis.GetAllPlans(tokens)).rejects.toThrow('Failed to fetch billing plans');
    });
  });

  describe('GetSinglePlan', () => {
    it('fetches by id', async () => {
      mockGet.mockResolvedValueOnce({ data: { id: 'p1' } });
      await BillingApis.GetSinglePlan({ id: 'p1', ...tokens });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/plan/p1'));
    });
  });

  describe('GetPlanByPlanType', () => {
    it('fetches by plan type', async () => {
      mockGet.mockResolvedValueOnce({ data: [] });
      await BillingApis.GetPlanByPlanType({ planType: 'STANDARD', ...tokens });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/plan/type/STANDARD'));
    });
  });

  describe('DuplicateBillingPlan', () => {
    it('calls duplicate endpoint', async () => {
      mockGet.mockResolvedValueOnce({ data: { id: 'new-p' } });
      await BillingApis.DuplicateBillingPlan({ planId: 'p1', ...tokens });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/plan/duplicate/p1'));
    });
  });

  describe('GetAllSubscriptions', () => {
    it('returns subscription data', async () => {
      mockGet.mockResolvedValueOnce({ data: { data: [] } });
      const result = await BillingApis.GetAllSubscriptions(tokens);
      expect(result).toEqual({ data: [] });
    });
  });

  describe('GetSubscriptionById', () => {
    it('fetches by id', async () => {
      mockGet.mockResolvedValueOnce({ data: { id: 's1' } });
      await BillingApis.GetSubscriptionById({ id: 's1', ...tokens });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/subscription/s1'));
    });
  });

  describe('GetSubscriptionByPlanType', () => {
    it('fetches by plan type', async () => {
      mockGet.mockResolvedValueOnce({ data: [] });
      await BillingApis.GetSubscriptionByPlanType({ planType: 'ENTERPRISE', ...tokens });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/subscription/plan/ENTERPRISE'));
    });
  });
});
