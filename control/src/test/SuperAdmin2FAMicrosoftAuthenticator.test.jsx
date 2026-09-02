import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

/**
 * The super-admin authenticator enrolment wizard: scan a QR code, prove the app
 * works twice with two *different* codes, then land on a confirmation screen.
 *
 * The interesting constraint is time. A TOTP code only changes every thirty
 * seconds and the backend refuses a code it has already spent, so after the
 * first verification the page locks the second entry until the clock crosses
 * into the next thirty-second window. Reaching phase two therefore needs fake
 * timers and a fixed system time -- `atWindowStart()` pins the clock to the
 * start of a window so advancing exactly 30s is guaranteed to roll it over.
 *
 * `api.Admin2FAVerify` answers with the acknowledgement two levels deep
 * (`response.data.data === true`), which is why the fixtures are nested.
 */

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  userId: 'admin-1',
  api: { Admin2FALink: vi.fn(), Admin2FAVerify: vi.fn() },
  showToast: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock('../hooks/useAuth', () => ({ default: () => ({ userId: mocks.userId }) }));
vi.mock('../api/authApis', () => ({ default: mocks.api }));
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => mocks.showToast(...a),
  showApiError: vi.fn(),
}));

import SuperAdmin2FAMicrosoftAuthenticator from '../Pages/Authentication/MicrosoftAuth/SuperAdmin2FAMicrosoftAuthenticator';

const TOTP_PERIOD_MS = 30_000;

// Pin the clock to the very start of a TOTP window so that advancing exactly
// one period always lands in the next one.
const atWindowStart = () => {
  vi.useFakeTimers();
  vi.setSystemTime(Math.ceil(Date.now() / TOTP_PERIOD_MS) * TOTP_PERIOD_MS);
};

const renderWizard = async () => {
  const view = render(<SuperAdmin2FAMicrosoftAuthenticator />);
  await act(async () => {});
  return view;
};

const boxes = () =>
  Array.from({ length: 6 }, (_, i) => document.getElementById(`code-input-${i}`));

const typeCode = async (digits) => {
  await act(async () => {
    digits.split('').forEach((d, i) => {
      fireEvent.change(boxes()[i], { target: { value: d } });
    });
  });
};

const clickButton = async (name) => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
};

// Step 1 is the QR screen; step 2 is the first code entry.
const goToCodeEntry = async () => {
  await renderWizard();
  await clickButton('Continue');
};

const verifyOk = () => mocks.api.Admin2FAVerify.mockResolvedValue({ data: { data: true } });

