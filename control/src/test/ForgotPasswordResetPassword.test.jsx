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
}));

const api = vi.hoisted(() => ({
  GetSuperAdminChoices: vi.fn(),
  AdminSetPassword: vi.fn(),
}));
vi.mock('../api/authApis', () => ({ default: api }));

const { navigate, params } = vi.hoisted(() => ({ navigate: vi.fn(), params: {} }));
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useParams: () => params,
}));

import ForgotPasswordResetPassword from '../Pages/Authentication/ForgotPassword/ForgotPasswordResetPassword';

/**
 * The last step of the forgot-password flow: pick a new password.
 *
 * Where it sends the admin afterwards is decided by three values pulled from
 * two responses — `setForAll` from the 2FA choices, and `authType` plus
 * `auth2FADone` from the set-password response itself. The six combinations are
 * enumerated below, including the one the code silently ignores: an admin who
 * has already done 2FA on a server that does not force it lands nowhere.
 *
 * Both fields register through react-hook-form, so a submit is a real form
 * submit and every assertion about validation waits for the resolver.
 */

const STRONG = 'Str0ng!pass';

const setPasswordResponse = (over = {}) => ({
  data: {
    message: 'Password updated successfully!',
    data: { authType: 'AUTHENTICATOR', auth2FADone: false, ...over },
  },
});

const fill = (password, confirm = password) => {
  fireEvent.change(screen.getByPlaceholderText('Enter new password'), {
    target: { value: password },
  });
  fireEvent.change(screen.getByPlaceholderText('Confirm new password'), {
    target: { value: confirm },
  });
};

const submit = async () => {
  await act(async () => {
    fireEvent.click(screen.getByText('Continue'));
  });
};

const submitValid = async () => {
  fill(STRONG);
  await submit();
};

