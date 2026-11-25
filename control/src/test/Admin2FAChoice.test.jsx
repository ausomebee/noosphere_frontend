import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const spies = vi.hoisted(() => ({
  navigate: vi.fn(),
  showValidationErrors: vi.fn(),
}));

// The super admin's 2FA policy, as the page sees it. Defaults to the super
// admin's own view (Back returns to their 2FA settings); tests override it.
const policy = vi.hoisted(() => ({
  value: { isSuperAdmin: true, status: 'ready', enforcedMethod: null, backTarget: '/SA/2fa-settings' },
}));
vi.mock('../hooks/useTwoFactorPolicy', async (importOriginal) => ({
  ...(await importOriginal()),
  default: () => policy.value,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => spies.navigate };
});

vi.mock('../Helper/formErrors', () => ({
  showValidationErrors: (...a) => spies.showValidationErrors(...a),
}));

import Admin2FAChoice from '../Pages/Authentication/Admin2FAChoice';

/**
 * The self-service 2FA picker an admin lands on when the organisation has not
 * mandated a single method. It is a two-option radio group in front of a
 * navigate() call, with no API of its own.
 *
 * The choice defaults to the authenticator app, so the happy path is one click
 * on Continue and the yup schema never has anything to complain about. Reaching
 * the error branch therefore means feeding the group a value the schema's
 * `oneOf` rejects, which the rendered radios cannot produce on their own -- the
 * test rewrites a radio's value attribute before clicking it, since that is the
 * only way an out-of-range value can arrive at the resolver.
 *
 * A RadioInput's label carries no htmlFor, so every click here targets the
 * input[type="radio"] element itself rather than its text.
 */

const radio = (value) =>
  document.body.querySelector(`input[type="radio"][value="${value}"]`);

const continueButton = () => screen.getByRole('button', { name: 'Continue' });

const renderScreen = () =>
  render(
    <MemoryRouter>
      <Admin2FAChoice />
    </MemoryRouter>
  );

const submit = async () => {
  await act(async () => {
    fireEvent.click(continueButton());
  });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('the choice on offer', () => {
  it('opens on the recommended authenticator option', () => {
    renderScreen();
    expect(radio('qrCode').checked).toBe(true);
    expect(radio('securityQuestion').checked).toBe(false);
  });

  it('names both methods and the heading', () => {
    renderScreen();
    expect(
      screen.getByText('Set up Two-Factor Authentication (2FA)')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Authenticator app \(Recommended\)/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Security Question/)).toBeInTheDocument();
  });

  it('shows no validation message before anything is submitted', () => {
    renderScreen();
    expect(document.body.querySelector('.error-message')).toBeNull();
  });
});

describe('continuing', () => {
  it('sends the authenticator route when the default is kept', async () => {
    renderScreen();
    await submit();
    expect(spies.navigate).toHaveBeenCalledWith('/2fa/authenticator');
    expect(spies.showValidationErrors).not.toHaveBeenCalled();
  });

  it('sends the security-question route once that method is picked', async () => {
    renderScreen();
    fireEvent.click(radio('securityQuestion'));
    await submit();
    expect(spies.navigate).toHaveBeenCalledWith('/2fa/security-question');
  });

  it('goes back to the authenticator route when the choice is changed back', async () => {
    renderScreen();
    fireEvent.click(radio('securityQuestion'));
    fireEvent.click(radio('qrCode'));
    await submit();
    expect(spies.navigate).toHaveBeenCalledWith('/2fa/authenticator');
  });

  it('refuses a method the schema does not recognise', async () => {
    renderScreen();
    // The two rendered radios can only ever produce a valid value, so the
    // rejected-value branch is reached by handing the group a third one.
    const rogue = radio('securityQuestion');
    rogue.value = 'smsCode';
    fireEvent.click(rogue);
    await submit();

    expect(spies.navigate).not.toHaveBeenCalled();
    expect(spies.showValidationErrors).toHaveBeenCalled();
    expect(await screen.findByText('Invalid 2FA method')).toBeInTheDocument();
  });
});

describe("respecting the super admin's 2FA choice", () => {
  afterEach(() => {
    policy.value = { isSuperAdmin: true, status: 'ready', enforcedMethod: null, backTarget: '/SA/2fa-settings' };
  });

  it('sends an admin straight to the method the super admin set for everyone', () => {
    policy.value = { isSuperAdmin: false, status: 'ready', enforcedMethod: 'SECRETMESSAGE', backTarget: null };
    renderScreen();
    expect(spies.navigate).toHaveBeenCalledWith('/2fa/security-question', { replace: true });
  });

  it('lets an admin choose when the super admin left it to each admin', () => {
    policy.value = { isSuperAdmin: false, status: 'ready', enforcedMethod: null, backTarget: '/2fa/choice' };
    renderScreen();
    expect(spies.navigate).not.toHaveBeenCalled();
  });

  it('waits for the policy before deciding', () => {
    policy.value = { isSuperAdmin: false, status: 'loading', enforcedMethod: null, backTarget: null };
    renderScreen();
    expect(spies.navigate).not.toHaveBeenCalled();
  });
});
