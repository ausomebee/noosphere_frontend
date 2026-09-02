import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

/**
 * The control-panel chrome: permission-filtered sidebar, a secondary sidebar
 * for one tenant, the offline banner, the notification bell and the profile
 * menu.
 *
 * Everything the layout shows is derived from two inputs — the current path and
 * the signed-in user's role — so the tests below drive it by rendering at a
 * path with a store seeded to a particular role, rather than by poking state.
 * `useAuth` and `usePermission` are deliberately left real, reading the
 * `authentication` slice of a store built per test, because the sidebar's whole
 * job is the filtering those two hooks decide.
 *
 * `useIdleTimeout`, `useSocket` and the persistor are mocked: the first two own
 * timers and a socket that have nothing to do with what is rendered, and the
 * real persistor would build the whole app store on import.
 */

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  purge: vi.fn(),
  disconnectSocket: vi.fn(),
  socketOpts: null,
  isConnected: true,
  notificationApi: { getNotifications: vi.fn() },
  tenantApi: { GetSingleTenant: vi.fn() },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock('../ReduxStore/store', () => ({ persistor: { purge: (...a) => mocks.purge(...a) } }));
vi.mock('../ReduxStore/features/authentication', () => ({
  logout: () => ({ type: 'auth/logout' }),
}));
vi.mock('../api/socketService', () => ({
  disconnectSocket: (...a) => mocks.disconnectSocket(...a),
}));
vi.mock('../hooks/useIdleTimeout', () => ({ default: () => {} }));
vi.mock('../hooks/useSocket', () => ({
  default: (opts) => {
    mocks.socketOpts = opts;
    return { isConnected: mocks.isConnected };
  },
}));
vi.mock('../api/notificationApi', () => ({ default: mocks.notificationApi }));
vi.mock('../api/TenantApis', () => ({ default: mocks.tenantApi }));
vi.mock('../Components/ConnectionStatus/ConnectionStatus', () => ({
  default: ({ isConnected }) => <span data-testid="conn">{String(isConnected)}</span>,
}));

import Layout from '../Pages/Layout/ControlLayout';

// A role with no roleModuleAccesses at all is treated as super-admin, so a role
// that should be *restricted* must list the modules it does get.
const roleFor = (accesses) => ({ roleModuleAccesses: accesses });

const superAdmin = { id: 'u1', firstName: 'Ada', lastName: 'Lovelace', isSuperAdmin: true };

const makeStore = (user = superAdmin) =>
  configureStore({
    reducer: {
      authentication: (
        state = {
          isAuthenticated: true,
          loading: false,
          error: null,
          accessToken: 'token',
          refreshToken: 'refresh',
          user,
        }
      ) => state,
    },
  });

const renderLayout = async ({ path = '/performance', user = superAdmin } = {}) => {
  const view = render(
    <Provider store={makeStore(user)}>
      <MemoryRouter initialEntries={[path]}>
        <Layout>
          <p>page body</p>
        </Layout>
      </MemoryRouter>
    </Provider>
  );
  await act(async () => {});
  return view;
};

const navItem = (name) =>
  Array.from(document.body.querySelectorAll('.nav-item')).find((el) =>
    el.textContent.includes(name)
  );

const subNavOf = (name) => navItem(name)?.parentElement.querySelector('.sub-nav');

