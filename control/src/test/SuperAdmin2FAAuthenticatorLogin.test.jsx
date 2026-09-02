import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const showToast = vi.fn();
const showApiError = vi.fn();
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => showToast(...a),
  showApiError: (...a) => showApiError(...a),
}));

const showValidationErrors = vi.fn();
vi.mock('../Helper/formErrors', () => ({
  showValidationErrors: (...a) => showValidationErrors(...a),
}));

const api = vi.hoisted(() => ({ Admin2FAVerify: vi.fn() }));
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

import SuperAdmin2FAAuthenticatorLogin from '../Pages/Authentication/MicrosoftAuth/SuperAdmin2FAAuthenticatorLogin';

/**
 * The authenticator-code screen shown at login.
 *
 * The six boxes are local state mirrored into a single react-hook-form field,
 * and the mirror only asks for validation once every box is filled — so a
 * half-typed code carries a stale-but-quiet form value, and the schema's
 * "6-digit" message appears on submit rather than while typing. The tests below
 * lean on that: they type, then submit, to see a message.
 *
 * Boxes are addressed positionally through `.code-input` because they are
 * unlabelled; jsdom tracks focus, so the auto-advance and backspace-retreat
 * behaviour can be asserted against `document.activeElement`.
 */

const boxes = () => [...document.querySelectorAll('.code-input')];

const type = (digits) => {
  digits.split('').forEach((digit, index) => {
    fireEvent.change(boxes()[index], { target: { value: digit } });
  });
};

const submit = async () => {
  await act(async () => {
    fireEvent.click(screen.getByText('Continue'));
  });
};

const paste = (text) =>
  fireEvent.paste(boxes()[0], {
    clipboardData: { getData: () => text },
  });

