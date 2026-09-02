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

const authApi = vi.hoisted(() => ({ AdminForgetPassword: vi.fn() }));
vi.mock('../api/authApis', () => ({ default: authApi }));

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

import ForgotPassword from '../Pages/Authentication/ForgotPassword/ForgotPassword';

/**
 * The "email me a reset link" screen.
 *
 * Success is judged by an exact string in the response body rather than the
 * HTTP status, so a 200 carrying any other message is thrown by the handler
 * itself and lands in the same catch as a network failure. That is why an
 * unexpected body reports the screen's own generic wording — the thrown Error
 * has no `response`, so the server-message branch cannot apply to it.
 *
 * The inline error is held in component state as well as being toasted, so it
 * survives on screen until the next submit clears it.
 */

const emailField = () => document.body.querySelector('#email');
const submit = async () => {
  await act(async () => {
    fireEvent.click(screen.getByText('Continue'));
  });
};
const fill = (value = 'ada@example.com') => {
  fireEvent.change(emailField(), { target: { value } });
};

beforeEach(() => {
  vi.clearAllMocks();
  authApi.AdminForgetPassword.mockResolvedValue({
    data: { message: 'mail sent successfully' },
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('the form', () => {
  it('opens with an empty field under its heading', () => {
    render(<ForgotPassword />);
    expect(screen.getByText('Forgot Password')).toBeInTheDocument();
    expect(emailField().value).toBe('');
  });

  it('refuses a blank address', async () => {
    render(<ForgotPassword />);
    await submit();
    await waitFor(() =>
      expect(screen.getByText('Email is required')).toBeInTheDocument()
    );
    expect(showValidationErrors).toHaveBeenCalled();
    expect(authApi.AdminForgetPassword).not.toHaveBeenCalled();
  });

  it('refuses something that is not an address', async () => {
    render(<ForgotPassword />);
    fill('not-an-address');
    await submit();
    await waitFor(() =>
      expect(
        screen.getByText('Please enter a valid email address')
      ).toBeInTheDocument()
    );
    expect(authApi.AdminForgetPassword).not.toHaveBeenCalled();
  });
});

describe('requesting the link', () => {
  it('sends the address and moves to the confirmation screen', async () => {
    render(<ForgotPassword />);
    fill();
    await submit();
    expect(authApi.AdminForgetPassword).toHaveBeenCalledWith({
      email: 'ada@example.com',
    });
    expect(showToast).toHaveBeenCalledWith(
      'Password reset email sent successfully!',
      'success'
    );
    expect(navigate).toHaveBeenCalledWith('/password-reset-confirmation');
  });

  it('treats any other response body as a failure', async () => {
    authApi.AdminForgetPassword.mockResolvedValue({
      data: { message: 'queued' },
    });
    render(<ForgotPassword />);
    fill();
    await submit();
    await waitFor(() =>
      expect(
        screen.getByText('Failed to send password reset email.')
      ).toBeInTheDocument()
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows the reason the server gave', async () => {
    authApi.AdminForgetPassword.mockRejectedValue({
      response: { data: { message: 'No account with that address' } },
    });
    render(<ForgotPassword />);
    fill();
    await submit();
    await waitFor(() =>
      expect(
        screen.getByText('No account with that address')
      ).toBeInTheDocument()
    );
    expect(showToast).toHaveBeenCalledWith('No account with that address', 'error');
  });

  it('falls back to its own wording for a bare failure', async () => {
    authApi.AdminForgetPassword.mockRejectedValue(new Error('offline'));
    render(<ForgotPassword />);
    fill();
    await submit();
    await waitFor(() =>
      expect(
        screen.getByText('Failed to send password reset email.')
      ).toBeInTheDocument()
    );
  });

  it('clears the previous error before trying again', async () => {
    authApi.AdminForgetPassword.mockRejectedValueOnce(new Error('offline'));
    render(<ForgotPassword />);
    fill();
    await submit();
    await waitFor(() =>
      expect(
        screen.getByText('Failed to send password reset email.')
      ).toBeInTheDocument()
    );

    await submit();
    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(
      screen.queryByText('Failed to send password reset email.')
    ).toBeNull();
  });

  it('logs the failure under a development build', async () => {
    authApi.AdminForgetPassword.mockRejectedValue(new Error('offline'));
    render(<ForgotPassword />);
    fill();
    await submit();
    expect(console.error).toHaveBeenCalledWith(
      'Password reset failed:',
      expect.any(Error)
    );
  });

  it('stays quiet under a production build', async () => {
    vi.stubEnv('DEV', false);
    authApi.AdminForgetPassword.mockRejectedValue(new Error('offline'));
    render(<ForgotPassword />);
    fill();
    await submit();
    await waitFor(() =>
      expect(
        screen.getByText('Failed to send password reset email.')
      ).toBeInTheDocument()
    );
    expect(console.error).not.toHaveBeenCalled();
  });

  it('locks the button while the request is in flight', async () => {
    let release;
    authApi.AdminForgetPassword.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve({ data: { message: 'mail sent successfully' } });
      })
    );
    render(<ForgotPassword />);
    fill();
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() =>
      expect(document.body.querySelector('.auth-button')).toBeDisabled()
    );
    await act(async () => { release(); });
    await waitFor(() => expect(navigate).toHaveBeenCalled());
  });
});
