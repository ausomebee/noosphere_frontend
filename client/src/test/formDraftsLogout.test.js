import { describe, it, expect } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import formResponseReducer, {
  initializeResponse,
  setResponse,
  setSignature,
  markAsSubmitted,
} from "../ReduxStore/features/formResponseSlice";
import formBuilderReducer, { loadForm } from "../ReduxStore/features/formBuilderSlice";
import authReducer, { logout } from "../ReduxStore/features/authentication";

/**
 * Form drafts carry client data, so a logout must clear them in memory.
 * Purging storage alone was not enough: redux-persist wrote the in-memory
 * slices straight back after the purge, so the next user on a shared
 * workstation could open the previous client's half-filled form.
 */

const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      formBuilder: formBuilderReducer,
      formResponse: formResponseReducer,
    },
  });

describe("logging out", () => {
  it("clears the form response draft", () => {
    const store = makeStore();
    store.dispatch(initializeResponse({ formId: "form-1", tenantId: "t1", submittedBy: "tc1" }));
    store.dispatch(setResponse({ fieldId: "f1", value: "private answer" }));
    store.dispatch(setSignature({ fieldId: "s1", signature: "data:image/png;base64,x" }));

    store.dispatch(logout());

    expect(store.getState().formResponse).toEqual(formResponseReducer(undefined, { type: "@@init" }));
  });

  it("clears a persisted 'submitted' flag too", () => {
    const store = makeStore();
    store.dispatch(initializeResponse({ formId: "form-1", tenantId: "t1", submittedBy: "tc1" }));
    store.dispatch(markAsSubmitted({ submissionId: "sub-1" }));

    store.dispatch(logout());

    expect(store.getState().formResponse.submitted).toBe(false);
    expect(store.getState().formResponse.formId).toBeNull();
  });

  it("clears the loaded form definition", () => {
    const store = makeStore();
    store.dispatch(
      loadForm({ formName: "Intake", formId: "form-1", elements: [{ id: "f1", type: "shortText" }] })
    );

    store.dispatch(logout());

    expect(store.getState().formBuilder).toEqual(formBuilderReducer(undefined, { type: "@@init" }));
  });
});
