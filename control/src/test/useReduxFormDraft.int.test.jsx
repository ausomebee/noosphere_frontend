import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { useForm } from "react-hook-form";
import formDraftsReducer from "../ReduxStore/features/formDraftsSlice";
import useReduxFormDraft from "../hooks/useReduxFormDraft";

const makeStore = () =>
  configureStore({ reducer: { formDrafts: formDraftsReducer } });

const Form = ({ isOpen }) => {
  // Nested object (like AddProspect's `location`) — redux freezes it, so restore
  // must deep-clone or RHF throws "Cannot assign to read only property".
  const { register, reset, watch } = useForm({
    defaultValues: { companyName: "", location: { city: "" } },
  });
  useReduxFormDraft("test", { watch, reset, isOpen });
  if (!isOpen) return null;
  return (
    <>
      <input aria-label="company" {...register("companyName")} />
      <input aria-label="city" {...register("location.city")} />
      {/* mirrors AddProspect Cancel: reset(defaultValues) then close */}
      <button aria-label="cancel" onClick={() => reset({ companyName: "", location: { city: "" } })}>
        Cancel
      </button>
    </>
  );
};

describe("useReduxFormDraft integration", () => {
  let store;
  beforeEach(() => {
    store = makeStore();
  });

  it("persists user typing to the formDrafts slice", async () => {
    const user = userEvent.setup();
    render(
      <Provider store={store}>
        <Form isOpen={true} />
      </Provider>
    );
    await user.type(screen.getByLabelText("company"), "Acme");
    await waitFor(
      () => expect(store.getState().formDrafts.test?.values?.companyName).toBe("Acme"),
      { timeout: 1000 }
    );
  });

  it("keeps the draft when the form resets (Cancel) and restores on reopen", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Provider store={store}>
        <Form isOpen={true} />
      </Provider>
    );
    await user.type(screen.getByLabelText("company"), "Acme");
    await user.type(screen.getByLabelText("city"), "Lagos");
    await waitFor(
      () => expect(store.getState().formDrafts.test?.values?.location?.city).toBe("Lagos"),
      { timeout: 1000 }
    );

    // Simulate Cancel exactly like AddProspect: reset(defaultValues), then close.
    await user.click(screen.getByLabelText("cancel"));
    // give any debounced persist a chance to (wrongly) fire
    await new Promise((r) => setTimeout(r, 400));
    // Draft must survive the reset(defaultValues) on Cancel
    expect(store.getState().formDrafts.test?.values?.companyName).toBe("Acme");

    rerender(
      <Provider store={store}>
        <Form isOpen={false} />
      </Provider>
    );
    expect(store.getState().formDrafts.test?.values?.companyName).toBe("Acme");

    // Reopen
    rerender(
      <Provider store={store}>
        <Form isOpen={true} />
      </Provider>
    );
    await waitFor(
      () => expect(screen.getByLabelText("company").value).toBe("Acme"),
      { timeout: 1000 }
    );
  });
});
