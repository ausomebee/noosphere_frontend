import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../api/authApis'; 

const initialState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  loading: false,
  error: null,
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
      state.token = null;
      state.refreshToken = null;
      state.error = null;
    },
    updateAccessToken(state, action) {
      if (state.user) {
        state.user.accessToken = action.payload;
      }
      state.token = action.payload;
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
        const userData = action.payload.data;
        state.loading = false;
        state.isAuthenticated = true;
        state.user = userData;
        state.token = userData.token || userData.accessToken;
        state.refreshToken = userData.refreshToken || null;
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
        state.token = userData.token || userData.accessToken;
        state.refreshToken = userData.refreshToken || null;
      })
      .addCase(OnboardAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, updateAccessToken, setTokens } = authenticationSlice.actions;
export default authenticationSlice.reducer;