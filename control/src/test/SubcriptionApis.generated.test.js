import { describe, it, expect, vi, beforeEach } from 'vitest';

const verbs = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../Helper/AxiosInterceptor', () => ({ default: () => verbs }));

import api from '../api/SubcriptionApis.js';

/**
 * Every wrapper in SubcriptionApis.js follows one shape: build an authenticated client,
 * make the call, and on failure rethrow as `new Error(body.message || <its own
 * copy>)`. This drives all three arms of each -- success, a backend message,
 * and the fallback when the backend sends none -- from one table.
 */

const tokens = { accessToken: 'at', refreshToken: 'rt' };

// [ method name, HTTP verb, minimal args, fallback message, where the
//   wrapper reads the backend message from: the response body or error.message ]
const WRAPPERS = [
  ['GetSubscriptionByStatus', 'get', { status: "status" }, 'Failed to fetch subscription by status', 'body'],
  ['GetCountForSubscription', 'get', {  }, 'Failed to fetch subscription counts by status', 'body'],
  ['CancelSubscriptionNow', 'patch', { status: "status", subscriptionId: "subscriptionId", adminId: "adminId", comment: "comment", reason: "reason", mailNotification: "mailNotification" }, 'Failed to update subscription status for cancel now', 'body'],
  ['CancelSubscriptionLater', 'patch', { subscriptionId: "subscriptionId", adminId: "adminId", comment: "comment", reason: "reason", mailNotification: "mailNotification" }, 'Failed to update subscription status for cancel at end', 'body'],
  ['ResumeSubscriptionNow', 'patch', { status: "status", subscriptionId: "subscriptionId", adminId: "adminId", comment: "comment", reason: "reason", mailNotification: "mailNotification" }, 'Failed to update subscription status for resume now', 'body'],
  ['ResumeSubscriptionLater', 'patch', { resumeShedule: "resumeShedule", subscriptionId: "subscriptionId", adminId: "adminId", comment: "comment", reason: "reason", mailNotification: "mailNotification" }, 'Failed to update subscription status for resume later', 'body'],
  ['PauseSubscriptionNow', 'patch', { status: "status", subscriptionId: "subscriptionId", adminId: "adminId", comment: "comment", reason: "reason", mailNotification: "mailNotification" }, 'Failed to update subscription status for pause now', 'body'],
  ['PauseSubscriptionUntil', 'patch', { resumeShedule: "resumeShedule", status: "status", subscriptionId: "subscriptionId", adminId: "adminId", comment: "comment", reason: "reason", mailNotification: "mailNotification" }, 'Failed to update subscription status for pause until', 'body'],
  ['PauseSubscriptionSchedule', 'patch', { pauseSchedule: "pauseSchedule", subscriptionId: "subscriptionId", adminId: "adminId", comment: "comment", reason: "reason", mailNotification: "mailNotification" }, 'Failed to update subscription status for pause schedule', 'body'],
  ['GetSubscriptionByPlan', 'get', { planId: "planId" }, 'Failed to fetch subscriptions by plan', 'body'],
];

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(verbs).forEach((v) => v.mockReset());
});

describe('SubcriptionApis.js', () => {
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