const setWidth = (width) =>
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.socketOpts = null;
  mocks.isConnected = true;
  setWidth(1400);
  mocks.notificationApi.getNotifications.mockResolvedValue({ data: { data: [] } });
  mocks.tenantApi.GetSingleTenant.mockResolvedValue({ data: { companyName: 'Acme Health' } });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('the primary sidebar', () => {
  it('shows every module to a super-admin', async () => {
    await renderLayout();
    for (const name of ['Performance', 'Tenants', 'Billing & Payments', 'Issues', 'Features', 'Settings']) {
      expect(navItem(name)).toBeTruthy();
    }
  });

  it('hides modules the role was never granted', async () => {
    await renderLayout({
      user: { id: 'u1', role: roleFor([{ module: 'TENANT', permissions: ['view_pipeline'] }]) },
    });
    expect(navItem('Tenants')).toBeTruthy();
    expect(navItem('Billing & Payments')).toBeFalsy();
    expect(navItem('Settings')).toBeFalsy();
  });

  it('hides sub-nav entries the role cannot view', async () => {
    await renderLayout({
      path: '/tenants/pipeline',
      user: { id: 'u1', role: roleFor([{ module: 'TENANT', permissions: ['view_pipeline'] }]) },
    });
    expect(screen.getByText('Pipeline')).toBeInTheDocument();
    expect(screen.queryByText('Tenant List')).not.toBeInTheDocument();
  });

  it('accepts either of a sub-nav entry\'s two permission keys', async () => {
    await renderLayout({
      user: {
        id: 'u1',
        role: roleFor([{ module: 'BILLING', permissions: ['view_plans'] }]),
      },
    });
    expect(screen.getByText('Plans & Pricing')).toBeInTheDocument();
    expect(screen.queryByText('Reports')).not.toBeInTheDocument();
  });

  it('opens and closes a group when its row is clicked', async () => {
    await renderLayout();
    const tenants = navItem('Tenants');
    expect(subNavOf('Tenants').className).not.toContain('open');
    fireEvent.click(tenants);
    expect(subNavOf('Tenants').className).toContain('open');
    fireEvent.click(tenants);
    expect(subNavOf('Tenants').className).not.toContain('open');
  });

  it('leaves a childless module with no disclosure arrow', async () => {
    await renderLayout();
    expect(navItem('Performance').querySelector('.nav-arrow')).toBeNull();
    expect(subNavOf('Performance')).toBeNull();
  });

  it('opens the group that owns the current route on arrival', async () => {
    await renderLayout({ path: '/billing-payments/invoice-payments' });
    expect(subNavOf('Billing & Payments').className).toContain('open');
  });
});

describe('collapsing the sidebar', () => {
  const collapseButton = () => document.body.querySelector('.collapse-button');

  it('collapses and expands from the rail button', async () => {
    await renderLayout();
    const sidebar = document.body.querySelector('.sidebar');
    fireEvent.click(collapseButton());
    expect(sidebar.className).toContain('collapsed');
    fireEvent.click(collapseButton());
    expect(sidebar.className).not.toContain('collapsed');
  });

  it('drops the sub-navs and arrows while collapsed', async () => {
    await renderLayout();
    fireEvent.click(collapseButton());
    expect(subNavOf('Tenants')).toBeNull();
    expect(navItem('Tenants').querySelector('.nav-arrow')).toBeNull();
  });

  it('re-expands when a nav row is clicked on a wide screen', async () => {
    await renderLayout();
    fireEvent.click(collapseButton());
    fireEvent.click(navItem('Tenants'));
    expect(document.body.querySelector('.sidebar').className).not.toContain('collapsed');
  });

  it('stays collapsed when the same click happens on a narrow screen', async () => {
    await renderLayout();
    fireEvent.click(collapseButton());
    setWidth(600);
    fireEvent.click(navItem('Tenants'));
    expect(document.body.querySelector('.sidebar').className).toContain('collapsed');
  });
});

describe('the mobile drawer', () => {
  const menuButton = () => document.body.querySelector('.menu-button');

  it('opens from the hamburger', async () => {
    await renderLayout();
    fireEvent.click(menuButton());
    expect(document.body.querySelector('.sidebar').className).toContain('open');
  });

  it('closes itself when a link is followed on a narrow screen', async () => {
    await renderLayout();
    fireEvent.click(menuButton());
    setWidth(600);
    fireEvent.click(screen.getByText('Performance'));
    expect(document.body.querySelector('.sidebar').className).not.toContain('open');
  });

  it('stays open when the same link is followed on a wide screen', async () => {
    await renderLayout();
    fireEvent.click(menuButton());
    fireEvent.click(screen.getByText('Performance'));
    expect(document.body.querySelector('.sidebar').className).toContain('open');
  });

  it('closes from the overlay on a narrow screen but not a wide one', async () => {
    await renderLayout();
    const overlay = document.body.querySelector('.sidebar-overlay');
    fireEvent.click(menuButton());
    fireEvent.click(overlay);
    expect(document.body.querySelector('.sidebar').className).toContain('open');
    setWidth(600);
    fireEvent.click(overlay);
    expect(document.body.querySelector('.sidebar').className).not.toContain('open');
  });

  it('closes the drawer from a sub-nav link on a narrow screen', async () => {
    await renderLayout({ path: '/tenants/pipeline' });
    fireEvent.click(menuButton());
    setWidth(600);
    fireEvent.click(screen.getByText('Tenant List'));
    expect(document.body.querySelector('.sidebar').className).not.toContain('open');
  });
});

