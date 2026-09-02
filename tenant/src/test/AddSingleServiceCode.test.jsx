import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import AddSingleServiceCodeModal from "../Components/ReusableModal/BillingAndPaymentModal/AddSingleServiceCode";
import formDraftsReducer from "../ReduxStore/features/formDraftsSlice";

/**
 * The single-service-code modal used by the payer detail page: pick a tenant
 * service code (or "Others (Custom)" and type your own), give it a rounding
 * rule and a rate, and optionally attach modifier rows.
 *
 * Picking a code is not a plain field write — a `watch` subscription notices
 * the change and back-fills the code, the description and the whole modifier
 * array from the chosen tenant service code, so the pickers here are driven
 * through react-select's portalled option nodes rather than by setting values.
 *
 * Both the memoised defaults and the on-open reset call the same transform
 * inside a try/catch, so handing the modal a `serviceCodes` that is not an
 * array is the way to reach every fallback path at once — including the close
 * handler, which reports the failure instead of closing.
 *
 * The draft hook writes into the persisted `formDrafts` slice, so every render
 * needs a real store; drafts are per-key, and the store is rebuilt per test so
 * nothing leaks between them.
 */

const toastMock = vi.hoisted(() => ({ showToast: vi.fn(), showApiError: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toastMock.showToast(...a),
  showApiError: (...a) => toastMock.showApiError(...a),
}));

const serviceCodes = [
  {
    id: "sc-1",
    code: "97153",
    description: "Adaptive behavior treatment by protocol",
    modifiers: [{ modifier: "HO", ratePerUnit: 2 }],
  },
  { id: "sc-2", code: "97155", description: "Protocol modification", modifiers: [] },
];

const roundingRules = [{ id: "rr-1", ruleName: "8 Minute Rule" }];

// `initialData` sits in the on-open reset effect's dependency list, and the
// component's own `= {}` default builds a fresh object on every render — which
// re-fires the effect forever. Every render here therefore passes one stable
// object, the way the real callers do. See the note in the final report.
const NO_RECORD = {};

const renderModal = (props = {}) => {
  const store = configureStore({ reducer: { formDrafts: formDraftsReducer } });
  const onSave = props.onSave ?? vi.fn().mockResolvedValue(undefined);
  const onClose = props.onClose ?? vi.fn();
  const view = render(
    <Provider store={store}>
      <AddSingleServiceCodeModal
        isOpen
        mode="add"
        serviceCodes={serviceCodes}
        roundingRules={roundingRules}
        initialData={NO_RECORD}
        {...props}
        onSave={onSave}
        onClose={onClose}
      />
    </Provider>
  );
  return { ...view, onSave, onClose, store };
};

// Fields are identified by their visible label; several labels repeat (one
// "Rate per Unit" per modifier row), so the index picks which one.
const groupsFor = (label) =>
  Array.from(document.body.querySelectorAll(".input-group")).filter(
    (g) => g.querySelector(".input-group-label")?.textContent.replace(/\*$/, "").trim() === label
  );

const controlFor = (label, index = 0) =>
  groupsFor(label)[index].querySelector("input, textarea");

const openMenu = (label, index = 0) => {
  fireEvent.keyDown(controlFor(label, index), { key: "ArrowDown" });
  return Array.from(document.body.querySelectorAll(".rs__option"));
};

const chooseOption = (label, optionText, index = 0) => {
  const option = openMenu(label, index).find((o) => o.textContent === optionText);
  fireEvent.click(option);
};

// CheckboxInput renders no htmlFor, so the box is reached by class.
const billableBox = () => document.body.querySelector("input.form-checkbox");

const modifierRows = () =>
  document.body.querySelectorAll('[aria-label="Remove Modifier"]');

const save = () => fireEvent.click(screen.getByRole("button", { name: "Save Service Code" }));

