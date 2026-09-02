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

const authApi = vi.hoisted(() => ({ AdminSetPassword: vi.fn() }));
vi.mock('../api/authApis', () => ({ default: authApi }));

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

const state = {
  authentication: { accessToken: 'at', refreshToken: 'rt', user: { id: 'u1' } },
};
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (fn) => fn(state),
}));

import SuperAdminChangePassword from '../Pages/Authentication/SuperAdminChangePassword';

/**
 * The forced password change that opens super-admin onboarding.
 *
 * Two fields, both judged by the shared eight-character policy — the confirm
 * field is held to the full strength rules rather than merely "must match", so
 * a weak value fails twice. On success the screen prefers whatever message the
 * server sent and falls back to its own, then hands off to the administrative
 * password step. Labels carry no `htmlFor`, so fields are reached by id.
 */

const STRONG = 'Str0ng!Pass';

const field = (id) => document.body.querySelector(`#${id}`);
const submit = async () => {
  await act(async () => {
    fireEvent.click(screen.getByText('Continue'));
  });
};

const fill = ({ next = STRONG, confirm = STRONG } = {}) => {
  fireEvent.change(field('newPassword'), { target: { value: next } });
  fireEvent.change(field('confirmPassword'), { target: { value: confirm } });
};

beforeEach(() => {
  vi.clearAllMocks();
  state.authentication.user = { id: 'u1' };
  authApi.AdminSetPassword.mockResolvedValue({});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('the form', () => {
  it('renders both fields under the onboarding heading', () => {
    render(<SuperAdminChangePassword />);
    expect(screen.getByText('Change your password')).toBeInTheDocument();
    expect(field('newPassword')).toBeInTheDocument();
    expect(field('confirmPassword')).toBeInTheDocument();
  });

  it('shows the strength checklist once something is typed', () => {
    render(<SuperAdminChangePassword />);
    expect(document.body.querySelector('.password-strength')).toBeNull();
    fireEvent.input(field('newPassword'), { target: { value: STRONG } });
    const meter = document.body.querySelector('.password-strength');
    expect(meter.textContent).toContain('Strong password');
    expect(meter.textContent).toContain('At least 8 characters');
  });

  it('confirms a match once the second field agrees', () => {
    render(<SuperAdminChangePassword />);
    fireEvent.change(field('newPassword'), { target: { value: STRONG } });
    fireEvent.input(field('confirmPassword'), { target: { value: STRONG } });
    expect(document.body.querySelector('.password-match').textContent).toContain(
      'Passwords match'
    );
  });

  it('calls out a mismatch only after the confirm field is left', () => {
    render(<SuperAdminChangePassword />);
    fireEvent.change(field('newPassword'), { target: { value: STRONG } });
    fireEvent.input(field('confirmPassword'), { target: { value: 'Other!Pass1' } });
    expect(document.body.querySelector('.password-match')).toBeNull();

    fireEvent.blur(field('confirmPassword'));
    expect(document.body.querySelector('.password-match').textContent).toContain(
      'Passwords do not match'
    );
  });
});

describe('validation', () => {
  it('refuses an empty form', async () => {
    render(<SuperAdminChangePassword />);
    await submit();
    await waitFor(() => expect(showValidationErrors).toHaveBeenCalled());
    expect(authApi.AdminSetPassword).not.toHaveBeenCalled();
  });

  it('refuses a password under eight characters', async () => {
    render(<SuperAdminChangePassword />);
    fill({ next: 'Sh0rt!', confirm: 'Sh0rt!' });
    await submit();
    // The rule applies to both fields, so the message comes back twice.
    await waitFor(() =>
      expect(screen.getAllByText('At least 8 characters')).toHaveLength(2)
    );
    expect(authApi.AdminSetPassword).not.toHaveBeenCalled();
  });

  it('refuses a confirmation that does not match a strong password', async () => {
    render(<SuperAdminChangePassword />);
    fill({ confirm: 'Other!Pass1' });
    await submit();
    await waitFor(() =>
      expect(screen.getByText('Passwords must match')).toBeInTheDocument()
    );
    expect(authApi.AdminSetPassword).not.toHaveBeenCalled();
  });

  it('refuses a password with no special character', async () => {
    render(<SuperAdminChangePassword />);
    fill({ next: 'Str0ngPass', confirm: 'Str0ngPass' });
    await submit();
    await waitFor(() =>
      expect(screen.getAllByText('One special character').length).toBeGreaterThan(0)
    );
  });
});

describe('submitting', () => {
  it('sends the new password under the signed-in admin id', async () => {
    render(<SuperAdminChangePassword />);
    fill();
    await submit();
    expect(authApi.AdminSetPassword).toHaveBeenCalledWith({
      id: 'u1',
      password: STRONG,
    });
    expect(navigate).toHaveBeenCalledWith('/SA/administrative-password');
  });

  it('prefers the message the server sent', async () => {
    authApi.AdminSetPassword.mockResolvedValue({
      data: { message: 'Password rotated' },
    });
    render(<SuperAdminChangePassword />);
    fill();
    await submit();
    expect(showToast).toHaveBeenCalledWith('Password rotated', 'success');
  });

  it('falls back to its own success wording', async () => {
    render(<SuperAdminChangePassword />);
    fill();
    await submit();
    expect(showToast).toHaveBeenCalledWith('Password updated successfully!', 'success');
  });

  it('sends a null id when nobody is signed in', async () => {
    state.authentication.user = null;
    render(<SuperAdminChangePassword />);
    fill();
    await submit();
    expect(authApi.AdminSetPassword).toHaveBeenCalledWith(
      expect.objectContaining({ id: null })
    );
  });

  it('reports the reason the server refused it and stays put', async () => {
    authApi.AdminSetPassword.mockRejectedValue({
      response: { data: { message: 'Password was used before' } },
    });
    render(<SuperAdminChangePassword />);
    fill();
    await submit();
    expect(showToast).toHaveBeenCalledWith('Password was used before', 'error');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('falls back to its own failure wording', async () => {
    authApi.AdminSetPassword.mockRejectedValue(new Error('network down'));
    render(<SuperAdminChangePassword />);
    fill();
    await submit();
    expect(showToast).toHaveBeenCalledWith('Failed to update password.', 'error');
  });

  it('logs the failure under a development build', async () => {
    authApi.AdminSetPassword.mockRejectedValue(new Error('network down'));
    render(<SuperAdminChangePassword />);
    fill();
    await submit();
    expect(console.error).toHaveBeenCalledWith(
      'Could not set password:',
      expect.any(Error)
    );
  });

  it('stays quiet under a production build', async () => {
    vi.stubEnv('DEV', false);
    authApi.AdminSetPassword.mockRejectedValue(new Error('network down'));
    render(<SuperAdminChangePassword />);
    fill();
    await submit();
    expect(showToast).toHaveBeenCalledWith('Failed to update password.', 'error');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('locks the button while the request is in flight', async () => {
    let release;
    authApi.AdminSetPassword.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve({});
      })
    );
    render(<SuperAdminChangePassword />);
    fill();
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() =>
      expect(document.body.querySelector('.auth-button')).toBeDisabled()
    );
    await act(async () => { release(); });
    await waitFor(() => expect(navigate).toHaveBeenCalled());
  });
});
