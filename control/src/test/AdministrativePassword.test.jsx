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

const authApi = vi.hoisted(() => ({ SuperAdministrativePassword: vi.fn() }));
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

import AdministrativePassword from '../Pages/Authentication/AdministrativePassword';

/**
 * The onboarding step that sets the administrator password.
 *
 * This screen holds a stricter 12-character policy than the rest of the app,
 * and applies it to the confirm field as well — so a confirm value that matches
 * a weak password is rejected twice over. None of the labels carry an `htmlFor`,
 * so the fields are reached by id rather than by label text.
 *
 * The failure path is the branchy one: it prefers the server's own message and
 * falls back to its own wording, and it logs to the console only under a DEV
 * build, which Vitest is by default.
 */

const STRONG = 'Str0ng!Password1';

const field = (id) => document.body.querySelector(`#${id}`);
const submit = async () => {
  await act(async () => {
    fireEvent.click(screen.getByText('Continue'));
  });
};

const fill = ({
  old: oldValue = 'one-time-code',
  next = STRONG,
  confirm = STRONG,
} = {}) => {
  fireEvent.change(field('oldAdministratorPassword'), { target: { value: oldValue } });
  fireEvent.change(field('newAdministratorPassword'), { target: { value: next } });
  fireEvent.change(field('confirmNewAdministratorPassword'), {
    target: { value: confirm },
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  authApi.SuperAdministrativePassword.mockResolvedValue({});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('the form', () => {
  it('renders all three password fields', () => {
    render(<AdministrativePassword />);
    expect(field('oldAdministratorPassword')).toBeInTheDocument();
    expect(field('newAdministratorPassword')).toBeInTheDocument();
    expect(field('confirmNewAdministratorPassword')).toBeInTheDocument();
  });

  it('shows the checklist against the raised twelve-character minimum', () => {
    render(<AdministrativePassword />);
    // The strength meter renders nothing until something has been typed.
    expect(document.body.querySelector('.password-strength')).toBeNull();
    fireEvent.input(field('newAdministratorPassword'), { target: { value: 'abc' } });
    const meter = document.body.querySelector('.password-strength');
    expect(meter.textContent).toContain('At least 12 characters');
    expect(meter.textContent).toContain('Weak password');
  });

  it('calls the confirmation a match once the two agree', () => {
    render(<AdministrativePassword />);
    fireEvent.input(field('newAdministratorPassword'), { target: { value: STRONG } });
    fireEvent.change(field('newAdministratorPassword'), { target: { value: STRONG } });
    fireEvent.input(field('confirmNewAdministratorPassword'), {
      target: { value: STRONG },
    });
    expect(document.body.querySelector('.password-match').textContent).toContain(
      'Passwords match'
    );
  });

  it('starts with nothing for the confirm field to match against', () => {
    // `watch(...) || ""` has no value on first render, so the match indicator
    // renders in its neutral state rather than crashing on undefined.
    render(<AdministrativePassword />);
    expect(field('confirmNewAdministratorPassword').value).toBe('');
  });
});

describe('validation', () => {
  it('refuses an entirely blank form', async () => {
    render(<AdministrativePassword />);
    await submit();
    await waitFor(() => expect(showValidationErrors).toHaveBeenCalled());
    expect(authApi.SuperAdministrativePassword).not.toHaveBeenCalled();
  });

  it('refuses a missing one-time password', async () => {
    render(<AdministrativePassword />);
    fill({ old: '' });
    await submit();
    await waitFor(() =>
      expect(screen.getByText('Password is required')).toBeInTheDocument()
    );
    expect(authApi.SuperAdministrativePassword).not.toHaveBeenCalled();
  });

  it('refuses a new password under twelve characters', async () => {
    render(<AdministrativePassword />);
    fill({ next: 'Sh0rt!Aa', confirm: 'Sh0rt!Aa' });
    await submit();
    // Both the new and the confirm field are held to the same minimum, so the
    // same message comes back twice.
    await waitFor(() =>
      expect(screen.getAllByText('At least 12 characters')).toHaveLength(2)
    );
    expect(authApi.SuperAdministrativePassword).not.toHaveBeenCalled();
  });

  it.each([
    ['no uppercase letter', 'str0ng!password1', 'One uppercase letter'],
    ['no lowercase letter', 'STR0NG!PASSWORD1', 'One lowercase letter'],
    ['no digit', 'Strong!Passwords', 'One number'],
    ['no special character', 'Str0ngPassword12', 'One special character'],
  ])('refuses a new password with %s', async (_case, value, message) => {
    render(<AdministrativePassword />);
    fill({ next: value, confirm: value });
    await submit();
    await waitFor(() =>
      expect(
        document.body.querySelectorAll('.error-message').length
      ).toBeGreaterThan(0)
    );
    expect(screen.getAllByText(message).length).toBeGreaterThan(0);
    expect(authApi.SuperAdministrativePassword).not.toHaveBeenCalled();
  });

  it('refuses a confirmation that does not match', async () => {
    render(<AdministrativePassword />);
    fill({ confirm: 'Other!Password12' });
    await submit();
    await waitFor(() =>
      expect(screen.getByText('Passwords must match')).toBeInTheDocument()
    );
    expect(authApi.SuperAdministrativePassword).not.toHaveBeenCalled();
  });
});

describe('submitting', () => {
  it('sends the two passwords under the signed-in admin id and moves on', async () => {
    render(<AdministrativePassword />);
    fill();
    await submit();

    expect(authApi.SuperAdministrativePassword).toHaveBeenCalledWith({
      id: 'u1',
      oldAdministratorPassword: 'one-time-code',
      newAdministratorPassword: STRONG,
    });
    expect(showToast).toHaveBeenCalledWith(
      'Administrator password set successfully!',
      'success'
    );
    expect(navigate).toHaveBeenCalledWith('/SA/2fa-settings');
  });

  it('sends a null id when nobody is signed in', async () => {
    state.authentication.user = null;
    render(<AdministrativePassword />);
    fill();
    await submit();
    expect(authApi.SuperAdministrativePassword).toHaveBeenCalledWith(
      expect.objectContaining({ id: null })
    );
    state.authentication.user = { id: 'u1' };
  });

  it('shows the reason the server gave and stays put', async () => {
    authApi.SuperAdministrativePassword.mockRejectedValue({
      response: { data: { message: 'One-time password already used' } },
    });
    render(<AdministrativePassword />);
    fill();
    await submit();

    await waitFor(() =>
      expect(screen.getByText('One-time password already used')).toBeInTheDocument()
    );
    expect(showToast).toHaveBeenCalledWith('One-time password already used', 'error');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('falls back to its own wording for a bare failure', async () => {
    authApi.SuperAdministrativePassword.mockRejectedValue(new Error('network down'));
    render(<AdministrativePassword />);
    fill();
    await submit();

    await waitFor(() =>
      expect(screen.getByText('Failed to set password.')).toBeInTheDocument()
    );
    expect(showToast).toHaveBeenCalledWith('Failed to set password.', 'error');
  });

  it('logs the failure under a development build', async () => {
    authApi.SuperAdministrativePassword.mockRejectedValue(new Error('network down'));
    render(<AdministrativePassword />);
    fill();
    await submit();
    expect(console.error).toHaveBeenCalledWith(
      'Could not set password:',
      expect.any(Error)
    );
  });

  it('stays quiet under a production build', async () => {
    vi.stubEnv('DEV', false);
    authApi.SuperAdministrativePassword.mockRejectedValue(new Error('network down'));
    render(<AdministrativePassword />);
    fill();
    await submit();
    await waitFor(() =>
      expect(screen.getByText('Failed to set password.')).toBeInTheDocument()
    );
    expect(console.error).not.toHaveBeenCalled();
  });

  it('locks the button while the request is in flight', async () => {
    let release;
    authApi.SuperAdministrativePassword.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve({});
      })
    );
    render(<AdministrativePassword />);
    fill();
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() =>
      expect(document.body.querySelector('.auth-button')).toBeDisabled()
    );
    await act(async () => { release(); });
    await waitFor(() => expect(navigate).toHaveBeenCalled());
  });
});