beforeEach(() => {
  vi.clearAllMocks();
  // react-select scrolls the focused option into view; jsdom has no layout.
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("opening and closing", () => {
  it("renders nothing at all while closed", () => {
    const { container } = renderModal({ isOpen: false });
    expect(container).toBeEmptyDOMElement();
    expect(document.body.querySelector(".modal-content")).toBeNull();
  });

  it("titles itself for each mode", () => {
    const add = renderModal();
    expect(screen.getByText("Add Service Code")).toBeInTheDocument();
    add.unmount();

    const edit = renderModal({ mode: "edit", initialData: { code: "97153" } });
    expect(screen.getByText("Edit Service Code")).toBeInTheDocument();
    edit.unmount();

    renderModal({ mode: "view", initialData: { code: "97153" } });
    expect(screen.getByText("View Service Code")).toBeInTheDocument();
  });

  it("offers only a Close button in view mode, and closing goes straight through", () => {
    const { onClose } = renderModal({ mode: "view", initialData: { code: "97153" } });
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("closes without touching the form when nothing was changed", () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(toastMock.showApiError).not.toHaveBeenCalled();
  });

  it("renames the primary button once an edited record is touched", async () => {
    renderModal({ mode: "edit", initialData: { code: "97153", ratePerUnit: 10 } });
    expect(screen.getByRole("button", { name: "Save Service Code" })).toBeInTheDocument();
    chooseOption("Service Code", "97155 - Protocol modification");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument()
    );
  });
});

describe("prefilling from an existing record", () => {
  it("selects the tenant service code the record points at", () => {
    renderModal({
      mode: "edit",
      initialData: { code: "97153", description: "Adaptive behavior treatment by protocol" },
    });
    expect(screen.getByText("97153 - Adaptive behavior treatment by protocol")).toBeInTheDocument();
    // A known code needs no free-text field.
    expect(groupsFor("Custom Code")).toHaveLength(0);
  });

  it("falls back to the custom option for a code the tenant does not stock", () => {
    renderModal({ mode: "edit", initialData: { code: "XX999", description: "One-off" } });
    expect(screen.getByText("Others (Custom)")).toBeInTheDocument();
    expect(controlFor("Custom Code")).toHaveValue("XX999");
  });

  it("keeps only the modifier rows that name a modifier", () => {
    renderModal({
      mode: "edit",
      initialData: {
        code: "97153",
        modifiers: [{ modifier: "HO", ratePerUnit: 5 }, { modifier: "" }, {}],
      },
    });
    expect(modifierRows()).toHaveLength(1);
    expect(screen.getByText("HO - Master's-level provider")).toBeInTheDocument();
  });

  it("gives a modifier with no rate a rate of zero", () => {
    renderModal({ mode: "edit", initialData: { code: "97153", modifiers: [{ modifier: "HN" }] } });
    expect(controlFor("Rate per Unit", 1)).toHaveValue(0);
  });

  it("supplies a currency, a zero rate and one empty modifier row for a blank record", () => {
    renderModal();
    expect(screen.getByText("USD ($)")).toBeInTheDocument();
    expect(controlFor("Rate per Unit")).toHaveValue(0);
    expect(modifierRows()).toHaveLength(1);
    expect(billableBox()).not.toBeChecked();
  });

  it("keeps a record that is already marked billable", () => {
    renderModal({ mode: "edit", initialData: { code: "97153", billable: true } });
    expect(billableBox()).toBeChecked();
  });

  it("hides every row control in view mode", () => {
    renderModal({
      mode: "view",
      initialData: { code: "97153", modifiers: [{ modifier: "HO" }] },
    });
    expect(modifierRows()).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Add Modifier" })).toBeDisabled();
  });
});

describe("choosing a service code", () => {
  it("back-fills the description and the code's own modifiers", async () => {
    renderModal();
    chooseOption("Service Code", "97153 - Adaptive behavior treatment by protocol");
    await waitFor(() =>
      expect(controlFor("Description")).toHaveValue("Adaptive behavior treatment by protocol")
    );
    expect(modifierRows()).toHaveLength(1);
    expect(screen.getByText("HO - Master's-level provider")).toBeInTheDocument();
  });

  it("leaves one empty modifier row for a code that carries none", async () => {
    renderModal();
    chooseOption("Service Code", "97155 - Protocol modification");
    await waitFor(() => expect(controlFor("Description")).toHaveValue("Protocol modification"));
    expect(modifierRows()).toHaveLength(1);
    expect(screen.queryByText("HO - Master's-level provider")).not.toBeInTheDocument();
  });

  it("clears the fields again when the custom option is chosen", async () => {
    renderModal();
    chooseOption("Service Code", "97153 - Adaptive behavior treatment by protocol");
    await waitFor(() => expect(controlFor("Description")).not.toHaveValue(""));
    chooseOption("Service Code", "Others (Custom)");
    await waitFor(() => expect(controlFor("Description")).toHaveValue(""));
    expect(controlFor("Custom Code")).toHaveValue("");
  });

  it("truncates a long description in the option label", () => {
    renderModal({
      serviceCodes: [
        {
          id: "sc-9",
          code: "97158",
          description:
            "Group adaptive behavior treatment by protocol administered by a qualified health professional",
        },
      ],
    });
    const labels = openMenu("Service Code").map((o) => o.textContent);
    expect(labels.some((l) => l.endsWith("..."))).toBe(true);
  });
});

describe("modifier rows", () => {
  it("adds a row and removes it again", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Add Modifier" }));
    expect(modifierRows()).toHaveLength(2);
    fireEvent.click(modifierRows()[1]);
    expect(modifierRows()).toHaveLength(1);
  });

  it("lets the last remaining row be removed too", () => {
    renderModal();
    fireEvent.click(modifierRows()[0]);
    expect(modifierRows()).toHaveLength(0);
  });
});

describe("saving", () => {
  const fillRequired = async () => {
    chooseOption("Service Code", "97153 - Adaptive behavior treatment by protocol");
    await waitFor(() => expect(controlFor("Description")).not.toHaveValue(""));
    chooseOption("Rounding Rule", "8 Minute Rule");
    fireEvent.change(controlFor("Rate per Unit"), { target: { value: "12" } });
  };

  it("sends the cleaned payload with the chosen code's id and closes", async () => {
    const { onSave, onClose } = renderModal();
    await fillRequired();
    save();
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        code: "97153",
        description: "Adaptive behavior treatment by protocol",
        unitCurrency: "USD",
        ratePerUnit: 12,
        roundingRule: "rr-1",
        modifiers: [{ modifier: "HO", ratePerUnit: 2 }],
        billable: false,
        serviceCodeId: "sc-1",
      })
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("drops the modifier rows the user left blank", async () => {
    const { onSave } = renderModal();
    await fillRequired();
    fireEvent.click(screen.getByRole("button", { name: "Add Modifier" }));
    save();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].modifiers).toEqual([{ modifier: "HO", ratePerUnit: 2 }]);
  });

  it("sends no service code id for a custom code", async () => {
    const { onSave } = renderModal();
    fireEvent.change(controlFor("Custom Code"), { target: { value: "XX999" } });
    fireEvent.change(controlFor("Description"), { target: { value: "One-off service" } });
    chooseOption("Rounding Rule", "8 Minute Rule");
    // A whole number on purpose: the rate field is `type="number"` with no
    // `step`, so a fractional value fails native constraint validation and the
    // form never submits at all. See the note in the final report.
    fireEvent.change(controlFor("Rate per Unit"), { target: { value: "8" } });
    save();
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ code: "XX999", serviceCodeId: "", ratePerUnit: 8 })
      )
    );
  });

  it("records the billable checkbox", async () => {
    const { onSave } = renderModal();
    await fillRequired();
    fireEvent.click(billableBox());
    save();
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ billable: true }))
    );
  });

  it("refuses an empty form and says which field needs attention", async () => {
    const { onSave, onClose } = renderModal();
    save();
    await waitFor(() => expect(toastMock.showToast).toHaveBeenCalled());
    expect(toastMock.showToast.mock.calls[0][1]).toBe("error");
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("rejects a rate below zero", async () => {
    const { onSave } = renderModal();
    await fillRequired();
    fireEvent.change(controlFor("Rate per Unit"), { target: { value: "-5" } });
    save();
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        expect.stringContaining("Must be 0 or greater"),
        "error"
      )
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it("warns and stays open when the caller's save throws", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("500"));
    const { onClose } = renderModal({ onSave });
    await fillRequired();
    save();
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Failed to save service code", "error")
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("clears the saved draft once the record is accepted", async () => {
    const { store, onSave } = renderModal();
    await fillRequired();
    await waitFor(() => expect(store.getState().formDrafts["add-service-code"]).toBeDefined());
    save();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    await waitFor(() =>
      expect(store.getState().formDrafts["add-service-code"]).toBeUndefined()
    );
  });
});

describe("a malformed service code list", () => {
  it("offers only the custom option when the list is not an array", () => {
    renderModal({ serviceCodes: {} });
    const labels = openMenu("Service Code").map((o) => o.textContent);
    expect(labels).toEqual(["Others (Custom)"]);
  });

  it("offers only the custom option when a code has no description to label it with", () => {
    renderModal({ serviceCodes: [{ id: "sc-1", code: "97153" }] });
    const labels = openMenu("Service Code").map((o) => o.textContent);
    expect(labels).toEqual(["Others (Custom)"]);
  });

  it("offers no rounding rules when that list is not an array either", () => {
    renderModal({ roundingRules: null });
    const labels = openMenu("Rounding Rule").map((o) => o.textContent);
    expect(labels).toEqual([]);
    expect(
      screen.getByText(/No rounding rules found/)
    ).toBeInTheDocument();
  });

  it("reports a close it cannot reset instead of swallowing it", async () => {
    // The list is unusable, so the reset the close handler runs on a touched
    // form throws; the modal reports that rather than closing on a bad state.
    const { onClose } = renderModal({ serviceCodes: {} });
    chooseOption("Modifier", "HO - Master's-level provider");
    await waitFor(() => expect(screen.getByText("HO - Master's-level provider")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(toastMock.showApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "SAVE_SERVICE_CODE"
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
