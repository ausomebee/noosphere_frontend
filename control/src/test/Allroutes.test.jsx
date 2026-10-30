import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const state = vi.hoisted(() => ({
  authenticated: true,
  moduleAccess: true,
  showToast: vi.fn(),
  hasModuleAccess: vi.fn(),
}));

// A page stub cheap enough that the whole route table can be mounted without
// dragging in the real dashboard screens and their API modules.
const stub = vi.hoisted(() => (testId) => ({
  default: () => React.createElement('div', { 'data-testid': testId }),
}));

vi.mock('../hooks/useAuth', () => ({
  default: () => ({ isAuthenticated: state.authenticated }),
}));
vi.mock('../hooks/usePermission', () => ({
  default: () => ({ hasModuleAccess: (key) => state.hasModuleAccess(key) }),
}));
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => state.showToast(...a),
}));
// The real LayoutRoute pulls in ControlLayout, the socket hook and the whole
// chrome; all this suite needs from it is the nested Outlet.
vi.mock('../Components/LayoutRoute', async () => {
  const { Outlet } = await vi.importActual('react-router-dom');
  return {
    default: () => (
      <div data-testid="layout">
        <Outlet />
      </div>
    ),
  };
});

vi.mock('../Pages/Authentication/SuperAdminLogin', () => stub('login'));
vi.mock('../Pages/Authentication/SuperAdminChangePassword', () => stub('change-password'));
vi.mock('../Pages/Authentication/AdministrativePassword', () => stub('administrative-password'));
vi.mock('../Pages/Authentication/Admin2FAChoice', () => stub('2fa-choice'));
vi.mock('../Pages/Authentication/SuperAdmin2FASettings', () => stub('2fa-settings'));
vi.mock('../Pages/Authentication/MicrosoftAuth/SuperAdmin2FAMicrosoftAuthenticator', () => stub('2fa-authenticator'));
vi.mock('../Pages/Authentication/2FAQuestion/SuperAdmin2FAQuestion', () => stub('2fa-question'));
vi.mock('../Pages/Authentication/SuperAdmin2FAQuestionLogin', () => stub('2fa-question-login'));
vi.mock('../Pages/Authentication/MicrosoftAuth/SuperAdmin2FAAuthenticatorLogin', () => stub('2fa-authenticator-login'));
vi.mock('../Pages/Authentication/ForgotPassword/ForgotPassword', () => stub('forgot-password'));
vi.mock('../Pages/Authentication/ForgotPassword/ForgotPasswordConfirmation', () => stub('reset-confirmation'));
vi.mock('../Pages/Authentication/ForgotPassword/SetNewPassword', () => stub('set-new-password'));
vi.mock('../Pages/Authentication/ForgotPassword/PasswordResetSuccessful', () => stub('reset-successful'));
vi.mock('../Pages/Authentication/ForgotPassword/PasswordResetFailed', () => stub('reset-failed'));
vi.mock('../Pages/Authentication/ForgotPassword/ForgotPasswordResetPassword', () => stub('reset-password'));
vi.mock('../Pages/Authentication/AdminAuth/AdminOnboarding', () => stub('onboarding'));
vi.mock('../Components/ManageColumn/ManageColumn', () => stub('manage-column'));
vi.mock('../Components/ProspectPanel/ProspectPanel', () => stub('prospect-panel'));
vi.mock('../Pages/Tenant/TenantPipeline/TenantPipeline', () => stub('tenant-pipeline'));
vi.mock('../Pages/Tenant/TenantSingle/TenantSingleAccOverview', () => stub('tenant-overview'));
vi.mock('../Pages/Tenant/TenantList/TenantList', () => stub('tenant-list'));
vi.mock('../Pages/Tenant/TenantSingle/TenantSingleFeature', () => stub('tenant-features'));
vi.mock('../Pages/Tenant/TenantSingle/TenantSingleBilling', () => stub('tenant-billing'));
vi.mock('../Pages/Tenant/TenantSingle/TenantSingleIssueManagement', () => stub('tenant-issues'));
vi.mock('../Pages/Tenant/TenantSingle/TenantSingleUserLogs', () => stub('tenant-logs'));
vi.mock('../Pages/Tenant/TenantSingle/TenantSingleSecuritySettings', () => stub('tenant-security'));
vi.mock('../Pages/Tenant/TenantList/TenantListUsageStatistics', () => stub('tenant-usage'));
vi.mock('../Pages/FeatureManagement/FeatureManagement', () => stub('features'));
vi.mock('../Pages/BillingsAndPayment/PlansAndPayment', () => stub('plans'));
vi.mock('../Pages/BillingsAndPayment/BillingManager', () => stub('billing-manager'));
vi.mock('../Pages/BillingsAndPayment/BillingReports', () => stub('billing-reports'));
vi.mock('../Pages/BillingsAndPayment/SubscriberList', () => stub('subscribers'));
vi.mock('../Pages/BillingsAndPayment/BillingReport/SubscriptionManager/SubscriptionManager', () => stub('subscription-manager'));
vi.mock('../Pages/BillingsAndPayment/BillingReport/AutoBilling/AutoBilling', () => stub('auto-billing'));
vi.mock('../Pages/Performance/MainPerformance', () => stub('performance'));
vi.mock('../Pages/IssueManagement/IssueManagement', () => stub('issues'));
vi.mock('../Pages/Settings/ControlSettings', () => stub('settings'));
vi.mock('../Pages/Notifications/Notifications', () => stub('notifications'));
vi.mock('../Pages/Settings/SecuritySettings', () => stub('security-settings'));
vi.mock('../Pages/Settings/SettingsSubs/RoleConfiguration', () => stub('role-configuration'));

