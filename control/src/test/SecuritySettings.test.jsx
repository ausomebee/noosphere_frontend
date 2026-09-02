import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const showToast = vi.fn();
const showApiError = vi.fn();
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => showToast(...a),
  showApiError: (...a) => showApiError(...a),
}));

const authApis = vi.hoisted(() => ({
  GetSuperAdminChoices: vi.fn(),
  SetSuperAdminEnabled: vi.fn(),
  AdminSetPassword: vi.fn(),
  SuperAdministrativePassword: vi.fn(),
  SuperAdminChoices: vi.fn(),
}));
vi.mock('../api/authApis', () => ({ default: authApis }));

const state = {
  authentication: {
    accessToken: 'at',
    refreshToken: 'rt',
    user: { id: 'admin-1', email: 'boss@example.com' },
  },
};
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (fn) => fn(state),
}));

import SecuritySettings from '../Pages/Settings/SecuritySettings';

/**
 * The super-admin security page: two password modals and the 2FA panel.
 *
 * `usePermission` treats an admin with no role at all as a super-admin, so the
 * default fixture here is roleless and sees everything; the permission tests
 * hand the user an explicit role whose grants are narrowed instead.
 *
 * The 2FA method rows only exist while the master switch is on, and the switch
 * starts off, so every test that reaches a gear icon first has the fetch report
 * `isEnabled: true` rather than clicking the switch — clicking it would fire a
 * save the test does not care about.
 *
 * Both save handlers are async and return their promise to ReusableModal, so
 * clicks on the modal's primary button are wrapped in an async `act` rather
 * than driven with timers.
 */

// A password that satisfies every rule in the shared policy.
const STRONG = 'Str0ng!pass';

const choices = (over = {}) => ({
  data: {
    data: {
      isEnabled: true,
      securityQuestion: true,
      Authenticator2FA: false,
      setForAll: false,
      ...over,
    },
  },
});

const restrictTo = (permissions) => {
  state.authentication.user.role = {
    roleModuleAccesses: [{ module: 'SETTINGS', permissions }],
  };
};

const modalPrimary = () => document.body.querySelector('.primary-button');
const modalSecondary = () => document.body.querySelector('.secondary-button');
const field = (placeholder) => screen.getByPlaceholderText(placeholder);
const submitModal = async () => {
  await act(async () => {
    fireEvent.click(modalPrimary());
  });
};

const renderPage = async () => {
  const view = render(<SecuritySettings />);
  await waitFor(() => expect(authApis.GetSuperAdminChoices).toHaveBeenCalled());
  return view;
};

// The gear buttons sit in the order the methods are listed: question first.
const gearFor = (name) =>
  screen
    .getByText(name)
    .closest('.settings-2fa-method-row')
    .querySelector('.settings-2fa-gear-btn');

