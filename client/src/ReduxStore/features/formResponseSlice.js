// ReduxStore/features/formResponseSlice.js
import { createSlice } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

const initialState = {
  formId: null,
  tenantId: null,
  submittedBy: null,
  responses: {},
  files: {}, // fieldId → [{ file, filename, progress, url?, error?, errorMessage?, previewUrl? }]
  signatures: {},
  signatureMode: {},
  currentPage: 0,
  isLoading: false,
  error: null,
  submitted: false,
  submissionId: null,
  submittedAt: null,
  version: 1,
};

// Helper: Serialize file info → drop actual File object + store previewUrl if exists
const serializeFileInfo = (fileItems) => {
  if (!Array.isArray(fileItems)) return [];
  return fileItems.map((item) => {
    const { file, previewUrl, ...rest } = item;

    // Revoke preview URL if it was created (cleanup)
    if (previewUrl && !item.url) { // only revoke if not yet uploaded
      try {
        URL.revokeObjectURL(previewUrl);
      } catch (e) {
        // Silent fail - URL might already be revoked
      }
    }

    return {
      ...rest,
      filename: item.filename,
      size: item.file?.size,
      type: item.file?.type,
      lastModified: item.file?.lastModified,
      progress: item.progress || 0,
      url: item.url || null,
      error: item.error || false,
      errorMessage: item.errorMessage || null,
      previewUrl: item.previewUrl || null, // keep for rehydration (but won't work after refresh)
      _wasUploaded: !!item.url,
    };
  });
};

// Helper: Deserialize → safe, no File restoration
const deserializeFileInfo = (fileInfo) => {
  if (!fileInfo) return [];
  return fileInfo.map((info) => ({
    ...info,
    file: null, // Cannot restore File object
    previewUrl: info.previewUrl || null,
  }));
};

const formResponseSlice = createSlice({
  name: "formResponse",
  initialState,
  reducers: {
    initializeResponse: (state, action) => {
      const { formId, tenantId, submittedBy } = action.payload;
      state.formId = formId;
      state.tenantId = tenantId;
      state.submittedBy = submittedBy;
      state.submitted = false;
      state.submissionId = null;
      state.submittedAt = null;
    },

    setResponse: (state, action) => {
      const { fieldId, value } = action.payload;
      state.responses[fieldId] = value;
    },

    addFilesToField: (state, action) => {
      const { fieldId, fileItems } = action.payload;
      // Create preview URLs for images when adding
      const enhancedItems = fileItems.map((item) => {
        if (item.file?.type?.includes("image")) {
          return {
            ...item,
            previewUrl: URL.createObjectURL(item.file),
          };
        }
        return item;
      });
      state.files[fieldId] = [...(state.files[fieldId] || []), ...enhancedItems];
    },

    setFilesForField: (state, action) => {
      const { fieldId, fileItems } = action.payload;
      state.files[fieldId] = Array.isArray(fileItems) ? [...fileItems] : [];
    },

    setFileUploadStatus: (state, action) => {
      const { fieldId, fileIndex, updates } = action.payload;
      if (!state.files[fieldId]?.[fileIndex]) return;
      state.files[fieldId][fileIndex] = {
        ...state.files[fieldId][fileIndex],
        ...updates,
      };
    },

    setSignature: (state, action) => {
      const { fieldId, signature } = action.payload;
      state.signatures[fieldId] = signature;
    },

    setSignatureMode: (state, action) => {
      const { fieldId, mode } = action.payload;
      state.signatureMode[fieldId] = mode;
    },

    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },

    clearResponseField: (state, action) => {
      const { fieldId } = action.payload;
      delete state.responses[fieldId];
      delete state.files[fieldId];
      delete state.signatures[fieldId];
      delete state.signatureMode[fieldId];
    },

    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },

    setError: (state, action) => {
      state.error = action.payload;
    },

    clearAllResponses: (state) => {
      state.responses = {};
      state.files = {};
      state.signatures = {};
      state.signatureMode = {};
      state.currentPage = 0;
      state.error = null;
    },

    markAsSubmitted: (state, action) => {
      const { submissionId } = action.payload || {};
      state.submitted = true;
      state.submissionId = submissionId;
      state.submittedAt = new Date().toISOString();
      state.responses = {};
      state.files = {};
      state.signatures = {};
      state.signatureMode = {};
      state.currentPage = 0;
    },

    loadSavedResponse: (state, action) => {
      const savedState = action.payload;
      if (savedState.files) {
        Object.keys(savedState.files).forEach((fieldId) => {
          savedState.files[fieldId] = deserializeFileInfo(
            savedState.files[fieldId],
          );
        });
      }
      return { ...initialState, ...savedState };
    },

    resetFormResponse: () => initialState,
  },
});

export const {
  initializeResponse,
  setResponse,
  addFilesToField,
  setFilesForField,
  setFileUploadStatus,
  setSignature,
  setSignatureMode,
  setCurrentPage,
  clearResponseField,
  setLoading,
  setError,
  clearAllResponses,
  markAsSubmitted,
  loadSavedResponse,
  resetFormResponse,
} = formResponseSlice.actions;

export const selectFormResponse = (state) => state.formResponse;
export const selectResponses = (state) => state.formResponse.responses;
export const selectFiles = (state) => state.formResponse.files;
export const selectSignatures = (state) => state.formResponse.signatures;
export const selectCurrentPage = (state) => state.formResponse.currentPage;
export const selectIsSubmitted = (state) => state.formResponse.submitted;
export const selectSubmissionId = (state) => state.formResponse.submissionId;
export const selectIsLoading = (state) => state.formResponse.isLoading;
export const selectError = (state) => state.formResponse.error;

export const selectFileCount = (state, fieldId) => {
  const files = state.formResponse.files[fieldId];
  return files ? files.length : 0;
};

export const selectHasResponse = (state, fieldId) => {
  const { responses, files, signatures } = state.formResponse;
  return !!(
    responses[fieldId] ||
    files[fieldId]?.length > 0 ||
    signatures[fieldId]
  );
};

const formResponsePersistConfig = {
  key: "formResponse",
  storage,
  whitelist: [
    "formId",
    "tenantId",
    "submittedBy",
    "responses",
    "signatures",
    "signatureMode",
    "currentPage",
    "submitted",
    "submissionId",
    "submittedAt",
    // Note: files are NOT in whitelist → we handle serialization manually
  ],
};

export const persistedFormResponseReducer = persistReducer(
  formResponsePersistConfig,
  formResponseSlice.reducer
);

export default formResponseSlice.reducer;