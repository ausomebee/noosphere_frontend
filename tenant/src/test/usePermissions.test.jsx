import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import usePermissions from '../hooks/usePermissions';

// Mock useAuth
vi.mock('../hooks/useAuth', () => ({
  default: vi.fn(),
}));

import useAuth from '../hooks/useAuth';

describe('usePermissions', () => {
  it('returns empty sets when user has no role', () => {
    useAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.userModules.size).toBe(0);
    expect(result.current.userPermissions.size).toBe(0);
  });

  it('correctly identifies user modules', () => {
    useAuth.mockReturnValue({
      user: {
        role: {
          roleModuleAccesses: [
            { module: 'DASHBOARD', permissions: ['view_dashboard'] },
            { module: 'CLIENTS', permissions: ['view_clients', 'edit_clients'] },
          ],
        },
      },
    });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasModule('DASHBOARD')).toBe(true);
    expect(result.current.hasModule('CLIENTS')).toBe(true);
    expect(result.current.hasModule('PAYROLL')).toBe(false);
  });

  it('correctly identifies user permissions', () => {
    useAuth.mockReturnValue({
      user: {
        role: {
          roleModuleAccesses: [
            { module: 'DASHBOARD', permissions: ['view_dashboard'] },
            { module: 'CLIENTS', permissions: ['view_clients', 'edit_clients'] },
          ],
        },
      },
    });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission('view_dashboard')).toBe(true);
    expect(result.current.hasPermission('view_clients')).toBe(true);
    expect(result.current.hasPermission('edit_clients')).toBe(true);
    expect(result.current.hasPermission('delete_clients')).toBe(false);
  });

  it('hasAnyPermission returns true if user has at least one', () => {
    useAuth.mockReturnValue({
      user: {
        role: {
          roleModuleAccesses: [
            { module: 'CLIENTS', permissions: ['view_clients'] },
          ],
        },
      },
    });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasAnyPermission('view_clients', 'edit_clients')).toBe(true);
    expect(result.current.hasAnyPermission('delete_clients', 'edit_clients')).toBe(false);
  });

  it('hasAllPermissions returns true only if user has all', () => {
    useAuth.mockReturnValue({
      user: {
        role: {
          roleModuleAccesses: [
            { module: 'CLIENTS', permissions: ['view_clients', 'edit_clients'] },
          ],
        },
      },
    });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasAllPermissions('view_clients', 'edit_clients')).toBe(true);
    expect(result.current.hasAllPermissions('view_clients', 'delete_clients')).toBe(false);
  });

  it('handles empty permissions array in module', () => {
    useAuth.mockReturnValue({
      user: {
        role: {
          roleModuleAccesses: [
            { module: 'REPORTS', permissions: [] },
          ],
        },
      },
    });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasModule('REPORTS')).toBe(true);
    expect(result.current.userPermissions.size).toBe(0);
  });

  it('handles missing permissions key in module', () => {
    useAuth.mockReturnValue({
      user: {
        role: {
          roleModuleAccesses: [
            { module: 'SETTINGS' },
          ],
        },
      },
    });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasModule('SETTINGS')).toBe(true);
    expect(result.current.userPermissions.size).toBe(0);
  });
});
