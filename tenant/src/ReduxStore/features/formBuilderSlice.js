// ReduxStore/features/formBuilderSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  formName: "Untitled Form",
  elements: [],
  status: "draft",
  // Tracks whether the in-progress form has unsaved edits. Persisted via
  // redux-persist so leaving the builder (even on a save error) keeps the work;
  // it's only cleared once a save action completes (markSaved / loadForm /
  // resetForm).
  dirty: false,
};

const formBuilderSlice = createSlice({
  name: "formBuilder",
  initialState,
  reducers: {
    setFormName: (state, action) => {
      state.formName = action.payload;
      state.dirty = true;
    },
    addElement: (state, action) => {
      const payload = action.payload;
      const id = payload.id || Date.now() + Math.random();
      state.elements.push({
        id: String(id),
        type: payload.type,
        label: payload.label || "",
        required: payload.required || false,
        options: payload.options || [],
        maxStars: payload.maxStars,
        fileSettings: payload.fileSettings,
        allowSignatureUpload: payload.allowSignatureUpload,
      });
      state.dirty = true;
    },
    updateElement: (state, action) => {
      const { id, updates } = action.payload;
      const stringId = String(id);
      const el = state.elements.find((e) => String(e.id) === stringId);
      if (el) {
        Object.assign(el, updates);
        state.dirty = true;
      }
    },
    deleteElement: (state, action) => {
      const stringId = String(action.payload);
      state.elements = state.elements.filter((e) => String(e.id) !== stringId);
      state.dirty = true;
    },
    reorderElements: (state, action) => {
      state.elements = action.payload.map(el => ({
        ...el,
        id: String(el.id)
      }));
      state.dirty = true;
    },
    toggleRequired: (state, action) => {
      const stringId = String(action.payload);
      const el = state.elements.find((e) => String(e.id) === stringId);
      if (el) {
        el.required = !el.required;
        state.dirty = true;
      }
    },
    addOption: (state, action) => {
      const { id, option } = action.payload;
      const stringId = String(id);
      const el = state.elements.find((e) => String(e.id) === stringId);
      if (el) {
        if (!el.options) el.options = [];
        el.options.push(option);
        state.dirty = true;
      }
    },
    removeOption: (state, action) => {
      const { id, index } = action.payload;
      const stringId = String(id);
      const el = state.elements.find((e) => String(e.id) === stringId);
      if (el && el.options && el.options.length > index) {
        el.options.splice(index, 1);
        state.dirty = true;
      }
    },
    updateOption: (state, action) => {
      const { id, index, value } = action.payload;
      const stringId = String(id);
      const el = state.elements.find((e) => String(e.id) === stringId);
      if (el && el.options && el.options.length > index) {
        el.options[index] = value;
        state.dirty = true;
      }
    },
    setStatus: (state, action) => {
      state.status = action.payload;
    },
    // CRITICAL FIX: Preserve ALL custom fields
    loadForm: (state, action) => {
      const { formName, elements, status } = action.payload;
      return {
        formName: formName || "Untitled Form",
        status: status || "draft",
        elements: (elements || []).map(el => ({
          id: String(el.id),
          type: el.type,
          label: el.label || "",
          required: el.required || false,
          options: el.options || [],
          maxStars: el.maxStars,
          fileSettings: el.fileSettings,
          allowSignatureUpload: el.allowSignatureUpload,
        })),
        dirty: false,
      };
    },
    // Mark the current form as saved without wiping it (used after a
    // successful draft/template/publish so the buffer isn't treated as
    // unsaved work the next time a blank "New Form" is opened).
    markSaved: (state) => {
      state.dirty = false;
    },
    resetForm: () => initialState,
  },
});

export const {
  setFormName,
  addElement,
  updateElement,
  deleteElement,
  reorderElements,
  toggleRequired,
  addOption,
  removeOption,
  updateOption,
  setStatus,
  loadForm,
  markSaved,
  resetForm,
} = formBuilderSlice.actions;

export default formBuilderSlice.reducer;
