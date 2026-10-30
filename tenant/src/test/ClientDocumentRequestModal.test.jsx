import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

/**
 * The client panel's "new document request" modal: a required document name, an
 * optional description, a multiple-files checkbox and an optional due date,
 * assembled into a request that also carries a fixed status and a creation
 * stamp.
 *
 * It is plain `useState` rather than react-hook-form, and the guard clause is
 * the only validation -- a name of nothing but spaces is refused, and the name
 * that does go through is trimmed. The two optional text fields collapse to
 * `null` rather than an empty string, so both arms of each fallback matter.
 *
 * The save is deliberately ordered: the fields are only cleared and the modal
 * only closed once the caller's promise resolves, so a rejected save leaves
 * everything typed in place. The clock is frozen so the `createdAt` stamp can
 * be asserted exactly.
 */

const toast = vi.hoisted(() => ({ showToast: vi.fn(), showApiError: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...args) => toast.showToast(...args),
  showApiError: (...args) => toast.showApiError(...args),
}));

import NewDocumentRequestModal from "../Components/ReusableModal/ClientModal/ClientDocumentRequestModal";

const renderModal = (props = {}) => {
  const onClose = vi.fn();
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const view = render(
    <NewDocumentRequestModal isOpen onClose={onClose} onSubmit={onSubmit} {...props} />
  );
  return { ...view, onClose, onSubmit };
};

const nameInput = () => screen.getByPlaceholderText("Type something");
const descriptionInput = () => screen.getByPlaceholderText("Enter a description...");
const multipleBox = () => document.body.querySelector("#allow-multiple");
const dueDateInput = () => document.body.querySelector("input[type='date']");
const primary = () => document.body.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.body.querySelector(".modal-btn-secondary");

const save = async () => {
  await act(async () => {
    fireEvent.click(primary());
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date("2026-03-12T09:00:00.000Z"));
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  // The failure path logs the raw error; keep the run readable.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the form", () => {
  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(document.body.querySelector(".modal-content")).toBeNull();
  });

  it("opens blank with the checkbox clear", () => {
    renderModal();
    expect(document.body.querySelector(".modal-title-text")).toHaveTextContent(
      "New document request"
    );
    expect(nameInput()).toHaveValue("");
    expect(descriptionInput()).toHaveValue("");
    expect(multipleBox()).not.toBeChecked();
    expect(dueDateInput()).toHaveValue("");
  });

  it("locks the Save button while the caller reports a save in flight", () => {
    renderModal({ loading: true });
    expect(primary()).toBeDisabled();
  });

  it("ticks the multiple-files box", () => {
    renderModal();
    fireEvent.click(multipleBox());
    expect(multipleBox()).toBeChecked();
  });
});

describe("the name guard", () => {
  it("refuses a request with no name", async () => {
    const { onSubmit } = renderModal();
    await save();
    expect(toast.showToast).toHaveBeenCalledWith("Name of document is required", "error");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("refuses a name that is only whitespace", async () => {
    const { onSubmit } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "   " } });
    await save();
    expect(toast.showToast).toHaveBeenCalledWith("Name of document is required", "error");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("saving a request", () => {
  it("sends a name-only request with the optional fields nulled", async () => {
    const { onSubmit } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "  Insurance card  " } });
    await save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: "Insurance card",
      description: null,
      allowMultipleFiles: false,
      dueDate: null,
      status: "Pending upload",
      createdAt: "2026-03-12T09:00:00.000Z",
    });
  });

  it("sends every optional field once they are filled in", async () => {
    const { onSubmit } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Insurance card" } });
    fireEvent.change(descriptionInput(), { target: { value: "  Front and back  " } });
    fireEvent.click(multipleBox());
    fireEvent.change(dueDateInput(), { target: { value: "2026-04-01" } });
    await save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: "Insurance card",
      description: "Front and back",
      allowMultipleFiles: true,
      dueDate: "2026-04-01",
    });
  });

  // A description of nothing but spaces collapses to null, same as an absent
  // one, rather than being stored as an empty string.
  it("nulls a description that is only whitespace", async () => {
    const { onSubmit } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Insurance card" } });
    fireEvent.change(descriptionInput(), { target: { value: "   " } });
    await save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].description).toBeNull();
  });

  it("blanks the form and closes once the save lands", async () => {
    const { onSubmit, onClose } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Insurance card" } });
    fireEvent.change(descriptionInput(), { target: { value: "Front and back" } });
    fireEvent.click(multipleBox());
    fireEvent.change(dueDateInput(), { target: { value: "2026-04-01" } });
    await save();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(nameInput()).toHaveValue("");
    expect(descriptionInput()).toHaveValue("");
    expect(multipleBox()).not.toBeChecked();
    expect(dueDateInput()).toHaveValue("");
  });
});

describe("a save that fails", () => {
  it("keeps everything typed and leaves the modal open", async () => {
    const { onSubmit, onClose } = renderModal();
    const failure = new Error("500");
    onSubmit.mockRejectedValue(failure);
    fireEvent.change(nameInput(), { target: { value: "Insurance card" } });
    fireEvent.change(descriptionInput(), { target: { value: "Front and back" } });
    await save();
    await waitFor(() => expect(toast.showApiError).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
    expect(nameInput()).toHaveValue("Insurance card");
    expect(descriptionInput()).toHaveValue("Front and back");
  });

  it("reports the failure under the document-request context", async () => {
    const { onSubmit } = renderModal();
    const failure = new Error("500");
    onSubmit.mockRejectedValue(failure);
    fireEvent.change(nameInput(), { target: { value: "Insurance card" } });
    await save();
    await waitFor(() =>
      expect(toast.showApiError).toHaveBeenCalledWith(failure, "DOCUMENT_REQUEST")
    );
  });
});

describe("backing out", () => {
  it("blanks the form and closes from Cancel", () => {
    const { onClose, onSubmit } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Typed then abandoned" } });
    fireEvent.click(multipleBox());
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(nameInput()).toHaveValue("");
    expect(multipleBox()).not.toBeChecked();
  });

  it("blanks the form and closes from Escape", () => {
    const { onClose } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Typed then abandoned" } });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(nameInput()).toHaveValue("");
  });
});
