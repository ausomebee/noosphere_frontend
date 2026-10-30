import { createSlice } from "@reduxjs/toolkit";

// Generic, persisted store of in-progress modal form drafts.
// Shape: { [key]: { values, savedAt } }
// Keyed per modal (e.g. "add-prospect"); persisted via redux-persist so an
// accidental Cancel/close doesn't lose what the user typed. Cleared only on a
// successful submit (or when a draft passes its TTL — see useReduxFormDraft).
const formDraftsSlice = createSlice({
  name: "formDrafts",
  initialState: {},
  reducers: {
    setFormDraft: (state, action) => {
      const { key, values, savedAt } = action.payload;
      state[key] = { values, savedAt: savedAt ?? Date.now() };
    },
    clearFormDraft: (state, action) => {
      delete state[action.payload];
    },
  },
});

export const { setFormDraft, clearFormDraft } = formDraftsSlice.actions;
export default formDraftsSlice.reducer;
