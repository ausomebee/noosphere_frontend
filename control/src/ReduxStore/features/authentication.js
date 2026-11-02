import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../api/authApis';

const initialState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  loading: false,
  error: null,
  // Set when the password step succeeds but 2FA has not been finished yet.
  // The login response already carries full tokens, so ProtectedRoute uses
  // this to keep the admin out of the app until the 2FA step is done.
  pending2FA: false,
  pending2FARoute: null,
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
  async ({ id, password }, { rejectWithValue }) => {
    try {
      const response = await api.AdminOnboarding({ id, password });
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
      state.accessToken = null;
      state.refreshToken = null;
      state.error = null;
      state.pending2FA = false;
      state.pending2FARoute = null;
    },
    // The 2FA page the admin has to finish before entering the app.
    setPending2FARoute(state, action) {
      state.pending2FARoute = action.payload;
    },
    // 2FA verified (or not required) — the admin may enter the app.
    complete2FA(state) {
      state.pending2FA = false;
      state.pending2FARoute = null;
    },
    updateAccessToken(state, action) {
      state.accessToken = action.payload;
    },
    setTokens(state, action) {
      const { accessToken, refreshToken } = action.payload;
      state.accessToken = accessToken;
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
        const userData = action.payload.data;
        state.loading = false;
        state.isAuthenticated = true;
        state.user = userData;
        state.accessToken = userData.accessToken;
        state.refreshToken = userData.refreshToken;
        state.pending2FA = true;
        state.pending2FARoute = null;
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
        const userData = action.payload.data;
        state.loading = false;
        state.isAuthenticated = true;
        state.user = userData;
        state.accessToken = userData.accessToken;
        state.refreshToken = userData.refreshToken;
        state.pending2FA = true;
        state.pending2FARoute = null;
      })
      .addCase(OnboardAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, updateAccessToken, setTokens, setPending2FARoute, complete2FA } = authenticationSlice.actions;
export default authenticationSlice.reducer;
