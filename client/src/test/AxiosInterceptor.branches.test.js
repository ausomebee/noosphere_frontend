import { describe, it, expect, vi, beforeEach } from 'vitest';

let requestFn;
let responseFn;
let responseErrFn;
let instanceMock;

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => {
      const instance = vi.fn(() => Promise.resolve({ data: 'retried' }));
      instance.interceptors = {
        request: { use: vi.fn((fn) => { requestFn = fn; }) },
        response: {
          use: vi.fn((fn, err) => {
            responseFn = fn;
            responseErrFn = err;
          }),
        },
      };
      instanceMock = instance;
      return instance;
    }),
  },
}));

const refreshAccessToken = vi.fn();
vi.mock('../api/authApis', () => ({
  default: { get refreshAccessToken() { return refreshAccessToken; } },
}));

const purge = vi.fn();
const dispatch = vi.fn();
let storeValue;
vi.mock('../Helper/storeRef', () => ({
  getStore: vi.fn(() => storeValue),
  getPersistor: vi.fn(() => ({ purge })),
}));

vi.mock('../ReduxStore/features/authentication', () => ({
  logout: vi.fn(() => ({ type: 'auth/logout' })),
  setTokens: vi.fn((tokens) => ({ type: 'auth/setTokens', payload: tokens })),
}));

const showToast = vi.fn();
vi.mock('../Helper/ShowToast', () => ({ showToast: (...a) => showToast(...a) }));

import AxiosInterceptor from '../Helper/AxiosInterceptor';

/**
 * Branch coverage for the token-refresh path.
 *
 * AxiosInterceptor.test.js covers header injection and the non-auth
 * rejections. This file drives the refresh itself: where the refresh token is
 * read from, what happens when the server rejects it outright versus when the
 * refresh call merely fails to reach the server, and the queued-request path
 * that other in-flight calls take while a refresh is running.
 */

const authError = (message = 'Not authorized') => ({
  config: { url: '/x', headers: {} },
  response: { status: 500, data: { message } },
});

beforeEach(() => {
  vi.clearAllMocks();
  storeValue = {
    getState: vi.fn(() => ({ auth: { refreshToken: 'stored-refresh' } })),
    dispatch,
  };
  refreshAccessToken.mockReset();
});

describe('choosing the refresh token', () => {
  it('prefers the token held in the store', async () => {
    refreshAccessToken.mockResolvedValue('new-access');
    AxiosInterceptor('at', 'prop-refresh');
    await responseErrFn(authError());
    expect(refreshAccessToken).toHaveBeenCalledWith('stored-refresh', expect.any(Function));
  });

  it('falls back to the prop when the store has no refresh token', async () => {
    storeValue.getState = vi.fn(() => ({ auth: {} }));
    refreshAccessToken.mockResolvedValue('new-access');
    AxiosInterceptor('at', 'prop-refresh');
    await responseErrFn(authError());
    expect(refreshAccessToken).toHaveBeenCalledWith('prop-refresh', expect.any(Function));
  });

  it('falls back to the prop when the auth slice is missing entirely', async () => {
    storeValue.getState = vi.fn(() => ({}));
    refreshAccessToken.mockResolvedValue('new-access');
    AxiosInterceptor('at', 'prop-refresh');
    await responseErrFn(authError());
    expect(refreshAccessToken).toHaveBeenCalledWith('prop-refresh', expect.any(Function));
  });

  it('falls back to the prop when there is no store at all', async () => {
    storeValue = undefined;
    refreshAccessToken.mockResolvedValue('new-access');
    AxiosInterceptor('at', 'prop-refresh');
    await responseErrFn(authError());
    expect(refreshAccessToken).toHaveBeenCalledWith('prop-refresh', expect.any(Function));
  });
});

describe('successful refresh', () => {
  it('retries the original request with the new token', async () => {
    refreshAccessToken.mockResolvedValue('new-access');
    AxiosInterceptor('at', 'rt');
    const result = await responseErrFn(authError());
    expect(result).toEqual({ data: 'retried' });
    const retried = instanceMock.mock.calls[0][0];
    expect(retried.headers.Authorization).toBe('Bearer new-access');
  });

  it('stores the refreshed tokens through the callback', async () => {
    refreshAccessToken.mockImplementation(async (_t, onTokens) => {
      onTokens({ accessToken: 'a', refreshToken: 'b' });
      return 'new-access';
    });
    AxiosInterceptor('at', 'rt');
    await responseErrFn(authError());
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'auth/setTokens' })
    );
  });
});