/**
 * The control app's route table, plus the two pieces of behaviour that live
 * alongside it: ModuleGuard, which drops a whole branch of the tree and toasts
 * when the signed-in admin lacks a module, and lazyWithReload, which turns a
 * dead post-deploy chunk into a single page reload.
 *
 * Every page is stubbed here -- the point of the file is the wiring, not the
 * screens -- and the layout wrapper is replaced by a bare Outlet so the nested
 * protected/guarded/leaf chain still resolves without mounting the chrome.
 *
 * React.lazy memoises each component's import promise, so every case re-imports
 * Allroutes through vi.resetModules() to get fresh lazy wrappers; otherwise the
 * first successful load would be replayed forever. A hoisted vi.mock factory is
 * memoised the same way, which is why the payment chunk -- the one route whose
 * import has to succeed in one test and fail in the next -- is registered per
 * test with vi.doMock rather than at the top of the file.
 */

const renderAt = async (path, { wrapper: Wrapper, payment } = {}) => {
  vi.resetModules();
  if (payment) vi.doMock('../Pages/Payment/PaymentPage', payment);
  const { default: AllRoutes } = await import('../Components/Allroutes');
  const tree = (
    <MemoryRouter initialEntries={[path]}>
      <AllRoutes />
    </MemoryRouter>
  );
  return render(Wrapper ? <Wrapper>{tree}</Wrapper> : tree);
};

// Modelled on a hashed chunk that no longer exists after a deploy: the dynamic
// import rejects rather than resolving to a module.
const deadChunk = () => {
  throw new Error('Failed to fetch dynamically imported module');
};

// Catches the rethrown chunk error so the second-failure branch can be asserted
// on instead of tearing the render down.
class Boundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <div data-testid="chunk-error" /> : this.props.children;
  }
}

let originalLocation;
const reload = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  state.authenticated = true;
  state.moduleAccess = true;
  state.hasModuleAccess.mockImplementation(() => state.moduleAccess);
  sessionStorage.clear();
  // jsdom's location.reload is not configurable on the object itself, so the
  // whole location has to be swapped out.
  originalLocation = window.location;
  delete window.location;
  window.location = { ...originalLocation, reload };
});

afterEach(() => {
  window.location = originalLocation;
});