describe('active route highlighting', () => {
  const isActive = (name) => navItem(name).className.includes('active');
  const subItem = (label) => screen.getByText(label).closest('.sub-nav-item');

  it('marks the module whose own path is current', async () => {
    await renderLayout({ path: '/performance' });
    expect(isActive('Performance')).toBe(true);
    expect(isActive('Issues')).toBe(false);
  });

  it('marks a module because one of its children is current', async () => {
    await renderLayout({ path: '/settings/securitySettings' });
    expect(isActive('Settings')).toBe(true);
    expect(subItem('Security Settings').className).toContain('active');
    expect(subItem('Roles & Permissions').className).not.toContain('active');
  });

  it('matches a child route that carries path parameters', async () => {
    await renderLayout({ path: '/tenants/column-single/col-9' });
    expect(isActive('Tenants')).toBe(true);
    expect(subItem('Pipeline').className).toContain('active');
  });

  it('keeps Tenant List lit while a single tenant is open', async () => {
    await renderLayout({ path: '/tenants/tenant-lists/overview/t1' });
    expect(subItem('Tenant List').className).toContain('active');
    expect(subItem('Pipeline').className).not.toContain('active');
    // The Tenants row itself is left unlit: isNavActive returns from the
    // children branch before it can reach the secondary-sidebar special case.
    expect(isActive('Tenants')).toBe(false);
  });
});

describe('the tenant sidebar', () => {
  it('stays hidden outside a single tenant', async () => {
    await renderLayout({ path: '/performance' });
    expect(document.body.querySelector('.secondary-sidebar')).toBeNull();
    expect(document.body.querySelector('.main-wrapper').className).not.toContain(
      'with-secondary-sidebar'
    );
  });

  it('names the tenant it fetched', async () => {
    await renderLayout({ path: '/tenants/tenant-lists/overview/t1' });
    expect(mocks.tenantApi.GetSingleTenant).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 't1' })
    );
    expect(screen.getByRole('heading', { name: 'Acme Health' })).toBeInTheDocument();
  });

  it('falls back to the contact person when there is no company name', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({ data: { contactPerson: 'Grace Hopper' } });
    await renderLayout({ path: '/tenants/tenant-lists/overview/t1' });
    expect(screen.getByRole('heading', { name: 'Grace Hopper' })).toBeInTheDocument();
  });

  it('reads a response that is the tenant itself rather than a data envelope', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({ companyName: 'Bare Body Ltd' });
    await renderLayout({ path: '/tenants/tenant-lists/overview/t1' });
    expect(screen.getByRole('heading', { name: 'Bare Body Ltd' })).toBeInTheDocument();
  });

  it('falls back to a generic label when the record names nobody', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({ data: {} });
    await renderLayout({ path: '/tenants/tenant-lists/overview/t1' });
    expect(screen.getByRole('heading', { name: 'Tenant' })).toBeInTheDocument();
  });

  it('falls back to a generic label when the fetch fails', async () => {
    mocks.tenantApi.GetSingleTenant.mockRejectedValue(new Error('404'));
    await renderLayout({ path: '/tenants/tenant-lists/overview/t1' });
    expect(screen.getByRole('heading', { name: 'Tenant' })).toBeInTheDocument();
  });

  it('shows an ellipsis until the name arrives', async () => {
    mocks.tenantApi.GetSingleTenant.mockReturnValue(new Promise(() => {}));
    render(
      <Provider store={makeStore()}>
        <MemoryRouter initialEntries={['/tenants/tenant-lists/overview/t1']}>
          <Layout />
        </MemoryRouter>
      </Provider>
    );
    expect(screen.getByRole('heading', { name: '...' })).toBeInTheDocument();
  });

  it('marks the section the admin is looking at', async () => {
    await renderLayout({ path: '/tenants/tenant-lists/billing/t1' });
    // "Billing & Payments" is also a primary module, so scope the lookup.
    const secondary = document.body.querySelector('.secondary-sidebar');
    const billing = Array.from(secondary.querySelectorAll('a')).find(
      (a) => a.textContent === 'Billing & Payments'
    );
    expect(billing.className).toContain('active');
    expect(screen.getByText('Account Overview').className).not.toContain('active');
  });

  it('lights Feature Management while usage statistics is open', async () => {
    await renderLayout({ path: '/tenants/tenant-lists/usage-statistics/t1' });
    expect(screen.getByText('Feature Management').className).toContain('active');
    expect(screen.getByText('Account Overview').className).not.toContain('active');
  });

  it('hides the tenant sections the role cannot view', async () => {
    await renderLayout({
      path: '/tenants/tenant-lists/overview/t1',
      user: {
        id: 'u1',
        role: roleFor([{ module: 'TENANT', permissions: ['view_tenant_details'] }]),
      },
    });
    expect(screen.getByText('Account Overview')).toBeInTheDocument();
    expect(screen.queryByText('Issues & Support')).not.toBeInTheDocument();
  });
});

