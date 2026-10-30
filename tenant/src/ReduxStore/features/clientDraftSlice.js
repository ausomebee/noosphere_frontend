// ReduxStore/features/ClientDraftSlice.js
import { createSlice } from "@reduxjs/toolkit";

const clientDraftSlice = createSlice({
  name: "clientDraft",
  initialState: { formData: {} },
  reducers: {
    setDraftField: (state, action) => {
      state.formData = { ...state.formData, ...action.payload };
    },
    resetDraft: (state) => {
      state.formData = {};
    },
  },
});

export const { setDraftField, resetDraft } = clientDraftSlice.actions;
export default clientDraftSlice.reducer;