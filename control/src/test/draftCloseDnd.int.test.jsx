import React, { useState } from "react";
import ReactDOM from "react-dom";
import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { useForm } from "react-hook-form";
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import formDraftsReducer from "../ReduxStore/features/formDraftsSlice";
import useReduxFormDraft from "../hooks/useReduxFormDraft";

const store = configureStore({ reducer: { formDrafts: formDraftsReducer } });

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

// A sortable "column" that renders the modal as its React child (like Column.jsx).
const Column = () => {
  const [open, setOpen] = useState(false);
  const { setNodeRef, attributes, listeners } = useSortable({ id: "col1" });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      <button className="add-candidate" onClick={() => setOpen(true)}>Add a candidate</button>
      <Modal isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
};

const Board = () => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor)
  );
  return (
    <DndContext sensors={sensors}>
      <SortableContext items={["col1"]}>
        <Column />
      </SortableContext>
    </DndContext>
  );
};

describe("modal closes on Cancel inside a dnd-kit sortable (with draft)", () => {
  it("closes when Cancel clicked", async () => {
    const user = userEvent.setup();
    render(
      <Provider store={store}>
        <Board />
      </Provider>
    );
    await user.click(screen.getByText("Add a candidate"));
    await user.type(screen.getByLabelText("company"), "DRAFTY");
    await waitFor(
      () => expect(store.getState().formDrafts["add-prospect"]?.values?.companyName).toBe("DRAFTY"),
      { timeout: 1000 }
    );
    await user.click(screen.getByText("Cancel"));
    await waitFor(() => expect(screen.queryByLabelText("company")).toBeNull(), { timeout: 1000 });
  });
});
