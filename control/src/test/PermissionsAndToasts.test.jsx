import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const toast = vi.hoisted(() => {
  const fn = vi.fn();
  fn.success = vi.fn();
  fn.error = vi.fn();
  fn.dismiss = vi.fn();
  return fn;
});
vi.mock('react-toastify', () => ({ toast }));
vi.mock('react-toastify/dist/ReactToastify.css', () => ({}));

const state = { authentication: { accessToken: 'at', refreshToken: 'rt', user: null } };
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (fn) => fn(state),
}));

import usePermission from '../hooks/usePermission';
import { showToast, showApiError } from '../Helper/ShowToast';
import { permissionsConfig } from '../Data/permissionsConfig';
import ERROR_MESSAGES from '../Helper/errorMessages';

/**
 * The permission reader and the toast helper.
 *
 * `usePermission` accepts four different shapes for what the backend sends
 * back, because it has had to: a flat array of keys per module, an object map
 * of key-to-boolean, the same two again directly on the user, and no role at
 * all. The last of those, and an empty access list, both mean "org owner" and
 * grant everything — which is the arm most likely to be got wrong, so it is
 * pinned from both directions.
 *
 * `hasModuleAccess` matches against the module's *backendKey*, not the key the
 * caller passes; a module the config does not know about is allowed through.
 */

const asUser = (user) => {
  state.authentication.user = user;
};

const perms = () => renderHook(() => usePermission()).result.current;

// A module the config genuinely knows about, whatever the config happens to say.
const knownModule = permissionsConfig[0];