beforeEach(() => {
  vi.clearAllMocks();
  api.Admin2FAVerify.mockResolvedValue({ data: { status: 'ok' } });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('typing the code', () => {
  it('opens with six empty boxes', () => {
    render(<SuperAdmin2FAAuthenticatorLogin />);
    expect(boxes().length).toBe(6);
    expect(boxes().every((box) => box.value === '')).toBe(true);
  });

  it('moves to the next box after each digit', () => {
    render(<SuperAdmin2FAAuthenticatorLogin />);
    fireEvent.change(boxes()[0], { target: { value: '1' } });
    expect(document.activeElement).toBe(boxes()[1]);
  });

  it('stays put once the last box is filled', () => {
    render(<SuperAdmin2FAAuthenticatorLogin />);
    type('123456');
    expect(boxes()[5].value).toBe('6');
    expect(document.activeElement).not.toBe(boxes()[0]);
  });

  it('ignores anything that is not a digit', () => {
    render(<SuperAdmin2FAAuthenticatorLogin />);
    fireEvent.change(boxes()[0], { target: { value: 'a' } });
    expect(boxes()[0].value).toBe('');
    expect(document.activeElement).not.toBe(boxes()[1]);
  });

  it('clears a box when the digit is deleted', () => {
    render(<SuperAdmin2FAAuthenticatorLogin />);
    fireEvent.change(boxes()[0], { target: { value: '1' } });
    fireEvent.change(boxes()[0], { target: { value: '' } });
    expect(boxes()[0].value).toBe('');
  });

  it('retreats to the previous box on backspace in an empty one', () => {
    render(<SuperAdmin2FAAuthenticatorLogin />);
    type('12');
    boxes()[2].focus();
    fireEvent.keyDown(boxes()[2], { key: 'Backspace' });
    expect(document.activeElement).toBe(boxes()[1]);
  });

  it('stays put on backspace in a box that still holds a digit', () => {
    render(<SuperAdmin2FAAuthenticatorLogin />);
    type('12');
    boxes()[1].focus();
    fireEvent.keyDown(boxes()[1], { key: 'Backspace' });
    expect(document.activeElement).toBe(boxes()[1]);
  });

  it('stays put on backspace in the very first box', () => {
    render(<SuperAdmin2FAAuthenticatorLogin />);
    boxes()[0].focus();
    fireEvent.keyDown(boxes()[0], { key: 'Backspace' });
    expect(document.activeElement).toBe(boxes()[0]);
  });

  it('ignores other keys', () => {
    render(<SuperAdmin2FAAuthenticatorLogin />);
    boxes()[3].focus();
    fireEvent.keyDown(boxes()[3], { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(boxes()[3]);
  });
});

describe('pasting a code', () => {
  it('spreads a full code across the boxes', async () => {
    render(<SuperAdmin2FAAuthenticatorLogin />);
    paste('123456');
    expect(boxes().map((b) => b.value).join('')).toBe('123456');
    expect(document.activeElement).toBe(boxes()[5]);

    await submit();
    expect(api.Admin2FAVerify).toHaveBeenCalledWith({
      userId: 'admin-1',
      token: '123456',
    });
  });

  it('strips anything that is not a digit and pads the rest', () => {
    render(<SuperAdmin2FAAuthenticatorLogin />);
    paste('12-34');
    expect(boxes().map((b) => b.value)).toEqual(['1', '2', '3', '4', '', '']);
    expect(document.activeElement).toBe(boxes()[3]);
  });

  it('keeps only the first six digits of a longer paste', () => {
    render(<SuperAdmin2FAAuthenticatorLogin />);
    paste('1234567890');
    expect(boxes().map((b) => b.value).join('')).toBe('123456');
  });

  it('survives a paste with no digits in it at all', () => {
    render(<SuperAdmin2FAAuthenticatorLogin />);
    boxes()[0].focus();
    paste('hello');
    // There is no box before the first one to focus, so the boxes are simply
    // left empty.
    expect(boxes().every((box) => box.value === '')).toBe(true);
  });
});

describe('the form rules', () => {
  it('refuses an empty code', async () => {
    render(<SuperAdmin2FAAuthenticatorLogin />);
    await submit();
    await waitFor(() => expect(screen.getByText('OTP is required')).toBeInTheDocument());
    expect(showValidationErrors).toHaveBeenCalled();
    expect(api.Admin2FAVerify).not.toHaveBeenCalled();
  });

  it('refuses a half-typed code', async () => {
    render(<SuperAdmin2FAAuthenticatorLogin />);
    type('123');
    await submit();
    await waitFor(() =>
      expect(screen.getByText('OTP must be a 6-digit number')).toBeInTheDocument()
    );
    expect(api.Admin2FAVerify).not.toHaveBeenCalled();
  });

  it('marks the boxes while the code is rejected', async () => {
    render(<SuperAdmin2FAAuthenticatorLogin />);
    await submit();
    await waitFor(() => expect(boxes()[0]).toHaveClass('input-error'));
  });

  it('says nothing while the code is still being typed', () => {
    render(<SuperAdmin2FAAuthenticatorLogin />);
    type('12');
    expect(screen.queryByText('OTP must be a 6-digit number')).toBeNull();
  });

  it('clears the complaint once the sixth digit lands', async () => {
    render(<SuperAdmin2FAAuthenticatorLogin />);
    await submit();
    await waitFor(() => expect(screen.getByText('OTP is required')).toBeInTheDocument());

    await act(async () => {
      type('123456');
    });
    await waitFor(() => expect(screen.queryByText('OTP is required')).toBeNull());
  });
});

describe('verifying the code', () => {
  const verify = async () => {
    render(<SuperAdmin2FAAuthenticatorLogin />);
    type('123456');
    await submit();
  };

  it('sends the admin to the dashboard on success', async () => {
    await verify();
    expect(showToast).toHaveBeenCalledWith('OTP verification successful!', 'success');
    expect(navigate).toHaveBeenCalledWith('/tenants/pipeline');
  });

  it('treats a non-ok status as a failure', async () => {
    api.Admin2FAVerify.mockResolvedValue({ data: { status: 'denied' } });
    await verify();
    expect(showApiError).toHaveBeenCalledWith(expect.any(Error), 'VERIFY_2FA');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('reports a refused verification', async () => {
    api.Admin2FAVerify.mockRejectedValue(new Error('expired code'));
    await verify();
    expect(showApiError).toHaveBeenCalledWith(expect.any(Error), 'VERIFY_2FA');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('logs the failure in development', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.Admin2FAVerify.mockRejectedValue(new Error('expired code'));
    await verify();
    expect(spy).toHaveBeenCalledWith('2FA verification failed:', expect.any(Error));
  });

  it('keeps the failure out of the production console', async () => {
    vi.stubEnv('DEV', false);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.Admin2FAVerify.mockRejectedValue(new Error('expired code'));
    await verify();
    expect(spy).not.toHaveBeenCalled();
    expect(showApiError).toHaveBeenCalled();
  });

  it('frees the button again once the failure is reported', async () => {
    api.Admin2FAVerify.mockRejectedValue(new Error('expired code'));
    await verify();
    await waitFor(() =>
      expect(document.querySelector('.custom-button')).not.toBeDisabled()
    );
  });
});

describe('the help link', () => {
  it('goes nowhere yet', () => {
    render(<SuperAdmin2FAAuthenticatorLogin />);
    fireEvent.click(screen.getByText("Can't access authenticator app?"));
    expect(navigate).not.toHaveBeenCalled();
  });
});
