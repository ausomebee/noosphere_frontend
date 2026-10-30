import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const showToast = vi.fn();
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => showToast(...a),
  showApiError: vi.fn(),
}));

const showValidationErrors = vi.fn();
vi.mock('../Helper/formErrors', () => ({
  showValidationErrors: (...a) => showValidationErrors(...a),
  default: (...a) => showValidationErrors(...a),
}));

const authApi = vi.hoisted(() => ({ SuperAdminChoices: vi.fn() }));
vi.mock('../api/authApis', () => ({ default: authApi }));

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

import SuperAdmin2FASettings from '../Pages/Authentication/SuperAdmin2FASettings';

/**
 * The onboarding step that picks the organization's 2FA method.
 *
 * The form submits three booleans derived from two controls: the chosen method
 * is expanded into a pair of mutually exclusive flags, and the switch becomes
 * `setForAll`. Which screen comes next is decided by the same choice, so the
 * request and the navigation are asserted together.
 *
 * The `RadioInput` labels carry no `htmlFor`, so the radios are clicked
 * directly. The schema's `oneOf` means the submit handler's `default:` arm — the
 * one that logs an invalid method — cannot be reached from the UI at all.
 */

const radio = (value) =>
  document.body.querySelector(`input[type="radio"][value="${value}"]`);
const toggle = () => document.body.querySelector('input[type="checkbox"]');
const submit = async () => {
  await act(async () => {
    fireEvent.click(screen.getByText('Continue'));
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  authApi.SuperAdminChoices.mockResolvedValue({});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('the form', () => {
  it('opens with 2FA on and the authenticator app chosen', () => {
    render(<SuperAdmin2FASettings />);
    expect(toggle().checked).toBe(true);
    expect(radio('qrCode').checked).toBe(true);
    expect(radio('securityQuestion').checked).toBe(false);
  });

  it('recommends the authenticator app', () => {
    render(<SuperAdmin2FASettings />);
    expect(screen.getByText('Recommended')).toBeInTheDocument();
    expect(screen.getByText('Security Question')).toBeInTheDocument();
  });

  it('moves the choice to the security question', () => {
    render(<SuperAdmin2FASettings />);
    fireEvent.click(radio('securityQuestion'));
    expect(radio('securityQuestion').checked).toBe(true);
    expect(radio('qrCode').checked).toBe(false);
  });
});

describe('submitting', () => {
  it('sends the authenticator flags and moves to the QR screen', async () => {
    render(<SuperAdmin2FASettings />);
    await submit();
    expect(authApi.SuperAdminChoices).toHaveBeenCalledWith({
      Authenticator2FA: true,
      securityQuestion: false,
      setForAll: true,
    });
    expect(navigate).toHaveBeenCalledWith('/2fa/authenticator');
  });

  it('sends the security-question flags and moves to that screen', async () => {
    render(<SuperAdmin2FASettings />);
    fireEvent.click(radio('securityQuestion'));
    await submit();
    expect(authApi.SuperAdminChoices).toHaveBeenCalledWith({
      Authenticator2FA: false,
      securityQuestion: true,
      setForAll: true,
    });
    expect(navigate).toHaveBeenCalledWith('/2fa/security-question');
  });

  it('sends setForAll as false when the switch is turned off', async () => {
    render(<SuperAdmin2FASettings />);
    fireEvent.click(toggle());
    await submit();
    expect(authApi.SuperAdminChoices).toHaveBeenCalledWith(
      expect.objectContaining({ setForAll: false })
    );
  });

  it('prefers the message the server sent', async () => {
    authApi.SuperAdminChoices.mockResolvedValue({
      data: { message: 'Preferences stored' },
    });
    render(<SuperAdmin2FASettings />);
    await submit();
    expect(showToast).toHaveBeenCalledWith('Preferences stored', 'success');
  });

  it('falls back to its own success wording', async () => {
    render(<SuperAdmin2FASettings />);
    await submit();
    expect(showToast).toHaveBeenCalledWith('2FA settings saved successfully!', 'success');
  });

  it('reports the reason the server refused it and stays put', async () => {
    authApi.SuperAdminChoices.mockRejectedValue({
      response: { data: { message: '2FA is enforced by policy' } },
    });
    render(<SuperAdmin2FASettings />);
    await submit();
    expect(showToast).toHaveBeenCalledWith('2FA is enforced by policy', 'error');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('falls back to its own failure wording', async () => {
    authApi.SuperAdminChoices.mockRejectedValue(new Error('network down'));
    render(<SuperAdmin2FASettings />);
    await submit();
    expect(showToast).toHaveBeenCalledWith('Failed to update 2FA settings.', 'error');
  });

  it('logs the failure under a development build', async () => {
    authApi.SuperAdminChoices.mockRejectedValue(new Error('network down'));
    render(<SuperAdmin2FASettings />);
    await submit();
    expect(console.error).toHaveBeenCalledWith(
      '2FA settings error:',
      expect.any(Error)
    );
  });

  it('stays quiet under a production build', async () => {
    vi.stubEnv('DEV', false);
    authApi.SuperAdminChoices.mockRejectedValue(new Error('network down'));
    render(<SuperAdmin2FASettings />);
    await submit();
    expect(showToast).toHaveBeenCalledWith('Failed to update 2FA settings.', 'error');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('locks the button while the request is in flight', async () => {
    let release;
    authApi.SuperAdminChoices.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve({});
      })
    );
    render(<SuperAdmin2FASettings />);
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() =>
      expect(document.body.querySelector('.auth-button')).toBeDisabled()
    );
    await act(async () => { release(); });
    await waitFor(() => expect(navigate).toHaveBeenCalled());
  });

  it('never reaches the validation-error handler, since the defaults are valid', async () => {
    render(<SuperAdmin2FASettings />);
    await submit();
    expect(showValidationErrors).not.toHaveBeenCalled();
    expect(document.body.querySelector('.error-message')).toBeNull();
  });
});