beforeEach(() => {
  vi.clearAllMocks();
  state.authentication.user = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('an admin with no session', () => {
  it('is granted nothing at all', () => {
    asUser(null);
    const p = perms();
    expect(p.hasPermission('edit_feature')).toBe(false);
    expect(p.hasAnyPermission('edit_feature', 'view_features')).toBe(false);
    expect(p.hasModuleAccess(knownModule.key)).toBe(false);
    expect(p.isSuperAdmin).toBe(false);
  });
});

describe('an admin granted everything', () => {
  it.each([
    ['flagged as a super-admin', { id: 'u1', isSuperAdmin: true, role: { roleModuleAccesses: [] } }],
    ['carrying no role at all', { id: 'u1' }],
    ['whose role grants no modules', { id: 'u1', role: { roleModuleAccesses: [] } }],
  ])('passes every check when %s', (_case, user) => {
    asUser(user);
    const p = perms();
    expect(p.isSuperAdmin).toBe(true);
    expect(p.hasPermission('anything_at_all')).toBe(true);
    expect(p.hasAnyPermission('one', 'two')).toBe(true);
    expect(p.hasModuleAccess(knownModule.key)).toBe(true);
  });
});

describe('an admin with an explicit role', () => {
  const withAccesses = (roleModuleAccesses) =>
    asUser({ id: 'u1', role: { roleModuleAccesses } });

  it('reads a flat array of permission keys', () => {
    withAccesses([
      { module: knownModule.backendKey, permissions: ['edit_feature', 'view_features'] },
    ]);
    const p = perms();
    expect(p.isSuperAdmin).toBe(false);
    expect(p.hasPermission('edit_feature')).toBe(true);
    expect(p.hasPermission('delete_feature')).toBe(false);
  });

  it('reads an object map of key to boolean, dropping the false ones', () => {
    withAccesses([
      {
        module: knownModule.backendKey,
        permissions: { edit_feature: true, delete_feature: false },
      },
    ]);
    const p = perms();
    expect(p.hasPermission('edit_feature')).toBe(true);
    expect(p.hasPermission('delete_feature')).toBe(false);
  });

  it('ignores a permissions field that is neither', () => {
    withAccesses([{ module: knownModule.backendKey, permissions: 'nonsense' }]);
    expect(perms().hasPermission('edit_feature')).toBe(false);
  });

  it('ignores an access entry that names no module', () => {
    withAccesses([{ permissions: ['edit_feature'] }]);
    const p = perms();
    expect(p.hasPermission('edit_feature')).toBe(true);
    expect(p.hasModuleAccess(knownModule.key)).toBe(false);
  });

  it('grants a module the role names', () => {
    withAccesses([{ module: knownModule.backendKey, permissions: ['view_features'] }]);
    expect(perms().hasModuleAccess(knownModule.key)).toBe(true);
  });

  it('withholds a module the role does not name', () => {
    withAccesses([{ module: 'SOMETHING_ELSE', permissions: ['view_features'] }]);
    expect(perms().hasModuleAccess(knownModule.key)).toBe(false);
  });

  it('allows a module the config has never heard of', () => {
    withAccesses([{ module: 'SOMETHING_ELSE', permissions: ['view_features'] }]);
    expect(perms().hasModuleAccess('a-module-that-does-not-exist')).toBe(true);
  });

  it('is satisfied when any one of several keys is granted', () => {
    withAccesses([{ module: knownModule.backendKey, permissions: ['view_features'] }]);
    const p = perms();
    expect(p.hasAnyPermission('delete_feature', 'view_features')).toBe(true);
    expect(p.hasAnyPermission('delete_feature', 'edit_feature')).toBe(false);
  });
});

describe('the flat fallback on the user itself', () => {
  it('reads permissions given as an array', () => {
    asUser({
      id: 'u1',
      role: { roleModuleAccesses: [{ module: 'X' }] },
      permissions: ['edit_feature'],
    });
    expect(perms().hasPermission('edit_feature')).toBe(true);
  });

  it('reads permissions given as an object map', () => {
    asUser({
      id: 'u1',
      role: { roleModuleAccesses: [{ module: 'X' }] },
      permissions: { edit_feature: true, delete_feature: false },
    });
    const p = perms();
    expect(p.hasPermission('edit_feature')).toBe(true);
    expect(p.hasPermission('delete_feature')).toBe(false);
  });

  it('is not consulted once the role has granted something', () => {
    asUser({
      id: 'u1',
      role: {
        roleModuleAccesses: [{ module: 'X', permissions: ['from_role'] }],
      },
      permissions: ['from_user'],
    });
    const p = perms();
    expect(p.hasPermission('from_role')).toBe(true);
    expect(p.hasPermission('from_user')).toBe(false);
  });
});

describe('the toast helper', () => {
  it.each([
    ['success', 'success'],
    ['error', 'error'],
  ])('routes a %s toast to its own styling', (type, method) => {
    showToast('Saved', type);
    expect(toast[method]).toHaveBeenCalledWith('Saved', expect.any(Object));
  });

  it.each([
    ['info', 'info'],
    ['nothing at all', undefined],
  ])('renders a plain toast for %s', (_case, type) => {
    showToast('Heads up', type);
    expect(toast).toHaveBeenCalledWith('Heads up', expect.any(Object));
  });

  it('dismisses whatever is on screen first so toasts do not stack', () => {
    showToast('Saved', 'success');
    expect(toast.dismiss).toHaveBeenCalled();
  });
});

describe('the API error reporter', () => {
  it('shows the wording configured for the key it was given', () => {
    const key = Object.keys(ERROR_MESSAGES).find((k) => k !== 'DEFAULT');
    showApiError(new Error('boom'), key);
    expect(toast.error).toHaveBeenCalledWith(ERROR_MESSAGES[key], expect.any(Object));
  });

  it('falls back to the default wording for a key it does not know', () => {
    showApiError(new Error('boom'), 'NO_SUCH_KEY');
    expect(toast.error).toHaveBeenCalledWith(ERROR_MESSAGES.DEFAULT, expect.any(Object));
  });

  it('falls back to the default wording when given no key at all', () => {
    showApiError(new Error('boom'));
    expect(toast.error).toHaveBeenCalledWith(ERROR_MESSAGES.DEFAULT, expect.any(Object));
  });

  it('logs the failure in development but not in production', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    showApiError(new Error('boom'), 'DEFAULT');
    expect(spy).toHaveBeenCalled();

    spy.mockClear();
    vi.stubEnv('DEV', false);
    showApiError(new Error('boom'), 'DEFAULT');
    expect(spy).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});
