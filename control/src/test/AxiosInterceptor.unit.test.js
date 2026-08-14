import { describe, it, expect, vi, beforeEach } from 'vitest';

let requestFn;
let requestErrFn;
let responseFn;
let responseErrFn;

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => {
      const instance = vi.fn();
      instance.interceptors = {
        request: {
          use: vi.fn((fn, err) => {
            requestFn = fn;
            requestErrFn = err;
          }),
        },
        response: {
          use: vi.fn((fn, err) => {
            responseFn = fn;
            responseErrFn = err;
          }),
        },
      };
      return instance;
    }),
  },
}));

vi.mock('../api/authApis', () => ({
  default: {
    refreshAccessToken: vi.fn(),
  },
}));

vi.mock('../Helper/storeRef', () => ({
  getStore: vi.fn(() => ({
    getState: vi.fn(() => ({ authentication: { refreshToken: 'stored-refresh' } })),
    dispatch: vi.fn(),
  })),
  getPersistor: vi.fn(() => ({ purge: vi.fn() })),
}));

vi.mock('../ReduxStore/features/authentication', () => ({
  logout: vi.fn(() => ({ type: 'auth/logout' })),
  setTokens: vi.fn((tokens) => ({ type: 'auth/setTokens', payload: tokens })),
}));

vi.mock('../Helper/ShowToast', () => ({
  showToast: vi.fn(),
}));

import axios from 'axios';
import AxiosInterceptor from '../Helper/AxiosInterceptor';

describe('AxiosInterceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestFn = null;
    responseFn = null;
    responseErrFn = null;
  });

  it('creates axios instance with withCredentials', () => {
    AxiosInterceptor('token', 'refresh');
    expect(axios.create).toHaveBeenCalledWith({ withCredentials: true, timeout: 30000 });
  });

  it('registers request and response interceptors', () => {
    const instance = AxiosInterceptor('token', 'refresh');
    expect(instance.interceptors.request.use).toHaveBeenCalledTimes(1);
    expect(instance.interceptors.response.use).toHaveBeenCalledTimes(1);
  });

  describe('request interceptor', () => {
    it('adds Authorization header when token exists', () => {
      AxiosInterceptor('my-token', 'refresh');
      const config = { headers: {} };
      const result = requestFn(config);
      expect(result.headers['Authorization']).toBe('Bearer my-token');
    });

    it('skips Authorization header when no token', () => {
      AxiosInterceptor(null, 'refresh');
      const config = { headers: {} };
      const result = requestFn(config);
      expect(result.headers['Authorization']).toBeUndefined();
    });

    it('preserves existing config properties', () => {
      AxiosInterceptor('token', 'refresh');
      const config = { headers: {}, url: '/api/test', method: 'GET' };
      const result = requestFn(config);
      expect(result.url).toBe('/api/test');
      expect(result.method).toBe('GET');
    });
  });

  describe('response interceptor', () => {
    it('passes through successful responses', () => {
      AxiosInterceptor('token', 'refresh');
      const response = { data: { message: 'ok' }, status: 200 };
      expect(responseFn(response)).toEqual(response);
    });

    it('rejects 500 errors without auth message', async () => {
      AxiosInterceptor('token', 'refresh');
      const error = {
        response: { status: 500, data: { message: 'Internal Server Error' } },
        config: {},
      };
      await expect(responseErrFn(error)).rejects.toEqual(error);
    });

    it('rejects errors without response', async () => {
      AxiosInterceptor('token', 'refresh');
      const error = { config: {} };
      await expect(responseErrFn(error)).rejects.toEqual(error);
    });

    it('triggers refresh on 500 with auth error message', async () => {
      const api = await import('../api/authApis');
      api.default.refreshAccessToken.mockResolvedValue(null);

      AxiosInterceptor('token', 'refresh');
      const error = {
        response: { status: 500, data: { message: 'Not Authorized: Invalid or expired token' } },
        config: { headers: {} },
      };

      await responseErrFn(error).catch(() => {});
      expect(api.default.refreshAccessToken).toHaveBeenCalled();
    });
  });
});