describe('the network banner', () => {
  it('stays out of the way while the browser is online', async () => {
    await renderLayout();
    expect(document.body.querySelector('.network-status-banner')).toBeNull();
  });

  it('warns when the browser goes offline', async () => {
    await renderLayout();
    await act(async () => {
      window.dispatchEvent(new Event('offline'));
    });
    const banner = document.body.querySelector('.network-status-banner');
    expect(banner.className).toContain('offline');
    expect(banner.textContent).toContain('You are offline');
  });

  it('confirms the reconnection and then withdraws the banner', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await renderLayout();
    await act(async () => {
      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));
    });
    expect(document.body.querySelector('.network-status-banner').className).toContain('online');
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(document.body.querySelector('.network-status-banner')).toBeNull();
  });

  it('cancels the pending confirmation if the connection drops again', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await renderLayout();
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    await act(async () => {
      window.dispatchEvent(new Event('offline'));
      vi.advanceTimersByTime(3000);
    });
    expect(document.body.querySelector('.network-status-banner').className).toContain('offline');
  });
});

describe('the notification bell', () => {
  const badge = () => document.body.querySelector('.notification-bell-badge');

  it('counts the unread notifications it fetched', async () => {
    mocks.notificationApi.getNotifications.mockResolvedValue({
      data: { data: [{ isRead: false }, { isRead: true }, { isRead: false }] },
    });
    await renderLayout();
    expect(badge().textContent).toBe('2');
  });

  it('unwraps notifications that arrive inside an envelope', async () => {
    mocks.notificationApi.getNotifications.mockResolvedValue({
      data: { data: [{ notification: { isRead: false } }] },
    });
    await renderLayout();
    expect(badge().textContent).toBe('1');
  });

  it('reads a response whose data is the list itself', async () => {
    mocks.notificationApi.getNotifications.mockResolvedValue({ data: [{ isRead: false }] });
    await renderLayout();
    expect(badge().textContent).toBe('1');
  });

  it('reads a response that is the bare list', async () => {
    mocks.notificationApi.getNotifications.mockResolvedValue([{ isRead: false }, { isRead: false }]);
    await renderLayout();
    expect(badge().textContent).toBe('2');
  });

  it('shows no badge when the payload is not a list at all', async () => {
    mocks.notificationApi.getNotifications.mockResolvedValue({ data: { data: { oops: 1 } } });
    await renderLayout();
    expect(badge()).toBeNull();
  });

  it('shows no badge when the fetch fails', async () => {
    mocks.notificationApi.getNotifications.mockRejectedValue(new Error('offline'));
    await renderLayout();
    expect(badge()).toBeNull();
  });

  it('caps the badge at ninety-nine plus', async () => {
    mocks.notificationApi.getNotifications.mockResolvedValue({
      data: { data: Array.from({ length: 120 }, () => ({ isRead: false })) },
    });
    await renderLayout();
    expect(badge().textContent).toBe('99+');
  });

  it('does not fetch for a user the store has not identified', async () => {
    await renderLayout({ user: { firstName: 'Ada' } });
    expect(mocks.notificationApi.getNotifications).not.toHaveBeenCalled();
  });

  it('increments live as the socket delivers notifications', async () => {
    await renderLayout();
    await act(async () => {
      mocks.socketOpts.onNotification({});
      mocks.socketOpts.onNotification({});
    });
    expect(badge().textContent).toBe('2');
  });

  it('clears the count and opens the notifications page', async () => {
    mocks.notificationApi.getNotifications.mockResolvedValue({ data: { data: [{ isRead: false }] } });
    await renderLayout();
    fireEvent.click(screen.getByLabelText('Notifications'));
    expect(mocks.navigate).toHaveBeenCalledWith('/notifications');
    expect(badge()).toBeNull();
  });

  it('passes the socket connection state to the presence badge', async () => {
    mocks.isConnected = false;
    await renderLayout();
    expect(screen.getByTestId('conn').textContent).toBe('false');
  });
});