describe('refresh rejected by the server', () => {
  it('ends the session when the refresh resolves null', async () => {
    refreshAccessToken.mockResolvedValue(null);
    AxiosInterceptor('at', 'rt');
    const err = authError();
    await expect(responseErrFn(err)).rejects.toBe(err);
    expect(purge).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'auth/logout' }));
  });

  it('ends the session when the refresh call itself returns 401', async () => {
    refreshAccessToken.mockRejectedValue({ response: { status: 401 } });
    AxiosInterceptor('at', 'rt');
    const err = authError();
    await expect(responseErrFn(err)).rejects.toBe(err);
    expect(purge).toHaveBeenCalled();
  });

  it('ends the session when the refresh call returns 403', async () => {
    refreshAccessToken.mockRejectedValue({ response: { status: 403 } });
    AxiosInterceptor('at', 'rt');
    await expect(responseErrFn(authError())).rejects.toBeTruthy();
    expect(purge).toHaveBeenCalled();
  });
});

describe('refresh that never reached the server', () => {
  it('keeps the user signed in when the refresh fails with a 5xx', async () => {
    refreshAccessToken.mockRejectedValue({ response: { status: 503 } });
    AxiosInterceptor('at', 'rt');
    const err = authError();
    await expect(responseErrFn(err)).rejects.toBe(err);
    // The refresh token is probably still good, so the session must survive.
    expect(purge).not.toHaveBeenCalled();
  });

  it('keeps the user signed in when the refresh fails with no response at all', async () => {
    refreshAccessToken.mockRejectedValue(new Error('network down'));
    AxiosInterceptor('at', 'rt');
    const err = authError();
    await expect(responseErrFn(err)).rejects.toBe(err);
    expect(purge).not.toHaveBeenCalled();
  });
});

describe('requests queued behind an in-flight refresh', () => {
  it('replays a queued request once the refresh succeeds', async () => {
    let release;
    refreshAccessToken.mockImplementation(
      () => new Promise((r) => { release = () => r('new-access'); })
    );
    AxiosInterceptor('at', 'rt');

    const first = responseErrFn(authError());
    // A second failure arrives while the first refresh is still running, so it
    // must queue rather than starting a refresh of its own.
    const second = responseErrFn(authError());
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);

    release();
    await expect(first).resolves.toEqual({ data: 'retried' });
    await expect(second).resolves.toEqual({ data: 'retried' });
  });

  it('rejects a queued request when the refresh fails', async () => {
    let fail;
    refreshAccessToken.mockImplementation(
      () => new Promise((_r, rej) => { fail = () => rej({ response: { status: 401 } }); })
    );
    AxiosInterceptor('at', 'rt');

    const first = responseErrFn(authError());
    const second = responseErrFn(authError());
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);

    fail();
    await expect(first).rejects.toBeTruthy();
    await expect(second).rejects.toBeTruthy();
  });
});

describe('non-auth failures are passed straight through', () => {
  it('ignores a 500 whose message is not an auth message', async () => {
    AxiosInterceptor('at', 'rt');
    const err = {
      config: { url: '/x', headers: {} },
      response: { status: 500, data: { message: 'Database exploded' } },
    };
    await expect(responseErrFn(err)).rejects.toBe(err);
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it('ignores a 500 with no message at all', async () => {
    AxiosInterceptor('at', 'rt');
    const err = { config: { url: '/x', headers: {} }, response: { status: 500, data: {} } };
    await expect(responseErrFn(err)).rejects.toBe(err);
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it('refreshes on a plain 401', async () => {
    refreshAccessToken.mockResolvedValue('new-access');
    AxiosInterceptor('at', 'rt');
    await responseErrFn({
      config: { url: '/x', headers: {} },
      response: { status: 401, data: {} },
    });
    expect(refreshAccessToken).toHaveBeenCalled();
  });

  it.each(['expired token', 'Invalid or expired session'])(
    'refreshes on a 500 carrying %s',
    async (message) => {
      refreshAccessToken.mockResolvedValue('new-access');
      AxiosInterceptor('at', 'rt');
      await responseErrFn(authError(message));
      expect(refreshAccessToken).toHaveBeenCalled();
    }
  );

  it('does not retry a request that has already been retried', async () => {
    AxiosInterceptor('at', 'rt');
    const err = {
      config: { url: '/x', headers: {}, _retry: true },
      response: { status: 401, data: {} },
    };
    await expect(responseErrFn(err)).rejects.toBe(err);
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it('passes through an error with no response', async () => {
    AxiosInterceptor('at', 'rt');
    const err = { config: { url: '/x', headers: {} } };
    await expect(responseErrFn(err)).rejects.toBe(err);
  });

  it('passes through successful responses untouched', () => {
    AxiosInterceptor('at', 'rt');
    const ok = { status: 200, data: 1 };
    expect(responseFn(ok)).toBe(ok);
  });

  it('adds the Authorization header when a token is present', () => {
    AxiosInterceptor('my-token', 'rt');
    expect(requestFn({ headers: {} }).headers.Authorization).toBe('Bearer my-token');
  });
});
