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

// The thunk is only ever used as a tagged action creator plus its
// `fulfilled.match` predicate, so a plain function with that one static is
// enough to drive both arms of the submit.
const { OnboardAdmin } = vi.hoisted(() => {
  const OnboardAdmin = (payload) => ({ type: 'onboardAdmin', payload });
  OnboardAdmin.fulfilled = { match: (action) => action?.type === 'onboardAdmin/fulfilled' };
  return { OnboardAdmin };
});
vi.mock('../ReduxStore/features/authentication', () => ({ OnboardAdmin }));

const { navigate, params, dispatch, result } = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: {},
  dispatch: vi.fn(),
  result: { current: null },
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useParams: () => params,
}));

const state = { authentication: { loading: false, user: null } };
vi.mock('react-redux', () => ({
  useDispatch: () => dispatch,
  useSelector: (fn) => fn(state),
}));

import AdminOnboarding from '../Pages/Authentication/AdminAuth/AdminOnboarding';

/**
 * The invited-admin password screen.
 *
 * The email comes in URL-encoded on the route and is pinned into a read-only
 * field, so the only way to give the form a bad address is through the route
 * param — which is what the validation test here does.
 *
 * Where the admin lands after a successful onboarding depends on two flags the
 * server returns from two different calls: `setForAll` from the 2FA choices and
 * `auth2FADone` from the onboarding response itself. Every combination gets a
 * test because the routing arms are otherwise indistinguishable — three of them
 * end on the same "/" destination.
 */

const STRONG = 'Str0ng!pass';

const fulfilledWith = (data) => ({ type: 'onboardAdmin/fulfilled', payload: { data } });
const rejectedWith = (payload) => ({ type: 'onboardAdmin/rejected', payload });

const choices = (over = {}) => ({
  data: {
    data: {
      setForAll: false,
      Authenticator2FA: false,
      securityQuestion: false,
      ...over,
    },
  },
});

