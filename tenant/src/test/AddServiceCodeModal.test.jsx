import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

import AddServiceCodeModal from "../Components/ReusableModal/BillingAndPaymentModal/AddServiceCodeModal";

/**
 * The billing service-code editor: a code, a description, a repeatable list of
 * modifier pickers backed by a field array, and an active switch. Add mode
 * opens on blank defaults; edit mode is handed a row in the *table's* shape --
 * `serviceCodes` rather than `code`, and modifiers as one comma-space-joined
 * string -- which the modal has to unpick.
 *
 * `initialData` sits in the dependency list of the effect that resets the form
 * and its own default is a fresh `{}`, so a render that omits it loops forever.
 * Every render below passes one stable object.
 *
 * The modifier pickers are react-select with the menu portalled to the body, so
 * they are opened off the hidden text box and the option is clicked. The
 * standard modifier list starts with a blank-valued "No Modifier" entry that
 * SelectInput strips, so that entry is never offered.
 */

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

const validation = vi.hoisted(() => ({ showValidationErrors: vi.fn() }));
vi.mock("../Helper/formErrors", () => ({
  showValidationErrors: (...a) => validation.showValidationErrors(...a),
}));

// See the docblock: a fresh literal here re-runs the reset effect forever.
const NOTHING_STORED = {};

const renderModal = ({ initialData = NOTHING_STORED, ...props } = {}) => {
  // react-hook-form hands the submit handler its live internal values object
  // and `handleSave` resets the form straight afterwards, which blanks that
  // very object -- so the payload has to be snapshotted as it arrives.
  const saved = [];
  const onSave = vi.fn(async (data) => {
    saved.push(structuredClone(data));
  });
  const onClose = vi.fn();
  const view = render(
    <AddServiceCodeModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      initialData={initialData}
      {...props}
    />
  );
  return { ...view, onSave, onClose, saved };
};

const codeInput = () => screen.getByPlaceholderText("Enter Service Code");
const descriptionInput = () => screen.getByPlaceholderText("Enter a description");
const selects = () => Array.from(document.body.querySelectorAll(".select-input-wrapper"));
const removeButtons = () => screen.getAllByRole("button", { name: "Remove Modifier" });
const primary = () => document.body.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.body.querySelector(".modal-btn-secondary");
const statusLabel = () => document.body.querySelector(".input-switch-label");
const statusSwitch = () => document.body.querySelector(".switch input");

const openMenu = (index) => {
  const input = selects()[index].querySelector("input");
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
};

const menuLabels = () => {
  const menus = document.body.querySelectorAll(".rs__menu");
  const menu = menus[menus.length - 1];
  return Array.from(menu.querySelectorAll(".rs__option")).map((o) => o.textContent);
};

const choose = (index, label) => {
  openMenu(index);
  const menus = document.body.querySelectorAll(".rs__menu");
  const option = Array.from(
    menus[menus.length - 1].querySelectorAll(".rs__option")
  ).find((o) => o.textContent === label);
  if (!option) throw new Error(`no option "${label}" in select ${index}`);
  fireEvent.click(option);
};

const valueOf = (index) =>
  selects()[index].querySelector(".rs__single-value")?.textContent ?? "";

const submit = async () =>
  act(async () => {
    fireEvent.click(primary());
  });

