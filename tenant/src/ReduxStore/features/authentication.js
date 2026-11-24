import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../api/authApis'; 

const initialState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  loading: false,
  error: null,
  // Set when the password step succeeds and cleared once the user is let into
  // the app. Login hands back full tokens before 2FA, so the route guards read
  // this to keep a half-signed-in user on their 2FA page. Sessions persisted
  // before this existed have no field, which reads as "not pending".
  pending2FA: false,
  pending2FARoute: null,
  // When 2FA is required, sign-in (and a set-password that leads into 2FA)
  // returns a short-lived `twoFactorToken` instead of full tokens. It is only
  // good for the 2FA calls and the first-login password change.
  twoFactorToken: null,
  twoFactorUserId: null,
};

// What a sign-in or onboarding response leaves in the store.
const applySignIn = (state, userData) => {
  state.loading = false;
  state.isAuthenticated = true;
  state.user = userData;
  state.token = userData.token || userData.accessToken || null;
  state.refreshToken = userData.refreshToken || null;
  state.twoFactorToken = userData.twoFactorToken || null;
  state.twoFactorUserId = userData.twoFactorToken ? userData.id ?? null : null;
  state.pending2FA = true;
  state.pending2FARoute = null;
};

export const AdminLogin = createAsyncThunk(
  'auth/AdminLogin',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.AdminLogin({ email, password });
      return response.data; 
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const OnboardAdmin = createAsyncThunk(
  'auth/OnboardAdmin',
  async ({ id, password, token }, { rejectWithValue }) => {
    try {
      const response = await api.AdminOnboarding({ id, password, token });
      return response.data; 
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const authenticationSlice = createSlice({
  name: 'authentication',
  initialState,
  reducers: {
    logout(state) {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.error = null;
      state.pending2FA = false;
      state.pending2FARoute = null;
      state.twoFactorToken = null;
      state.twoFactorUserId = null;
    },
    // Records the 2FA page this login must finish on; the guards send a
    // pending user back to it.
    setPending2FARoute(state, action) {
      state.pending2FARoute = action.payload || null;
    },
    // 2FA passed (or isn't required): the user may now enter the app.
    clearPending2FA(state) {
      state.pending2FA = false;
      state.pending2FARoute = null;
    },
    updateAccessToken(state, action) {
      if (state.user) {
        state.user.accessToken = action.payload;
      }
      state.token = action.payload;
    },
    // A set-password response that leads into 2FA hands back a 2FA token.
    setTwoFactorToken(state, action) {
      const { token, userId } = action.payload || {};
      state.twoFactorToken = token || null;
      state.twoFactorUserId = token ? userId ?? null : null;
    },
    // 2FA passed and the backend issued full tokens: swap them in for the
    // 2FA token. Older backends return no tokens here, which leaves the ones
    // from sign-in in place.
    completeTwoFactor(state, action) {
      const { accessToken, refreshToken } = action.payload || {};
      if (accessToken) {
        state.token = accessToken;
        if (state.user) state.user.accessToken = accessToken;
      }
      if (refreshToken) {
        state.refreshToken = refreshToken;
        if (state.user) state.user.refreshToken = refreshToken;
      }
      state.twoFactorToken = null;
      state.twoFactorUserId = null;
    },
    setTokens(state, action) {
      const { accessToken, refreshToken } = action.payload;
      if (state.user) {
        state.user.accessToken = accessToken;
      }
      state.token = accessToken;
      state.refreshToken = refreshToken;
    },
  },
  extraReducers: (builder) => {
    builder
      // AdminLogin cases
      .addCase(AdminLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(AdminLogin.fulfilled, (state, action) => {
        applySignIn(state, action.payload.data);
      })
      .addCase(AdminLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // AdminOnboarding cases
      .addCase(OnboardAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(OnboardAdmin.fulfilled, (state, action) => {
        // Onboarding always ends on 2FA setup or back at the login page, never
        // in the app, so the session stays pending until a real login.
        applySignIn(state, action.payload.data);
      })
      .addCase(OnboardAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  logout,
  updateAccessToken,
  setTokens,
  setPending2FARoute,
  clearPending2FA,
  setTwoFactorToken,
  completeTwoFactor,
} = authenticationSlice.actions;
export default authenticationSlice.reducer;