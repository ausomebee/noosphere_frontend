import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

import AddDiagnosisCode from "../Components/ReusableModal/OrganizationModal/AddDiagnosisCode";

/**
 * The organisation's diagnosis-code editor: a code, a description and an active
 * switch, over a two-field yup schema.
 *
 * Two things are worth knowing. The stored record names its code field `code`
 * while the form calls it `diagnosisCode`, so the reset effect renames it on
 * the way in and the payload goes back out under the form's name -- the caller,
 * not the modal, has to map it back. And a failed save is reported inline at
 * the top of the body rather than as a toast, and that banner is cleared at the
 * start of the next attempt.
 *
 * `initialData` is in the reset effect's dependency list and its own default is
 * a fresh `{}`, so a render that omits it never settles; every render below
 * passes one stable object.
 */

const validation = vi.hoisted(() => ({ showValidationErrors: vi.fn() }));
vi.mock("../Helper/formErrors", () => ({
  showValidationErrors: (...a) => validation.showValidationErrors(...a),
}));

// See the docblock: a fresh literal here loops the reset effect forever.
const NOTHING_STORED = {};

const renderModal = ({ initialData = NOTHING_STORED, ...props } = {}) => {
  const saved = [];
  // react-hook-form hands the submit handler its live values object and the
  // handler resets straight afterwards, blanking it, so it is snapshotted here.
  const onSave = vi.fn(async (data) => {
    saved.push({ ...data });
  });
  const onClose = vi.fn();
  const view = render(
    <AddDiagnosisCode
      isOpen
      onClose={onClose}
      onSave={onSave}
      initialData={initialData}
      {...props}
    />
  );
  return { ...view, onSave, onClose, saved };
};

const codeInput = () => screen.getByPlaceholderText("Enter code");
const descriptionInput = () => screen.getByPlaceholderText("Enter description");
const primary = () => document.body.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.body.querySelector(".modal-btn-secondary");
const title = () => document.body.querySelector(".modal-title-text");
const statusLabel = () => document.body.querySelector(".input-switch-label");
const statusSwitch = () => document.body.querySelector(".switch input");

const submit = async () =>
  act(async () => {
    fireEvent.click(primary());
  });

const fillMinimum = () => {
  fireEvent.change(codeInput(), { target: { value: "F84.0" } });
  fireEvent.change(descriptionInput(), { target: { value: "Autistic disorder" } });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the modal shell", () => {
  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(document.body.querySelector(".modal-content")).toBeNull();
  });

  it("titles itself for a new diagnosis code", () => {
    renderModal();
    expect(title()).toHaveTextContent("Add Diagnosis Code");
    expect(primary()).toHaveTextContent("Save");
    expect(secondary()).toHaveTextContent("Cancel");
  });

  it("titles itself for an edit", () => {
    renderModal({ mode: "edit", initialData: { code: "F84.0" } });
    expect(title()).toHaveTextContent("Edit Diagnosis Code");
    expect(primary()).toHaveTextContent("Save Changes");
  });

  it("opens blank and active", () => {
    renderModal();
    expect(codeInput()).toHaveValue("");
    expect(descriptionInput()).toHaveValue("");
    expect(statusLabel()).toHaveTextContent("Active");
    expect(document.body.querySelector(".text-red-500.font-medium")).toBeNull();
  });

  it("clears the form and closes from Cancel", () => {
    const { onClose } = renderModal();
    fireEvent.change(codeInput(), { target: { value: "typed then abandoned" } });
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(codeInput()).toHaveValue("");
  });

  it("clears the form and closes from Escape", () => {
    const { onClose } = renderModal();
    fireEvent.change(codeInput(), { target: { value: "typed then abandoned" } });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    expect(codeInput()).toHaveValue("");
  });
});

