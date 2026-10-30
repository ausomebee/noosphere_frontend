import { describe, it, expect, vi, beforeEach } from 'vitest';

const patch = vi.fn();
const get = vi.fn();
vi.mock('../Helper/AxiosInterceptor', () => ({
  default: () => ({ patch: (...a) => patch(...a), get: (...a) => get(...a) }),
}));

import api from '../api/SubcriptionApis';

/**
 * The body every subscription state-change wrapper sends.
 *
 * SubcriptionApis.generated.test.js already drives the success and failure arms
 * of each call. What it does not touch is the shaping done on the way in: the
 * subscription id is normalised to an array of plain string ids no matter which
 * of four shapes the caller passes, and `comment` is spread in only when the
 * admin actually typed one -- an empty comment must not reach the backend as a
 * key at all.
 */

const tokens = { accessToken: 'at', refreshToken: 'rt' };

// Every wrapper that normalises an id and conditionally spreads a comment,
// with the extra argument each one requires beyond the shared set.
const PATCHERS = [
  ['CancelSubscriptionNow', { status: 'CANCELLED' }],
  ['CancelSubscriptionLater', {}],
  ['ResumeSubscriptionNow', { status: 'ACTIVE' }],
  ['ResumeSubscriptionLater', { resumeShedule: '2025-06-01' }],
  ['PauseSubscriptionNow', { status: 'PAUSED' }],
  ['PauseSubscriptionUntil', { status: 'PAUSED', resumeShedule: '2025-06-01' }],
  ['PauseSubscriptionSchedule', { pauseSchedule: '2025-06-01' }],
];

const bodyOf = () => patch.mock.calls[0][1];

beforeEach(() => {
  vi.clearAllMocks();
  patch.mockResolvedValue({ data: { ok: true } });
  get.mockResolvedValue({ data: { ok: true } });
});

describe('normalising the subscription id', () => {
  it('wraps a single id in an array', async () => {
    await api.CancelSubscriptionNow({ subscriptionId: 's1', reason: 'r', ...tokens });
    expect(bodyOf().id).toEqual(['s1']);
  });

  it('reads the id out of a single row object', async () => {
    // The tables hand back whole rows, not ids, when one row is actioned.
    await api.CancelSubscriptionNow({ subscriptionId: { id: 's1', plan: 'Pro' }, reason: 'r', ...tokens });
    expect(bodyOf().id).toEqual(['s1']);
  });

  it('keeps an array of plain ids as it is', async () => {
    await api.CancelSubscriptionNow({ subscriptionId: ['s1', 's2'], reason: 'r', ...tokens });
    expect(bodyOf().id).toEqual(['s1', 's2']);
  });

  it('flattens an array of row objects, and a mixture of both', async () => {
    await api.CancelSubscriptionNow({
      subscriptionId: [{ id: 's1' }, 's2', { id: 's3' }],
      reason: 'r',
      ...tokens,
    });
    expect(bodyOf().id).toEqual(['s1', 's2', 's3']);
  });
});

describe('the optional comment', () => {
  it.each(PATCHERS)('%s sends the comment when one was typed', async (name, extra) => {
    await api[name]({ subscriptionId: 's1', reason: 'r', comment: 'churned', ...extra, ...tokens });
    expect(bodyOf().comment).toBe('churned');
  });

  it.each(PATCHERS)('%s omits the comment key entirely when it is blank', async (name, extra) => {
    await api[name]({ subscriptionId: 's1', reason: 'r', comment: '', ...extra, ...tokens });
    expect(bodyOf()).not.toHaveProperty('comment');
  });

  it.each(PATCHERS)('%s omits the comment key when none was supplied', async (name, extra) => {
    await api[name]({ subscriptionId: 's1', reason: 'r', ...extra, ...tokens });
    expect(bodyOf()).not.toHaveProperty('comment');
  });
});

describe('the rest of the body', () => {
  it('always clears auto-renew and defaults the mail notification to off', async () => {
    await api.CancelSubscriptionLater({ subscriptionId: 's1', adminId: 'a1', reason: 'r', ...tokens });
    expect(bodyOf()).toEqual(
      expect.objectContaining({ adminId: 'a1', reason: 'r', autoRenew: false, mailNotification: false })
    );
  });

  it('coerces a truthy mail notification flag to a boolean', async () => {
    await api.CancelSubscriptionLater({
      subscriptionId: 's1',
      reason: 'r',
      mailNotification: 'yes',
      ...tokens,
    });
    expect(bodyOf().mailNotification).toBe(true);
  });
});
