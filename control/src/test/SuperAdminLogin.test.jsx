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

const api = vi.hoisted(() => ({ GetSuperAdminChoices: vi.fn() }));
vi.mock('../api/authApis', () => ({ default: api }));

const { AdminLogin } = vi.hoisted(() => {
  const AdminLogin = (payload) => ({ type: 'adminLogin', payload });
  AdminLogin.fulfilled = { match: (action) => action?.type === 'adminLogin/fulfilled' };
  return { AdminLogin };
});
vi.mock('../ReduxStore/features/authentication', () => ({ AdminLogin }));

const { navigate, dispatch, result } = vi.hoisted(() => ({
  navigate: vi.fn(),
  dispatch: vi.fn(),
  result: { current: null },
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

const state = { authentication: { loading: false, user: null } };
vi.mock('react-redux', () => ({
  useDispatch: () => dispatch,
  useSelector: (fn) => fn(state),
}));

import AdminsLogin from '../Pages/Authentication/SuperAdminLogin';

/**
 * The administrator sign-on screen.
 *
 * A successful login does no navigating of its own — it asks the server for the
 * super-admin's 2FA choices and then routes on four values: the master
 * `isEnabled` switch, `setForAll`, the admin's own `authType`/`superAdmin`
 * flags, and whether they have already completed 2FA. The tests are grouped by
 * those two states (setup versus verification) because the same method name
 * routes to a different screen in each.
 *
 * Note the effective method: with `setForAll` on it comes from the global
 * choice, and with it off from the admin's own record — so the same choices
 * response produces different destinations depending on that one flag.
 */

const fulfilledWith = (data) => ({ type: 'adminLogin/fulfilled', payload: { data } });
const rejectedWith = (payload) => ({ type: 'adminLogin/rejected', payload });

const choices = (over = {}) => ({
  data: {
    data: {
      isEnabled: true,
      setForAll: false,
      Authenticator2FA: false,
      securityQuestion: false,
      ...over,
    },
  },
});

const fill = (email = 'olivia@therapyco.com', password = 'sekrit99') => {
  fireEvent.change(screen.getByPlaceholderText('olivia@therapyco.com'), {
    target: { value: email },
  });
  fireEvent.change(screen.getByPlaceholderText('Enter password'), {
    target: { value: password },
  });
};

const submit = async () => {
  await act(async () => {
    fireEvent.click(screen.getByText('Continue'));
  });
};

const login = async () => {
  render(<AdminsLogin />);
  fill();
  await submit();
};

beforeEach(() => {
  vi.clearAllMocks();
  state.authentication.loading = false;
  result.current = fulfilledWith({ auth2FADone: false, superAdmin: false });
  dispatch.mockImplementation(() => Promise.resolve(result.current));
  api.GetSuperAdminChoices.mockResolvedValue(choices());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('the form rules', () => {
  it('refuses an empty form', async () => {
    render(<AdminsLogin />);
    await submit();
    await waitFor(() => expect(showValidationErrors).toHaveBeenCalled());
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('flags an address that is not one when the field is left', async () => {
    // The email field validates on blur (`mode: "onTouched"`), which is the
    // only way to see yup's message: the field is a native `type="email"`, so
    // jsdom — like a browser — refuses to submit the form at all while its own
    // constraint check fails, and the resolver never runs.
    render(<AdminsLogin />);
    const emailField = screen.getByPlaceholderText('olivia@therapyco.com');
    fireEvent.change(emailField, { target: { value: 'olivia' } });
    fireEvent.blur(emailField);
    await waitFor(() => expect(screen.getByText('Invalid email')).toBeInTheDocument());
    expect(emailField).toHaveClass('input-error');
  });

  it('cannot be submitted at all while the address is malformed', async () => {
    render(<AdminsLogin />);
    fill('olivia');
    await submit();
    expect(screen.getByPlaceholderText('olivia@therapyco.com').checkValidity()).toBe(
      false
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('refuses a password under six characters', async () => {
    render(<AdminsLogin />);
    fill('olivia@therapyco.com', '12345');
    await submit();
    await waitFor(() =>
      expect(
        screen.getByText('Password must be at least 6 characters')
      ).toBeInTheDocument()
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('sends the credentials it was given', async () => {
    await login();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'adminLogin',
      payload: { email: 'olivia@therapyco.com', password: 'sekrit99' },
    });
    expect(showToast).toHaveBeenCalledWith('Login successful', 'success');
  });
});

describe('the master 2FA switch', () => {
  it('goes straight to the dashboard when 2FA is switched off', async () => {
    api.GetSuperAdminChoices.mockResolvedValue(
      choices({ isEnabled: false, setForAll: true, Authenticator2FA: true })
    );
    await login();
    expect(navigate).toHaveBeenCalledWith('/tenants/pipeline');
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('carries on with 2FA when the switch is missing from the response', async () => {
    // An undefined `isEnabled` is not a strict `false`, so the guard does not
    // fire and the routing runs as normal.
    api.GetSuperAdminChoices.mockResolvedValue(choices({ isEnabled: undefined }));
    await login();
    expect(navigate).toHaveBeenCalledWith('/2fa/choice');
  });
});

describe('an admin who has not set up 2FA', () => {
  it('is sent to the authenticator when that is the forced method', async () => {
    api.GetSuperAdminChoices.mockResolvedValue(
      choices({ setForAll: true, Authenticator2FA: true })
    );
    await login();
    expect(navigate).toHaveBeenCalledWith('/2fa/authenticator');
  });

  it('is sent to the security question when that is the forced method', async () => {
    api.GetSuperAdminChoices.mockResolvedValue(
      choices({ setForAll: true, securityQuestion: true })
    );
    await login();
    expect(navigate).toHaveBeenCalledWith('/2fa/security-question');
  });

  it('uses their own recorded method when nothing is forced', async () => {
    result.current = fulfilledWith({ auth2FADone: false, authType: 'SECRETMESSAGE' });
    await login();
    expect(navigate).toHaveBeenCalledWith('/2fa/security-question');
  });

  it('sends a brand-new super admin to change their password first', async () => {
    result.current = fulfilledWith({ auth2FADone: false, superAdmin: true });
    await login();
    expect(navigate).toHaveBeenCalledWith('/SA/change-password');
  });

  it('lets an ordinary admin pick a method for themselves', async () => {
    await login();
    expect(navigate).toHaveBeenCalledWith('/2fa/choice');
  });

  it('ignores their own method while one is forced on everyone', async () => {
    // setForAll is on but no global method was chosen, so the effective type is
    // null even though this admin has one of their own.
    result.current = fulfilledWith({ auth2FADone: false, authType: 'AUTHENTICATOR' });
    api.GetSuperAdminChoices.mockResolvedValue(choices({ setForAll: true }));
    await login();
    expect(navigate).toHaveBeenCalledWith('/2fa/choice');
  });
});

describe('an admin who has already set up 2FA', () => {
  beforeEach(() => {
    result.current = fulfilledWith({ auth2FADone: true, authType: 'AUTHENTICATOR' });
  });

  it('is asked for an authenticator code', async () => {
    await login();
    expect(navigate).toHaveBeenCalledWith('/SA/2fa-authentication/login');
  });

  it('is asked for their security answer', async () => {
    result.current = fulfilledWith({ auth2FADone: true, authType: 'SECRETMESSAGE' });
    await login();
    expect(navigate).toHaveBeenCalledWith('/SA/2fa-question/login');
  });

  it('follows the forced method rather than their own', async () => {
    api.GetSuperAdminChoices.mockResolvedValue(
      choices({ setForAll: true, securityQuestion: true })
    );
    await login();
    expect(navigate).toHaveBeenCalledWith('/SA/2fa-question/login');
  });

  it('goes to the dashboard when no method can be worked out', async () => {
    result.current = fulfilledWith({ auth2FADone: true, authType: null });
    await login();
    expect(navigate).toHaveBeenCalledWith('/tenants/pipeline');
  });
});

describe('reading the 2FA choices', () => {
  it('keeps 2FA on when the choices call fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.GetSuperAdminChoices.mockRejectedValue(new Error('offline'));
    await login();
    expect(spy).toHaveBeenCalledWith(
      'Error fetching SuperAdmin choices:',
      expect.any(Error)
    );
    // The fallback leaves isEnabled true, so the admin still has to choose.
    expect(navigate).toHaveBeenCalledWith('/2fa/choice');
  });

  it('keeps that failure out of the production console', async () => {
    vi.stubEnv('DEV', false);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.GetSuperAdminChoices.mockRejectedValue(new Error('offline'));
    await login();
    expect(spy).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/2fa/choice');
  });
});

describe('a refused login', () => {
  it('shows the message object the thunk rejected with', async () => {
    result.current = rejectedWith({ message: 'Account locked' });
    await login();
    expect(showToast).toHaveBeenCalledWith('Account locked', 'error');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows a bare string payload as the message', async () => {
    result.current = rejectedWith('Invalid credentials');
    await login();
    expect(showToast).toHaveBeenCalledWith('Invalid credentials', 'error');
  });

  it('falls back to a generic message when there is no payload', async () => {
    result.current = rejectedWith(undefined);
    await login();
    expect(showToast).toHaveBeenCalledWith('Login failed', 'error');
  });

  it('reports an outright failure of the dispatch', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    dispatch.mockImplementation(() => Promise.reject(new Error('network down')));
    await login();
    expect(showToast).toHaveBeenCalledWith(
      'An unexpected error occurred. Please try again.',
      'error'
    );
    expect(spy).toHaveBeenCalledWith('Unexpected error:', expect.any(Error));
  });

  it('keeps that failure out of the production console', async () => {
    vi.stubEnv('DEV', false);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    dispatch.mockImplementation(() => Promise.reject(new Error('network down')));
    await login();
    expect(spy).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      'An unexpected error occurred. Please try again.',
      'error'
    );
  });
});

describe('the rest of the screen', () => {
  it('spins the button while the login is in flight', () => {
    state.authentication.loading = true;
    render(<AdminsLogin />);
    expect(screen.queryByText('Continue')).toBeNull();
    expect(document.querySelector('.custom-button')).toBeDisabled();
  });

  it('offers the forgotten-password route', () => {
    render(<AdminsLogin />);
    fireEvent.click(screen.getByText('Forgot Password?'));
    expect(navigate).toHaveBeenCalledWith('/forgot-password');
  });
});
