import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * The tenant security tab: inline email and phone editing, a copyable portal
 * URL, two destructive admin actions and the three-step deactivation modal.
 *
 * The portal URL's apex is derived from `window.location.hostname`, so several
 * tests swap `window.location` for a plain object -- jsdom's own Location would
 * try to navigate if the hostname were assigned directly. The copy button has
 * two independent paths (the clipboard API in a secure context, a hidden
 * textarea otherwise), and both are exercised.
 *
 * The real `ReusableModal` is used so the deactivation flow runs through its
 * own primary-button plumbing; the modal's step is read back from its title.
 */

const mocks = vi.hoisted(() => ({
  params: { tenantId: 'tenant-1' },
  state: {},
  tenantApi: {
    GetSingleTenant: vi.fn(),
    ChangeTenantEmail: vi.fn(),
    ChangeTenantPhoneNumber: vi.fn(),
    ChangeAdminPassword: vi.fn(),
    ResetTenant2FA: vi.fn(),
    DeactivateTenant: vi.fn(),
  },
  showToast: vi.fn(),
  showApiError: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => mocks.params };
});

vi.mock('react-redux', () => ({
  useSelector: (selector) => selector(mocks.state),
}));

vi.mock('../api/TenantApis', () => ({ default: mocks.tenantApi }));
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => mocks.showToast(...a),
  showApiError: (...a) => mocks.showApiError(...a),
}));

import TenantSingleSecuritySettings from '../Pages/Tenant/TenantSingle/TenantSingleSecuritySettings';

const TENANT = {
  id: 'tenant-1',
  companyName: 'Acme Health',
  contactPerson: 'Alan T',
  email: 'admin@acme.test',
  phoneNumber: '08001234567',
  subdomain: 'acme',
};

const buildState = (permissions) => ({
  authentication: {
    isAuthenticated: true,
    loading: false,
    error: null,
    accessToken: 'token',
    refreshToken: 'refresh',
    user: {
      id: 'u1',
      role: { roleModuleAccesses: [{ module: 'TENANT', permissions }] },
    },
  },
});

const ALL_PERMS = ['manage_tenant_security', 'deactivate_tenant'];

const renderSettings = async ({ permissions = ALL_PERMS } = {}) => {
  mocks.state = buildState(permissions);
  const view = render(
    <MemoryRouter>
      <TenantSingleSecuritySettings />
    </MemoryRouter>
  );
  await act(async () => {});
  return view;
};

const originalLocation = window.location;
const setHostname = (hostname) => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { ...originalLocation, hostname },
  });
};

// Each settings row pairs its label with the control and the button that acts
// on it, and neither is associated with the label by markup.
const row = (label) =>
  Array.from(document.body.querySelectorAll('.tenant-settings-row')).find(
    (r) => r.querySelector('.tenant-settings-label')?.textContent === label
  );
const rowInput = (label) => row(label).querySelector('.settings-input');
const rowButton = (label) => row(label).querySelector('.custom-button');
const portalUrlText = () => document.body.querySelector('.tenant-portal-url-text').textContent;
const modalTitle = () => document.body.querySelector('.modal-title')?.textContent;
const primaryButton = () => document.body.querySelector('.primary-button');
const secondaryButton = () => document.body.querySelector('.secondary-button');
// Both toggles are async handlers, and Button locks itself for as long as the
// promise they return is pending -- an un-awaited click leaves the button busy
// and swallows the next one.
const toggleEmail = () =>
  act(async () => {
    fireEvent.click(rowButton('Tenant Admin Email'));
  });
const togglePhone = () =>
  act(async () => {
    fireEvent.click(rowButton('Tenant Admin Mobile'));
  });

const field = (label) => {
  const group = Array.from(document.body.querySelectorAll('.input-group')).find(
    (g) => g.querySelector('.input-label')?.textContent === label
  );
  return group?.querySelector('input, select, textarea');
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.params = { tenantId: 'tenant-1' };
  vi.spyOn(console, 'error').mockImplementation(() => {});
  setHostname('localhost');
  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  document.execCommand = vi.fn();
  mocks.tenantApi.GetSingleTenant.mockResolvedValue({ data: TENANT });
  mocks.tenantApi.ChangeTenantEmail.mockResolvedValue({});
  mocks.tenantApi.ChangeTenantPhoneNumber.mockResolvedValue({});
  mocks.tenantApi.ChangeAdminPassword.mockResolvedValue({});
  mocks.tenantApi.ResetTenant2FA.mockResolvedValue({});
  mocks.tenantApi.DeactivateTenant.mockResolvedValue({});
});

afterEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: originalLocation,
  });
  vi.restoreAllMocks();
});

