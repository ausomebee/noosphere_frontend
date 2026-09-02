import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

import AddLicensesModal from "../Components/ReusableModal/OrganizationModal/AddLicensesModal";

/**
 * The organisation's professional-licence editor: four required fields, a US
 * state picker, and an expiry date that has to survive two shape changes -- the
 * stored record may name it `expiryDate` or `expirationDate` and may hold a
 * full timestamp, while the form field and the saved payload both want a plain
 * YYYY-MM-DD.
 *
 * Edit mode is decided by the presence of an id on `initialValues`, not by a
 * mode prop, so a record without one opens titled "Add" while still
 * pre-filling. The reset effect only runs when `initialValues` is truthy, which
 * is why the add-mode renders below omit it entirely rather than passing `{}`.
 *
 * `handleSave` re-throws whatever the caller rejects with; ReusableModal
 * swallows that on the way out, so a failed save is observed through the modal
 * staying open with its values intact rather than through a toast.
 */

const validation = vi.hoisted(() => ({ showValidationErrors: vi.fn() }));
vi.mock("../Helper/formErrors", () => ({
  showValidationErrors: (...a) => validation.showValidationErrors(...a),
}));

const renderModal = (props = {}) => {
  const saved = [];
  const onSave = vi.fn(async (payload) => {
    saved.push({ ...payload });
  });
  const onClose = vi.fn();
  const view = render(
    <AddLicensesModal isOpen onClose={onClose} onSave={onSave} {...props} />
  );
  return { ...view, onSave, onClose, saved };
};

const nameInput = () => screen.getByPlaceholderText("Enter license name");
const numberInput = () => screen.getByPlaceholderText("Enter license number");
const dateInput = () => screen.getByPlaceholderText("Select expiration date");
const stateWrapper = () => document.body.querySelector(".select-input-wrapper");
const primary = () => document.body.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.body.querySelector(".modal-btn-secondary");
const title = () => document.body.querySelector(".modal-title-text");

const chooseState = (label) => {
  const input = stateWrapper().querySelector("input");
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
  const menus = document.body.querySelectorAll(".rs__menu");
  const option = Array.from(
    menus[menus.length - 1].querySelectorAll(".rs__option")
  ).find((o) => o.textContent === label);
  if (!option) throw new Error(`no state option "${label}"`);
  fireEvent.click(option);
};

const stateValue = () =>
  stateWrapper().querySelector(".rs__single-value")?.textContent ?? "";

const submit = async () =>
  act(async () => {
    fireEvent.click(primary());
  });

const fillMinimum = () => {
  fireEvent.change(nameInput(), { target: { value: "BCBA" } });
  fireEvent.change(numberInput(), { target: { value: "1-23-4567" } });
  fireEvent.change(dateInput(), { target: { value: "2027-06-30" } });
  chooseState("California");
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

  it("titles itself for a new licence and opens blank", () => {
    renderModal();
    expect(title()).toHaveTextContent("Add License");
    expect(primary()).toHaveTextContent("Save License");
    expect(nameInput()).toHaveValue("");
    expect(numberInput()).toHaveValue("");
    expect(dateInput()).toHaveValue("");
    expect(stateValue()).toBe("");
  });

  it("titles itself for a stored licence that carries an id", () => {
    renderModal({ initialValues: { id: "lic-1", licenseName: "BCBA" } });
    expect(title()).toHaveTextContent("Edit License");
  });

  // Edit mode keys off the id alone, so a pre-fill without one still reads as
  // an add even though the fields arrive populated.
  it("still titles itself an add when the record has no id", () => {
    renderModal({ initialValues: { licenseName: "BCBA" } });
    expect(title()).toHaveTextContent("Add License");
    expect(nameInput()).toHaveValue("BCBA");
  });

  it("clears the form and closes from Cancel", () => {
    const { onClose } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "typed then abandoned" } });
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(nameInput()).toHaveValue("");
  });

  it("clears the form and closes from Escape", () => {
    const { onClose } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "typed then abandoned" } });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    expect(nameInput()).toHaveValue("");
  });
});