// Get through phase one and past the window the first code belonged to.
const goToSecondPhase = async () => {
  atWindowStart();
  verifyOk();
  await goToCodeEntry();
  await typeCode('123456');
  await clickButton('Continue');
  await act(async () => {
    vi.advanceTimersByTime(TOTP_PERIOD_MS);
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.userId = 'admin-1';
  mocks.api.Admin2FALink.mockResolvedValue({ data: { data: { qrcode: 'data:image/png;base64,zz' } } });
  verifyOk();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('the QR step', () => {
  it('asks the API for an enrolment link for the signed-in admin', async () => {
    await renderWizard();
    expect(mocks.api.Admin2FALink).toHaveBeenCalledWith({ id: 'admin-1', moduleType: 'ADMIN' });
    expect(screen.getByAltText('QR Code')).toHaveAttribute('src', 'data:image/png;base64,zz');
  });

  it('renders the instructions without a QR image when the fetch fails', async () => {
    mocks.api.Admin2FALink.mockRejectedValue(new Error('503'));
    await renderWizard();
    expect(screen.queryByAltText('QR Code')).not.toBeInTheDocument();
    expect(screen.getByText(/Download an authentication app/)).toBeInTheDocument();
    expect(console.error).toHaveBeenCalled();
  });

  it('stays quiet about the failure outside development', async () => {
    vi.stubEnv('DEV', false);
    mocks.api.Admin2FALink.mockRejectedValue(new Error('503'));
    await renderWizard();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('leaves the wizard for the 2FA settings page from Back', async () => {
    await renderWizard();
    await clickButton('Back');
    expect(mocks.navigate).toHaveBeenCalledWith('/SA/2fa-settings');
  });

  it('moves on to code entry from Continue', async () => {
    await goToCodeEntry();
    expect(boxes()[0]).toBeInTheDocument();
    expect(
      screen.getByText(/Enter the code currently showing in your app/)
    ).toBeInTheDocument();
  });
});

describe('typing a code', () => {
  it('accepts a digit per box and advances the focus', async () => {
    await goToCodeEntry();
    await act(async () => {
      fireEvent.change(boxes()[0], { target: { value: '7' } });
    });
    expect(boxes()[0].value).toBe('7');
    expect(document.activeElement).toBe(boxes()[1]);
  });

  it('refuses anything that is not a digit', async () => {
    await goToCodeEntry();
    await act(async () => {
      fireEvent.change(boxes()[0], { target: { value: 'x' } });
    });
    expect(boxes()[0].value).toBe('');
  });

  it('clears a box without moving on', async () => {
    await goToCodeEntry();
    await typeCode('1');
    await act(async () => {
      fireEvent.change(boxes()[0], { target: { value: '' } });
    });
    expect(boxes()[0].value).toBe('');
  });

  it('leaves the focus alone on the last box', async () => {
    await goToCodeEntry();
    await typeCode('123456');
    expect(document.activeElement).toBe(boxes()[5]);
  });

  it('steps back on backspace in an empty box', async () => {
    await goToCodeEntry();
    boxes()[2].focus();
    fireEvent.keyDown(boxes()[2], { key: 'Backspace' });
    expect(document.activeElement).toBe(boxes()[1]);
  });

  it('stays put on backspace in a filled box', async () => {
    await goToCodeEntry();
    await typeCode('12');
    boxes()[1].focus();
    fireEvent.keyDown(boxes()[1], { key: 'Backspace' });
    expect(document.activeElement).toBe(boxes()[1]);
  });

  it('stays put on backspace in the first box', async () => {
    await goToCodeEntry();
    boxes()[0].focus();
    fireEvent.keyDown(boxes()[0], { key: 'Backspace' });
    expect(document.activeElement).toBe(boxes()[0]);
  });

  it('ignores any other key', async () => {
    await goToCodeEntry();
    boxes()[3].focus();
    fireEvent.keyDown(boxes()[3], { key: 'a' });
    expect(document.activeElement).toBe(boxes()[3]);
  });
});

describe('pasting a code', () => {
  const paste = async (text) => {
    await act(async () => {
      fireEvent.paste(boxes()[0], { clipboardData: { getData: () => text } });
    });
  };

  it('fills every box from a six-digit paste', async () => {
    await goToCodeEntry();
    await paste('654321');
    expect(boxes().map((b) => b.value).join('')).toBe('654321');
    expect(document.activeElement).toBe(boxes()[5]);
  });

  it('strips separators and surplus digits out of the paste', async () => {
    await goToCodeEntry();
    await paste('12 34-56789');
    expect(boxes().map((b) => b.value).join('')).toBe('123456');
  });

  it('pads a short paste and parks the focus on the last digit', async () => {
    await goToCodeEntry();
    await paste('12');
    expect(boxes().map((b) => b.value).join('')).toBe('12');
    expect(document.activeElement).toBe(boxes()[1]);
  });

  it('survives a paste with no digits in it at all', async () => {
    await goToCodeEntry();
    await paste('hello');
    expect(boxes().map((b) => b.value).join('')).toBe('');
  });
});

describe('the first verification', () => {
  it('refuses an incomplete code without calling the API', async () => {
    await goToCodeEntry();
    await typeCode('123');
    await clickButton('Continue');
    expect(mocks.showToast).toHaveBeenCalledWith('Please enter a 6-digit code.', 'error');
    expect(mocks.api.Admin2FAVerify).not.toHaveBeenCalled();
  });

  it('sends the joined code and announces the first success', async () => {
    await goToCodeEntry();
    await typeCode('123456');
    await clickButton('Continue');
    expect(mocks.api.Admin2FAVerify).toHaveBeenCalledWith({
      userId: 'admin-1',
      token: '123456',
    });
    expect(mocks.showToast).toHaveBeenCalledWith(
      'OTP first verification successful!',
      'success'
    );
  });

  it('stays on the first phase when the code is rejected', async () => {
    mocks.api.Admin2FAVerify.mockResolvedValue({ data: { data: false } });
    await goToCodeEntry();
    await typeCode('123456');
    await clickButton('Continue');
    expect(mocks.showToast).toHaveBeenCalledWith('Invalid OTP. Please try again.', 'error');
    expect(
      screen.getByText(/Enter the code currently showing in your app/)
    ).toBeInTheDocument();
  });

  it('surfaces the server message when verification errors', async () => {
    mocks.api.Admin2FAVerify.mockRejectedValue({
      response: { data: { message: 'Account locked' } },
    });
    await goToCodeEntry();
    await typeCode('123456');
    await clickButton('Continue');
    expect(mocks.showToast).toHaveBeenCalledWith('Account locked', 'error');
  });

  it('falls back to a generic message when the error carries none', async () => {
    mocks.api.Admin2FAVerify.mockRejectedValue(new Error('network'));
    await goToCodeEntry();
    await typeCode('123456');
    await clickButton('Continue');
    expect(mocks.showToast).toHaveBeenCalledWith('Verification failed.', 'error');
    expect(console.error).toHaveBeenCalled();
  });

  it('logs nothing about the error outside development', async () => {
    vi.stubEnv('DEV', false);
    mocks.api.Admin2FAVerify.mockRejectedValue(new Error('network'));
    await goToCodeEntry();
    await typeCode('123456');
    await clickButton('Continue');
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe('waiting for the code to roll over', () => {
  it('holds the second entry shut until the app shows a new code', async () => {
    atWindowStart();
    await goToCodeEntry();
    await typeCode('123456');
    await clickButton('Continue');
    expect(screen.getByText(/still showing the code you just used/)).toBeInTheDocument();
    expect(boxes()[0]).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('counts down while the window runs out', async () => {
    atWindowStart();
    await goToCodeEntry();
    await typeCode('123456');
    await clickButton('Continue');
    expect(screen.getByRole('status').textContent).toContain('30s');
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByRole('status').textContent).toContain('20s');
  });

  it('opens the second entry once the window rolls over', async () => {
    await goToSecondPhase();
    expect(screen.getByText(/now showing a new code/)).toBeInTheDocument();
    expect(boxes()[0]).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Continue' })).not.toBeDisabled();
    expect(screen.getByText(/This second code must be a different one/)).toBeInTheDocument();
  });

  it('starts the second entry empty', async () => {
    await goToSecondPhase();
    expect(boxes().map((b) => b.value).join('')).toBe('');
  });
});

describe('the second verification', () => {
  it('rejects the code that was already used', async () => {
    await goToSecondPhase();
    mocks.api.Admin2FAVerify.mockClear();
    await typeCode('123456');
    await clickButton('Continue');
    expect(mocks.showToast).toHaveBeenLastCalledWith(
      'Please use a different OTP from your authenticator app.',
      'error'
    );
    expect(mocks.api.Admin2FAVerify).not.toHaveBeenCalled();
    expect(boxes().map((b) => b.value).join('')).toBe('');
    expect(document.activeElement).toBe(boxes()[0]);
  });

  it('announces the second success and reaches the confirmation screen', async () => {
    await goToSecondPhase();
    await typeCode('654321');
    await clickButton('Continue');
    expect(mocks.showToast).toHaveBeenCalledWith(
      'OTP second verification successful!',
      'success'
    );
    expect(screen.getByText('Verification Successful')).toBeInTheDocument();
  });

  it('stays on the second phase when the new code is rejected', async () => {
    await goToSecondPhase();
    mocks.api.Admin2FAVerify.mockResolvedValue({ data: { data: false } });
    await typeCode('654321');
    await clickButton('Continue');
    expect(screen.queryByText('Verification Successful')).not.toBeInTheDocument();
    expect(mocks.showToast).toHaveBeenLastCalledWith('Invalid OTP. Please try again.', 'error');
  });

  it('refuses an incomplete second code', async () => {
    await goToSecondPhase();
    mocks.api.Admin2FAVerify.mockClear();
    await typeCode('65');
    await clickButton('Continue');
    expect(mocks.showToast).toHaveBeenLastCalledWith('Please enter a 6-digit code.', 'error');
    expect(mocks.api.Admin2FAVerify).not.toHaveBeenCalled();
  });
});

describe('stepping backwards', () => {
  it('returns to the QR screen and forgets the code that was typed', async () => {
    await goToCodeEntry();
    await typeCode('123456');
    await clickButton('Back');
    expect(screen.getByText(/Download an authentication app/)).toBeInTheDocument();
    await clickButton('Continue');
    expect(boxes().map((b) => b.value).join('')).toBe('');
  });

  it('drops back to the first phase from the second', async () => {
    await goToSecondPhase();
    await clickButton('Back');
    await clickButton('Continue');
    expect(
      screen.getByText(/Enter the code currently showing in your app/)
    ).toBeInTheDocument();
    expect(boxes()[0]).not.toBeDisabled();
  });
});

describe('finishing enrolment', () => {
  const finish = async () => {
    await goToSecondPhase();
    await typeCode('654321');
    await clickButton('Continue');
  };

  it('jumps the wizard from confirmation straight to the final screen', async () => {
    await finish();
    await clickButton('Continue');
    expect(screen.getByText("You're all set!")).toBeInTheDocument();
  });

  it('sends the admin to the login page', async () => {
    await finish();
    await clickButton('Continue');
    await clickButton('Proceed to login');
    expect(mocks.navigate).toHaveBeenCalledWith('/');
  });
});

describe('editing the second code', () => {
  it('steps back on backspace in an empty second-phase box', async () => {
    await goToSecondPhase();
    boxes()[3].focus();
    fireEvent.keyDown(boxes()[3], { key: 'Backspace' });
    expect(document.activeElement).toBe(boxes()[2]);
  });

  it('fills the second-phase boxes from a paste', async () => {
    await goToSecondPhase();
    await act(async () => {
      fireEvent.paste(boxes()[0], { clipboardData: { getData: () => '654321' } });
    });
    expect(boxes().map((b) => b.value).join('')).toBe('654321');
  });
});