describe('loading the tenant', () => {
  it('shows a section loader first', async () => {
    mocks.state = buildState(ALL_PERMS);
    render(
      <MemoryRouter>
        <TenantSingleSecuritySettings />
      </MemoryRouter>
    );
    expect(document.body.querySelector('.section-loader')).toBeInTheDocument();
    await act(async () => {});
    expect(document.body.querySelector('.section-loader')).toBeNull();
  });

  it('fills the editable fields from the tenant', async () => {
    await renderSettings();
    expect(rowInput('Tenant Admin Email')).toHaveValue('admin@acme.test');
    expect(rowInput('Tenant Admin Mobile')).toHaveValue('08001234567');
    expect(document.body.querySelector('.tenant-title-breadcrumbs-org')).toHaveTextContent('Acme Health');
  });

  it('reads a tenant response that is not wrapped in data', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({ ...TENANT });
    await renderSettings();
    expect(rowInput('Tenant Admin Email')).toHaveValue('admin@acme.test');
  });

  it('leaves both fields blank when the tenant has neither', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({ data: { contactPerson: 'Alan T' } });
    await renderSettings();
    expect(rowInput('Tenant Admin Email')).toHaveValue('');
    expect(rowInput('Tenant Admin Mobile')).toHaveValue('');
    expect(document.body.querySelector('.tenant-title-breadcrumbs-org')).toHaveTextContent('Alan T');
  });

  it('falls back to the generic breadcrumb for an unnamed tenant', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({ data: {} });
    await renderSettings();
    expect(document.body.querySelector('.tenant-title-breadcrumbs-org')).toHaveTextContent('Tenant');
  });

  it('surfaces a failed tenant load', async () => {
    mocks.tenantApi.GetSingleTenant.mockRejectedValue(new Error('x'));
    await renderSettings();
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOAD_TENANT');
    expect(portalUrlText()).toBe('https://—');
  });
});

describe('the portal url', () => {
  it('dashes the url when the tenant has no subdomain', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({ data: { ...TENANT, subdomain: null } });
    await renderSettings();
    expect(portalUrlText()).toBe('https://—');
  });

  it('falls back to the production apex on localhost', async () => {
    await renderSettings();
    expect(portalUrlText()).toBe('https://acme.nooshere.org/tenant/');
  });

  it('falls back to the production apex on a localhost subdomain', async () => {
    setHostname('control.localhost');
    await renderSettings();
    expect(portalUrlText()).toBe('https://acme.nooshere.org/tenant/');
  });

  it('falls back to the production apex on an amazonaws host', async () => {
    setHostname('ec2-1-2-3-4.compute.amazonaws.com');
    await renderSettings();
    expect(portalUrlText()).toBe('https://acme.nooshere.org/tenant/');
  });

  it('falls back to the production apex on a raw ip address', async () => {
    setHostname('10.0.11.254');
    await renderSettings();
    expect(portalUrlText()).toBe('https://acme.nooshere.org/tenant/');
  });

  it('takes the apex from a real host', async () => {
    setHostname('admin.staging.example.org');
    await renderSettings();
    expect(portalUrlText()).toBe('https://acme.example.org/tenant/');
  });

  it('uses a single-label host as it stands', async () => {
    setHostname('intranet');
    await renderSettings();
    expect(portalUrlText()).toBe('https://acme.intranet/tenant/');
  });
});

describe('copying the portal url', () => {
  const copyButton = () => document.body.querySelector('.tenant-copy-button');

  it('writes the url through the clipboard api in a secure context', async () => {
    await renderSettings();
    fireEvent.click(copyButton());
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'https://acme.nooshere.org/tenant/'
    );
    expect(mocks.showToast).toHaveBeenCalledWith('URL copied to clipboard', 'success');
  });

  it('falls back to a hidden textarea outside a secure context', async () => {
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    await renderSettings();
    fireEvent.click(copyButton());
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(mocks.showToast).toHaveBeenCalledWith('URL copied to clipboard', 'success');
  });

  it('warns when the copy throws', async () => {
    navigator.clipboard.writeText.mockImplementation(() => {
      throw new Error('denied');
    });
    await renderSettings();
    fireEvent.click(copyButton());
    expect(mocks.showToast).toHaveBeenCalledWith('Failed to copy URL', 'error');
  });

  it('does nothing when there is no url to copy', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({ data: { ...TENANT, subdomain: '' } });
    await renderSettings();
    fireEvent.click(copyButton());
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(mocks.showToast).not.toHaveBeenCalled();
  });
});

