import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const auth = { user: null };
vi.mock('../hooks/useAuth', () => ({ default: () => auth }));

import usePermission from '../hooks/usePermission';
import { permissionsConfig } from '../Data/permissionsConfig';

/**
 * Super-admin permission checks.
 *
 * Two shapes count as full access rather than "no access": the explicit
 * isSuperAdmin flag, and a user whose role grants nothing at all -- that is the
 * org owner, not a locked-out account. The permission list itself arrives in
 * several shapes depending on the endpoint, so each is read defensively.
 */

const setUser = (user) => { auth.user = user; };

const withPermissions = (permissions, module = 'TENANTS') => ({
  isSuperAdmin: false,
  role: { roleModuleAccesses: [{ module, permissions }] },
});

beforeEach(() => {
  vi.clearAllMocks();
  auth.user = null;
});

describe('no user', () => {
  it('grants nothing at all', () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasPermission('anything')).toBe(false);
    expect(result.current.hasAnyPermission('a', 'b')).toBe(false);
    expect(result.current.hasModuleAccess('tenant')).toBe(false);
    expect(result.current.isSuperAdmin).toBe(false);
  });
});

describe('full access', () => {
  it('treats the explicit flag as full access', () => {
    setUser({ isSuperAdmin: true, role: { roleModuleAccesses: [] } });
    const { result } = renderHook(() => usePermission());
    expect(result.current.isSuperAdmin).toBe(true);
    expect(result.current.hasPermission('anything')).toBe(true);
    expect(result.current.hasAnyPermission('a')).toBe(true);
    expect(result.current.hasModuleAccess('anything')).toBe(true);
  });

  it('treats a user with no role as full access', () => {
    setUser({ id: 'u1' });
    const { result } = renderHook(() => usePermission());
    expect(result.current.isSuperAdmin).toBe(true);
  });

  it('treats a role that grants nothing as full access -- the org owner case', () => {
    setUser({ isSuperAdmin: false, role: { roleModuleAccesses: [] } });
    const { result } = renderHook(() => usePermission());
    expect(result.current.isSuperAdmin).toBe(true);
  });
});

describe('reading the permission list', () => {
  it('reads a flat array of keys', () => {
    setUser(withPermissions(['view_tenants', 'edit_tenants']));
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasPermission('view_tenants')).toBe(true);
    expect(result.current.hasPermission('delete_tenants')).toBe(false);
  });

  it('reads an object map, keeping only the true ones', () => {
    setUser(withPermissions({ view_tenants: true, edit_tenants: false }));
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasPermission('view_tenants')).toBe(true);
    expect(result.current.hasPermission('edit_tenants')).toBe(false);
  });

  it('falls back to a flat array on the user when the role grants none', () => {
    setUser({
      isSuperAdmin: false,
      role: { roleModuleAccesses: [{ module: 'TENANTS', permissions: [] }] },
      permissions: ['view_tenants'],
    });
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasPermission('view_tenants')).toBe(true);
  });

  it('falls back to an object map on the user too', () => {
    setUser({
      isSuperAdmin: false,
      role: { roleModuleAccesses: [{ module: 'TENANTS', permissions: [] }] },
      permissions: { view_tenants: true, edit_tenants: false },
    });
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasPermission('view_tenants')).toBe(true);
    expect(result.current.hasPermission('edit_tenants')).toBe(false);
  });

  it('ignores a permissions value it cannot read', () => {
    setUser(withPermissions('nonsense'));
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasPermission('view_tenants')).toBe(false);
  });

  it('tolerates an access entry with no module', () => {
    setUser({
      isSuperAdmin: false,
      role: { roleModuleAccesses: [{ permissions: ['view_tenants'] }] },
    });
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasPermission('view_tenants')).toBe(true);
  });
});

describe('hasAnyPermission', () => {
  it('passes when at least one key is granted', () => {
    setUser(withPermissions(['view_tenants']));
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasAnyPermission('nope', 'view_tenants')).toBe(true);
  });

  it('fails when none is', () => {
    setUser(withPermissions(['view_tenants']));
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasAnyPermission('nope', 'also_nope')).toBe(false);
  });

  it('fails on an empty key list', () => {
    setUser(withPermissions(['view_tenants']));
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasAnyPermission()).toBe(false);
  });
});

describe('module access', () => {
  const known = permissionsConfig[0];

  it('grants a module the role was given', () => {
    setUser(withPermissions(['x'], known.backendKey));
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasModuleAccess(known.key)).toBe(true);
  });

  it('refuses a module the role was not given', () => {
    setUser(withPermissions(['x'], 'SOMETHING_ELSE'));
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasModuleAccess(known.key)).toBe(false);
  });

  it('allows a module key it does not recognise, rather than locking the page', () => {
    setUser(withPermissions(['x'], 'SOMETHING_ELSE'));
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasModuleAccess('not-in-the-config')).toBe(true);
  });
});

describe('roles and permission lists in shapes the API should not send', () => {
  it('treats a role with no access list at all as full access', () => {
    setUser({ isSuperAdmin: false, role: {} });
    const { result } = renderHook(() => usePermission());
    expect(result.current.isSuperAdmin).toBe(true);
    expect(result.current.hasPermission('anything')).toBe(true);
  });

  it('ignores flat permissions that are neither a list nor a map', () => {
    setUser({
      isSuperAdmin: false,
      // The module grant contributes nothing, so the flat fallback runs — and
      // a bare string is not a shape it knows how to read.
      role: { roleModuleAccesses: [{ module: 'TENANTS', permissions: 'view_tenant' }] },
      permissions: 'view_tenant',
    });
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasPermission('view_tenant')).toBe(false);
    expect(result.current.isSuperAdmin).toBe(false);
  });
});
