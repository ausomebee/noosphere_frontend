import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import useAuth from '../hooks/useAuth';

const createWrapper = (authState) => {
  const store = configureStore({
    reducer: {
      authentication: () => authState,
    },
  });
  return ({ children }) => <Provider store={store}>{children}</Provider>;
};

describe('useAuth hook', () => {
  it('returns all auth fields from state', () => {
    const authState = {
      isAuthenticated: true,
      user: { id: 'user-1', email: 'test@test.com' },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      loading: false,
      error: null,
    };

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(authState),
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual({ id: 'user-1', email: 'test@test.com' });
    expect(result.current.accessToken).toBe('access-token');
    expect(result.current.refreshToken).toBe('refresh-token');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('extracts userId from user.id', () => {
    const authState = {
      isAuthenticated: true,
      user: { id: 'abc-123' },
      accessToken: null,
      refreshToken: null,
      loading: false,
      error: null,
    };

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(authState),
    });

    expect(result.current.userId).toBe('abc-123');
  });

  it('returns null userId when user is null', () => {
    const authState = {
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      loading: false,
      error: null,
    };

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(authState),
    });

    expect(result.current.userId).toBeNull();
  });

  it('returns null userId when user has no id', () => {
    const authState = {
      isAuthenticated: true,
      user: { email: 'no-id@test.com' },
      accessToken: null,
      refreshToken: null,
      loading: false,
      error: null,
    };

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(authState),
    });

    expect(result.current.userId).toBeNull();
  });

  it('returns loading state', () => {
    const authState = {
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      loading: true,
      error: null,
    };

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(authState),
    });

    expect(result.current.loading).toBe(true);
  });

  it('returns error state', () => {
    const authState = {
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      loading: false,
      error: 'Something went wrong',
    };

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(authState),
    });

    expect(result.current.error).toBe('Something went wrong');
  });
});