describe('changing the admin email', () => {
  it('unlocks the field on the first click', async () => {
    await renderSettings();
    expect(rowInput('Tenant Admin Email')).toHaveAttribute('readonly');
    await toggleEmail();
    expect(rowInput('Tenant Admin Email')).not.toHaveAttribute('readonly');
    expect(rowButton('Tenant Admin Email')).toHaveTextContent('Save');
    expect(mocks.tenantApi.ChangeTenantEmail).not.toHaveBeenCalled();
  });

  it('refuses to save an empty email', async () => {
    await renderSettings();
    await toggleEmail();
    fireEvent.change(rowInput('Tenant Admin Email'), { target: { value: '' } });
    await toggleEmail();
    expect(mocks.showToast).toHaveBeenCalledWith('Email is required', 'error');
    expect(mocks.tenantApi.ChangeTenantEmail).not.toHaveBeenCalled();
  });

  it('saves the edited email and reloads the tenant', async () => {
    await renderSettings();
    await toggleEmail();
    fireEvent.change(rowInput('Tenant Admin Email'), { target: { value: 'new@acme.test' } });
    await toggleEmail();
    expect(mocks.tenantApi.ChangeTenantEmail).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', email: 'new@acme.test' })
    );
    expect(mocks.showToast).toHaveBeenCalledWith('Email updated successfully', 'success');
    expect(mocks.tenantApi.GetSingleTenant).toHaveBeenCalledTimes(2);
    expect(rowInput('Tenant Admin Email')).toHaveAttribute('readonly');
  });

  it('stays in edit mode when the save is rejected', async () => {
    mocks.tenantApi.ChangeTenantEmail.mockRejectedValue(new Error('x'));
    await renderSettings();
    await toggleEmail();
    await toggleEmail();
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'UPDATE_TENANT_EMAIL');
    expect(rowInput('Tenant Admin Email')).not.toHaveAttribute('readonly');
  });
});

describe('changing the admin phone', () => {
  it('unlocks the field on the first click', async () => {
    await renderSettings();
    await togglePhone();
    expect(rowInput('Tenant Admin Mobile')).not.toHaveAttribute('readonly');
    expect(mocks.tenantApi.ChangeTenantPhoneNumber).not.toHaveBeenCalled();
  });

  it('refuses to save an empty phone number', async () => {
    await renderSettings();
    await togglePhone();
    fireEvent.change(rowInput('Tenant Admin Mobile'), { target: { value: '' } });
    await togglePhone();
    expect(mocks.showToast).toHaveBeenCalledWith('Phone number is required', 'error');
  });

  it('saves the edited phone number', async () => {
    await renderSettings();
    await togglePhone();
    fireEvent.change(rowInput('Tenant Admin Mobile'), { target: { value: '07000000000' } });
    await togglePhone();
    expect(mocks.tenantApi.ChangeTenantPhoneNumber).toHaveBeenCalledWith(
      expect.objectContaining({ phoneNumber: '07000000000' })
    );
    expect(mocks.showToast).toHaveBeenCalledWith('Phone number updated successfully', 'success');
  });

  it('stays in edit mode when the save is rejected', async () => {
    mocks.tenantApi.ChangeTenantPhoneNumber.mockRejectedValue(new Error('x'));
    await renderSettings();
    await togglePhone();
    await togglePhone();
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'UPDATE_TENANT_PHONE');
    expect(rowInput('Tenant Admin Mobile')).not.toHaveAttribute('readonly');
  });
});

describe('admin security actions', () => {
  it('resets the admin password', async () => {
    await renderSettings();
    await act(async () => {
      fireEvent.click(screen.getByText('Reset Password'));
    });
    expect(mocks.tenantApi.ChangeAdminPassword).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1' })
    );
    expect(mocks.showToast).toHaveBeenCalledWith('Password reset successfully', 'success');
  });

  it('surfaces a failed password reset', async () => {
    mocks.tenantApi.ChangeAdminPassword.mockRejectedValue(new Error('x'));
    await renderSettings();
    await act(async () => {
      fireEvent.click(screen.getByText('Reset Password'));
    });
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'RESET_TENANT_PASSWORD');
  });

  it('confirms before resetting two-factor authentication', async () => {
    await renderSettings();
    fireEvent.click(screen.getByText('Reset tenant two-factor authentication settings'));
    expect(modalTitle()).toBe("Are you sure you want to reset this tenant's login?");
    await act(async () => {
      fireEvent.click(primaryButton());
    });
    expect(mocks.tenantApi.ResetTenant2FA).toHaveBeenCalled();
    expect(mocks.showToast).toHaveBeenCalledWith('Tenant 2FA login reset successfully', 'success');
    expect(modalTitle()).toBeUndefined();
  });

  it('keeps the confirmation open when the reset is rejected', async () => {
    mocks.tenantApi.ResetTenant2FA.mockRejectedValue(new Error('x'));
    await renderSettings();
    fireEvent.click(screen.getByText('Reset tenant two-factor authentication settings'));
    await act(async () => {
      fireEvent.click(primaryButton());
    });
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'RESET_TENANT_2FA');
    expect(modalTitle()).toBe("Are you sure you want to reset this tenant's login?");
  });

  it('closes the confirmation on cancel', async () => {
    await renderSettings();
    fireEvent.click(screen.getByText('Reset tenant two-factor authentication settings'));
    fireEvent.click(secondaryButton());
    expect(modalTitle()).toBeUndefined();
    expect(mocks.tenantApi.ResetTenant2FA).not.toHaveBeenCalled();
  });
});

