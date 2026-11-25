import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

/**
 * How the super admin's 2FA choice decides where an admin can go from a 2FA
 * setup page: the super admin back to their own settings, an admin under a
 * method set for everyone nowhere (no choice to make), and an admin left to
 * choose back to their own choice page.
 */

const api = vi.hoisted(() => ({ GetSuperAdminChoices: vi.fn() }));
vi.mock('../api/authApis', () => ({ default: api }));
const auth = vi.hoisted(() => ({ value: { user: { superAdmin: false } } }));
vi.mock('../hooks/useAuth', () => ({ default: () => auth.value }));

import useTwoFactorPolicy, {
  enforcedMethodFrom,
  setupBackTarget,
} from '../hooks/useTwoFactorPolicy';

const choices = (over) => ({
  data: {
    data: { isEnabled: true, setForAll: false, Authenticator2FA: false, securityQuestion: false, ...over },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  auth.value = { user: { superAdmin: false } };
});

describe('enforcedMethodFrom', () => {
  it('reads the method set for everyone', () => {
    expect(enforcedMethodFrom({ setForAll: true, Authenticator2FA: true })).toBe('AUTHENTICATOR');
    expect(enforcedMethodFrom({ setForAll: true, securityQuestion: true })).toBe('SECRETMESSAGE');
  });

  it('enforces nothing when each admin chooses, 2FA is off, or no method is named', () => {
    expect(enforcedMethodFrom({ setForAll: false, Authenticator2FA: true })).toBeNull();
    expect(enforcedMethodFrom({ isEnabled: false, setForAll: true, Authenticator2FA: true })).toBeNull();
    expect(enforcedMethodFrom({ setForAll: true })).toBeNull();
    expect(enforcedMethodFrom(undefined)).toBeNull();
  });
});

describe('setupBackTarget', () => {
  it('returns the super admin to their own 2FA settings', () => {
    expect(setupBackTarget({ isSuperAdmin: true, status: 'loading' })).toBe('/SA/2fa-settings');
  });

  it('offers an admin their own choice only when nothing is set for everyone', () => {
    expect(setupBackTarget({ isSuperAdmin: false, status: 'ready', enforcedMethod: null })).toBe('/2fa/choice');
    expect(setupBackTarget({ isSuperAdmin: false, status: 'ready', enforcedMethod: 'AUTHENTICATOR' })).toBeNull();
  });

  it('offers no way back while the policy is unknown', () => {
    expect(setupBackTarget({ isSuperAdmin: false, status: 'loading' })).toBeNull();
    expect(setupBackTarget({ isSuperAdmin: false, status: 'failed' })).toBeNull();
  });
});

describe('useTwoFactorPolicy', () => {
  it('enforces the method the super admin set for everyone', async () => {
    api.GetSuperAdminChoices.mockResolvedValue(choices({ setForAll: true, Authenticator2FA: true }));
    const { result } = renderHook(() => useTwoFactorPolicy());
    expect(result.current.backTarget).toBeNull();
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.enforcedMethod).toBe('AUTHENTICATOR');
    expect(result.current.backTarget).toBeNull();
  });

  it('lets an admin go back to choose when nothing is set for everyone', async () => {
    api.GetSuperAdminChoices.mockResolvedValue(choices({ setForAll: false }));
    const { result } = renderHook(() => useTwoFactorPolicy());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.backTarget).toBe('/2fa/choice');
  });

  it('offers no way back when the policy cannot be read', async () => {
    api.GetSuperAdminChoices.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useTwoFactorPolicy());
    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.backTarget).toBeNull();
  });

  it('always returns the super admin to their own 2FA settings', async () => {
    auth.value = { user: { superAdmin: true } };
    api.GetSuperAdminChoices.mockResolvedValue(choices({ setForAll: true, Authenticator2FA: true }));
    const { result } = renderHook(() => useTwoFactorPolicy());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.isSuperAdmin).toBe(true);
    expect(result.current.backTarget).toBe('/SA/2fa-settings');
  });
});
