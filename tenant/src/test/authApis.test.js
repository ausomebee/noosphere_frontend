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

  describe('AdminVerifyToken', () => {
    it('sends POST with userId and token', async () => {
      axios.post.mockResolvedValueOnce({ data: { valid: true } });
      await api.AdminVerifyToken({ userId: 'u1', token: 'tok123' });
      expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/auth/tenant/verify'), { userId: 'u1', token: 'tok123' });
    });
    it('throws on failure', async () => {
      axios.post.mockRejectedValueOnce({ response: { data: { message: 'Invalid' } } });
      await expect(api.AdminVerifyToken({ userId: 'u1', token: 'bad' })).rejects.toThrow('Invalid');
    });
  });

  describe('AdminOnboarding', () => {
    it('sends PATCH with id and password', async () => {
      axios.patch.mockResolvedValueOnce({ data: { status: 'ok' } });
      await api.AdminOnboarding({ id: 'u1', password: 'newPass' });
      expect(axios.patch).toHaveBeenCalledWith(expect.stringContaining('/tenant/setpassword'), { id: 'u1', password: 'newPass' });
    });
    it('throws on failure', async () => {
      axios.patch.mockRejectedValueOnce({ response: { data: { message: 'Onboarding failed' } } });
      await expect(api.AdminOnboarding({ id: 'u1', password: 'x' })).rejects.toThrow('Onboarding failed');
    });
  });

  describe('Admin2FALink', () => {
    it('sends GET with id and moduleType', async () => {
      axios.get.mockResolvedValueOnce({ data: { link: 'otpauth://...' } });
      await api.Admin2FALink({ id: 'u1', moduleType: 'TENANT' });
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/auth/tenant/u1/TENANT'));
    });
    it('throws on failure', async () => {
      axios.get.mockRejectedValueOnce({ response: { data: { message: '2FA fail' } } });
      await expect(api.Admin2FALink({ id: 'u1', moduleType: 'TENANT' })).rejects.toThrow('2FA fail');
    });
  });

  describe('GetSuperAdminChoices', () => {
    it('sends GET with id and headers', async () => {
      axios.get.mockResolvedValueOnce({ data: { Authenticator2FA: true } });
      await api.GetSuperAdminChoices({ id: 't1' });
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/tenant/tenantadminchoices/t1'),
        expect.objectContaining({ headers: { "Content-Type": "application/json" } })
      );
    });
    it('throws on failure', async () => {
      axios.get.mockRejectedValueOnce({ response: { data: { message: 'Not found' } } });
      await expect(api.GetSuperAdminChoices({ id: 't1' })).rejects.toThrow('Not found');
    });
  });

  describe('Admin2FAVerifySecretMessage', () => {
    it('sends POST with secret answer', async () => {
      axios.post.mockResolvedValueOnce({ data: { verified: true } });
      await api.Admin2FAVerifySecretMessage({ userId: 'u1', secret: 'answer', authQuestion: 'What?' });
      expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/auth/tenant/verifysecretmessage'), { userId: 'u1', secret: 'answer', authQuestion: 'What?' });
    });
    it('throws on failure', async () => {
      axios.post.mockRejectedValueOnce({ response: { data: { message: 'Wrong answer' } } });
      await expect(api.Admin2FAVerifySecretMessage({ userId: 'u1', secret: 'bad', authQuestion: 'What?' })).rejects.toThrow('Wrong answer');
    });
  });

  describe('error paths - default messages', () => {
    it('AdminSetPassword throws on error with nested data.data', async () => {
      axios.patch.mockRejectedValueOnce({ response: { data: { data: { message: 'Fail' } } } });
      await expect(api.AdminSetPassword({ id: '1', password: 'x' })).rejects.toThrow('Fail');
    });
    it('AdminSetPassword throws default message', async () => {
      axios.patch.mockRejectedValueOnce(new Error('Network'));
      await expect(api.AdminSetPassword({ id: '1', password: 'x' })).rejects.toThrow('Password setting failed');
    });
    it('Admin2FAVerify throws on error', async () => {
      axios.post.mockRejectedValueOnce({ response: { data: { message: 'Bad token' } } });
      await expect(api.Admin2FAVerify({ userId: 'u1', token: 'bad' })).rejects.toThrow('Bad token');
    });
    it('Admin2FACreateSecretMessage throws on error', async () => {
      axios.post.mockRejectedValueOnce({ response: { data: { message: 'Fail' } } });
      await expect(api.Admin2FACreateSecretMessage({ userId: 'u1', secret: 's', authQuestion: 'q', module: 'TENANT' })).rejects.toThrow('Fail');
    });
    it('SuperAdminChoices throws on error', async () => {
      axios.patch.mockRejectedValueOnce({ response: { data: { message: 'Fail' } } });
      await expect(api.SuperAdminChoices({ Authenticator2FA: true, securityQuestion: false, setForAll: true, tenantId: 't1' })).rejects.toThrow('Fail');
    });
    it('AdminForgetPassword throws default message', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network'));
      await expect(api.AdminForgetPassword({ email: 'x@x.com' })).rejects.toThrow('Forget Password Email failed');
    });
  });

  describe('refreshAccessToken', () => {
    it('posts to /auth/refresh-token and calls onSuccess with new tokens', async () => {
      const { refreshAccessToken } = await import('../api/authApis');
      const onSuccess = vi.fn();
      axios.post.mockResolvedValueOnce({ data: { data: { accessToken: 'new-token', refreshToken: 'new-refresh' } } });

      const result = await refreshAccessToken('refresh-t', onSuccess);
      expect(result).toBe('new-token');
      expect(onSuccess).toHaveBeenCalledWith({ accessToken: 'new-token', refreshToken: 'new-refresh' });
    });

    it('returns null on failure', async () => {
      const { refreshAccessToken } = await import('../api/authApis');
      axios.post.mockRejectedValueOnce(new Error('fail'));

      const result = await refreshAccessToken('bad-refresh', vi.fn());
      expect(result).toBeNull();
    });
  });
});
