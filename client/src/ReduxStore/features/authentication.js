import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../api/authApis';

const initialState = {
    isAuthenticated: false,
    user: null,
    accessToken: null, // Changed from token to accessToken
    refreshToken: null, // Add refreshToken
    loading: false,
    error: null,
};

export const ClientLogin = createAsyncThunk(
  'auth/clientLogin',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.ClientLogin({ email, password });
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
      logout: (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.loading = false;
        state.error = null;
      },
      clearError: (state) => {
        state.error = null;
      },
      setTokens: (state, action) => {
        const { accessToken, refreshToken } = action.payload;
        state.accessToken = accessToken;
        state.refreshToken = refreshToken;
      },
      updateUser: (state, action) => {
        state.user = { ...state.user, ...action.payload };
      },
    },
    extraReducers: (builder) => {
      builder
        .addCase(ClientLogin.pending, (state) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(ClientLogin.fulfilled, (state, action) => {
          const userData = action.payload.data;
          state.loading = false;
          state.isAuthenticated = true;
          state.user = userData;
          state.accessToken = userData.accessToken; // Use accessToken from response
          state.refreshToken = userData.refreshToken; // Store refreshToken
        })
        .addCase(ClientLogin.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload;
          state.isAuthenticated = false;
          state.user = null;
          state.accessToken = null;
          state.refreshToken = null;
        })
    },
});

export const { logout, clearError, setTokens, updateUser } = authenticationSlice.actions;

export default authenticationSlice.reducer;