// ReduxStore/features/formBuilderSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  formName: "Untitled Form",
  elements: [],
  status: "draft",
  formId: null,
  tenantId: null,
  isLoading: false,
  error: null,
  isPublished: false,
  isTemplate: false,
  tenantClientId: null,
  createdAt: null,
  updatedAt: null,
  version: 1,
};

const formBuilderSlice = createSlice({
  name: "formBuilder",
  initialState,
  reducers: {
    // Basic form management
    setFormName: (state, action) => {
      state.formName = action.payload;
    },

    setFormId: (state, action) => {
      state.formId = action.payload;
    },

    setTenantId: (state, action) => {
      state.tenantId = action.payload;
    },

    setStatus: (state, action) => {
      state.status = action.payload;
    },

    setIsPublished: (state, action) => {
      state.isPublished = action.payload;
    },

    setIsTemplate: (state, action) => {
      state.isTemplate = action.payload;
    },

    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },

    setError: (state, action) => {
      state.error = action.payload;
    },

    // Element management
    addElement: (state, action) => {
      const payload = action.payload;
      const id = payload.id || Date.now() + Math.random();

      const elementType = payload.fieldType || payload.type;

      state.elements.push({
        id: String(id),
        formId: payload.formId || state.formId,
        type: elementType,
        fieldType: elementType,
        label: payload.label || "",
        placeholder: payload.placeholder || "",
        required: payload.isRequired || payload.required || false,
        isRequired: payload.isRequired || payload.required || false,
        options: payload.options || null,
        fileUpload: payload.fileUpload || null,
        starRating: payload.starRating || null,
        signature: payload.signature || null,
        order: payload.order || state.elements.length + 1,

        maxFiles: payload.maxFiles || 1,
        maxFileSize: payload.maxFileSize || 10,
        allowedFileTypes: payload.allowedFileTypes || ["image/* .jpg, .jpeg, .png, .gif, .webp", "PDF"],
        maxStars: payload.maxStars || 5,
        allowSignatureUpload: payload.allowSignatureUpload !== false,
      });
    },

    updateElement: (state, action) => {
      const { id, updates } = action.payload;
      const stringId = String(id);
      const el = state.elements.find((e) => String(e.id) === stringId);
      if (el) {
        if (Object.prototype.hasOwnProperty.call(updates, "required")) {
          updates.isRequired = updates.required;
        }
        if (Object.prototype.hasOwnProperty.call(updates, "isRequired")) {
          updates.required = updates.isRequired;
        }
        if (Object.prototype.hasOwnProperty.call(updates, "type")) {
          updates.fieldType = updates.type;
        }
        Object.assign(el, updates);
      }
    },

    deleteElement: (state, action) => {
      const stringId = String(action.payload);
      state.elements = state.elements.filter((e) => String(e.id) !== stringId);
      state.elements.forEach((el, index) => {
        el.order = index + 1;
      });
    },

    reorderElements: (state, action) => {
      state.elements = action.payload.map((el, index) => ({
        ...el,
        id: String(el.id),
        order: index + 1,
      }));
    },

    toggleRequired: (state, action) => {
      const stringId = String(action.payload);
      const el = state.elements.find((e) => String(e.id) === stringId);
      if (el) {
        el.required = !el.required;
        el.isRequired = !el.isRequired;
      }
    },

    // Options management
    addOption: (state, action) => {
      const { id, option } = action.payload;
      const stringId = String(id);
      const el = state.elements.find((e) => String(e.id) === stringId);
      if (el) {
        if (!el.options) el.options = [];
        if (Array.isArray(el.options)) {
          el.options.push(option);
        } else {
          el.options = [option];
        }
      }
    },

    removeOption: (state, action) => {
      const { id, index } = action.payload;
      const stringId = String(id);
      const el = state.elements.find((e) => String(e.id) === stringId);
      if (
        el &&
        el.options &&
        Array.isArray(el.options) &&
        el.options.length > index
      ) {
        el.options.splice(index, 1);
      }
    },

    updateOption: (state, action) => {
      const { id, index, value } = action.payload;
      const stringId = String(id);
      const el = state.elements.find((e) => String(e.id) === stringId);
      if (
        el &&
        el.options &&
        Array.isArray(el.options) &&
        el.options.length > index
      ) {
        el.options[index] = value;
      }
    },

    // ────────────────────────────────────────────────
    // Simplified & reliable loadForm reducer
    // Prefers pre-transformed elements when provided
    // ────────────────────────────────────────────────
    loadForm: (state, action) => {
      const payload = action.payload;

      // Case 1: We received already transformed elements (preferred path from FormRenderer)
      if (payload.elements && Array.isArray(payload.elements)) {
        state.formName = payload.formName || "Untitled Form";
        state.elements = payload.elements.map((el) => ({
          ...el,
          id: String(el.id),
          type: el.type || el.fieldType || "unknown",
          fieldType: el.fieldType || el.type || "unknown",
          required: !!el.required || !!el.isRequired,
          isRequired: !!el.required || !!el.isRequired,
          order: Number(el.order) || 0,
        }));
        state.formId = payload.formId || null;
        state.tenantId = payload.tenantId || null;
        state.status =
          payload.status || (payload.isPublished ? "published" : "draft");
        state.isPublished = !!payload.isPublished;
        state.isTemplate = !!payload.isTemplate;
        state.tenantClientId = payload.tenantClientId || null;
        state.createdAt = payload.createdAt || null;
        state.updatedAt = payload.updatedAt || null;
        state.isLoading = false;
        state.error = null;
        state.version = 1;
        return;
      }

      // Case 2: Raw API-like data with fields array (fallback for other use cases)
      if (payload.formData && Array.isArray(payload.formData.fields)) {
        const formData = payload.formData;

        const parseFileSize = (sizeString) => {
          if (!sizeString && sizeString !== 0) return 10;
          if (typeof sizeString === "number") return sizeString;
          const match = sizeString
            ?.toString()
            .match(/^(\d+(?:\.\d+)?)\s*(MB|KB|GB)?$/i);
          if (!match) return 10;
          const size = parseFloat(match[1]);
          const unit = (match[2] || "MB").toUpperCase();
          return unit === "KB"
            ? size / 1024
            : unit === "GB"
              ? size * 1024
              : size;
        };

        const transformedElements = formData.fields.map((field) => {
          const base = {
            id: String(field.id),
            type: field.fieldType,
            fieldType: field.fieldType,
            label: field.label || "",
            placeholder: field.placeholder || "",
            required: field.isRequired || false,
            isRequired: field.isRequired || false,
            options: field.options || [],
            order: field.order || 0,
          };

          if (field.fieldType === "fileUpload") {
            const cfg = field.fileUpload?.[0] || {};
            return {
              ...base,
              maxFiles: parseInt(cfg.maxFiles, 10) || 1,
              maxFileSize: parseFileSize(cfg.maxSize) || 10,
              allowedFileTypes: Array.isArray(cfg.allowedTypes)
                ? cfg.allowedTypes
                : ["Image", "PDF"],
              fileUpload: field.fileUpload,
            };
          }

          if (field.fieldType === "starRating") {
            return {
              ...base,
              maxStars: parseInt(field.starRating?.[0], 10) || 5,
              starRating: field.starRating,
            };
          }

          if (field.fieldType === "signature") {
            return {
              ...base,
              allowSignatureUpload: field.signature?.[0]?.allowUpload === true,
              signature: field.signature,
            };
          }

          return base;
        });

        state.formName = formData.name || "Untitled Form";
        state.elements = transformedElements;
        state.formId = formData.id || null;
        state.tenantId = formData.tenantId || null;
        state.status = formData.isDraft ? "draft" : "published";
        state.isPublished = !formData.isDraft;
        state.isTemplate = formData.isTemplate || false;
        state.tenantClientId = formData.tenantClientId || null;
        state.createdAt = formData.createdAt || null;
        state.updatedAt = formData.updatedAt || null;
        state.isLoading = false;
        state.error = null;
        state.version = 1;
        return;
      }

      // Case 3: Partial update (minimal changes)
      state.formName = payload.formName || state.formName;
      state.formId = payload.formId || state.formId;
      state.tenantId = payload.tenantId || state.tenantId;
      state.status = payload.status || state.status;
      state.isPublished = payload.isPublished ?? state.isPublished;
      state.isTemplate = payload.isTemplate ?? state.isTemplate;
      state.tenantClientId = payload.tenantClientId || state.tenantClientId;
      state.createdAt = payload.createdAt || state.createdAt;
      state.updatedAt = payload.updatedAt || state.updatedAt;
      state.isLoading = false;
      state.error = null;
    },

    // Publish form
    publishForm: (state) => {
      state.status = "published";
      state.isPublished = true;
      state.updatedAt = new Date().toISOString();
    },

    // Save draft
    saveDraft: (state) => {
      state.updatedAt = new Date().toISOString();
    },

    // Update form metadata
    updateFormMetadata: (state, action) => {
      Object.assign(state, action.payload);
      state.updatedAt = new Date().toISOString();
    },

    // Clear form state
    resetForm: () => initialState,
  },
});

export const {
  setFormName,
  setFormId,
  setTenantId,
  setStatus,
  setIsPublished,
  setIsTemplate,
  setLoading,
  setError,
  addElement,
  updateElement,
  deleteElement,
  reorderElements,
  toggleRequired,
  addOption,
  removeOption,
  updateOption,
  loadForm,
  publishForm,
  saveDraft,
  updateFormMetadata,
  resetForm,
} = formBuilderSlice.actions;

// Selectors
export const selectFormName = (state) => state.formBuilder.formName;
export const selectElements = (state) => state.formBuilder.elements;
export const selectFormId = (state) => state.formBuilder.formId;
export const selectTenantId = (state) => state.formBuilder.tenantId;
export const selectFormStatus = (state) => state.formBuilder.status;
export const selectIsLoading = (state) => state.formBuilder.isLoading;
export const selectError = (state) => state.formBuilder.error;
export const selectIsPublished = (state) => state.formBuilder.isPublished;
export const selectIsTemplate = (state) => state.formBuilder.isTemplate;

export default formBuilderSlice.reducer;
