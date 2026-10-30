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

const authApi = vi.hoisted(() => ({ Admin2FAVerifySecretMessage: vi.fn() }));
vi.mock('../api/authApis', () => ({ default: authApi }));

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

const state = {
  authentication: {
    accessToken: 'at',
    refreshToken: 'rt',
    user: { id: 'u1', authQuestion: 'What was your first pet called?' },
  },
};
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (fn) => fn(state),
}));

import SuperAdmin2FAQuestionLogin from '../Pages/Authentication/SuperAdmin2FAQuestionLogin';

/**
 * The security-question half of super-admin login.
 *
 * The question itself comes off the stored user rather than a request, so a
 * session that has no question shows a placeholder instead. The success path is
 * decided by the response body, not the HTTP status: anything other than an
 * `ok` status is thrown by the handler itself and lands in the same catch as a
 * network failure — which is why a rejected verification reports the screen's
 * own wording rather than a server message.
 */

const answer = () => document.body.querySelector('#security-answer');
const submit = async () => {
  await act(async () => {
    fireEvent.click(screen.getByText('Continue'));
  });
};
const fill = (value = 'Rex') => {
  fireEvent.change(answer(), { target: { value } });
};

beforeEach(() => {
  vi.clearAllMocks();
  state.authentication.user = {
    id: 'u1',
    authQuestion: 'What was your first pet called?',
  };
  authApi.Admin2FAVerifySecretMessage.mockResolvedValue({
    data: { status: 'ok' },
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('the question', () => {
  it('shows the question stored against the session', () => {
    render(<SuperAdmin2FAQuestionLogin />);
    expect(
      screen.getByText('What was your first pet called?')
    ).toBeInTheDocument();
  });

  it('shows a placeholder when the session carries no question', () => {
    state.authentication.user = { id: 'u1' };
    render(<SuperAdmin2FAQuestionLogin />);
    expect(screen.getByText('No question available')).toBeInTheDocument();
  });

  it('shows the placeholder when nobody is signed in at all', () => {
    state.authentication.user = null;
    render(<SuperAdmin2FAQuestionLogin />);
    expect(screen.getByText('No question available')).toBeInTheDocument();
  });
});

describe('validation', () => {
  it('refuses a blank answer', async () => {
    render(<SuperAdmin2FAQuestionLogin />);
    await submit();
    await waitFor(() =>
      expect(screen.getByText('Answer is required')).toBeInTheDocument()
    );
    expect(showValidationErrors).toHaveBeenCalled();
    expect(authApi.Admin2FAVerifySecretMessage).not.toHaveBeenCalled();
  });

  it('refuses an answer under three characters', async () => {
    render(<SuperAdmin2FAQuestionLogin />);
    fill('ab');
    await submit();
    await waitFor(() =>
      expect(
        screen.getByText('Answer must be at least 3 characters')
      ).toBeInTheDocument()
    );
    expect(authApi.Admin2FAVerifySecretMessage).not.toHaveBeenCalled();
  });
});

describe('verifying', () => {
  it('sends the answer with the question it was asked and moves on', async () => {
    render(<SuperAdmin2FAQuestionLogin />);
    fill();
    await submit();
    expect(authApi.Admin2FAVerifySecretMessage).toHaveBeenCalledWith({
      userId: 'u1',
      secret: 'Rex',
      authQuestion: 'What was your first pet called?',
    });
    expect(showToast).toHaveBeenCalledWith(
      'Security question verified successfully!',
      'success'
    );
    expect(navigate).toHaveBeenCalledWith('/tenants/pipeline');
  });

  it('sends an undefined question when the session has none', async () => {
    state.authentication.user = { id: 'u1' };
    render(<SuperAdmin2FAQuestionLogin />);
    fill();
    await submit();
    expect(authApi.Admin2FAVerifySecretMessage).toHaveBeenCalledWith(
      expect.objectContaining({ authQuestion: undefined })
    );
  });

  it('treats any status other than ok as a refusal', async () => {
    authApi.Admin2FAVerifySecretMessage.mockResolvedValue({
      data: { status: 'mismatch' },
    });
    render(<SuperAdmin2FAQuestionLogin />);
    fill('Wrong');
    await submit();
    expect(showToast).toHaveBeenCalledWith('Verification failed.', 'error');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('reports the reason the server gave for a rejected call', async () => {
    authApi.Admin2FAVerifySecretMessage.mockRejectedValue({
      response: { data: { message: 'Too many attempts' } },
    });
    render(<SuperAdmin2FAQuestionLogin />);
    fill();
    await submit();
    expect(showToast).toHaveBeenCalledWith('Too many attempts', 'error');
  });

  it('falls back to its own wording for a bare failure', async () => {
    authApi.Admin2FAVerifySecretMessage.mockRejectedValue(new Error('offline'));
    render(<SuperAdmin2FAQuestionLogin />);
    fill();
    await submit();
    expect(showToast).toHaveBeenCalledWith('Verification failed.', 'error');
  });

  it('logs the failure under a development build', async () => {
    authApi.Admin2FAVerifySecretMessage.mockRejectedValue(new Error('offline'));
    render(<SuperAdmin2FAQuestionLogin />);
    fill();
    await submit();
    expect(console.error).toHaveBeenCalledWith(
      '2FA verification failed:',
      expect.any(Error)
    );
  });

  it('stays quiet under a production build', async () => {
    vi.stubEnv('DEV', false);
    authApi.Admin2FAVerifySecretMessage.mockRejectedValue(new Error('offline'));
    render(<SuperAdmin2FAQuestionLogin />);
    fill();
    await submit();
    expect(showToast).toHaveBeenCalledWith('Verification failed.', 'error');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('locks the button while the request is in flight', async () => {
    let release;
    authApi.Admin2FAVerifySecretMessage.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve({ data: { status: 'ok' } });
      })
    );
    render(<SuperAdmin2FAQuestionLogin />);
    fill();
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() =>
      expect(document.body.querySelector('.auth-button')).toBeDisabled()
    );
    await act(async () => { release(); });
    await waitFor(() => expect(navigate).toHaveBeenCalled());
  });
});

describe('the forgot-answer link', () => {
  it('swallows the click without navigating anywhere', () => {
    render(<SuperAdmin2FAQuestionLogin />);
    const link = screen.getByText('Forgot answer?');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    act(() => { link.dispatchEvent(event); });
    expect(event.defaultPrevented).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });
});
