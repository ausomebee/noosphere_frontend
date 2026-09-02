import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

/**
 * The program library's program modal: a required name and an optional
 * description behind a yup schema, doubling as an add and an edit dialog.
 *
 * The reset effect keys off `isOpen`, `initialData` and `mode` together and has
 * both arms wired -- opening loads the record, closing blanks the form -- which
 * is why the reopen tests re-render with the flag flipped rather than
 * unmounting. Cancel and the header close both go through the same handler,
 * which blanks the form before it tells the caller.
 *
 * `initialData` is an effect dependency, so every render passes one frozen
 * module-level object; a fresh literal per render would loop.
 *
 * One trap runs through the whole file: the object handed to `onSubmit` is
 * react-hook-form's live values object, and the modal resets the form the
 * instant the caller's promise settles -- which blanks that same object in
 * place. Reading `onSubmit.mock.calls` afterwards therefore shows empty
 * strings, so every payload assertion works off a snapshot taken inside the
 * mock instead.
 */

const toast = vi.hoisted(() => vi.fn());
vi.mock("../Helper/ShowToast", () => ({ showToast: toast, showApiError: vi.fn() }));

import AddProgramModal from "../Components/ReusableModal/ProgramLibraryModal/AddProgramModal";

const STORED_PROGRAM = Object.freeze({
  programName: "Manding",
  programDescription: "Requesting preferred items",
});

const renderModal = (props = {}) => {
  // `payloads` holds a snapshot taken while the handler is still running, which
  // is the only way to see what was actually submitted -- see the docblock.
  const payloads = [];
  const onSubmit = vi.fn(async (data) => {
    payloads.push({ ...data });
  });
  const onClose = vi.fn();
  const view = render(
    <AddProgramModal isOpen onClose={onClose} onSubmit={onSubmit} {...props} />
  );
  return { ...view, onSubmit, onClose, payloads };
};

const nameInput = () => screen.getByPlaceholderText("Enter program name");
const descriptionInput = () => screen.getByPlaceholderText("Enter program description");
const title = () => document.body.querySelector(".modal-title-text").textContent;
const primary = () => document.body.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.body.querySelector(".modal-btn-secondary");
const submit = async () => {
  await act(async () => {
    fireEvent.click(primary());
  });
};

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

  it("titles itself for a new program", () => {
    renderModal();
    expect(title()).toBe("Add a New Program");
    expect(primary()).toHaveTextContent("Save");
    expect(secondary()).toHaveTextContent("Cancel");
    expect(nameInput()).toHaveValue("");
    expect(descriptionInput()).toHaveValue("");
  });

  it("titles itself for an edit", () => {
    renderModal({ mode: "edit", initialData: STORED_PROGRAM });
    expect(title()).toBe("Edit Program");
  });
});

describe("opening on a stored program", () => {
  it("loads both fields from the record", () => {
    renderModal({ mode: "edit", initialData: STORED_PROGRAM });
    expect(nameInput()).toHaveValue("Manding");
    expect(descriptionInput()).toHaveValue("Requesting preferred items");
  });

  it("blanks a description the record left unset", () => {
    const NAME_ONLY = Object.freeze({ programName: "Manding" });
    renderModal({ mode: "edit", initialData: NAME_ONLY });
    expect(nameInput()).toHaveValue("Manding");
    expect(descriptionInput()).toHaveValue("");
  });

  it("blanks a name the record left unset", () => {
    const DESCRIPTION_ONLY = Object.freeze({ programDescription: "No name on file" });
    renderModal({ mode: "edit", initialData: DESCRIPTION_ONLY });
    expect(nameInput()).toHaveValue("");
    expect(descriptionInput()).toHaveValue("No name on file");
  });

  // Unlike the domain modal, the record is loaded regardless of mode.
  it("loads a record handed to the add mode too", () => {
    renderModal({ initialData: STORED_PROGRAM });
    expect(nameInput()).toHaveValue("Manding");
  });
});

describe("dismissing", () => {
  it("blanks the form and tells the caller on Cancel", () => {
    const { onClose } = renderModal({ mode: "edit", initialData: STORED_PROGRAM });
    fireEvent.change(nameInput(), { target: { value: "Typed then abandoned" } });
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalledTimes(1);
    // The close handler blanks rather than restoring: nothing re-runs the reset
    // effect, so a cancelled edit leaves an empty form behind, not the record.
    expect(nameInput()).toHaveValue("");
  });

  it("blanks the form on Escape", () => {
    const { onClose } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Typed then abandoned" } });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(nameInput()).toHaveValue("");
  });

  // The closed arm of the reset effect: a modal that is genuinely closed and
  // reopened comes back blank rather than holding the abandoned text.
  it("comes back blank after being closed and reopened", async () => {
    const { rerender, onClose, onSubmit } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Typed then abandoned" } });

    rerender(
      <AddProgramModal isOpen={false} onClose={onClose} onSubmit={onSubmit} />
    );
    expect(document.body.querySelector(".modal-content")).toBeNull();

    rerender(<AddProgramModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    await waitFor(() => expect(nameInput()).toHaveValue(""));
  });
});

describe("saving", () => {
  it("refuses a program with no name and toasts the schema message", async () => {
    const { onSubmit } = renderModal();
    await submit();
    expect(await screen.findByText("Program Name is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith("Program Name is required", "error");
  });

  it("saves a name on its own", async () => {
    const { onSubmit, payloads } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Manding" } });
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(payloads[0]).toEqual({
      programName: "Manding",
      programDescription: "",
    });
  });

  it("saves the description alongside the name", async () => {
    const { onSubmit, payloads } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Manding" } });
    fireEvent.change(descriptionInput(), {
      target: { value: "Requesting preferred items" },
    });
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(payloads[0]).toEqual({
      programName: "Manding",
      programDescription: "Requesting preferred items",
    });
  });

  // Current behaviour, not intended behaviour: the caller is handed the form's
  // live values object rather than a copy, so the reset that follows a
  // successful save blanks it under any caller that kept a reference.
  it("blanks the submitted object once the reset runs", async () => {
    const { onSubmit, payloads } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Manding" } });
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(payloads[0].programName).toBe("Manding");
    expect(onSubmit.mock.calls[0][0].programName).toBe("");
  });

  it("blanks the form once the save lands", async () => {
    const { onSubmit, onClose } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Manding" } });
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    await waitFor(() => expect(nameInput()).toHaveValue(""));
    // Dismissing is the caller's job; the modal only clears itself.
    expect(onClose).not.toHaveBeenCalled();
  });

  it("locks the footer while the save is in flight", async () => {
    let release;
    const { onSubmit } = renderModal();
    onSubmit.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    fireEvent.change(nameInput(), { target: { value: "Manding" } });
    await submit();
    await waitFor(() => expect(primary()).toBeDisabled());
    await act(async () => {
      release();
    });
    await waitFor(() => expect(primary()).not.toBeDisabled());
  });

  // The reset only runs on the success side of the try, so a rejected save
  // keeps the typed values for a retry.
  it("keeps the typed name when the caller rejects the save", async () => {
    const { onSubmit } = renderModal();
    onSubmit.mockRejectedValue(new Error("duplicate program"));
    fireEvent.change(nameInput(), { target: { value: "Manding" } });
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(nameInput()).toHaveValue("Manding");
    await waitFor(() => expect(primary()).not.toBeDisabled());
  });
});
