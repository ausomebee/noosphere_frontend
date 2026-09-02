import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let responseErrFn;
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => {
      const instance = vi.fn(() => Promise.resolve({ data: 'retried' }));
      instance.interceptors = {
        request: { use: vi.fn() },
        response: {
          use: vi.fn((_ok, err) => {
            responseErrFn = err;
          }),
        },
      };
      return instance;
    }),
  },
}));

const refreshAccessToken = vi.fn();
vi.mock('../api/authApis', () => ({ default: { refreshAccessToken: (...a) => refreshAccessToken(...a) } }));

vi.mock('../Helper/storeRef', () => ({
  getStore: () => ({ getState: () => ({ authentication: {} }), dispatch: vi.fn() }),
  getPersistor: () => ({ purge: vi.fn() }),
}));

vi.mock('../ReduxStore/features/authentication', () => ({
  logout: () => ({ type: 'auth/logout' }),
  setTokens: (t) => ({ type: 'auth/setTokens', payload: t }),
}));

vi.mock('../Helper/ShowToast', () => ({ showToast: vi.fn() }));

import AxiosInterceptor from '../Helper/AxiosInterceptor';

/**
 * The developer-only logging on the token-refresh path.
 *
 * AxiosInterceptor.branches.test.js drives the refresh behaviour itself; the
 * one thing it cannot see is that the diagnostic console.error is gated on
 * import.meta.env.DEV, which vitest reports as true. Stubbing it false stands
 * in for a production build, where a failed refresh must stay silent -- the
 * error object carries the request URL and the Authorization header.
 */

const authError = () => ({
  config: { url: '/x', headers: {} },
  response: { status: 401, data: {} },
});

let consoleError;

beforeEach(() => {
  vi.clearAllMocks();
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  consoleError.mockRestore();
});

describe('a refresh that throws', () => {
  it('logs the failure in a dev build', async () => {
    refreshAccessToken.mockRejectedValue(new Error('network down'));
    AxiosInterceptor('at', 'rt');
    await expect(responseErrFn(authError())).rejects.toBeTruthy();
    expect(consoleError).toHaveBeenCalledWith('Token refresh failed', expect.any(Error));
  });

  it('stays silent in a production build', async () => {
    vi.stubEnv('DEV', false);
    refreshAccessToken.mockRejectedValue(new Error('network down'));
    AxiosInterceptor('at', 'rt');
    await expect(responseErrFn(authError())).rejects.toBeTruthy();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('still rejects with the original error, not the refresh failure', async () => {
    vi.stubEnv('DEV', false);
    refreshAccessToken.mockRejectedValue(new Error('network down'));
    AxiosInterceptor('at', 'rt');
    const original = authError();
    // The caller needs the 401 it actually made, so it can decide what to show.
    await expect(responseErrFn(original)).rejects.toBe(original);
  });
});