describe('the public routes', () => {
  it('opens on the login screen at the root', async () => {
    await renderAt('/');
    expect(await screen.findByTestId('login')).toBeInTheDocument();
  });

  it('serves the tokenised payment page without a session', async () => {
    state.authenticated = false;
    await renderAt('/payment/pay-token-1', { payment: () => stub('payment') });
    expect(await screen.findByTestId('payment')).toBeInTheDocument();
  });

  it('serves the parameterised onboarding link', async () => {
    state.authenticated = false;
    await renderAt('/admin/onboarding/admin@example.com/user-7');
    expect(await screen.findByTestId('onboarding')).toBeInTheDocument();
  });

  it('falls through to the not-found page for an unknown path', async () => {
    await renderAt('/nowhere-at-all');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });
});

describe('the protected routes', () => {
  it('sends an unauthenticated visitor back to the login screen', async () => {
    state.authenticated = false;
    await renderAt('/issues');
    expect(await screen.findByTestId('login')).toBeInTheDocument();
    expect(screen.queryByTestId('issues')).not.toBeInTheDocument();
  });

  it('renders a guarded page inside the layout when the module is allowed', async () => {
    await renderAt('/issues');
    expect(await screen.findByTestId('issues')).toBeInTheDocument();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(state.hasModuleAccess).toHaveBeenCalledWith('issueManagement');
    expect(state.showToast).not.toHaveBeenCalled();
  });

  it('lets any signed-in admin reach notifications without a module check', async () => {
    state.moduleAccess = false;
    await renderAt('/notifications');
    expect(await screen.findByTestId('notifications')).toBeInTheDocument();
    expect(state.showToast).not.toHaveBeenCalled();
  });

  it('reaches a lazily loaded page nested under a module guard', async () => {
    await renderAt('/tenants/column-single/stage-3');
    expect(await screen.findByTestId('manage-column')).toBeInTheDocument();
  });

  it('reaches an eagerly imported billing page', async () => {
    await renderAt('/billing-payments/plans-pricing');
    expect(await screen.findByTestId('plans')).toBeInTheDocument();
    expect(state.hasModuleAccess).toHaveBeenCalledWith('billing');
  });

  it('checks the settings module for the role configuration screen', async () => {
    await renderAt('/settings/roles-permissions/configure/role-2');
    expect(await screen.findByTestId('role-configuration')).toBeInTheDocument();
    expect(state.hasModuleAccess).toHaveBeenCalledWith('settings');
  });
});

describe('the module guard', () => {
  it('renders nothing and warns when the module is denied', async () => {
    state.moduleAccess = false;
    await renderAt('/issues');

    expect(await screen.findByTestId('layout')).toBeInTheDocument();
    expect(screen.queryByTestId('issues')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(state.showToast).toHaveBeenCalledWith(
        "You don't have access to this module",
        'error'
      )
    );
  });

  it('denies the performance module on its own key', async () => {
    state.moduleAccess = false;
    await renderAt('/performance');
    expect(screen.queryByTestId('performance')).not.toBeInTheDocument();
    expect(state.hasModuleAccess).toHaveBeenCalledWith('performanceMonitoring');
  });

  it('denies the feature module without touching the page', async () => {
    state.moduleAccess = false;
    await renderAt('/features');
    expect(screen.queryByTestId('features')).not.toBeInTheDocument();
    expect(state.hasModuleAccess).toHaveBeenCalledWith('featureManagement');
  });
});

describe('recovering from a stale chunk', () => {
  it('clears the reload marker once a chunk loads cleanly', async () => {
    sessionStorage.setItem('chunkReloadAttempted', '1');
    await renderAt('/');

    expect(await screen.findByTestId('login')).toBeInTheDocument();
    expect(sessionStorage.getItem('chunkReloadAttempted')).toBeNull();
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads once when a chunk cannot be fetched', async () => {
    await renderAt('/payment/pay-token-2', { payment: deadChunk });

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem('chunkReloadAttempted')).toBe('1');
    // The import promise is deliberately left pending, so the page never
    // renders and the Suspense fallback is what stays on screen.
    expect(screen.queryByTestId('payment')).not.toBeInTheDocument();
  });

  it('gives up and rethrows when the reload has already been tried', async () => {
    sessionStorage.setItem('chunkReloadAttempted', '1');
    await renderAt('/payment/pay-token-3', { wrapper: Boundary, payment: deadChunk });

    expect(await screen.findByTestId('chunk-error')).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });
});
