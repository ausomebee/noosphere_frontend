import { describe, it, expect, vi, beforeEach } from 'vitest';

const axiosPost = vi.fn();
const axiosGet = vi.fn();
const axiosPatch = vi.fn();

vi.mock('axios', () => ({
  default: {
    post: (...a) => axiosPost(...a),
    get: (...a) => axiosGet(...a),
    patch: (...a) => axiosPatch(...a),
  },
}));

const fetchPost = vi.fn();
const fetchGet = vi.fn();
const fetchPatch = vi.fn();
const fetchPut = vi.fn();
const fetchDelete = vi.fn();

vi.mock('../Helper/AxiosInterceptor', () => ({
  default: () => ({
    post: fetchPost,
    get: fetchGet,
    patch: fetchPatch,
    put: fetchPut,
    delete: fetchDelete,
  }),
}));

import api, { refreshAccessToken } from '../api/authApis';

/**
 * Branch coverage for the auth API module.
 *
 * Every call ends in `error.response?.data?.message || "<fallback>"`, so each
 * needs both halves driven. `refreshAccessToken` carries the module's only
 * real logic and gets its own cases: it must distinguish a refresh token the
 * server actively rejected from one that merely could not be delivered.
 */

const withMessage = (message) => ({ response: { data: { message } } });
const withoutMessage = [
  new Error('network down'),
  { response: {} },
  { response: { data: {} } },
];

const allVerbs = [axiosPost, axiosGet, axiosPatch, fetchPost, fetchGet, fetchPatch, fetchPut, fetchDelete];
const rejectAll = (v) => allVerbs.forEach((m) => m.mockRejectedValue(v));
const resolveAll = (v) => allVerbs.forEach((m) => m.mockResolvedValue(v));

const calls = Object.keys(api)
  .filter((k) => typeof api[k] === 'function' && k !== 'refreshAccessToken')
  .map((name) => [
    name,
    () =>
      api[name]({
        id: '1',
        userId: 'u1',
        token: 'tok',
        email: 'a@b.co',
        password: 'pw',
        accessToken: 'at',
        refreshToken: 'rt',
        oldAdministratorPassword: 'old',
        newAdministratorPassword: 'new',
        isEnabled: true,
        authQuestion: 'q',
        answer: 'a',
      }),
  ]);

describe('authApis error paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes the expected calls', () => {
    expect(calls.length).toBeGreaterThanOrEqual(12);
  });

  it.each(calls)('%s surfaces the backend message', async (label, invoke) => {
    rejectAll(withMessage(`${label} said no`));
    const err = await invoke().catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    // AdminSetPassword reads one `.data` deeper than the rest of the module
    // (see the dedicated case below), so it alone falls back here.
    if (label === 'AdminSetPassword') {
      expect(err.message).toBe('Password setting failed');
    } else {
      expect(err.message).toBe(`${label} said no`);
    }
  });

  it('AdminSetPassword only surfaces a message nested one level deeper', async () => {
    // Documented, not endorsed: every other call in this module reads
    // `error.response.data.message`, but AdminSetPassword reads
    // `error.response.data.data.message`. A backend that answers in the common
    // shape therefore shows the generic fallback here and nowhere else.
    rejectAll({ response: { data: { message: 'common shape' } } });
    await expect(api.AdminSetPassword({ id: '1', password: 'pw' })).rejects.toThrow(
      'Password setting failed'
    );

    rejectAll({ response: { data: { data: { message: 'deeper shape' } } } });
    await expect(api.AdminSetPassword({ id: '1', password: 'pw' })).rejects.toThrow(
      'deeper shape'
    );
  });

  it.each(calls)('%s falls back to its own wording', async (label, invoke) => {
    for (const rejection of withoutMessage) {
      rejectAll(rejection);
      const err = await invoke().catch((e) => e);
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBeTruthy();
      expect(err.message).not.toBe('undefined');
      expect(err.message).not.toBe(`${label} said no`);
    }
  });

  it.each(calls)('%s resolves on success', async (label, invoke) => {
    resolveAll({ data: { data: { ok: true } } });
    await expect(invoke()).resolves.toBeDefined();
  });
});

describe('refreshAccessToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the new access token and reports the pair back', async () => {
    axiosPost.mockResolvedValue({
      data: { data: { accessToken: 'new-at', refreshToken: 'new-rt' } },
    });
    const onSuccess = vi.fn();
    await expect(refreshAccessToken('rt', onSuccess)).resolves.toBe('new-at');
    expect(onSuccess).toHaveBeenCalledWith({
      accessToken: 'new-at',
      refreshToken: 'new-rt',
    });
  });

  it('does not require an onSuccess callback', async () => {
    axiosPost.mockResolvedValue({
      data: { data: { accessToken: 'new-at', refreshToken: 'new-rt' } },
    });
    await expect(refreshAccessToken('rt')).resolves.toBe('new-at');
  });

  it('resolves null when the response carries no access token', async () => {
    axiosPost.mockResolvedValue({ data: { data: {} } });
    const onSuccess = vi.fn();
    await expect(refreshAccessToken('rt', onSuccess)).resolves.toBeNull();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('resolves null when the server rejects the token with 401', async () => {
    axiosPost.mockRejectedValue({ response: { status: 401 } });
    await expect(refreshAccessToken('rt')).resolves.toBeNull();
  });

  it('resolves null when the server rejects the token with 403', async () => {
    axiosPost.mockRejectedValue({ response: { status: 403 } });
    await expect(refreshAccessToken('rt')).resolves.toBeNull();
  });

  it('rethrows a 5xx so the session survives an API restart', async () => {
    const boom = { response: { status: 503 } };
    axiosPost.mockRejectedValue(boom);
    await expect(refreshAccessToken('rt')).rejects.toBe(boom);
  });

  it('rethrows a network failure with no response at all', async () => {
    const boom = new Error('network down');
    axiosPost.mockRejectedValue(boom);
    await expect(refreshAccessToken('rt')).rejects.toBe(boom);
  });
});
