import { describe, it, expect } from "vitest";
import formResponseReducer, {
  initializeResponse, setResponse, setCurrentPage, clearAllResponses,
  markAsSubmitted, setSignature, setSignatureMode, setFilesForField,
  setFileUploadStatus, clearResponseField, setLoading, setError, resetFormResponse,
} from "../ReduxStore/features/formResponseSlice";

const initialState = {
  formId: null, tenantId: null, submittedBy: null, responses: {}, files: {},
  signatures: {}, signatureMode: {}, currentPage: 0, isLoading: false,
  error: null, submitted: false, submissionId: null, submittedAt: null, version: 1,
};

describe("formResponse slice", () => {
  it("returns initial state", () => {
    expect(formResponseReducer(undefined, { type: "unknown" })).toEqual(initialState);
  });

  describe("initializeResponse", () => {
    it("sets form metadata", () => {
      const state = formResponseReducer(initialState, initializeResponse({
        formId: "form1", tenantId: "tenant1", submittedBy: "user1",
      }));
      expect(state.formId).toBe("form1");
      expect(state.tenantId).toBe("tenant1");
      expect(state.submittedBy).toBe("user1");
      expect(state.submitted).toBe(false);
    });
  });

  describe("setResponse", () => {
    it("stores field response", () => {
      const state = formResponseReducer(initialState, setResponse({ fieldId: "f1", value: "answer" }));
      expect(state.responses.f1).toBe("answer");
    });

    it("overwrites existing response", () => {
      const withResponse = { ...initialState, responses: { f1: "old" } };
      const state = formResponseReducer(withResponse, setResponse({ fieldId: "f1", value: "new" }));
      expect(state.responses.f1).toBe("new");
    });
  });

  describe("setCurrentPage", () => {
    it("updates current page", () => {
      const state = formResponseReducer(initialState, setCurrentPage(3));
      expect(state.currentPage).toBe(3);
    });
  });

  describe("setSignature", () => {
    it("stores signature data", () => {
      const state = formResponseReducer(initialState, setSignature({ fieldId: "sig1", signature: "data:image/png;base64,abc" }));
      expect(state.signatures.sig1).toBe("data:image/png;base64,abc");
    });
  });

  describe("setSignatureMode", () => {
    it("sets signature mode", () => {
      const state = formResponseReducer(initialState, setSignatureMode({ fieldId: "sig1", mode: "draw" }));
      expect(state.signatureMode.sig1).toBe("draw");
    });
  });

  describe("setFilesForField", () => {
    it("sets files array for field", () => {
      const files = [{ filename: "doc.pdf", url: "/uploads/doc.pdf" }];
      const state = formResponseReducer(initialState, setFilesForField({ fieldId: "f1", fileItems: files }));
      expect(state.files.f1).toHaveLength(1);
      expect(state.files.f1[0].filename).toBe("doc.pdf");
    });

    it("handles empty array", () => {
      const state = formResponseReducer(initialState, setFilesForField({ fieldId: "f1", fileItems: [] }));
      expect(state.files.f1).toEqual([]);
    });
  });

  describe("setFileUploadStatus", () => {
    it("updates file upload progress", () => {
      const withFile = { ...initialState, files: { f1: [{ filename: "doc.pdf", progress: 0 }] } };
      const state = formResponseReducer(withFile, setFileUploadStatus({
        fieldId: "f1", fileIndex: 0, updates: { progress: 50 },
      }));
      expect(state.files.f1[0].progress).toBe(50);
    });

    it("ignores invalid file index", () => {
      const withFile = { ...initialState, files: { f1: [{ filename: "doc.pdf" }] } };
      const state = formResponseReducer(withFile, setFileUploadStatus({
        fieldId: "f1", fileIndex: 5, updates: { progress: 100 },
      }));
      expect(state.files.f1).toHaveLength(1);
    });
  });

  describe("clearResponseField", () => {
    it("removes all data for a field", () => {
      const withData = {
        ...initialState,
        responses: { f1: "answer" },
        files: { f1: [{ filename: "doc.pdf" }] },
        signatures: { f1: "sig-data" },
        signatureMode: { f1: "draw" },
      };
      const state = formResponseReducer(withData, clearResponseField({ fieldId: "f1" }));
      expect(state.responses.f1).toBeUndefined();
      expect(state.files.f1).toBeUndefined();
      expect(state.signatures.f1).toBeUndefined();
      expect(state.signatureMode.f1).toBeUndefined();
    });
  });

  describe("clearAllResponses", () => {
    it("resets all response data but keeps metadata", () => {
      const withData = {
        ...initialState, formId: "form1", responses: { f1: "val" },
        files: { f1: [] }, signatures: { s1: "sig" }, currentPage: 2,
      };
      const state = formResponseReducer(withData, clearAllResponses());
      expect(state.responses).toEqual({});
      expect(state.files).toEqual({});
      expect(state.signatures).toEqual({});
      expect(state.currentPage).toBe(0);
      expect(state.formId).toBe("form1");
    });
  });

  describe("markAsSubmitted", () => {
    it("marks form as submitted and clears data", () => {
      const withData = { ...initialState, responses: { f1: "val" }, files: { f1: [] } };
      const state = formResponseReducer(withData, markAsSubmitted({ submissionId: "sub1" }));
      expect(state.submitted).toBe(true);
      expect(state.submissionId).toBe("sub1");
      expect(state.submittedAt).toBeTruthy();
      expect(state.responses).toEqual({});
      expect(state.files).toEqual({});
    });
  });

  describe("setLoading / setError", () => {
    it("sets loading state", () => {
      expect(formResponseReducer(initialState, setLoading(true)).isLoading).toBe(true);
      expect(formResponseReducer(initialState, setLoading(false)).isLoading).toBe(false);
    });
    it("sets error", () => {
      expect(formResponseReducer(initialState, setError("Oops")).error).toBe("Oops");
    });
  });

  describe("resetFormResponse", () => {
    it("fully resets to initial state", () => {
      const dirty = { ...initialState, formId: "x", responses: { a: 1 }, submitted: true };
      expect(formResponseReducer(dirty, resetFormResponse())).toEqual(initialState);
    });
  });
});
