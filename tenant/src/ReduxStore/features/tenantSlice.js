import { createSlice } from '@reduxjs/toolkit';

const tenantSlice = createSlice({
  name: 'tenant',
  initialState: {
    subdomain: null,
    loading: true,
  },
  reducers: {
    setSubdomain(state, action) {
      state.subdomain = action.payload;
      state.loading = false;
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
  },
});

export const { setSubdomain, setLoading } = tenantSlice.actions;
export default tenantSlice.reducer;