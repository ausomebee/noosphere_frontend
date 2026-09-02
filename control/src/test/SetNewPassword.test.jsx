import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const showValidationErrors = vi.fn();
vi.mock('../Helper/formErrors', () => ({
  showValidationErrors: (...a) => showValidationErrors(...a),
  default: (...a) => showValidationErrors(...a),
}));

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

import SetNewPassword from '../Pages/Authentication/ForgotPassword/SetNewPassword';

/**
 * The last step of the reset flow.
 *
 * There is no request here at all — a valid submit simply moves on to the 2FA
 * challenge — so everything worth pinning is the schema. Both fields are held
 * to the full shared policy, which means the confirm field fails on its own
 * strength before it is ever compared, and the strength checklist rendered
 * under the first field has to agree with the rules that judge it.
 *
 * The labels carry no `htmlFor`, so the fields are reached by id.
 */

const STRONG = 'Str0ng!Pass';

const field = (id) => document.body.querySelector(`#${id}`);
const submit = async () => {
  await act(async () => {
    fireEvent.click(screen.getByText('Continue'));
  });
};
const fill = ({ password = STRONG, confirm = STRONG } = {}) => {
  fireEvent.change(field('password'), { target: { value: password } });
  fireEvent.change(field('confirmPassword'), { target: { value: confirm } });
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the form', () => {
  it('opens with two empty fields under its heading', () => {
    render(<SetNewPassword />);
    expect(screen.getByText('Set a new password')).toBeInTheDocument();
    expect(field('password').value).toBe('');
    expect(field('confirmPassword').value).toBe('');
  });

  it('holds the checklist back until something is typed', () => {
    render(<SetNewPassword />);
    expect(document.body.querySelector('.password-strength')).toBeNull();
    fireEvent.input(field('password'), { target: { value: 'abc' } });
    const meter = document.body.querySelector('.password-strength');
    expect(meter.textContent).toContain('At least 8 characters');
    expect(meter.textContent).toContain('Weak password');
  });

  it('calls a fully compliant password strong', () => {
    render(<SetNewPassword />);
    fireEvent.input(field('password'), { target: { value: STRONG } });
    expect(document.body.querySelector('.password-strength').textContent).toContain(
      'Strong password'
    );
  });

  it('confirms a match once the second field agrees', () => {
    render(<SetNewPassword />);
    fireEvent.change(field('password'), { target: { value: STRONG } });
    fireEvent.input(field('confirmPassword'), { target: { value: STRONG } });
    expect(document.body.querySelector('.password-match').textContent).toContain(
      'Passwords match'
    );
  });

  it('holds the mismatch warning until the confirm field is left', () => {
    render(<SetNewPassword />);
    fireEvent.change(field('password'), { target: { value: STRONG } });
    fireEvent.input(field('confirmPassword'), { target: { value: 'Other!Pass1' } });
    expect(document.body.querySelector('.password-match')).toBeNull();

    fireEvent.blur(field('confirmPassword'));
    expect(document.body.querySelector('.password-match').textContent).toContain(
      'Passwords do not match'
    );
  });
});

describe('validation', () => {
  it('refuses an entirely blank form', async () => {
    render(<SetNewPassword />);
    await submit();
    await waitFor(() => expect(showValidationErrors).toHaveBeenCalled());
    expect(navigate).not.toHaveBeenCalled();
  });

  it('refuses a password under eight characters', async () => {
    render(<SetNewPassword />);
    fill({ password: 'Sh0rt!', confirm: 'Sh0rt!' });
    await submit();
    // The same minimum applies to both fields, so the message appears twice.
    await waitFor(() =>
      expect(screen.getAllByText('At least 8 characters')).toHaveLength(2)
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each([
    ['no uppercase letter', 'str0ng!pass', 'One uppercase letter'],
    ['no lowercase letter', 'STR0NG!PASS', 'One lowercase letter'],
    ['no digit', 'Strong!Pass', 'One number'],
    ['no special character', 'Str0ngPass1', 'One special character'],
  ])('refuses a password with %s', async (_case, value, message) => {
    render(<SetNewPassword />);
    fill({ password: value, confirm: value });
    await submit();
    await waitFor(() =>
      expect(screen.getAllByText(message).length).toBeGreaterThan(0)
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('refuses a confirmation that does not match', async () => {
    render(<SetNewPassword />);
    fill({ confirm: 'Other!Pass1' });
    await submit();
    await waitFor(() =>
      expect(screen.getByText('Passwords must match')).toBeInTheDocument()
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('submitting', () => {
  it('moves on to the 2FA challenge without sending anything', async () => {
    render(<SetNewPassword />);
    fill();
    await submit();
    expect(navigate).toHaveBeenCalledWith('/SA/2fa-question/login');
    expect(showValidationErrors).not.toHaveBeenCalled();
  });

  it('leaves the button live, since nothing is ever in flight', async () => {
    render(<SetNewPassword />);
    fill();
    await submit();
    expect(document.body.querySelector('.auth-button')).not.toBeDisabled();
  });
});