beforeEach(() => {
  vi.clearAllMocks();
  params.userId = 'admin-9';
  api.AdminSetPassword.mockResolvedValue(setPasswordResponse());
  api.GetSuperAdminChoices.mockResolvedValue({ data: { data: { setForAll: false } } });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('the form rules', () => {
  it('refuses an empty form', async () => {
    render(<ForgotPasswordResetPassword />);
    await submit();
    await waitFor(() => expect(showValidationErrors).toHaveBeenCalled());
    expect(api.AdminSetPassword).not.toHaveBeenCalled();
  });

  it('refuses a password that misses a rule', async () => {
    render(<ForgotPasswordResetPassword />);
    fill('alllowercase1!');
    await submit();
    await waitFor(() =>
      expect(screen.getAllByText('One uppercase letter').length).toBeGreaterThan(0)
    );
    expect(api.AdminSetPassword).not.toHaveBeenCalled();
  });

  it('refuses a confirmation that does not match', async () => {
    render(<ForgotPasswordResetPassword />);
    fill(STRONG, 'Other1!pass');
    await submit();
    await waitFor(() =>
      expect(screen.getByText('Passwords must match')).toBeInTheDocument()
    );
    expect(api.AdminSetPassword).not.toHaveBeenCalled();
  });

  it('sends the new password against the id from the route', async () => {
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(api.AdminSetPassword).toHaveBeenCalledWith({
      id: 'admin-9',
      password: STRONG,
    });
  });
});

describe('the success message', () => {
  it('repeats what the server said', async () => {
    api.AdminSetPassword.mockResolvedValue(
      setPasswordResponse({ authType: 'AUTHENTICATOR' })
    );
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(showToast).toHaveBeenCalledWith('Password updated successfully!', 'success');
  });

  it('falls back to its own wording when the server sent none', async () => {
    const response = setPasswordResponse();
    delete response.data.message;
    api.AdminSetPassword.mockResolvedValue(response);
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(showToast).toHaveBeenCalledWith('Password updated successfully!', 'success');
  });
});

describe('where the admin lands', () => {
  const forceFor = (setForAll) =>
    api.GetSuperAdminChoices.mockResolvedValue({ data: { data: { setForAll } } });

  it('goes to the authenticator setup when 2FA is forced and not yet done', async () => {
    forceFor(true);
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(navigate).toHaveBeenCalledWith('/2fa/authenticator');
  });

  it('goes to the security question setup when that is the method', async () => {
    forceFor(true);
    api.AdminSetPassword.mockResolvedValue(
      setPasswordResponse({ authType: 'SECRETMESSAGE' })
    );
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(navigate).toHaveBeenCalledWith('/2fa/security-question');
  });

  it('complains when 2FA is forced but the method is unrecognised', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    forceFor(true);
    api.AdminSetPassword.mockResolvedValue(setPasswordResponse({ authType: null }));
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(showToast).toHaveBeenCalledWith('Unknown authentication type', 'error');
    expect(spy).toHaveBeenCalledWith('Unknown authType:', null);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('goes to the authenticator login when 2FA is forced and already done', async () => {
    forceFor(true);
    api.AdminSetPassword.mockResolvedValue(
      setPasswordResponse({ auth2FADone: true })
    );
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(navigate).toHaveBeenCalledWith('/SA/2fa-authentication/login');
  });

  it('goes to the question login when 2FA is forced and already done', async () => {
    forceFor(true);
    api.AdminSetPassword.mockResolvedValue(
      setPasswordResponse({ auth2FADone: true, authType: 'SECRETMESSAGE' })
    );
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(navigate).toHaveBeenCalledWith('/SA/2fa-question/login');
  });

  it('complains when an enrolled admin has an unrecognised method', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    forceFor(true);
    api.AdminSetPassword.mockResolvedValue(
      setPasswordResponse({ auth2FADone: true, authType: 'SMS' })
    );
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(showToast).toHaveBeenCalledWith('Unknown authentication type', 'error');
    expect(spy).toHaveBeenCalledWith('Unknown authType:', 'SMS');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('goes home when 2FA is not forced and not yet done', async () => {
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('leaves an already-enrolled admin where they are when 2FA is optional', async () => {
    api.AdminSetPassword.mockResolvedValue(
      setPasswordResponse({ auth2FADone: true })
    );
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    // None of the three arms match this combination, so the password is saved
    // and the screen simply stays put.
    expect(showToast).toHaveBeenCalledWith('Password updated successfully!', 'success');
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('reading the 2FA choices', () => {
  it('treats a failed choices call as 2FA not being forced', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.GetSuperAdminChoices.mockRejectedValue(new Error('offline'));
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(spy).toHaveBeenCalledWith(
      'Error fetching SuperAdmin choices:',
      expect.any(Error)
    );
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('keeps that failure out of the production console', async () => {
    vi.stubEnv('DEV', false);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.GetSuperAdminChoices.mockRejectedValue(new Error('offline'));
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(spy).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/');
  });
});

describe('a refused update', () => {
  it('shows the message the server sent', async () => {
    api.AdminSetPassword.mockRejectedValue({
      response: { data: { message: 'Reset link expired' } },
    });
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(showToast).toHaveBeenCalledWith('Reset link expired', 'error');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('falls back to its own wording for a bare failure', async () => {
    api.AdminSetPassword.mockRejectedValue(new Error('network down'));
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(showToast).toHaveBeenCalledWith('Failed to update password.', 'error');
  });

  it('treats a response without the expected payload as a failure', async () => {
    // Destructuring authType out of a missing `data.data` throws, and the catch
    // reports it like any other failure.
    api.AdminSetPassword.mockResolvedValue({ data: {} });
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(showToast).toHaveBeenCalledWith('Failed to update password.', 'error');
  });

  it('keeps the failure out of the production console', async () => {
    vi.stubEnv('DEV', false);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.AdminSetPassword.mockRejectedValue(new Error('network down'));
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(spy).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Failed to update password.', 'error');
  });

  it('frees the button again once the failure is reported', async () => {
    api.AdminSetPassword.mockRejectedValue(new Error('network down'));
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    await waitFor(() =>
      expect(document.querySelector('.custom-button')).not.toBeDisabled()
    );
  });
});

describe('the unrecognised-method warnings in production', () => {
  const forceFor = (setForAll) =>
    api.GetSuperAdminChoices.mockResolvedValue({ data: { data: { setForAll } } });

  it('keeps an unrecognised enrolment method out of the production console', async () => {
    vi.stubEnv('DEV', false);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    forceFor(true);
    api.AdminSetPassword.mockResolvedValue(setPasswordResponse({ authType: 'SMS' }));
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(showToast).toHaveBeenCalledWith('Unknown authentication type', 'error');
    expect(spy).not.toHaveBeenCalled();
  });

  it('keeps an unrecognised login method out of the production console', async () => {
    vi.stubEnv('DEV', false);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    forceFor(true);
    api.AdminSetPassword.mockResolvedValue(
      setPasswordResponse({ auth2FADone: true, authType: 'SMS' })
    );
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(showToast).toHaveBeenCalledWith('Unknown authentication type', 'error');
    expect(spy).not.toHaveBeenCalled();
  });
});
