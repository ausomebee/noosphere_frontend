import { describe, it, expect } from 'vitest';
import reducer, { logout, updateAccessToken } from '../ReduxStore/features/authentication';

const initialState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  error: null,
};

describe('authenticationSlice', () => {
  it('returns initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('logout clears authentication state', () => {
    const loggedInState = {
      isAuthenticated: true,
      user: { id: '1', email: 'admin@test.com', accessToken: 'abc' },
      token: 'abc',
      loading: false,
      error: null,
    };
    const state = reducer(loggedInState, logout());
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.error).toBeNull();
  });

  it('updateAccessToken updates user accessToken and token', () => {
    const loggedInState = {
      isAuthenticated: true,
      user: { id: '1', accessToken: 'old-token' },
      token: 'old-token',
      loading: false,
      error: null,
    };
    const state = reducer(loggedInState, updateAccessToken('new-token'));
    expect(state.user.accessToken).toBe('new-token');
    expect(state.token).toBe('new-token');
  });

  it('updateAccessToken does nothing if user is null', () => {
    const state = reducer(initialState, updateAccessToken('token'));
    expect(state.user).toBeNull();
    expect(state.token).toBe('token');
  });

  it('AdminLogin.pending sets loading true', () => {
    const state = reducer(initialState, { type: 'auth/AdminLogin/pending' });
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('AdminLogin.fulfilled sets user and isAuthenticated', () => {
    const userData = { id: '1', email: 'a@b.com', token: 'jwt' };
    const state = reducer(initialState, {
      type: 'auth/AdminLogin/fulfilled',
      payload: { data: userData },
    });
    expect(state.loading).toBe(false);
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(userData);
    expect(state.token).toBe('jwt');
  });

  it('AdminLogin.rejected sets error', () => {
    const state = reducer(initialState, {
      type: 'auth/AdminLogin/rejected',
      payload: 'Invalid credentials',
    });
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Invalid credentials');
  });

  it('OnboardAdmin.pending sets loading', () => {
    const state = reducer(initialState, { type: 'auth/OnboardAdmin/pending' });
    expect(state.loading).toBe(true);
  });

  it('OnboardAdmin.fulfilled sets user', () => {
    const userData = { id: '2', email: 'new@test.com', token: 'jwt2' };
    const state = reducer(initialState, {
      type: 'auth/OnboardAdmin/fulfilled',
      payload: { data: userData },
    });
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(userData);
  });

  it('OnboardAdmin.rejected sets error', () => {
    const state = reducer(initialState, {
      type: 'auth/OnboardAdmin/rejected',
      payload: 'Onboarding failed',
    });
    expect(state.error).toBe('Onboarding failed');
  });
});
