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

const { navigate, params, link, dispatch } = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: {},
  link: { search: 'token=link-tok' },
  dispatch: vi.fn(),
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useParams: () => params,
  useSearchParams: () => [new URLSearchParams(link.search)],
}));
vi.mock('react-redux', () => ({ useDispatch: () => dispatch }));

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
  link.search = 'token=link-tok';
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
      token: 'link-tok',
    });
  });
});

describe("the reset link's token", () => {
  it('refuses to save when the link carries no token, and says why', async () => {
    link.search = '';
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(showToast).toHaveBeenCalledWith(
      'This link is incomplete or out of date. Please request a new one.',
      'error'
    );
    expect(api.AdminSetPassword).not.toHaveBeenCalled();
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

describe('where the admin lands after the reset', () => {
  // The reset leaves nobody signed in, so when 2FA comes next the page starts
  // the half-finished sign-in from the response (as the login page does) and
  // goes to the right 2FA step.
  const withTwoFactor = (over) =>
    setPasswordResponse({
      twoFactorRequired: true,
      twoFactorToken: '2fa-tok',
      isSuperAdmin: true,
      authQuestion: 'What is your favorite hobby?',
      ...over,
    });

  it('starts the 2FA sign-in with the question and token, and goes to answer it', async () => {
    api.AdminSetPassword.mockResolvedValue(
      withTwoFactor({ auth2FADone: true, authType: 'SECRETMESSAGE' })
    );
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'authentication/startTwoFactorSession',
      payload: {
        user: expect.objectContaining({
          id: 'admin-9',
          authQuestion: 'What is your favorite hobby?',
          authType: 'SECRETMESSAGE',
          superAdmin: true,
        }),
        twoFactorToken: '2fa-tok',
      },
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'authentication/setPending2FARoute',
      payload: '/SA/2fa-question/login',
    });
    expect(navigate).toHaveBeenCalledWith('/SA/2fa-question/login');
  });

  it('goes to the authenticator check when that is the method already set up', async () => {
    api.AdminSetPassword.mockResolvedValue(withTwoFactor({ auth2FADone: true, authType: 'AUTHENTICATOR' }));
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(navigate).toHaveBeenCalledWith('/SA/2fa-authentication/login');
  });

  it('goes to set up the authenticator when 2FA is not set up yet', async () => {
    api.AdminSetPassword.mockResolvedValue(withTwoFactor({ auth2FADone: false, authType: 'AUTHENTICATOR' }));
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(navigate).toHaveBeenCalledWith('/2fa/authenticator');
  });

  it('goes to set up the security question when that is the method', async () => {
    api.AdminSetPassword.mockResolvedValue(withTwoFactor({ auth2FADone: false, authType: 'SECRETMESSAGE' }));
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(navigate).toHaveBeenCalledWith('/2fa/security-question');
  });

  it('sends the admin to sign in when the method is unrecognised', async () => {
    api.AdminSetPassword.mockResolvedValue(withTwoFactor({ auth2FADone: true, authType: 'SMS' }));
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(navigate).toHaveBeenCalledWith('/');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('sends the admin to sign in when no 2FA step follows (no 2FA token)', async () => {
    api.AdminSetPassword.mockResolvedValue(setPasswordResponse({ auth2FADone: true, authType: 'SECRETMESSAGE' }));
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(navigate).toHaveBeenCalledWith('/');
    expect(dispatch).not.toHaveBeenCalled();
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

  it('sends the admin to sign in when the save returns no 2FA details', async () => {
    // The password is saved; with nothing to route on, sign-in takes over (it
    // handles 2FA). This used to crash into "Failed to update password."
    api.AdminSetPassword.mockResolvedValue({ data: { status: 'ok', message: 'Password updated' } });
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(showToast).toHaveBeenCalledWith('Password updated', 'success');
    expect(showToast).not.toHaveBeenCalledWith('Failed to update password.', 'error');
    expect(navigate).toHaveBeenCalledWith('/');
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

  it('keeps its own wording for what the API helper really throws on a refusal', async () => {
    // AdminSetPassword re-throws a plain Error carrying its own fallback text;
    // the page shows its usual wording, not "Password setting failed".
    api.AdminSetPassword.mockRejectedValue(new Error('Password setting failed'));
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(showToast).toHaveBeenCalledWith('Failed to update password.', 'error');
  });

  it('says the server could not be reached when the call never got an answer', async () => {
    const unreachable = new Error(
      "Can't reach the server. Check your connection and try again."
    );
    unreachable.isNetworkError = true;
    api.AdminSetPassword.mockRejectedValue(unreachable);
    render(<ForgotPasswordResetPassword />);
    await submitValid();
    expect(showToast).toHaveBeenCalledWith(
      "Can't reach the server. Check your connection and try again.",
      'error'
    );
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