describe('deactivating the tenant', () => {
  const openDeactivate = async () => {
    await renderSettings();
    fireEvent.click(screen.getByText('Deactivate Account'));
  };

  const advance = async () => {
    await act(async () => {
      fireEvent.click(primaryButton());
    });
  };

  it('refuses to leave the first step without a reason', async () => {
    await openDeactivate();
    expect(modalTitle()).toBe('Deactivate tenant account');
    expect(primaryButton()).toHaveTextContent('Deactivate account');
    await advance();
    expect(mocks.showToast).toHaveBeenCalledWith('Please select a deactivation reason', 'error');
    expect(modalTitle()).toBe('Deactivate tenant account');
  });

  it('walks through the warning and the password step', async () => {
    await openDeactivate();
    fireEvent.change(field('Deactivation reason'), { target: { value: 'Security Risks' } });
    await advance();
    expect(modalTitle()).toBe('Are you sure?');
    expect(primaryButton()).toHaveTextContent('I am sure');
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    await advance();
    expect(modalTitle()).toBe('Enter password');
    expect(primaryButton()).toHaveTextContent('Deactivate account');
  });

  it('refuses to deactivate without a password', async () => {
    await openDeactivate();
    fireEvent.change(field('Deactivation reason'), { target: { value: 'Security Risks' } });
    await advance();
    await advance();
    await advance();
    expect(mocks.showToast).toHaveBeenCalledWith('Please enter your password', 'error');
    expect(mocks.tenantApi.DeactivateTenant).not.toHaveBeenCalled();
  });

  it('sends the reason, the details and the password', async () => {
    await openDeactivate();
    fireEvent.change(field('Deactivation reason'), { target: { value: 'Fraudulent Activity' } });
    fireEvent.change(field('Provide details'), { target: { value: 'Chargebacks' } });
    await advance();
    await advance();
    fireEvent.change(screen.getByPlaceholderText('Enter password'), { target: { value: 'hunter2' } });
    await advance();
    expect(mocks.tenantApi.DeactivateTenant).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'tenant-1',
        active: false,
        deactivatedById: 'u1',
        password: 'hunter2',
        reason: 'Fraudulent Activity',
        details: 'Chargebacks',
      })
    );
    expect(mocks.showToast).toHaveBeenCalledWith('Tenant deactivated successfully', 'success');
    expect(modalTitle()).toBeUndefined();
    expect(mocks.tenantApi.GetSingleTenant).toHaveBeenCalledTimes(2);
  });

  it('keeps the modal on the password step when the request is rejected', async () => {
    mocks.tenantApi.DeactivateTenant.mockRejectedValue(new Error('x'));
    await openDeactivate();
    fireEvent.change(field('Deactivation reason'), { target: { value: 'Security Risks' } });
    await advance();
    await advance();
    fireEvent.change(screen.getByPlaceholderText('Enter password'), { target: { value: 'hunter2' } });
    await advance();
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'DEACTIVATE_TENANT');
    expect(modalTitle()).toBe('Enter password');
  });

  it('resets the flow when it is cancelled and reopened', async () => {
    await openDeactivate();
    fireEvent.change(field('Deactivation reason'), { target: { value: 'Security Risks' } });
    await advance();
    fireEvent.click(secondaryButton());
    expect(modalTitle()).toBeUndefined();
    fireEvent.click(screen.getByText('Deactivate Account'));
    expect(modalTitle()).toBe('Deactivate tenant account');
    expect(field('Deactivation reason')).toHaveValue('');
  });
});

describe('permission gating', () => {
  it('hides the change buttons and the admin section without the security permission', async () => {
    await renderSettings({ permissions: ['deactivate_tenant'] });
    expect(rowButton('Tenant Admin Email')).toBeNull();
    expect(rowButton('Tenant Admin Mobile')).toBeNull();
    expect(screen.queryByText('Admin Security Settings')).toBeNull();
    expect(screen.getByText('Deactivate Account')).toBeInTheDocument();
  });

  it('hides the deactivate button without the deactivate permission', async () => {
    await renderSettings({ permissions: ['manage_tenant_security'] });
    expect(screen.queryByText('Deactivate Account')).toBeNull();
    expect(screen.getByText('Admin Security Settings')).toBeInTheDocument();
  });
});

describe('a host the browser does not report', () => {
  it('treats an empty hostname as a single-label host', async () => {
    setHostname('');
    await renderSettings();
    expect(portalUrlText()).toBe('https://acme./tenant/');
  });
});
