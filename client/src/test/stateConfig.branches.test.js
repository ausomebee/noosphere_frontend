import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import reducer, {
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
} from "../ReduxStore/features/formResponseSlice";

import {
  getNotificationAction,
  NOTIFICATION_ENTITY_TYPE,
  TYPE_LABEL,
  TYPE_ORDER,
  notificationItems,
} from "../Data/notificationConfig";

import omitEmpty from "../Helper/omitEmpty";

/**
 * Branch coverage for the form-response slice and the notification config's
 * action resolution.
 */

const initial = () => reducer(undefined, { type: "@@INIT" });

beforeEach(() => {
  vi.clearAllMocks();
  global.URL.createObjectURL = vi.fn(() => "blob:preview");
  global.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("formResponseSlice", () => {
  it("starts from a clean initial state", () => {
    const s = initial();
    expect(s.responses).toEqual({});
    expect(s.files).toEqual({});
    expect(s.submitted).toBe(false);
  });

  it("initializes a form and clears any prior submission", () => {
    let s = reducer(
      { ...initial(), submitted: true, submissionId: "old", submittedAt: "x" },
      initializeResponse({ formId: "f1", tenantId: "t1", submittedBy: "c1" })
    );
    expect(s.formId).toBe("f1");
    expect(s.tenantId).toBe("t1");
    expect(s.submittedBy).toBe("c1");
    expect(s.submitted).toBe(false);
    expect(s.submissionId).toBeNull();
    expect(s.submittedAt).toBeNull();
  });

  it("stores a field response", () => {
    const s = reducer(initial(), setResponse({ fieldId: "q1", value: "yes" }));
    expect(s.responses.q1).toBe("yes");
  });

  it("adds a preview url for image files but not for others", () => {
    const image = { file: { type: "image/png" }, name: "a.png" };
    const doc = { file: { type: "application/pdf" }, name: "a.pdf" };
    const s = reducer(initial(), addFilesToField({ fieldId: "q1", fileItems: [image, doc] }));
    expect(s.files.q1[0].previewUrl).toBe("blob:preview");
    expect(s.files.q1[1].previewUrl).toBeUndefined();
  });

  it("copes with a file item carrying no file object", () => {
    const s = reducer(initial(), addFilesToField({ fieldId: "q1", fileItems: [{ name: "x" }] }));
    expect(s.files.q1).toHaveLength(1);
    expect(s.files.q1[0].previewUrl).toBeUndefined();
  });

  it("appends to an existing field rather than replacing it", () => {
    let s = reducer(initial(), addFilesToField({ fieldId: "q1", fileItems: [{ name: "a" }] }));
    s = reducer(s, addFilesToField({ fieldId: "q1", fileItems: [{ name: "b" }] }));
    expect(s.files.q1).toHaveLength(2);
  });

  it("replaces a field's files wholesale, defaulting a non-array to empty", () => {
    let s = reducer(initial(), addFilesToField({ fieldId: "q1", fileItems: [{ name: "a" }] }));
    s = reducer(s, setFilesForField({ fieldId: "q1", fileItems: [{ name: "z" }] }));
    expect(s.files.q1).toHaveLength(1);
    expect(s.files.q1[0].name).toBe("z");
    s = reducer(s, setFilesForField({ fieldId: "q1", fileItems: null }));
    expect(s.files.q1).toEqual([]);
  });

  it("updates one file's upload status", () => {
    let s = reducer(initial(), addFilesToField({ fieldId: "q1", fileItems: [{ name: "a" }] }));
    s = reducer(s, setFileUploadStatus({ fieldId: "q1", fileIndex: 0, updates: { progress: 50 } }));
    expect(s.files.q1[0].progress).toBe(50);
  });

  it("ignores an upload status for a field or index that does not exist", () => {
    const before = initial();
    let s = reducer(before, setFileUploadStatus({ fieldId: "nope", fileIndex: 0, updates: {} }));
    expect(s.files.nope).toBeUndefined();
    s = reducer(
      reducer(before, addFilesToField({ fieldId: "q1", fileItems: [{ name: "a" }] })),
      setFileUploadStatus({ fieldId: "q1", fileIndex: 9, updates: { progress: 1 } })
    );
    expect(s.files.q1).toHaveLength(1);
  });

  it("stores a signature and its capture mode", () => {
    let s = reducer(initial(), setSignature({ fieldId: "q1", signature: "data:png" }));
    s = reducer(s, setSignatureMode({ fieldId: "q1", mode: "draw" }));
    expect(s.signatures.q1).toBe("data:png");
    expect(s.signatureMode.q1).toBe("draw");
  });

  it("tracks the current page", () => {
    expect(reducer(initial(), setCurrentPage(3)).currentPage).toBe(3);
  });

  it("clears every trace of one field", () => {
    let s = initial();
    s = reducer(s, setResponse({ fieldId: "q1", value: "v" }));
    s = reducer(s, addFilesToField({ fieldId: "q1", fileItems: [{ name: "a" }] }));
    s = reducer(s, setSignature({ fieldId: "q1", signature: "sig" }));
    s = reducer(s, setSignatureMode({ fieldId: "q1", mode: "type" }));
    s = reducer(s, clearResponseField({ fieldId: "q1" }));
    expect(s.responses.q1).toBeUndefined();
    expect(s.files.q1).toBeUndefined();
    expect(s.signatures.q1).toBeUndefined();
    expect(s.signatureMode.q1).toBeUndefined();
  });

  it("tracks loading and error", () => {
    expect(reducer(initial(), setLoading(true)).isLoading).toBe(true);
    expect(reducer(initial(), setError("bad")).error).toBe("bad");
  });

  it("clears every answer without touching the submission fields", () => {
    let s = reducer(initial(), setResponse({ fieldId: "q1", value: "v" }));
    s = reducer(s, setCurrentPage(2));
    s = reducer(s, setError("bad"));
    s = reducer(s, clearAllResponses());
    expect(s.responses).toEqual({});
    expect(s.currentPage).toBe(0);
    expect(s.error).toBeNull();
  });

  it("marks a submission and clears the answers", () => {
    let s = reducer(initial(), setResponse({ fieldId: "q1", value: "v" }));
    s = reducer(s, markAsSubmitted({ submissionId: "sub1" }));
    expect(s.submitted).toBe(true);
    expect(s.submissionId).toBe("sub1");
    expect(typeof s.submittedAt).toBe("string");
    expect(s.responses).toEqual({});
  });

  it("marks a submission even with no payload", () => {
    const s = reducer(initial(), markAsSubmitted());
    expect(s.submitted).toBe(true);
    expect(s.submissionId).toBeUndefined();
  });

  it("loads a saved response, rehydrating file info", () => {
    const s = reducer(
      initial(),
      loadSavedResponse({ formId: "f9", responses: { q1: "v" }, files: { q1: [] } })
    );
    expect(s.formId).toBe("f9");
    expect(s.responses.q1).toBe("v");
  });

  it("loads a saved response that carries no files at all", () => {
    const s = reducer(initial(), loadSavedResponse({ formId: "f9" }));
    expect(s.formId).toBe("f9");
    expect(s.files).toEqual({});
  });

  it("resets to the initial state", () => {
    let s = reducer(initial(), setResponse({ fieldId: "q1", value: "v" }));
    s = reducer(s, resetFormResponse());
    expect(s.responses).toEqual({});
    expect(s.formId).toBeNull();
  });

  it("returns the same state for an unrelated action", () => {
    const s = initial();
    expect(reducer(s, { type: "other/thing" })).toBe(s);
  });
});

describe("notificationConfig action resolution", () => {
  it("routes each appointment type to its own dashboard tab", () => {
    const cases = [
      ["APPOINTMENT_SCHEDULED", "upcoming"],
      ["APPOINTMENT_ABOUT_TO_START", "upcoming"],
      ["APPOINTMENT_STARTED", "upcoming"],
      ["APPOINTMENT_RESCHEDULED", "reschedule"],
      ["APPOINTMENT_CANCELLED", "cancelled"],
      ["APPOINTMENT_COMPLETED_AWAITING_FEEDBACK", "awaiting"],
    ];
    for (const [type, focusTab] of cases) {
      const action = getNotificationAction({ type, entityId: "a1" });
      expect(action.path).toBe("/dashboard");
      expect(action.state).toEqual({ focusTab, focusId: "a1" });
    }
  });

  it("routes document requests to the documents page", () => {
    expect(getNotificationAction({ type: "DOCUMENT_REQUESTED" }).path).toBe("/documents");
    expect(getNotificationAction({ type: "DOCUMENT_REQUEST_NUDGE" }).path).toBe("/documents");
  });

  it("deep-links a shared form by id, falling back to the list without one", () => {
    expect(getNotificationAction({ type: "FORM_SHARED", entityId: "f1" }).path).toBe(
      "/forms/renderer/f1"
    );
    expect(getNotificationAction({ type: "FORM_SHARED" }).path).toBe("/documents");
  });

  it("routes every authorization alert to the dashboard overview", () => {
    for (const type of [
      "AUTHORIZATION_EXPIRY_30_DAYS",
      "AUTHORIZATION_EXPIRY_7_DAYS",
      "AUTHORIZATION_EXPIRED",
      "AUTHORIZATION_UNITS_ALMOST_EXHAUSTED",
      "AUTHORIZATION_UNITS_EXHAUSTED",
    ]) {
      expect(getNotificationAction({ type }).path).toBe("/dashboard");
    }
  });

  it("resolves no action for a signature request", () => {
    // There is no client signing surface yet, so it is informational only.
    expect(getNotificationAction({ type: "SIGNATURE_REQUESTED" })).toBeNull();
  });

  it("reads entityId from the top level, data, or metadata", () => {
    const expected = "/forms/renderer/f1";
    expect(getNotificationAction({ type: "FORM_SHARED", entityId: "f1" }).path).toBe(expected);
    expect(getNotificationAction({ type: "FORM_SHARED", data: { entityId: "f1" } }).path).toBe(expected);
    expect(getNotificationAction({ type: "FORM_SHARED", metadata: { entityId: "f1" } }).path).toBe(expected);
  });

  it("falls back by entity type for an unrecognised notification type", () => {
    expect(
      getNotificationAction({ type: "BRAND_NEW", entityType: "APPOINTMENT", entityId: "a1" }).state
    ).toEqual({ focusTab: "upcoming", focusId: "a1" });
    expect(getNotificationAction({ type: "X", entityType: "DOCUMENT_REQUEST" }).path).toBe("/documents");
    expect(getNotificationAction({ type: "X", entityType: "AUTHORIZATION" }).path).toBe("/dashboard");
    expect(getNotificationAction({ type: "X", entityType: "CLINICAL_REPORT" }).path).toBe("/dashboard");
    expect(getNotificationAction({ type: "X", entityType: "FORM", entityId: "f2" }).path).toBe(
      "/forms/renderer/f2"
    );
    expect(getNotificationAction({ type: "X", entityType: "FORM" }).path).toBe("/documents");
  });

  it("resolves nothing for an entity type outside the client's domain", () => {
    // The client app has no route for these, so no action is offered.
    for (const entityType of ["TENANT", "PLAN", "TIMESHEET", "SUBSCRIPTION"]) {
      expect(getNotificationAction({ type: "X", entityType })).toBeNull();
    }
  });

  it("resolves nothing for a notification with neither type nor entity type", () => {
    expect(getNotificationAction({})).toBeNull();
    expect(getNotificationAction(undefined)).toBeNull();
  });

  it("keeps every fallback key inside the backend enum", () => {
    // The dev-only guard exists because DOCUMENT and REPORT had drifted onto
    // names the backend never sends; assert the invariant directly.
    for (const key of ["APPOINTMENT", "DOCUMENT_REQUEST", "FORM", "AUTHORIZATION", "CLINICAL_REPORT"]) {
      expect(NOTIFICATION_ENTITY_TYPE[key]).toBe(key);
    }
    expect(NOTIFICATION_ENTITY_TYPE.DOCUMENT).toBeUndefined();
    expect(NOTIFICATION_ENTITY_TYPE.REPORT).toBeUndefined();
  });

  it("gives every ordered type a label", () => {
    for (const type of TYPE_ORDER) {
      expect(TYPE_LABEL[type]).toBeTruthy();
    }
  });

  it("exposes the preference items the settings screen renders", () => {
    expect(Array.isArray(notificationItems)).toBe(true);
    expect(notificationItems.length).toBeGreaterThan(0);
    notificationItems.forEach((i) => expect(i.key).toBeTruthy());
  });
});

describe("omitEmpty", () => {
  it("strips undefined, null, blank strings and empty arrays", () => {
    expect(
      omitEmpty({ a: undefined, b: null, c: "", d: "   ", e: [], f: "keep" })
    ).toEqual({ f: "keep" });
  });

  it("keeps falsy values that carry meaning", () => {
    expect(omitEmpty({ a: false, b: 0, c: "x" })).toEqual({ a: false, b: 0, c: "x" });
  });

  it("keeps non-empty arrays and objects, and does not recurse", () => {
    const nested = { inner: { a: "" } };
    const out = omitEmpty({ list: [1], nested });
    expect(out.list).toEqual([1]);
    expect(out.nested).toEqual(nested);
  });

  it("returns an empty object for an empty input", () => {
    expect(omitEmpty({})).toEqual({});
  });
});
