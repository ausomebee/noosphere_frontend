import { createSlice } from "@reduxjs/toolkit";

const generalSettingsSlice = createSlice({
  name: "generalSettings",
  initialState: {
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12-hour",
    currency: "USD",
    loaded: false,
  },
  reducers: {
    setSettings(state, action) {
      const { dateFormat, timeFormat, currency } = action.payload;
      if (dateFormat) state.dateFormat = dateFormat;
      if (timeFormat) state.timeFormat = timeFormat;
      if (currency) state.currency = currency;
      state.loaded = true;
    },
    resetSettings(state) {
      state.dateFormat = "MM/DD/YYYY";
      state.timeFormat = "12-hour";
      state.currency = "USD";
      state.loaded = false;
    },
  },
});

export const { setSettings, resetSettings } = generalSettingsSlice.actions;
export default generalSettingsSlice.reducer;