describe("pre-filling from a stored code", () => {
  it("renames the stored `code` onto the form's own field", () => {
    renderModal({
      mode: "edit",
      initialData: { code: "F84.0", description: "Autistic disorder", status: true },
    });
    expect(codeInput()).toHaveValue("F84.0");
    expect(descriptionInput()).toHaveValue("Autistic disorder");
    expect(statusLabel()).toHaveTextContent("Active");
  });

  it("opens an archived code switched off", () => {
    renderModal({
      mode: "edit",
      initialData: { code: "F84.0", description: "Autistic disorder", status: false },
    });
    expect(statusLabel()).toHaveTextContent("Inactive");
  });

  // A record saved before the status column existed has no flag at all, and
  // that has to read as active rather than as archived.
  it("treats a record with no status flag as active", () => {
    renderModal({ mode: "edit", initialData: { code: "F84.0" } });
    expect(statusLabel()).toHaveTextContent("Active");
    expect(descriptionInput()).toHaveValue("");
  });

  it("re-fills when a different code is handed in", () => {
    const { rerender, onClose, onSave } = renderModal({
      mode: "edit",
      initialData: { code: "F84.0" },
    });
    rerender(
      <AddDiagnosisCode
        isOpen
        mode="edit"
        onClose={onClose}
        onSave={onSave}
        initialData={{ code: "F90.0", description: "ADHD" }}
      />
    );
    expect(codeInput()).toHaveValue("F90.0");
    expect(descriptionInput()).toHaveValue("ADHD");
  });
});

describe("validation", () => {
  it("refuses a diagnosis code with nothing filled in", async () => {
    const { onSave } = renderModal();
    await submit();
    expect(await screen.findByText("Diagnosis Code is required")).toBeInTheDocument();
    expect(screen.getByText("Diagnosis Description is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    expect(validation.showValidationErrors).toHaveBeenCalled();
  });

  it("refuses a diagnosis code with no description", async () => {
    const { onSave } = renderModal();
    fireEvent.change(codeInput(), { target: { value: "F84.0" } });
    await submit();
    expect(await screen.findByText("Diagnosis Description is required")).toBeInTheDocument();
    expect(screen.queryByText("Diagnosis Code is required")).toBeNull();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("saving", () => {
  it("sends the code under the form's field name and closes", async () => {
    const { onSave, onClose, saved } = renderModal();
    fillMinimum();
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(saved[0]).toEqual({
      diagnosisCode: "F84.0",
      description: "Autistic disorder",
      status: true,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("sends the switched-off status", async () => {
    const { onSave, saved } = renderModal();
    fillMinimum();
    fireEvent.click(statusSwitch());
    expect(statusLabel()).toHaveTextContent("Inactive");
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(saved[0].status).toBe(false);
  });

  it("clears the form once the save lands", async () => {
    renderModal();
    fillMinimum();
    await submit();
    await waitFor(() => expect(codeInput()).toHaveValue(""));
    expect(descriptionInput()).toHaveValue("");
  });

  it("banners a refused save and leaves the modal open", async () => {
    const { onSave, onClose } = renderModal();
    onSave.mockRejectedValue(new Error("Code already on file"));
    fillMinimum();
    await submit();
    expect(await screen.findByText("Failed to save diagnosis code.")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(codeInput()).toHaveValue("F84.0");
  });

  it("drops the banner when the next attempt succeeds", async () => {
    const { onSave, saved } = renderModal();
    onSave.mockRejectedValueOnce(new Error("Code already on file"));
    fillMinimum();
    await submit();
    expect(await screen.findByText("Failed to save diagnosis code.")).toBeInTheDocument();
    onSave.mockImplementation(async (data) => {
      saved.push({ ...data });
    });
    fireEvent.change(codeInput(), { target: { value: "F90.0" } });
    await submit();
    await waitFor(() =>
      expect(screen.queryByText("Failed to save diagnosis code.")).toBeNull()
    );
    expect(saved[0].diagnosisCode).toBe("F90.0");
  });

  it("disables the submit while the save is in flight", async () => {
    let release;
    const { onSave } = renderModal();
    onSave.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    fillMinimum();
    fireEvent.click(primary());
    await waitFor(() => expect(primary()).toBeDisabled());
    await act(async () => {
      release();
    });
    await waitFor(() => expect(primary()).toBeEnabled());
  });
});
