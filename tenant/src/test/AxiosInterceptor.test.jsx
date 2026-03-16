import { describe, it, expect, vi } from 'vitest';

const mockRequestUse = vi.fn();
const mockResponseUse = vi.fn();

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: mockRequestUse },
        response: { use: mockResponseUse },
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    })),
  },
}));

describe('AxiosInterceptor', () => {
  it('creates an axios instance and sets up interceptors', async () => {
    const axios = (await import('axios')).default;
    const { default: AxiosInterceptor } = await import('../Helper/AxiosInterceptor');

    const instance = AxiosInterceptor('test-token', 'refresh-token');

    expect(axios.create).toHaveBeenCalled();
    expect(instance).toBeDefined();
    expect(mockRequestUse).toHaveBeenCalled();
    expect(mockResponseUse).toHaveBeenCalled();
  });
});
