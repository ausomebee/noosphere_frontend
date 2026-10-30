import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();
const mockPut = vi.fn();

vi.mock('../Helper/AxiosInterceptor', () => ({
  default: () => ({
    post: mockPost,
    patch: mockPatch,
    get: mockGet,
    delete: mockDelete,
    put: mockPut,
  }),
}));

import BillingApis from '../api/BillingApis';
import InvoiceApi from '../api/InvoiceApi';

/**
 * Branch coverage for the API error paths.
 *
 * Every call in these modules ends in the same shape:
 *
 *   throw new Error(error.response?.data?.message || "<fallback>")
 *
 * The existing unit tests drive the success side. This file drives both halves
 * of that `||` for each call: a backend error that carries a message (which
 * must be surfaced verbatim), and one that does not (which must fall back to
 * the module's own wording rather than throwing `undefined`).
 */

const tokens = { accessToken: 'at', refreshToken: 'rt' };

/** A rejection shaped the way axios delivers a backend error. */
const withMessage = (message) => ({ response: { data: { message } } });

/** Rejections that carry no usable message, at each level it can go missing. */
const withoutMessage = [
  new Error('network down'),           // no `response` at all
  { response: {} },                    // response, but no `data`
  { response: { data: {} } },          // data, but no `message`
];

const allVerbs = [mockPost, mockPatch, mockGet, mockDelete, mockPut];
const rejectAll = (value) => allVerbs.forEach((m) => m.mockRejectedValue(value));

/**
 * Each entry is [label, invoke]. `invoke` supplies the minimum arguments the
 * call needs; the mocked transport rejects regardless, so only the error path
 * is under test.
 */
const billingCalls = [
  ['CreateBillingPlan', () => BillingApis.CreateBillingPlan({ name: 'P', ...tokens })],
  ['UpdateBillingPlan', () => BillingApis.UpdateBillingPlan({ id: '1', name: 'P', ...tokens })],
  ['TogglePlanActivity', () => BillingApis.TogglePlanActivity({ id: '1', ...tokens })],
  ['DeleteBillingPlan', () => BillingApis.DeleteBillingPlan({ id: '1', ...tokens })],
  ['GetAllPlans', () => BillingApis.GetAllPlans({ ...tokens })],
  ['GetSinglePlan', () => BillingApis.GetSinglePlan({ id: '1', ...tokens })],
  ['GetPlanByPlanType', () => BillingApis.GetPlanByPlanType({ planType: 'STANDARD', ...tokens })],
  ['DuplicateBillingPlan', () => BillingApis.DuplicateBillingPlan({ planId: '1', ...tokens })],
  ['CreateSubscription', () => BillingApis.CreateSubscription({ tenantId: 't', ...tokens })],
  ['GetAllSubscriptions', () => BillingApis.GetAllSubscriptions({ ...tokens })],
  ['GetSubscriptionById', () => BillingApis.GetSubscriptionById({ id: '1', ...tokens })],
  ['GetSubscriptionByPlanType', () => BillingApis.GetSubscriptionByPlanType({ planType: 'STANDARD', ...tokens })],
];

describe('BillingApis error paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(billingCalls)('%s surfaces the backend message', async (label, invoke) => {
    rejectAll(withMessage(`${label} said no`));
    await expect(invoke()).rejects.toThrow(`${label} said no`);
  });

  it.each(billingCalls)('%s falls back to its own wording', async (label, invoke) => {
    for (const rejection of withoutMessage) {
      rejectAll(rejection);
      const err = await invoke().catch((e) => e);
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBeTruthy();
      expect(err.message).not.toBe('undefined');
      expect(err.message).not.toBe(`${label} said no`);
    }
  });
});

describe('BillingApis payload defaults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults monthly and yearly price and currency when the objects are absent', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 'p' } });
    await BillingApis.CreateBillingPlan({ name: 'P', ...tokens });
    const payload = mockPost.mock.calls[0][1];
    expect(payload.pricePerMonth).toEqual({ price: 0, currency: 'USD' });
    expect(payload.pricePerYear).toEqual({ price: 0, currency: 'USD' });
  });

  it('keeps supplied price and currency', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 'p' } });
    await BillingApis.CreateBillingPlan({
      name: 'P',
      pricePerMonth: { price: 10, currency: 'GBP' },
      pricePerYear: { price: 100, currency: 'GBP' },
      ...tokens,
    });
    const payload = mockPost.mock.calls[0][1];
    expect(payload.pricePerMonth).toEqual({ price: 10, currency: 'GBP' });
    expect(payload.pricePerYear).toEqual({ price: 100, currency: 'GBP' });
  });

  it('defaults a zero price to 0 rather than dropping it', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 'p' } });
    await BillingApis.CreateBillingPlan({
      name: 'P',
      pricePerMonth: { price: 0, currency: 'EUR' },
      ...tokens,
    });
    expect(mockPost.mock.calls[0][1].pricePerMonth).toEqual({ price: 0, currency: 'EUR' });
  });

  it('applies the same defaults on update', async () => {
    mockPatch.mockResolvedValueOnce({ data: { id: 'p' } });
    await BillingApis.UpdateBillingPlan({ id: '1', name: 'P', ...tokens });
    const payload = mockPatch.mock.calls[0][1];
    expect(payload.pricePerMonth).toEqual({ price: 0, currency: 'USD' });
    expect(payload.pricePerYear).toEqual({ price: 0, currency: 'USD' });
  });
});

const invoiceCalls = Object.keys(InvoiceApi)
  .filter((k) => typeof InvoiceApi[k] === 'function')
  .map((name) => [
    name,
    () =>
      InvoiceApi[name]({
        id: '1',
        invoiceId: '1',
        tenantId: 't',
        planId: 'p',
        token: 'tok',
        paymentIntentId: 'pi_1',
        ...tokens,
      }),
  ]);

describe('InvoiceApi error paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The Stripe calls use fetch rather than the axios interceptor.
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: 'stripe said no' }),
      text: async () => 'stripe said no',
    });
  });

  it('exposes every call as a function', () => {
    expect(invoiceCalls.length).toBeGreaterThan(0);
  });

  it.each(invoiceCalls)('%s rejects with an Error carrying a message', async (label, invoke) => {
    rejectAll(withMessage(`${label} said no`));
    const err = await invoke().catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBeTruthy();
  });

  it.each(invoiceCalls)('%s never throws a bare undefined message', async (label, invoke) => {
    for (const rejection of withoutMessage) {
      rejectAll(rejection);
      const err = await invoke().catch((e) => e);
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBeTruthy();
      expect(err.message).not.toBe('undefined');
    }
  });
});
