import { describe, it, expect, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
  logout,
  updateAccessToken,
  AdminLogin,
  OnboardAdmin,
} from '../ReduxStore/features/authentication';

vi.mock('../api/authApis', () => ({
  default: {
    AdminLogin: vi.fn(),
    AdminOnboarding: vi.fn(),
  },
}));

import api from '../api/authApis';

const createStore = (preloaded) =>
  configureStore({ reducer: { authentication: authReducer }, preloadedState: preloaded });

describe('authentication slice', () => {
  describe('initial state', () => {
    it('has correct defaults', () => {
      const store = createStore();
      const state = store.getState().authentication;
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('logout', () => {
    it('resets all auth state', () => {
      const store = createStore({
        authentication: {
          isAuthenticated: true,
          user: { id: '1', email: 'test@test.com' },
          accessToken: 'token-123',
          refreshToken: 'refresh-123',
          loading: false,
          error: 'some error',
        },
      });

      store.dispatch(logout());
      const state = store.getState().authentication;

      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe('updateAccessToken', () => {
    it('updates the access token', () => {
      const store = createStore();
      store.dispatch(updateAccessToken('new-token-456'));
      expect(store.getState().authentication.accessToken).toBe('new-token-456');
    });
  });

  describe('AdminLogin thunk', () => {
    it('sets loading on pending', () => {
      const store = createStore();
      // Dispatch a pending action manually
      store.dispatch({ type: AdminLogin.pending.type });
      const state = store.getState().authentication;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('sets user and tokens on fulfilled', () => {
      const store = createStore();
      const userData = {
        id: 'user-1',
        email: 'admin@test.com',
        accessToken: 'access-abc',
        refreshToken: 'refresh-xyz',
      };

      store.dispatch({
        type: AdminLogin.fulfilled.type,
        payload: { data: userData },
      });

      const state = store.getState().authentication;
      expect(state.loading).toBe(false);
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(userData);
      expect(state.accessToken).toBe('access-abc');
      expect(state.refreshToken).toBe('refresh-xyz');
    });

    it('sets error on rejected', () => {
      const store = createStore();
      store.dispatch({
        type: AdminLogin.rejected.type,
        payload: 'Invalid credentials',
      });

      const state = store.getState().authentication;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Invalid credentials');
      expect(state.isAuthenticated).toBe(false);
    });

    it('calls api and dispatches fulfilled on success', async () => {
      const userData = {
        id: 'u1',
        email: 'a@b.com',
        accessToken: 'at',
        refreshToken: 'rt',
      };
      api.AdminLogin.mockResolvedValueOnce({ data: { data: userData } });

      const store = createStore();
      await store.dispatch(AdminLogin({ email: 'a@b.com', password: '123' }));

      const state = store.getState().authentication;
      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe('at');
      expect(api.AdminLogin).toHaveBeenCalledWith({ email: 'a@b.com', password: '123' });
    });

    it('calls api and dispatches rejected on failure', async () => {
      api.AdminLogin.mockRejectedValueOnce({
        response: { data: { message: 'Bad creds' } },
      });

      const store = createStore();
      await store.dispatch(AdminLogin({ email: 'a@b.com', password: 'wrong' }));

      const state = store.getState().authentication;
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Bad creds');
    });
  });

  describe('OnboardAdmin thunk', () => {
    it('sets user on fulfilled', () => {
      const store = createStore();
      const userData = {
        id: 'u2',
        accessToken: 'oat',
        refreshToken: 'ort',
      };

      store.dispatch({
        type: OnboardAdmin.fulfilled.type,
        payload: { data: userData },
      });

      const state = store.getState().authentication;
      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe('oat');
    });

    it('sets error on rejected', () => {
      const store = createStore();
      store.dispatch({
        type: OnboardAdmin.rejected.type,
        payload: 'Onboarding failed',
      });
      expect(store.getState().authentication.error).toBe('Onboarding failed');
    });
  });
});
