import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

/**
 * The billing screen's insurance type modal: a name and a description over one
 * small schema, serving three modes — add, edit and a read-only view — that
 * between them decide the title, the wording of the footer buttons, whether
 * there is a Cancel at all, and whether the fields are disabled.
 *
 * The one trap is `initialData`: its default is a fresh `{}` and it sits in the
 * dependency list of the effect that resets the form, so omitting it spins the
 * component forever. Every render below passes one frozen module-level object.
 *
 * Worth knowing while reading the view-mode tests: the primary button is
 * relabelled "Close" but still wired to the submit handler, so pressing it in
 * view mode saves the record rather than dismissing the modal.
 */

const toast = vi.hoisted(() => vi.fn());
vi.mock("../Helper/ShowToast", () => ({ showToast: toast, showApiError: vi.fn() }));

import AddInsuranceTypeModal from "../Components/ReusableModal/BillingAndPaymentModal/AddInsuranceTypeModal";

// `initialData` is an effect dependency; a fresh literal would loop forever.
const NOTHING_STORED = Object.freeze({});
const STORED_TYPE = Object.freeze({
  id: "ins-1",
  name: "Medicaid",
  description: "State-funded coverage",
});

const renderModal = ({ initialData = NOTHING_STORED, ...props } = {}) => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const view = render(
    <AddInsuranceTypeModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      initialData={initialData}
      {...props}
    />
  );
  return { ...view, onSave, onClose };
};

const nameInput = () => screen.getByPlaceholderText("Enter Insurance Type Name");
const descriptionInput = () =>
  screen.getByPlaceholderText("Enter Insurance Type Description");
const title = () => document.body.querySelector(".modal-title-text").textContent;
const primary = () => document.body.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.body.querySelector(".modal-btn-secondary");
const submit = async () => act(async () => { fireEvent.click(primary()); });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the modal shell", () => {
  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(document.body.querySelector(".modal-content")).toBeNull();
  });

  it("titles itself for a new insurance type", () => {
    renderModal();
    expect(title()).toBe("Add an Insurance Type");
    expect(primary()).toHaveTextContent("Save");
    expect(secondary()).toHaveTextContent("Cancel");
    expect(nameInput()).toHaveValue("");
    expect(descriptionInput()).toHaveValue("");
  });

  it("titles itself for an edit", () => {
    renderModal({ mode: "edit", initialData: STORED_TYPE });
    expect(title()).toBe("Edit Insurance Type");
    expect(primary()).toHaveTextContent("Save");
  });

  it("titles itself for a view", () => {
    renderModal({ mode: "view", initialData: STORED_TYPE });
    expect(title()).toBe("View Insurance Type");
    expect(primary()).toHaveTextContent("Close");
  });

  it("locks the primary button while the caller is saving", () => {
    renderModal({ isLoading: true });
    expect(primary()).toBeDisabled();
  });
});

describe("opening on a stored record", () => {
  it("loads the record into both fields", () => {
    renderModal({ mode: "edit", initialData: STORED_TYPE });
    expect(nameInput()).toHaveValue("Medicaid");
    expect(descriptionInput()).toHaveValue("State-funded coverage");
  });

  it("blanks a field the record left unset", () => {
    const NAME_ONLY = Object.freeze({ name: "Medicaid" });
    renderModal({ mode: "edit", initialData: NAME_ONLY });
    expect(nameInput()).toHaveValue("Medicaid");
    expect(descriptionInput()).toHaveValue("");
  });

  it("restores the record when an edit is cancelled", () => {
    const { onClose } = renderModal({ mode: "edit", initialData: STORED_TYPE });
    fireEvent.change(nameInput(), { target: { value: "Typed then abandoned" } });
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(nameInput()).toHaveValue("Medicaid");
  });

  it("blanks the form when a new record is cancelled", () => {
    const { onClose } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Typed then abandoned" } });
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(nameInput()).toHaveValue("");
  });

  it("restores the record when the modal is closed with Escape", () => {
    const { onClose } = renderModal({ mode: "edit", initialData: STORED_TYPE });
    fireEvent.change(nameInput(), { target: { value: "Typed then abandoned" } });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(nameInput()).toHaveValue("Medicaid");
  });
});

describe("view mode", () => {
  it("locks both fields and offers no Cancel", () => {
    renderModal({ mode: "view", initialData: STORED_TYPE });
    expect(nameInput()).toBeDisabled();
    expect(descriptionInput()).toBeDisabled();
    expect(secondary()).toBeNull();
  });

  // The "Close" button is still the form's submit button, so it saves the
  // record it was only meant to be showing.
  it("saves the record from the button labelled Close", async () => {
    const { onSave, onClose } = renderModal({ mode: "view", initialData: STORED_TYPE });
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toEqual({
      name: "Medicaid",
      description: "State-funded coverage",
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("still dismisses on Escape", () => {
    const { onClose } = renderModal({ mode: "view", initialData: STORED_TYPE });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("saving", () => {
  it("refuses an insurance type with no name", async () => {
    const { onSave } = renderModal();
    await submit();
    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith("Name is required", "error");
  });

  it("saves a name on its own", async () => {
    const { onSave } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Medicaid" } });
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toEqual({ name: "Medicaid", description: "" });
  });

  it("saves the description alongside the name", async () => {
    const { onSave } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Medicaid" } });
    fireEvent.change(descriptionInput(), {
      target: { value: "State-funded coverage" },
    });
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toEqual({
      name: "Medicaid",
      description: "State-funded coverage",
    });
  });

  // Closing and dismissing are the caller's job, so a save that lands leaves
  // the typed values in place.
  it("keeps the form as it is once the save lands", async () => {
    const { onSave, onClose } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Medicaid" } });
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(nameInput()).toHaveValue("Medicaid");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("reports a refused save", async () => {
    const { onSave } = renderModal();
    onSave.mockRejectedValue(new Error("409"));
    fireEvent.change(nameInput(), { target: { value: "Medicaid" } });
    await submit();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Failed to save insurance type", "error")
    );
    expect(nameInput()).toHaveValue("Medicaid");
  });

  it("locks the Save button while the request is in flight", async () => {
    let release;
    const { onSave } = renderModal();
    onSave.mockReturnValue(new Promise((r) => { release = r; }));
    fireEvent.change(nameInput(), { target: { value: "Medicaid" } });
    await submit();
    await waitFor(() => expect(primary()).toBeDisabled());
    await act(async () => { release(); });
    await waitFor(() => expect(primary()).not.toBeDisabled());
  });
});
