import React, { useState } from "react";
import ReactDOM from "react-dom";
import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { useForm } from "react-hook-form";
import formDraftsReducer from "../ReduxStore/features/formDraftsSlice";
import useReduxFormDraft from "../hooks/useReduxFormDraft";

const store = configureStore({ reducer: { formDrafts: formDraftsReducer } });

// Mirror the real structure: memo'd modal, portaled to body, uses the draft hook,
// returns null when closed. Cancel = onClose only (no reset).
const Modal = React.memo(({ isOpen, onClose }) => {
  const { register, reset, watch } = useForm({ defaultValues: { companyName: "" } });
  useReduxFormDraft("add-prospect", { watch, reset, isOpen });
  if (!isOpen) return null;
  return ReactDOM.createPortal(
    <div className="modal-overlay">
      <input aria-label="company" {...register("companyName")} />
      <button onClick={onClose}>Cancel</button>
    </div>,
    document.body
  );
});

const Parent = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Modal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
};

describe("modal closes on Cancel with a draft present", () => {
  it("closes the portaled modal when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Provider store={store}>
        <Parent />
      </Provider>
    );
    await user.click(screen.getByText("Open"));
    const input = screen.getByLabelText("company");
    await user.type(input, "DRAFTY");
    // let the draft persist (debounce)
    await waitFor(
      () => expect(store.getState().formDrafts["add-prospect"]?.values?.companyName).toBe("DRAFTY"),
      { timeout: 1000 }
    );
    // Cancel
    await user.click(screen.getByText("Cancel"));
    // Modal must be gone
    await waitFor(() => expect(screen.queryByLabelText("company")).toBeNull(), { timeout: 1000 });
    // Draft kept
    expect(store.getState().formDrafts["add-prospect"]?.values?.companyName).toBe("DRAFTY");
  });
});