const fillMinimum = () => {
  fireEvent.change(codeInput(), { target: { value: "97153" } });
  fireEvent.change(descriptionInput(), { target: { value: "Adaptive behavior treatment" } });
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

  it("titles itself for a new service code", () => {
    renderModal();
    expect(document.body.querySelector(".modal-title-text")).toHaveTextContent(
      "Add Service Code"
    );
    expect(primary()).toHaveTextContent("Save Service Code");
  });

  it("titles itself for an edit", () => {
    renderModal({ mode: "edit", initialData: { serviceCodes: "97153" } });
    expect(document.body.querySelector(".modal-title-text")).toHaveTextContent(
      "Edit Service Code"
    );
  });

  it("opens on the blank defaults with one modifier row", () => {
    renderModal();
    expect(codeInput()).toHaveValue("");
    expect(descriptionInput()).toHaveValue("");
    expect(selects()).toHaveLength(1);
    expect(valueOf(0)).toBe("");
    expect(statusLabel()).toHaveTextContent("Active");
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

describe("the modifier rows", () => {
  it("offers every modifier except the blank placeholder entry", () => {
    renderModal();
    openMenu(0);
    expect(menuLabels()).not.toContain("No Modifier");
    expect(menuLabels()[0]).toBe("HO - Master's-level provider");
  });

  it("adds a row and keeps the earlier choice", () => {
    renderModal();
    choose(0, "HN - Associate's-level provider");
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(selects()).toHaveLength(2);
    expect(valueOf(0)).toBe("HN - Associate's-level provider");
    expect(valueOf(1)).toBe("");
  });

  // Modifiers are optional in the schema, so even the last row can go.
  it("removes the only row, leaving no modifier pickers at all", () => {
    renderModal();
    fireEvent.click(removeButtons()[0]);
    expect(selects()).toHaveLength(0);
  });

  it("removes the row that was asked for", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    choose(1, "HP - Doctoral-level provider");
    fireEvent.click(removeButtons()[0]);
    expect(selects()).toHaveLength(1);
    expect(valueOf(0)).toBe("HP - Doctoral-level provider");
  });
});

describe("validation", () => {
  it("refuses a service code with no code and no description", async () => {
    const { onSave } = renderModal();
    await submit();
    expect(await screen.findByText("Service code is required")).toBeInTheDocument();
    expect(screen.getByText("Description is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    expect(validation.showValidationErrors).toHaveBeenCalled();
  });

  it("refuses a service code with a code but no description", async () => {
    const { onSave } = renderModal();
    fireEvent.change(codeInput(), { target: { value: "97153" } });
    await submit();
    expect(await screen.findByText("Description is required")).toBeInTheDocument();
    expect(screen.queryByText("Service code is required")).toBeNull();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("saving", () => {
  it("sends the blank-modifier row as it stands", async () => {
    const { onSave, onClose, saved } = renderModal();
    fillMinimum();
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(saved[0]).toEqual({
      code: "97153",
      description: "Adaptive behavior treatment",
      modifiers: [{ modifier: "" }],
      status: true,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("sends every chosen modifier", async () => {
    const { onSave, saved } = renderModal();
    fillMinimum();
    choose(0, "HO - Master's-level provider");
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    choose(1, "95 - Synchronous telehealth");
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(saved[0].modifiers).toEqual([
      { modifier: "HO" },
      { modifier: "95" },
    ]);
  });

  it("sends no modifiers at all when every row was removed", async () => {
    const { onSave, saved } = renderModal();
    fillMinimum();
    fireEvent.click(removeButtons()[0]);
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(saved[0].modifiers).toEqual([]);
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

  it("reports a refused save and leaves the modal open", async () => {
    const { onSave, onClose } = renderModal();
    onSave.mockRejectedValue(new Error("Code already exists"));
    fillMinimum();
    await submit();
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Failed to save service code", "error")
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(codeInput()).toHaveValue("97153");
  });

  it("disables both footer buttons while the save is in flight", async () => {
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

describe("editing an existing service code", () => {
  const row = (over = {}) => ({
    serviceCodes: "97155",
    description: "Protocol modification",
    modifiers: "HO, 95",
    isActive: true,
    ...over,
  });

  it("unpicks a table row back into the form", () => {
    renderModal({ mode: "edit", initialData: row() });
    expect(codeInput()).toHaveValue("97155");
    expect(descriptionInput()).toHaveValue("Protocol modification");
    expect(selects()).toHaveLength(2);
    expect(valueOf(0)).toBe("HO - Master's-level provider");
    expect(valueOf(1)).toBe("95 - Synchronous telehealth");
  });

  it("gives a row with no modifiers one blank picker", () => {
    renderModal({ mode: "edit", initialData: row({ modifiers: "" }) });
    expect(selects()).toHaveLength(1);
    expect(valueOf(0)).toBe("");
  });

  it("falls back to blank fields for a row with nothing in it", () => {
    renderModal({ mode: "edit", initialData: NOTHING_STORED });
    expect(codeInput()).toHaveValue("");
    expect(descriptionInput()).toHaveValue("");
    expect(selects()).toHaveLength(1);
  });

  // `status: data.isActive || true` can only ever produce `true`, so an
  // archived service code opens looking active. Documented, not endorsed.
  it("opens an archived service code as active anyway", () => {
    renderModal({ mode: "edit", initialData: row({ isActive: false }) });
    expect(statusLabel()).toHaveTextContent("Active");
  });

  it("saves the edited row back in the form's own shape", async () => {
    const { onSave, saved } = renderModal({ mode: "edit", initialData: row() });
    fireEvent.change(descriptionInput(), { target: { value: "Renamed" } });
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(saved[0]).toEqual({
      code: "97155",
      description: "Renamed",
      modifiers: [{ modifier: "HO" }, { modifier: "95" }],
      status: true,
    });
  });
});
