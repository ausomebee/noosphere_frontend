import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// The three panels each own a page's worth of fetching; only the choice of
// which one is mounted matters here.
const stub = vi.hoisted(
  () => (name) => ({ default: () => <div data-testid={name} /> })
);
vi.mock('../Pages/Settings/SettingsSubs/Staff', () => stub('staff-panel'));
vi.mock('../Pages/Settings/SettingsSubs/Departments', () => stub('departments-panel'));
vi.mock('../Pages/Settings/SettingsSubs/Roles', () => stub('roles-panel'));

const state = {
  authentication: { accessToken: 'at', refreshToken: 'rt', user: { id: 'u1' } },
};
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (fn) => fn(state),
}));

import ControlSettings from '../Pages/Settings/ControlSettings';

/**
 * The settings shell: a permission-filtered tab bar over three panels.
 *
 * Departments has no permission key of its own, so it is the one tab that
 * always survives the filter — which is what makes the fallback interesting.
 * The active tab is remembered in sessionStorage, so a tab that a later,
 * lesser-privileged admin cannot see is still read back from storage and has to
 * be replaced by the first tab that admin can actually see.
 */

const tabNames = () =>
  [...document.body.querySelectorAll('.settings-tab')].map((b) => b.textContent);
const activeTab = () =>
  document.body.querySelector('.settings-tab.active')?.textContent;

// A role grant limited to exactly the listed permission keys.
const restrictTo = (permissions) => {
  state.authentication.user.role = {
    roleModuleAccesses: [{ module: 'SETTINGS', permissions }],
  };
};

beforeEach(() => {
  sessionStorage.clear();
  delete state.authentication.user.role;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the tab bar', () => {
  it('offers all three tabs to an unrestricted admin', () => {
    render(<ControlSettings />);
    expect(tabNames()).toEqual(['STAFF', 'DEPARTMENTS', 'ROLES']);
  });

  it('opens on staff with only that tab marked active', () => {
    render(<ControlSettings />);
    expect(activeTab()).toBe('STAFF');
    expect(document.body.querySelectorAll('.settings-tab.active')).toHaveLength(1);
    expect(screen.getByTestId('staff-panel')).toBeInTheDocument();
  });

  it('hides the staff tab from an admin who may not view staff', () => {
    restrictTo(['view_roles']);
    render(<ControlSettings />);
    expect(tabNames()).toEqual(['DEPARTMENTS', 'ROLES']);
  });

  it('hides the roles tab from an admin who may not view roles', () => {
    restrictTo(['view_staff']);
    render(<ControlSettings />);
    expect(tabNames()).toEqual(['STAFF', 'DEPARTMENTS']);
  });

  it('leaves departments standing even for an admin granted nothing', () => {
    restrictTo(['something_else']);
    render(<ControlSettings />);
    expect(tabNames()).toEqual(['DEPARTMENTS']);
    expect(screen.getByTestId('departments-panel')).toBeInTheDocument();
  });
});

describe('switching panels', () => {
  it('mounts the departments panel and unmounts the staff one', () => {
    render(<ControlSettings />);
    fireEvent.click(screen.getByText('DEPARTMENTS'));
    expect(screen.getByTestId('departments-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('staff-panel')).toBeNull();
    expect(activeTab()).toBe('DEPARTMENTS');
  });

  it('mounts the roles panel', () => {
    render(<ControlSettings />);
    fireEvent.click(screen.getByText('ROLES'));
    expect(screen.getByTestId('roles-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('departments-panel')).toBeNull();
  });
});

describe('the remembered tab', () => {
  it('reopens on the tab that was last used', () => {
    sessionStorage.setItem('tab:control:controlSettings', 'roles');
    render(<ControlSettings />);
    expect(activeTab()).toBe('ROLES');
    expect(screen.getByTestId('roles-panel')).toBeInTheDocument();
  });

  it('writes the choice back to storage', () => {
    render(<ControlSettings />);
    fireEvent.click(screen.getByText('ROLES'));
    expect(sessionStorage.getItem('tab:control:controlSettings')).toBe('roles');
  });

  it('falls back to the first visible tab when the stored one is now hidden', () => {
    sessionStorage.setItem('tab:control:controlSettings', 'staff');
    restrictTo(['view_roles']);
    render(<ControlSettings />);
    expect(activeTab()).toBe('DEPARTMENTS');
    expect(screen.getByTestId('departments-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('staff-panel')).toBeNull();
  });

  it('shows no panel at all when the stored tab is a name it does not know', () => {
    // A stale key from an older build survives storage but matches no tab, so
    // the bar falls back to the first entry and that panel is what renders.
    sessionStorage.setItem('tab:control:controlSettings', 'billing');
    render(<ControlSettings />);
    expect(activeTab()).toBe('STAFF');
  });
});

describe('the page chrome', () => {
  it('titles the page', () => {
    render(<ControlSettings />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(
      screen.getByText('Manage your organization settings here')
    ).toBeInTheDocument();
  });
});
