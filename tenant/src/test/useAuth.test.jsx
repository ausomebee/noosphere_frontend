import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import useAuth from '../hooks/useAuth';
import authReducer from '../ReduxStore/features/authentication';

const createWrapper = (preloadedState) => {
  const store = configureStore({
    reducer: { authentication: authReducer },
    preloadedState: { authentication: preloadedState },
  });
  return ({ children }) => <Provider store={store}>{children}</Provider>;
};

describe('useAuth', () => {
  it('returns default values when not authenticated', () => {
    const wrapper = createWrapper({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
      error: null,
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.userId).toBeUndefined();
    expect(result.current.accessToken).toBeUndefined();
  });

  it('returns user data when authenticated', () => {
    const wrapper = createWrapper({
      isAuthenticated: true,
      user: {
        id: 'u1',
        tenantId: 't1',
        accessToken: 'at',
        refreshToken: 'rt',
        email: 'admin@test.com',
        role: { name: 'Admin' },
        superAdmin: true,
        authQuestion: 'What is your pet?',
        auth2FADone: true,
        authType: 'securityQuestion',
      },
      token: 'at',
      loading: false,
      error: null,
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.userId).toBe('u1');
    expect(result.current.tenantId).toBe('t1');
    expect(result.current.accessToken).toBe('at');
    expect(result.current.refreshToken).toBe('rt');
    expect(result.current.email).toBe('admin@test.com');
    expect(result.current.role).toEqual({ name: 'Admin' });
    expect(result.current.superAdmin).toBe(true);
    expect(result.current.auth2FADone).toBe(true);
    expect(result.current.authType).toBe('securityQuestion');
  });

  it('returns loading state', () => {
    const wrapper = createWrapper({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: true,
      error: null,
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.loading).toBe(true);
  });

  it('returns error state', () => {
    const wrapper = createWrapper({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
      error: 'Invalid credentials',
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.error).toBe('Invalid credentials');
  });

  it('handles missing auth state gracefully', () => {
    const store = configureStore({
      reducer: { authentication: () => ({}) },
    });
    const wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
