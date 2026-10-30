import { describe, it, expect, vi, beforeEach } from 'vitest';

const verbs = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../Helper/AxiosInterceptor', () => ({ default: () => verbs }));

import api from '../api/BillingApis.js';

/**
 * Every wrapper in BillingApis.js follows one shape: build an authenticated client,
 * make the call, and on failure rethrow as `new Error(body.message || <its own
 * copy>)`. This drives all three arms of each -- success, a backend message,
 * and the fallback when the backend sends none -- from one table.
 */

const tokens = { accessToken: 'at', refreshToken: 'rt' };

// [ method name, HTTP verb, minimal args, fallback message, where the
//   wrapper reads the backend message from: the response body or error.message ]
const WRAPPERS = [
  ['CreateBillingPlan', 'post', { name: "name", description: "description", pricePerMonth: "pricePerMonth", pricePerYear: "pricePerYear", features: "features", planType: "planType", colourCode: "colourCode", forClient: "forClient", forStaff: "forStaff", forStorage: "forStorage", extraFeaturesEnabled: "extraFeaturesEnabled", adminId: "adminId", extraFeatures: "extraFeatures" }, 'Billing plan creation failed', 'body'],
  ['UpdateBillingPlan', 'patch', { id: "id", name: "name", description: "description", pricePerMonth: "pricePerMonth", pricePerYear: "pricePerYear", features: "features", planType: "planType", colourCode: "colourCode", forClient: "forClient", forStaff: "forStaff", forStorage: "forStorage", extraFeaturesEnabled: "extraFeaturesEnabled", adminId: "adminId", extraFeatures: "extraFeatures" }, 'Billing plan update failed', 'body'],
  ['TogglePlanActivity', 'post', { id: "id", active: "active", administratorPassword: "administratorPassword" }, 'Billing plan activation failed', 'body'],
  ['DeleteBillingPlan', 'delete', { id: "id", administratorPassword: "administratorPassword" }, 'Billing plan deletion failed', 'body'],
  ['GetAllPlans', 'get', {  }, 'Failed to fetch billing plans', 'body'],
  ['GetSinglePlan', 'get', { id: "id" }, 'Failed to fetch billing plan', 'body'],
  ['GetPlanByPlanType', 'get', { planType: "planType" }, 'Failed to fetch billing plan by type', 'body'],
  ['DuplicateBillingPlan', 'get', { planId: "planId" }, 'Billing plan duplication failed', 'body'],
  ['CreateSubscription', 'post', { planId: "planId", organizationId: "organizationId", tenantId: "tenantId", transactionId: "transactionId", status: "status", endDate: new Date('2026-01-05T00:00:00Z'), startDate: new Date('2026-01-05T00:00:00Z') }, 'Subscription creation failed', 'body'],
  ['GetAllSubscriptions', 'get', {  }, 'Failed to fetch subscriptions', 'body'],
  ['GetSubscriptionById', 'get', { id: "id" }, 'Failed to fetch subscription', 'body'],
  ['GetSubscriptionByPlanType', 'get', { planType: "planType" }, 'Failed to fetch subscription by type', 'body'],
];

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(verbs).forEach((v) => v.mockReset());
});

describe('BillingApis.js', () => {
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