// Both password fields carry the same placeholder, so they are told apart by
// their order in the form.
const fill = (password, confirm = password) => {
  const [first, second] = screen.getAllByPlaceholderText('Enter a password');
  fireEvent.change(first, { target: { value: password } });
  fireEvent.change(second, { target: { value: confirm } });
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
  params.email = encodeURIComponent('olivia@therapyco.com');
  state.authentication.loading = false;
  result.current = fulfilledWith({ auth2FADone: false });
  dispatch.mockImplementation(() => Promise.resolve(result.current));
  api.GetSuperAdminChoices.mockResolvedValue(choices());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('the invited email', () => {
  it('decodes the address from the route into the read-only field', () => {
    params.email = encodeURIComponent('olivia+admin@therapyco.com');
    render(<AdminOnboarding />);
    const emailField = screen.getByPlaceholderText('olivia@therapyco.com');
    expect(emailField.value).toBe('olivia+admin@therapyco.com');
    expect(emailField).toHaveAttribute('readonly');
  });

  it('opens with an empty field when the route carries no email', () => {
    delete params.email;
    render(<AdminOnboarding />);
    expect(screen.getByPlaceholderText('olivia@therapyco.com').value).toBe('');
  });

  it('flags an address the route encoded badly', async () => {
    params.email = 'not-an-address';
    render(<AdminOnboarding />);
    await waitFor(() => expect(screen.getByText('Invalid email')).toBeInTheDocument());
    expect(screen.getByPlaceholderText('olivia@therapyco.com')).toHaveClass(
      'input-error'
    );
  });
});

describe('the password rules', () => {
  it('refuses an empty form and hands the errors to the toast helper', async () => {
    render(<AdminOnboarding />);
    await submit();
    await waitFor(() => expect(showValidationErrors).toHaveBeenCalled());
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('refuses a password that is too short', async () => {
    render(<AdminOnboarding />);
    fill('Sh0rt!');
    await submit();
    await waitFor(() =>
      expect(screen.getAllByText('At least 8 characters').length).toBeGreaterThan(0)
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('refuses a confirmation that does not match', async () => {
    render(<AdminOnboarding />);
    fill(STRONG, 'Other1!pass');
    await submit();
    await waitFor(() =>
      expect(screen.getByText('Passwords must match')).toBeInTheDocument()
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('accepts a password that satisfies every rule', async () => {
    render(<AdminOnboarding />);
    await submitValid();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'onboardAdmin',
      payload: { id: 'admin-9', password: STRONG },
    });
  });
});

describe('where a new admin lands', () => {
  it('sends them to the authenticator when 2FA is forced on everyone', async () => {
    api.GetSuperAdminChoices.mockResolvedValue(
      choices({ setForAll: true, Authenticator2FA: true })
    );
    render(<AdminOnboarding />);
    await submitValid();
    expect(showToast).toHaveBeenCalledWith('Onboarding successful', 'success');
    expect(navigate).toHaveBeenCalledWith('/2fa/authenticator');
  });

  it('prefers the authenticator when both methods are on', async () => {
    api.GetSuperAdminChoices.mockResolvedValue(
      choices({ setForAll: true, Authenticator2FA: true, securityQuestion: true })
    );
    render(<AdminOnboarding />);
    await submitValid();
    expect(navigate).toHaveBeenCalledWith('/2fa/authenticator');
  });

  it('sends them to the security question when that is the chosen method', async () => {
    api.GetSuperAdminChoices.mockResolvedValue(
      choices({ setForAll: true, securityQuestion: true })
    );
    render(<AdminOnboarding />);
    await submitValid();
    expect(navigate).toHaveBeenCalledWith('/2fa/security-question');
  });

  it('complains when 2FA is forced but no method was chosen', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.GetSuperAdminChoices.mockResolvedValue(choices({ setForAll: true }));
    render(<AdminOnboarding />);
    await submitValid();
    expect(showToast).toHaveBeenCalledWith('Unknown authentication type', 'error');
    expect(spy).toHaveBeenCalledWith('Unknown authType:', null);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps that complaint out of the production console', async () => {
    vi.stubEnv('DEV', false);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.GetSuperAdminChoices.mockResolvedValue(choices({ setForAll: true }));
    render(<AdminOnboarding />);
    await submitValid();
    expect(showToast).toHaveBeenCalledWith('Unknown authentication type', 'error');
    expect(spy).not.toHaveBeenCalled();
  });

  it('sends them home when they have already done 2FA', async () => {
    result.current = fulfilledWith({ auth2FADone: true });
    api.GetSuperAdminChoices.mockResolvedValue(
      choices({ setForAll: true, Authenticator2FA: true })
    );
    render(<AdminOnboarding />);
    await submitValid();
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('sends them home when 2FA is not forced', async () => {
    render(<AdminOnboarding />);
    await submitValid();
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('sends them home when 2FA is off and already done', async () => {
    result.current = fulfilledWith({ auth2FADone: true });
    render(<AdminOnboarding />);
    await submitValid();
    expect(navigate).toHaveBeenCalledWith('/');
  });
});

describe('reading the 2FA choices', () => {
  it('falls back to no 2FA when the choices call fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.GetSuperAdminChoices.mockRejectedValue(new Error('offline'));
    render(<AdminOnboarding />);
    await submitValid();
    expect(spy).toHaveBeenCalledWith(
      'Error fetching SuperAdmin choices:',
      expect.any(Error)
    );
    // The defaults leave setForAll false, so the admin is let straight in.
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('keeps that failure out of the production console', async () => {
    vi.stubEnv('DEV', false);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.GetSuperAdminChoices.mockRejectedValue(new Error('offline'));
    render(<AdminOnboarding />);
    await submitValid();
    expect(spy).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/');
  });
});

describe('a refused onboarding', () => {
  it('shows the message the server sent', async () => {
    result.current = rejectedWith({ message: 'Invitation expired' });
    render(<AdminOnboarding />);
    await submitValid();
    expect(showToast).toHaveBeenCalledWith('Invitation expired', 'error');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('falls back to a generic message when the server sent none', async () => {
    result.current = rejectedWith(undefined);
    render(<AdminOnboarding />);
    await submitValid();
    expect(showToast).toHaveBeenCalledWith('Onboarding failed', 'error');
  });

  it('reports an outright failure of the dispatch', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    dispatch.mockImplementation(() => Promise.reject(new Error('network down')));
    render(<AdminOnboarding />);
    await submitValid();
    expect(showToast).toHaveBeenCalledWith(
      'An unexpected error occurred. Please try again.',
      'error'
    );
    expect(spy).toHaveBeenCalledWith('Onboarding error:', expect.any(Error));
  });

  it('keeps that failure out of the production console', async () => {
    vi.stubEnv('DEV', false);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    dispatch.mockImplementation(() => Promise.reject(new Error('network down')));
    render(<AdminOnboarding />);
    await submitValid();
    expect(spy).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      'An unexpected error occurred. Please try again.',
      'error'
    );
  });
});

describe('the rest of the screen', () => {
  it('shows a spinner on the button while the thunk is in flight', () => {
    state.authentication.loading = true;
    render(<AdminOnboarding />);
    expect(screen.queryByText('Continue')).toBeNull();
    expect(document.querySelector('.custom-button')).toBeDisabled();
  });

  it('offers a way back to the login screen', () => {
    render(<AdminOnboarding />);
    fireEvent.click(screen.getByText('Login'));
    expect(navigate).toHaveBeenCalledWith('/');
  });
});
