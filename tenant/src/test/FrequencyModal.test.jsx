import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const toast = vi.hoisted(() => vi.fn());
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...args) => toast(...args),
  showApiError: vi.fn(),
}));

import FrequencyModal from "../Components/ReusableModal/DataCollectionModal/FrequencyModal";

/**
 * Frequency data collection: a spinner-style counter with plus/minus buttons and
 * a free-text note, validated by yup before it reaches the caller.
 *
 * The counter is not a plain number input. Typing is filtered to positive
 * integers on the way in, while the buttons re-read whatever the field holds and
 * coerce anything unparseable back to 1, so "empty" and "1" behave the same to
 * the plus button but differently to the schema.
 *
 * The plus/minus controls carry only an inline SVG and no accessible name, so
 * they are reached through their shared class in DOM order rather than by role.
 */

// The reset effect keys off `isOpen`, but a fresh object literal per render is
// still the kind of prop that bites elsewhere in this family of modals, so the
// fixture is a module-level constant.
const NO_INITIAL_DATA = {};

const onSave = vi.fn();
const onClose = vi.fn();

const renderModal = (props = {}) =>
  render(
    <FrequencyModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      initialData={NO_INITIAL_DATA}
      {...props}
    />
  );

const counter = () => document.body.querySelector('input[type="number"]');
const notes = () => screen.getByPlaceholderText("Enter a description...");

const stepper = (which) =>
  document.body.querySelectorAll("button.rounded-full")[
    which === "minus" ? 0 : 1
  ];

const save = () => fireEvent.click(screen.getByRole("button", { name: "Save" }));

const errorText = () =>
  document.body.querySelector("p.text-red-600")?.textContent;

beforeEach(() => {
  vi.clearAllMocks();
  onSave.mockResolvedValue(undefined);
});

describe("what the counter opens on", () => {
  it("starts at one when nothing has been recorded", () => {
    renderModal();
    expect(counter()).toHaveValue(1);
    expect(notes()).toHaveValue("");
  });

  it("opens on the values a previous recording left behind", () => {
    renderModal({ initialData: { numberOfOccurrence: 7, notes: "Hit twice" } });
    expect(counter()).toHaveValue(7);
    expect(notes()).toHaveValue("Hit twice");
  });

  it("treats a recorded zero as no recording at all", () => {
    // `|| 1`, not `?? 1` -- a stored 0 falls back to the opening value.
    renderModal({ initialData: { numberOfOccurrence: 0, notes: "" } });
    expect(counter()).toHaveValue(1);
  });

  it("starts over each time it is reopened", () => {
    const { rerender } = renderModal({ initialData: { numberOfOccurrence: 3 } });
    fireEvent.change(counter(), { target: { value: "9" } });
    expect(counter()).toHaveValue(9);

    rerender(
      <FrequencyModal
        isOpen={false}
        onClose={onClose}
        onSave={onSave}
        initialData={{ numberOfOccurrence: 3 }}
      />
    );
    rerender(
      <FrequencyModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        initialData={{ numberOfOccurrence: 3 }}
      />
    );
    expect(counter()).toHaveValue(3);
  });

  it("renders nothing while it is closed", () => {
    const { container } = render(
      <FrequencyModal
        isOpen={false}
        onClose={onClose}
        onSave={onSave}
        initialData={NO_INITIAL_DATA}
      />
    );
    expect(container).toBeEmptyDOMElement();
    expect(counter()).toBeNull();
  });
});

describe("the plus and minus buttons", () => {
  it("counts up", () => {
    renderModal();
    fireEvent.click(stepper("plus"));
    fireEvent.click(stepper("plus"));
    expect(counter()).toHaveValue(3);
  });

  it("counts down", () => {
    renderModal({ initialData: { numberOfOccurrence: 4 } });
    fireEvent.click(stepper("minus"));
    expect(counter()).toHaveValue(3);
  });

  it("will not count below one", () => {
    renderModal();
    fireEvent.click(stepper("minus"));
    expect(counter()).toHaveValue(1);
  });

  it("treats an emptied field as one when counting up", () => {
    renderModal({ initialData: { numberOfOccurrence: 5 } });
    fireEvent.change(counter(), { target: { value: "" } });
    fireEvent.click(stepper("plus"));
    expect(counter()).toHaveValue(2);
  });

  it("leaves an emptied field alone when counting down", () => {
    // An empty field reads as 1, and 1 is already the floor, so minus has
    // nothing to write back and the field stays empty.
    renderModal({ initialData: { numberOfOccurrence: 5 } });
    fireEvent.change(counter(), { target: { value: "" } });
    fireEvent.click(stepper("minus"));
    expect(counter()).toHaveValue(null);
  });
});

describe("typing into the counter", () => {
  it("accepts a positive whole number", () => {
    renderModal();
    fireEvent.change(counter(), { target: { value: "12" } });
    expect(counter()).toHaveValue(12);
  });

  it("allows the field to be emptied while it is being retyped", () => {
    renderModal({ initialData: { numberOfOccurrence: 5 } });
    fireEvent.change(counter(), { target: { value: "" } });
    expect(counter()).toHaveValue(null);
  });

  it("does not record a leading zero, and saves the value it last accepted", () => {
    // The box is uncontrolled, so a rejected keystroke stays visible; what the
    // filter actually protects is the value the form holds.
    renderModal({ initialData: { numberOfOccurrence: 5 } });
    fireEvent.change(counter(), { target: { value: "05" } });
    fireEvent.click(stepper("plus"));
    expect(counter()).toHaveValue(6);
  });

  it("leaves a decimal for the number input's own step constraint to refuse", () => {
    renderModal({ initialData: { numberOfOccurrence: 5 } });
    fireEvent.change(counter(), { target: { value: "1.5" } });
    save();
    expect(counter().checkValidity()).toBe(false);
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("saving", () => {
  it("hands the count and the note to the caller", async () => {
    renderModal();
    fireEvent.change(counter(), { target: { value: "3" } });
    fireEvent.change(notes(), { target: { value: "Three hits" } });
    save();
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ numberOfOccurrence: 3, notes: "Three hits" })
      )
    );
  });

  it("refuses to save an emptied counter", async () => {
    renderModal();
    fireEvent.change(counter(), { target: { value: "" } });
    save();
    await waitFor(() =>
      expect(errorText()).toBe("Number of occurrence must be a number")
    );
    expect(toast).toHaveBeenCalledWith(
      "Number of occurrence must be a number",
      "error"
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it("reports a save the caller rejected", async () => {
    onSave.mockRejectedValue(new Error("offline"));
    renderModal();
    save();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Failed to save frequency data", "error")
    );
  });

  it("closes without saving", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("holds the save button while a submit is already in flight", () => {
    renderModal({ submitting: true });
    // The label is swapped for a spinner while loading, so there is no
    // accessible name left to query by.
    expect(document.body.querySelector('button[type="submit"]')).toBeDisabled();
  });
});