describe('the profile menu', () => {
  it('builds initials from the first and last name', async () => {
    await renderLayout();
    expect(document.body.querySelector('.user-avatar').textContent).toContain('AL');
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  });

  it('falls back to a question mark and the email when the name is missing', async () => {
    await renderLayout({ user: { id: 'u1', email: 'ops@acme.test', isSuperAdmin: true } });
    expect(document.body.querySelector('.user-avatar').textContent).toContain('?');
    expect(screen.getByText('ops@acme.test')).toBeInTheDocument();
  });

  it('falls back again to the word User when there is no email either', async () => {
    await renderLayout({ user: { id: 'u1', isSuperAdmin: true } });
    expect(screen.getByText('User')).toBeInTheDocument();
  });

  it('names the role when the user carries one', async () => {
    await renderLayout({ user: { ...superAdmin, roles: { name: 'Ops Lead' } } });
    expect(screen.getByText('Ops Lead')).toBeInTheDocument();
  });

  it('falls back to Administrator without a named role', async () => {
    await renderLayout();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
  });

  it('opens on click and closes again', async () => {
    await renderLayout();
    const profile = document.body.querySelector('.user-profile');
    fireEvent.click(profile);
    expect(screen.getByText('Logout')).toBeInTheDocument();
    fireEvent.click(profile);
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
  });

  it('closes when the pointer goes down elsewhere', async () => {
    await renderLayout();
    fireEvent.click(document.body.querySelector('.user-profile'));
    fireEvent.mouseDown(document.body.querySelector('.main-content'));
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
  });

  it('stays open when the pointer goes down inside it', async () => {
    await renderLayout();
    const profile = document.body.querySelector('.user-profile');
    fireEvent.click(profile);
    fireEvent.mouseDown(profile);
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('drops the socket, purges the persisted store and returns to login', async () => {
    await renderLayout();
    fireEvent.click(document.body.querySelector('.user-profile'));
    fireEvent.click(screen.getByText('Logout'));
    expect(mocks.disconnectSocket).toHaveBeenCalled();
    expect(mocks.purge).toHaveBeenCalled();
    expect(mocks.navigate).toHaveBeenCalledWith('/');
  });
});

describe('the page frame', () => {
  it('renders its children into the main region', async () => {
    await renderLayout();
    expect(document.body.querySelector('#main-content').textContent).toBe('page body');
  });

  it('offers a skip link ahead of the navigation', async () => {
    await renderLayout();
    expect(screen.getByText('Skip to main content')).toHaveAttribute('href', '#main-content');
  });
});

describe('a notification fetch that resolves to nothing', () => {
  it('shows no badge when the request resolves without a response at all', async () => {
    // The last `??` arm only runs when the whole response is nullish, which no
    // envelope-shaped fixture can produce.
    mocks.notificationApi.getNotifications.mockResolvedValue(undefined);
    await renderLayout();
    expect(document.body.querySelector('.notification-bell-badge')).toBeNull();
  });
});
