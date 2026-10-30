import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const showToast = vi.fn();
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => showToast(...a),
  showApiError: vi.fn(),
}));

const api = vi.hoisted(() => ({ Admin2FACreateSecretMessage: vi.fn() }));
vi.mock('../api/authApis', () => ({ default: api }));

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

const state = {
  authentication: { accessToken: 'at', refreshToken: 'rt', user: { id: 'admin-1' } },
};
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (fn) => fn(state),
}));

import SuperAdmin2FAQuestion from '../Pages/Authentication/2FAQuestion/SuperAdmin2FAQuestion';

/**
 * The security-question enrolment wizard.
 *
 * It is a three-screen flow numbered 1, 2 and 4 — there is no step 3 — and the
 * only way forward is the API call on the first screen, so every test that
 * needs a later screen goes through a successful submit rather than seeding
 * state.
 *
 * The question list is a native `<select>` whose options are exactly the values
 * the yup schema allows, so the schema's `oneOf` message has no reachable path
 * through the DOM; the tests cover the required/length/match rules instead.
 */

const QUESTION = 'What is the name of your first pet?';

const questionSelect = () => document.querySelector('select.input-select');

const fill = (answer = 'Rex the dog', confirm = answer) => {
  fireEvent.change(questionSelect(), { target: { value: QUESTION } });
  fireEvent.change(screen.getByPlaceholderText('Type your answer'), {
    target: { value: answer },
  });
  fireEvent.change(screen.getByPlaceholderText('Confirm your answer'), {
    target: { value: confirm },
  });
};

const submit = async () => {
  await act(async () => {
    fireEvent.click(screen.getByText('Continue'));
  });
};

const enrol = async () => {
  render(<SuperAdmin2FAQuestion />);
  fill();
  await submit();
};

beforeEach(() => {
  vi.clearAllMocks();
  api.Admin2FACreateSecretMessage.mockResolvedValue({ data: { status: 'ok' } });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('the question form', () => {
  it('opens on the first step with an unanswered question', () => {
    render(<SuperAdmin2FAQuestion />);
    expect(
      screen.getByText('Two-Factor Authentication (2FA)')
    ).toBeInTheDocument();
    expect(questionSelect().value).toBe('');
  });

  it('offers the twenty questions the schema accepts', () => {
    render(<SuperAdmin2FAQuestion />);
    // The hand-written blank row is dropped by SelectInput, leaving its own
    // placeholder plus the twenty real questions.
    expect(questionSelect().options.length).toBe(21);
    expect(questionSelect().options[0].textContent).toBe(
      '-- Select Please select a security question --'
    );
  });

  it('refuses an empty form', async () => {
    render(<SuperAdmin2FAQuestion />);
    await submit();
    await waitFor(() =>
      expect(screen.getByText('Please select a security question')).toBeInTheDocument()
    );
    expect(screen.getByText('Answer is required')).toBeInTheDocument();
    expect(screen.getByText('Please confirm your answer')).toBeInTheDocument();
    expect(api.Admin2FACreateSecretMessage).not.toHaveBeenCalled();
  });

  it('marks the fields it rejected', async () => {
    render(<SuperAdmin2FAQuestion />);
    await submit();
    await waitFor(() => expect(questionSelect()).toHaveClass('input-error'));
    expect(screen.getByPlaceholderText('Type your answer')).toHaveClass('input-error');
  });

  it('refuses an answer under three characters', async () => {
    render(<SuperAdmin2FAQuestion />);
    fill('ab');
    await submit();
    await waitFor(() =>
      expect(
        screen.getByText('Answer must be at least 3 characters')
      ).toBeInTheDocument()
    );
    expect(api.Admin2FACreateSecretMessage).not.toHaveBeenCalled();
  });

  it('refuses a confirmation that does not match', async () => {
    render(<SuperAdmin2FAQuestion />);
    fill('Rex the dog', 'Rex the cat');
    await submit();
    await waitFor(() =>
      expect(screen.getByText('Answers must match')).toBeInTheDocument()
    );
    expect(api.Admin2FACreateSecretMessage).not.toHaveBeenCalled();
  });

  it('sends the question and the answer against the signed-in admin', async () => {
    await enrol();
    expect(api.Admin2FACreateSecretMessage).toHaveBeenCalledWith({
      userId: 'admin-1',
      secret: 'Rex the dog',
      authQuestion: QUESTION,
      module: 'ADMIN',
    });
    expect(showToast).toHaveBeenCalledWith(
      'Security question set successfully!',
      'success'
    );
  });

  it('goes back to the 2FA settings from the Back button', () => {
    render(<SuperAdmin2FAQuestion />);
    fireEvent.click(screen.getByText('Back'));
    expect(navigate).toHaveBeenCalledWith('/SA/2fa-settings');
    expect(api.Admin2FACreateSecretMessage).not.toHaveBeenCalled();
  });
});

describe('a refused enrolment', () => {
  it('treats a non-ok status as a failure and stays on the form', async () => {
    api.Admin2FACreateSecretMessage.mockResolvedValue({ data: { status: 'error' } });
    await enrol();
    expect(showToast).toHaveBeenCalledWith('Failed to set security question.', 'error');
    expect(
      screen.getByText('Two-Factor Authentication (2FA)')
    ).toBeInTheDocument();
  });

  it('shows the message the server sent under the form', async () => {
    api.Admin2FACreateSecretMessage.mockRejectedValue({
      response: { data: { message: 'Question already set' } },
    });
    await enrol();
    expect(showToast).toHaveBeenCalledWith('Question already set', 'error');
    expect(screen.getByText('Question already set')).toBeInTheDocument();
  });

  it('falls back to its own wording for a bare failure', async () => {
    api.Admin2FACreateSecretMessage.mockRejectedValue(new Error('network down'));
    await enrol();
    expect(showToast).toHaveBeenCalledWith('Failed to set security question.', 'error');
  });

  it('logs the failure in development', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.Admin2FACreateSecretMessage.mockRejectedValue(new Error('network down'));
    await enrol();
    expect(spy).toHaveBeenCalledWith('2FA verification failed:', expect.any(Error));
  });

  it('keeps the failure out of the production console', async () => {
    vi.stubEnv('DEV', false);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.Admin2FACreateSecretMessage.mockRejectedValue(new Error('network down'));
    await enrol();
    expect(spy).not.toHaveBeenCalled();
  });

  it('clears the previous message when the form is submitted again', async () => {
    api.Admin2FACreateSecretMessage.mockRejectedValueOnce(
      new Error('network down')
    );
    render(<SuperAdmin2FAQuestion />);
    fill();
    await submit();
    expect(screen.getByText('Failed to set security question.')).toBeInTheDocument();

    await submit();
    await waitFor(() =>
      expect(screen.getByText('Verification Successful')).toBeInTheDocument()
    );
  });
});

describe('the remaining steps', () => {
  it('confirms the question was accepted', async () => {
    await enrol();
    expect(screen.getByText('Verification Successful')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Type your answer')).toBeNull();
  });

  it('finishes on the all-set screen', async () => {
    await enrol();
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText("You're all set!")).toBeInTheDocument());
  });

  it('sends the admin to the login screen at the end', async () => {
    await enrol();
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText("You're all set!")).toBeInTheDocument());
    fireEvent.click(screen.getByText('Proceed to login'));
    expect(navigate).toHaveBeenCalledWith('/');
  });
});
