import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

// Mock env
vi.stubEnv('VITE_API_URL', 'https://api.test.com');

describe('authApis', () => {
  let api;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Dynamic import to pick up mocked env
    const mod = await import('../api/authApis');
    api = mod.default;
  });

  describe('AdminLogin', () => {
    it('sends POST with email and password', async () => {
      axios.post.mockResolvedValueOnce({ data: { status: 'ok', data: { id: '1' } } });
      const result = await api.AdminLogin({ email: 'a@b.com', password: '123' });
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/tenant/signin'),
        { email: 'a@b.com', password: '123' }
      );
      expect(result.data.status).toBe('ok');
    });

    it('throws on failure', async () => {
      axios.post.mockRejectedValueOnce({
        response: { data: { message: 'Bad credentials' } },
      });
      await expect(api.AdminLogin({ email: 'a@b.com', password: 'wrong' }))
        .rejects.toThrow('Bad credentials');
    });

    it('throws default message when no response message', async () => {
      axios.post.mockRejectedValueOnce(new Error('Network error'));
      await expect(api.AdminLogin({ email: 'a@b.com', password: '123' }))
        .rejects.toThrow('Login failed');
    });
  });

  describe('AdminForgetPassword', () => {
    it('sends GET with email', async () => {
      axios.get.mockResolvedValueOnce({ data: { status: 'ok' } });
      await api.AdminForgetPassword({ email: 'a@b.com' });
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/tenant/forgotpassword/a@b.com')
      );
    });

    it('throws on failure', async () => {
      axios.get.mockRejectedValueOnce({
        response: { data: { message: 'Not found' } },
      });
      await expect(api.AdminForgetPassword({ email: 'bad@b.com' }))
        .rejects.toThrow('Not found');
    });
  });

  describe('AdminSetPassword', () => {
    it('sends PATCH with id and password', async () => {
      axios.patch.mockResolvedValueOnce({ data: { status: 'ok' } });
      await api.AdminSetPassword({ id: '1', password: 'newPass' });
      expect(axios.patch).toHaveBeenCalledWith(
        expect.stringContaining('/tenant/setpassword'),
        { id: '1', password: 'newPass' }
      );
    });
  });

  describe('Admin2FAVerify', () => {
    it('sends POST with userId and token', async () => {
      axios.post.mockResolvedValueOnce({ data: { status: 'ok' } });
      await api.Admin2FAVerify({ userId: 'u1', token: '123456' });
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/auth/tenant/verify'),
        { userId: 'u1', token: '123456' }
      );
    });
  });

  describe('Admin2FACreateSecretMessage', () => {
    it('sends POST with question and answer', async () => {
      axios.post.mockResolvedValueOnce({ data: { status: 'ok' } });
      await api.Admin2FACreateSecretMessage({
        userId: 'u1',
        secret: 'myAnswer',
        authQuestion: 'What is your pet?',
        module: 'TENANT',
      });
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/auth/tenant/createsecretemessage'),
        {
          userId: 'u1',
          secret: 'myAnswer',
          authQuestion: 'What is your pet?',
          module: 'TENANT',
        }
      );
    });
  });

  describe('SuperAdminChoices', () => {
    it('sends PATCH with 2FA choices', async () => {
      axios.patch.mockResolvedValueOnce({ data: { status: 'ok' } });
      await api.SuperAdminChoices({
        Authenticator2FA: true,
        securityQuestion: false,
        setForAll: true,
        tenantId: 't1',
      });
      expect(axios.patch).toHaveBeenCalledWith(
        expect.stringContaining('/tenant/tenantadminchoices'),
        {
          Authenticator2FA: true,
          securityQuestion: false,
          setForAll: true,
          tenantId: 't1',
        }
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('dispatches updateAccessToken on success', async () => {
      const { refreshAccessToken } = await import('../api/authApis');
      const dispatch = vi.fn();
      axios.post.mockResolvedValueOnce({ data: { accessToken: 'new-token' } });

      const result = await refreshAccessToken('refresh-t', dispatch);
      expect(result).toBe('new-token');
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ payload: 'new-token' })
      );
    });

    it('returns null on failure', async () => {
      const { refreshAccessToken } = await import('../api/authApis');
      const dispatch = vi.fn();
      axios.post.mockRejectedValueOnce(new Error('fail'));

      const result = await refreshAccessToken('bad-refresh', dispatch);
      expect(result).toBeNull();
    });
  });
});
