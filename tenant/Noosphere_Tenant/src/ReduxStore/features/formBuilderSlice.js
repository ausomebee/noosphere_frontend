// ReduxStore/features/formBuilderSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  formName: "Untitled Form",
  elements: [],
  status: "draft",
};

const formBuilderSlice = createSlice({
  name: "formBuilder",
  initialState,
  reducers: {
    setFormName: (state, action) => {
      state.formName = action.payload;
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
    },
    updateElement: (state, action) => {
      const { id, updates } = action.payload;
      const stringId = String(id);
      const el = state.elements.find((e) => String(e.id) === stringId);
      if (el) Object.assign(el, updates);
    },
    deleteElement: (state, action) => {
      const stringId = String(action.payload);
      state.elements = state.elements.filter((e) => String(e.id) !== stringId);
    },
    reorderElements: (state, action) => {
      state.elements = action.payload.map(el => ({
        ...el,
        id: String(el.id)
      }));
    },
    toggleRequired: (state, action) => {
      const stringId = String(action.payload);
      const el = state.elements.find((e) => String(e.id) === stringId);
      if (el) el.required = !el.required;
    },
    addOption: (state, action) => {
      const { id, option } = action.payload;
      const stringId = String(id);
      const el = state.elements.find((e) => String(e.id) === stringId);
      if (el) {
        if (!el.options) el.options = [];
        el.options.push(option);
      }
    },
    removeOption: (state, action) => {
      const { id, index } = action.payload;
      const stringId = String(id);
      const el = state.elements.find((e) => String(e.id) === stringId);
      if (el && el.options && el.options.length > index) {
        el.options.splice(index, 1);
      }
    },
    updateOption: (state, action) => {
      const { id, index, value } = action.payload;
      const stringId = String(id);
      const el = state.elements.find((e) => String(e.id) === stringId);
      if (el && el.options && el.options.length > index) {
        el.options[index] = value;
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
      };
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
  resetForm,
} = formBuilderSlice.actions;

export default formBuilderSlice.reducer;