describe("pre-filling from a stored licence", () => {
  it("reads the record's own field names", () => {
    renderModal({
      initialValues: {
        id: "lic-1",
        licenseName: "BCBA",
        licenseNumber: "1-23-4567",
        issueState: "California",
        expiryDate: "2027-06-30T00:00:00.000Z",
      },
    });
    expect(nameInput()).toHaveValue("BCBA");
    expect(numberInput()).toHaveValue("1-23-4567");
    expect(stateValue()).toBe("California");
    expect(dateInput()).toHaveValue("2027-06-30");
  });

  // The staff record and the org record disagree on both names, so each field
  // has a second key to fall back on.
  it("reads the older `state` and `expirationDate` names", () => {
    renderModal({
      initialValues: {
        id: "lic-1",
        state: "Texas",
        expirationDate: "2026-01-15T12:00:00.000Z",
      },
    });
    expect(stateValue()).toBe("Texas");
    expect(dateInput()).toHaveValue("2026-01-15");
  });

  it("leaves every field blank for a record that holds only an id", () => {
    renderModal({ initialValues: { id: "lic-1" } });
    expect(nameInput()).toHaveValue("");
    expect(numberInput()).toHaveValue("");
    expect(stateValue()).toBe("");
    expect(dateInput()).toHaveValue("");
  });

  it("re-fills when a different licence is handed in", () => {
    const { rerender, onClose, onSave } = renderModal({
      initialValues: { id: "lic-1", licenseName: "BCBA" },
    });
    rerender(
      <AddLicensesModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        initialValues={{ id: "lic-2", licenseName: "RBT" }}
      />
    );
    expect(nameInput()).toHaveValue("RBT");
  });
});

describe("validation", () => {
  it("refuses a licence with nothing filled in", async () => {
    const { onSave } = renderModal();
    await submit();
    expect(await screen.findByText("License name is required")).toBeInTheDocument();
    expect(screen.getByText("License number is required")).toBeInTheDocument();
    expect(screen.getByText("State is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    expect(validation.showValidationErrors).toHaveBeenCalled();
  });

  it("refuses a licence with no expiry date", async () => {
    const { onSave } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "BCBA" } });
    fireEvent.change(numberInput(), { target: { value: "1-23-4567" } });
    chooseState("California");
    await submit();
    await waitFor(() => expect(validation.showValidationErrors).toHaveBeenCalled());
    expect(screen.queryByText("License name is required")).toBeNull();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a licence with no state", async () => {
    const { onSave } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "BCBA" } });
    fireEvent.change(numberInput(), { target: { value: "1-23-4567" } });
    fireEvent.change(dateInput(), { target: { value: "2027-06-30" } });
    await submit();
    expect(await screen.findByText("State is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("saving", () => {
  it("sends the licence with the date flattened to a day", async () => {
    const { onSave, onClose, saved } = renderModal();
    fillMinimum();
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    // yup casts the date field's "2027-06-30" as *local* midnight and the
    // payload then renders that instant in UTC, so anywhere west of Greenwich
    // the saved day slips back one. Pinned to the same local-midnight instant
    // so the expectation holds wherever the suite runs; the slip itself is a
    // real off-by-one, not something this test endorses.
    const asSaved = new Date("2027-06-30T00:00:00").toISOString().split("T")[0];
    expect(saved[0]).toEqual({
      id: undefined,
      licenseName: "BCBA",
      licenseNumber: "1-23-4567",
      issueState: "California",
      expiryDate: asSaved,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("carries the stored id back on an edit", async () => {
    const { onSave, saved } = renderModal({
      initialValues: {
        id: "lic-1",
        licenseName: "BCBA",
        licenseNumber: "1-23-4567",
        issueState: "California",
        expiryDate: "2027-06-30",
      },
    });
    fireEvent.change(nameInput(), { target: { value: "BCBA-D" } });
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(saved[0]).toMatchObject({ id: "lic-1", licenseName: "BCBA-D" });
  });

  it("clears the form once the save lands", async () => {
    renderModal();
    fillMinimum();
    await submit();
    await waitFor(() => expect(nameInput()).toHaveValue(""));
    expect(numberInput()).toHaveValue("");
    expect(stateValue()).toBe("");
  });

  // The handler re-throws so the caller can react; the modal's own contract is
  // simply that it stays open with the typed values still there.
  it("keeps the licence on screen when the save is refused", async () => {
    const { onSave, onClose } = renderModal();
    onSave.mockRejectedValue(new Error("Licence number already on file"));
    fillMinimum();
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
    expect(nameInput()).toHaveValue("BCBA");
    expect(stateValue()).toBe("California");
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
