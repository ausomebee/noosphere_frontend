import { describe, it, expect, vi, beforeEach } from 'vitest';

const get = vi.fn();
const patch = vi.fn();
const AxiosInterceptor = vi.fn(() => ({ get: (...a) => get(...a), patch: (...a) => patch(...a) }));
vi.mock('../Helper/AxiosInterceptor', () => ({ default: (...a) => AxiosInterceptor(...a) }));

import notificationApi from '../api/notificationApi';

/**
 * The two notification calls the control app makes.
 *
 * Both routes are namespaced by app -- "admin" here, "client" in the client
 * portal -- and the listing route ends in the caller's role, which defaults to
 * ADMIN because that is the only role this portal has. The URLs are asserted in
 * full because a wrong segment is the failure this wrapper can actually have.
 */

const tokens = { accessToken: 'at', refreshToken: 'rt' };

beforeEach(() => {
  vi.clearAllMocks();
  get.mockResolvedValue({ data: [{ id: 'n1' }] });
  patch.mockResolvedValue({ data: { id: 'n1', read: true } });
});

describe('loading notifications', () => {
  it('builds an authenticated client from the tokens it is given', async () => {
    await notificationApi.getNotifications({ userId: 'u1', ...tokens });
    expect(AxiosInterceptor).toHaveBeenCalledWith('at', 'rt');
  });

  it('defaults the role segment to ADMIN', async () => {
    await notificationApi.getNotifications({ userId: 'u1', ...tokens });
    expect(get).toHaveBeenCalledWith(expect.stringContaining('/notifications/user/admin/u1/ADMIN'));
  });

  it('uses a role that is supplied explicitly', async () => {
    await notificationApi.getNotifications({ userId: 'u1', userType: 'SUPERADMIN', ...tokens });
    expect(get).toHaveBeenCalledWith(
      expect.stringContaining('/notifications/user/admin/u1/SUPERADMIN')
    );
  });

  it('returns the response body', async () => {
    await expect(notificationApi.getNotifications({ userId: 'u1', ...tokens })).resolves.toEqual([
      { id: 'n1' },
    ]);
  });

  it('rethrows the message the backend sent', async () => {
    get.mockRejectedValue({ response: { data: { message: 'Token expired' } } });
    await expect(notificationApi.getNotifications({ userId: 'u1', ...tokens })).rejects.toThrow(
      'Token expired'
    );
  });

  it('falls back to its own message when the failure carries none', async () => {
    get.mockRejectedValue(new Error('socket hang up'));
    await expect(notificationApi.getNotifications({ userId: 'u1', ...tokens })).rejects.toThrow(
      'Failed to load notifications'
    );
  });
});

describe('marking one read', () => {
  it('patches the admin read route for that notification', async () => {
    await notificationApi.markNotificationRead({ id: 'n1', ...tokens });
    expect(patch).toHaveBeenCalledWith(expect.stringContaining('/notifications/read/admin/n1'));
  });

  it('returns the response body', async () => {
    await expect(notificationApi.markNotificationRead({ id: 'n1', ...tokens })).resolves.toEqual({
      id: 'n1',
      read: true,
    });
  });

  it('rethrows the message the backend sent', async () => {
    patch.mockRejectedValue({ response: { data: { message: 'Not found' } } });
    await expect(notificationApi.markNotificationRead({ id: 'n1', ...tokens })).rejects.toThrow(
      'Not found'
    );
  });

  it('falls back to its own message when the failure carries none', async () => {
    patch.mockRejectedValue({ response: {} });
    await expect(notificationApi.markNotificationRead({ id: 'n1', ...tokens })).rejects.toThrow(
      'Failed to mark notification as read'
    );
  });
});