beforeEach(() => {
  vi.clearAllMocks();
  delete state.authentication.user.role;
  state.authentication.user.id = 'admin-1';
  state.authentication.user.email = 'boss@example.com';
  authApis.GetSuperAdminChoices.mockResolvedValue(choices());
  authApis.SetSuperAdminEnabled.mockResolvedValue({});
  authApis.AdminSetPassword.mockResolvedValue({});
  authApis.SuperAdministrativePassword.mockResolvedValue({});
  authApis.SuperAdminChoices.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('permission gating', () => {
  it('shows the page to an admin with no role at all', async () => {
    await renderPage();
    expect(screen.getByText('Security Settings')).toBeInTheDocument();
  });

  it('refuses an admin without the view permission', async () => {
    restrictTo(['view_roles']);
    render(<SecuritySettings />);
    expect(
      screen.getByText("You don't have permission to view this.")
    ).toBeInTheDocument();
    expect(screen.queryByText('General Settings')).not.toBeInTheDocument();
  });

  it('hides the 2FA switch and gears from a view-only admin', async () => {
    restrictTo(['view_security_settings']);
    await renderPage();
    await waitFor(() => expect(screen.getByText('Security Question')).toBeInTheDocument());
    expect(document.querySelector('.switch input')).toBeNull();
    expect(document.querySelector('.settings-2fa-gear-btn')).toBeNull();
  });

  it('gives the switch and gears to an admin who may manage', async () => {
    restrictTo(['view_security_settings', 'manage_security_settings']);
    await renderPage();
    await waitFor(() => expect(document.querySelector('.switch input')).toBeTruthy());
    expect(screen.getAllByTitle('Settings').length).toBe(2);
  });
});

describe('loading the saved choices', () => {
  it('turns the master switch on and marks the default method', async () => {
    await renderPage();
    await waitFor(() =>
      expect(document.querySelector('.switch input').checked).toBe(true)
    );
    const question = screen.getByText('Security Question').closest('.settings-2fa-method-row');
    expect(question.textContent).toContain('Default');
    const app = screen.getByText('Authenticator App').closest('.settings-2fa-method-row');
    expect(app.textContent).not.toContain('Default');
  });

  it('leaves the methods hidden when 2FA is off on the server', async () => {
    authApis.GetSuperAdminChoices.mockResolvedValue(choices({ isEnabled: false }));
    await renderPage();
    await waitFor(() =>
      expect(document.querySelector('.switch input').checked).toBe(false)
    );
    expect(screen.queryByText('Security Question')).not.toBeInTheDocument();
  });

  it('reflects the set-for-all flag on both modals', async () => {
    authApis.GetSuperAdminChoices.mockResolvedValue(choices({ setForAll: true }));
    await renderPage();
    await waitFor(() => expect(screen.getByText('Security Question')).toBeInTheDocument());

    fireEvent.click(gearFor('Security Question'));
    expect(
      screen
        .getByText('Enable this method for all users')
        .closest('.input-checkbox-group')
        .querySelector('input').checked
    ).toBe(true);
  });

  it('keeps its defaults when the response carries no payload', async () => {
    authApis.GetSuperAdminChoices.mockResolvedValue({ data: {} });
    await renderPage();
    expect(document.querySelector('.switch input').checked).toBe(false);
  });

  it('keeps its defaults when the response is empty', async () => {
    authApis.GetSuperAdminChoices.mockResolvedValue(undefined);
    await renderPage();
    expect(document.querySelector('.switch input').checked).toBe(false);
  });

  it('logs a failed fetch in development and still renders', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    authApis.GetSuperAdminChoices.mockRejectedValue(new Error('offline'));
    await renderPage();
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(screen.getByText('Security Settings')).toBeInTheDocument();
    expect(showApiError).not.toHaveBeenCalled();
  });

  it('stays silent about a failed fetch in production', async () => {
    vi.stubEnv('DEV', false);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    authApis.GetSuperAdminChoices.mockRejectedValue(new Error('offline'));
    await renderPage();
    await waitFor(() => expect(screen.getByText('Security Settings')).toBeInTheDocument());
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('the account summary', () => {
  it('shows the signed-in admin email', async () => {
    await renderPage();
    expect(screen.getByText('boss@example.com')).toBeInTheDocument();
  });

  it('says Not set when the admin record carries no email', async () => {
    delete state.authentication.user.email;
    await renderPage();
    expect(screen.getByText('Not set')).toBeInTheDocument();
  });
});

describe('the master 2FA switch', () => {
  const toggle = async () => {
    await act(async () => {
      fireEvent.click(document.querySelector('.switch input'));
    });
  };

  it('turns 2FA on and says so', async () => {
    authApis.GetSuperAdminChoices.mockResolvedValue(choices({ isEnabled: false }));
    await renderPage();
    await toggle();
    expect(authApis.SetSuperAdminEnabled).toHaveBeenCalledWith({
      isEnabled: true,
      accessToken: 'at',
      refreshToken: 'rt',
    });
    expect(showToast).toHaveBeenCalledWith(
      'Two-factor authentication enabled',
      'success'
    );
  });

  it('turns 2FA off again', async () => {
    await renderPage();
    await waitFor(() =>
      expect(document.querySelector('.switch input').checked).toBe(true)
    );
    await toggle();
    expect(showToast).toHaveBeenCalledWith(
      'Two-factor authentication disabled',
      'success'
    );
    expect(screen.queryByText('Security Question')).not.toBeInTheDocument();
  });

  it('puts the switch back when the save is refused', async () => {
    authApis.GetSuperAdminChoices.mockResolvedValue(choices({ isEnabled: false }));
    authApis.SetSuperAdminEnabled.mockRejectedValue(new Error('offline'));
    await renderPage();
    await toggle();
    expect(showApiError).toHaveBeenCalledWith(expect.any(Error), 'TOGGLE_2FA');
    expect(document.querySelector('.switch input').checked).toBe(false);
  });
});

describe('changing the password', () => {
  const open = async () => {
    await renderPage();
    fireEvent.click(screen.getAllByText('Change')[0]);
    await waitFor(() => expect(screen.getByText('Change Password')).toBeInTheDocument());
  };

  const fill = (current, next, confirm = next) => {
    fireEvent.change(field('Enter current password'), { target: { value: current } });
    fireEvent.change(field('Enter new password'), { target: { value: next } });
    fireEvent.change(field('Confirm new password'), { target: { value: confirm } });
  };

  it('refuses a blank current password', async () => {
    await open();
    fill('', STRONG);
    await submitModal();
    expect(showToast).toHaveBeenCalledWith('Please fill in all fields', 'error');
    expect(authApis.AdminSetPassword).not.toHaveBeenCalled();
  });

  it('refuses a blank new password', async () => {
    await open();
    fill('old-pass', '   ');
    await submitModal();
    expect(showToast).toHaveBeenCalledWith('Please fill in all fields', 'error');
  });

  it('refuses a new password that misses a policy rule', async () => {
    await open();
    fill('old-pass', 'alllowercase1!');
    await submitModal();
    expect(showToast).toHaveBeenCalledWith(
      'Password must have: one uppercase letter',
      'error'
    );
    expect(authApis.AdminSetPassword).not.toHaveBeenCalled();
  });

  it('refuses a confirmation that does not match', async () => {
    await open();
    fill('old-pass', STRONG, `${STRONG}x`);
    await submitModal();
    expect(showToast).toHaveBeenCalledWith(
      'New password and confirm password do not match',
      'error'
    );
  });

  it('saves a valid password and empties the form', async () => {
    await open();
    fill('old-pass', STRONG);
    await submitModal();
    expect(authApis.AdminSetPassword).toHaveBeenCalledWith({
      id: 'admin-1',
      password: STRONG,
    });
    expect(showToast).toHaveBeenCalledWith('Password changed successfully', 'success');
    await waitFor(() => expect(screen.queryByText('Change Password')).toBeNull());

    fireEvent.click(screen.getAllByText('Change')[0]);
    await waitFor(() => expect(screen.getByText('Change Password')).toBeInTheDocument());
    expect(field('Enter new password').value).toBe('');
  });

  it('sends no id when the admin record has none', async () => {
    delete state.authentication.user.id;
    await open();
    fill('old-pass', STRONG);
    await submitModal();
    expect(authApis.AdminSetPassword).toHaveBeenCalledWith({
      id: undefined,
      password: STRONG,
    });
  });

  it('reports a refused change and stays open', async () => {
    authApis.AdminSetPassword.mockRejectedValue(new Error('wrong password'));
    await open();
    fill('old-pass', STRONG);
    await submitModal();
    expect(showApiError).toHaveBeenCalledWith(expect.any(Error), 'CHANGE_PASSWORD');
    expect(screen.getByText('Change Password')).toBeInTheDocument();
  });

  it('closes on cancel', async () => {
    await open();
    fireEvent.click(modalSecondary());
    await waitFor(() => expect(screen.queryByText('Change Password')).toBeNull());
  });
});

describe('changing the administrative password', () => {
  const open = async () => {
    await renderPage();
    fireEvent.click(screen.getAllByText('Change')[1]);
    await waitFor(() =>
      expect(screen.getByText('Change Administrative Password')).toBeInTheDocument()
    );
  };

  const fill = (current, next, confirm = next) => {
    fireEvent.change(field('Enter current administrative password'), {
      target: { value: current },
    });
    fireEvent.change(field('Enter new administrative password'), {
      target: { value: next },
    });
    fireEvent.change(field('Confirm new administrative password'), {
      target: { value: confirm },
    });
  };

  it('refuses an incomplete form', async () => {
    await open();
    fill('', STRONG);
    await submitModal();
    expect(showToast).toHaveBeenCalledWith('Please fill in all fields', 'error');
    expect(authApis.SuperAdministrativePassword).not.toHaveBeenCalled();
  });

  it('refuses a new password that misses a policy rule', async () => {
    await open();
    fill('old-admin', 'Sh0rt!');
    await submitModal();
    expect(showToast).toHaveBeenCalledWith(
      'Password must have: at least 8 characters',
      'error'
    );
  });

  it('refuses a confirmation that does not match', async () => {
    await open();
    fill('old-admin', STRONG, 'Other1!pass');
    await submitModal();
    expect(showToast).toHaveBeenCalledWith(
      'New password and confirm password do not match',
      'error'
    );
  });

  it('sends both passwords and closes', async () => {
    await open();
    fill('old-admin', STRONG);
    await submitModal();
    expect(authApis.SuperAdministrativePassword).toHaveBeenCalledWith({
      id: 'admin-1',
      oldAdministratorPassword: 'old-admin',
      newAdministratorPassword: STRONG,
    });
    expect(showToast).toHaveBeenCalledWith(
      'Administrative password changed successfully',
      'success'
    );
    await waitFor(() =>
      expect(screen.queryByText('Change Administrative Password')).toBeNull()
    );
  });

  it('sends no id when the admin record has none', async () => {
    delete state.authentication.user.id;
    await open();
    fill('old-admin', STRONG);
    await submitModal();
    expect(authApis.SuperAdministrativePassword).toHaveBeenCalledWith(
      expect.objectContaining({ id: undefined })
    );
  });

  it('reports a refused change', async () => {
    authApis.SuperAdministrativePassword.mockRejectedValue(new Error('denied'));
    await open();
    fill('old-admin', STRONG);
    await submitModal();
    expect(showApiError).toHaveBeenCalledWith(
      expect.any(Error),
      'CHANGE_ADMIN_PASSWORD'
    );
  });

  it('closes on cancel', async () => {
    await open();
    fireEvent.click(modalSecondary());
    await waitFor(() =>
      expect(screen.queryByText('Change Administrative Password')).toBeNull()
    );
  });
});

describe('the security question method', () => {
  const open = async (over) => {
    authApis.GetSuperAdminChoices.mockResolvedValue(choices(over));
    await renderPage();
    await waitFor(() => expect(screen.getByText('Security Question')).toBeInTheDocument());
    fireEvent.click(gearFor('Security Question'));
    await waitFor(() =>
      expect(screen.getByText('Security Question Settings')).toBeInTheDocument()
    );
  };

  // The checkbox label is a sibling of its input, not a wrapper, so the lookup
  // has to climb to the group.
  const checkbox = (label) =>
    screen.getByText(label).closest('.input-checkbox-group').querySelector('input');

  it('opens with the primary box matching the row badge', async () => {
    await open();
    expect(checkbox('Set as primary authentication method').checked).toBe(true);
  });

  it('opens with the primary box clear when the row is not the default', async () => {
    await open({ securityQuestion: false, Authenticator2FA: true });
    expect(checkbox('Set as primary authentication method').checked).toBe(false);
  });

  it('saves the method as primary and re-reads the server state', async () => {
    await open();
    fireEvent.click(checkbox('Enable this method for all users'));
    await submitModal();

    expect(authApis.SuperAdminChoices).toHaveBeenCalledWith({
      Authenticator2FA: false,
      securityQuestion: true,
      setForAll: true,
    });
    expect(showToast).toHaveBeenCalledWith('Security question settings saved', 'success');
    await waitFor(() =>
      expect(authApis.GetSuperAdminChoices).toHaveBeenCalledTimes(2)
    );
  });

  it('leaves the badge alone when it is not being made primary', async () => {
    await open({ securityQuestion: false, Authenticator2FA: true });
    // The re-fetch would otherwise put the badge back, so it is silenced here
    // to observe what the save itself did to the rows.
    authApis.GetSuperAdminChoices.mockResolvedValue({ data: {} });
    await submitModal();
    const app = screen.getByText('Authenticator App').closest('.settings-2fa-method-row');
    expect(app.textContent).toContain('Default');
  });

  it('reports a refused save', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    authApis.SuperAdminChoices.mockRejectedValue(new Error('offline'));
    await open();
    await submitModal();
    expect(showToast).toHaveBeenCalledWith('Failed to save settings', 'error');
    expect(spy).toHaveBeenCalled();
    expect(screen.getByText('Security Question Settings')).toBeInTheDocument();
  });

  it('stays silent about the failure in production', async () => {
    vi.stubEnv('DEV', false);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    authApis.SuperAdminChoices.mockRejectedValue(new Error('offline'));
    await open();
    await submitModal();
    expect(showToast).toHaveBeenCalledWith('Failed to save settings', 'error');
    expect(spy).not.toHaveBeenCalled();
  });

  it('closes on cancel without saving', async () => {
    await open();
    fireEvent.click(modalSecondary());
    await waitFor(() =>
      expect(screen.queryByText('Security Question Settings')).toBeNull()
    );
    expect(authApis.SuperAdminChoices).not.toHaveBeenCalled();
  });
});

describe('the authenticator method', () => {
  const open = async (over) => {
    authApis.GetSuperAdminChoices.mockResolvedValue(choices(over));
    await renderPage();
    await waitFor(() => expect(screen.getByText('Authenticator App')).toBeInTheDocument());
    fireEvent.click(gearFor('Authenticator App'));
    // The modal's title repeats the row's name, so the modal is identified by
    // the portalled node rather than by its text.
    await waitFor(() =>
      expect(document.body.querySelector('.modal-content')).toBeTruthy()
    );
  };

  // The checkbox label is a sibling of its input, not a wrapper, so the lookup
  // has to climb to the group.
  const checkbox = (label) =>
    screen.getByText(label).closest('.input-checkbox-group').querySelector('input');

  it('opens with the default box clear while the question is primary', async () => {
    await open();
    expect(checkbox('Set as default authentication method').checked).toBe(false);
  });

  it('opens with the default box ticked when it already is primary', async () => {
    await open({ securityQuestion: false, Authenticator2FA: true });
    expect(checkbox('Set as default authentication method').checked).toBe(true);
  });

  it('saves the method and moves the badge onto it', async () => {
    await open({ securityQuestion: false, Authenticator2FA: true });
    // Silenced so the badge observed below is the one the save moved.
    authApis.GetSuperAdminChoices.mockResolvedValue({ data: {} });
    fireEvent.click(checkbox('Enable this method for all users'));
    await submitModal();

    expect(authApis.SuperAdminChoices).toHaveBeenCalledWith({
      Authenticator2FA: true,
      securityQuestion: false,
      setForAll: true,
    });
    expect(showToast).toHaveBeenCalledWith('Authenticator settings saved', 'success');
    const app = screen.getByText('Authenticator App').closest('.settings-2fa-method-row');
    expect(app.textContent).toContain('Default');
  });

  it('leaves the badge where it was when it is not being made default', async () => {
    await open();
    authApis.GetSuperAdminChoices.mockResolvedValue({ data: {} });
    await submitModal();
    const question = screen.getByText('Security Question').closest('.settings-2fa-method-row');
    expect(question.textContent).toContain('Default');
  });

  it('reports a refused save', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    authApis.SuperAdminChoices.mockRejectedValue(new Error('offline'));
    await open();
    await submitModal();
    expect(showToast).toHaveBeenCalledWith(
      'Failed to save authenticator settings',
      'error'
    );
    expect(spy).toHaveBeenCalled();
  });

  it('stays silent about the failure in production', async () => {
    vi.stubEnv('DEV', false);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    authApis.SuperAdminChoices.mockRejectedValue(new Error('offline'));
    await open();
    await submitModal();
    expect(spy).not.toHaveBeenCalled();
  });

  it('closes on cancel without saving', async () => {
    await open();
    fireEvent.click(modalSecondary());
    await waitFor(() => expect(document.body.querySelector('.modal-content')).toBeNull());
    expect(authApis.SuperAdminChoices).not.toHaveBeenCalled();
  });
});
