import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import formDraftsReducer from "../ReduxStore/features/formDraftsSlice";

/**
 * The one modal behind both "Income Items" and "Deductions" in Payroll
 * settings. `isDeduction` only swaps the nouns in the title, the button and the
 * failure toast; everything else — the yup schema, the three rate shapes and
 * the view/edit/add modes — is shared.
 *
 * The rate half of the form is conditional on the chosen unit type, and yup
 * validates the three rate fields with `when("unitType", ...)` clauses, so a
 * field is only required while its section is on screen. `unitType` lives on
 * the parent object rather than inside `rate`, which is why those `when`
 * clauses read a sibling — switching type also runs a `clearErrors("rate")`
 * effect so stale "required" messages don't survive the switch.
 *
 * Both selects are react-select, driven here by opening the menu with
 * ArrowDown and clicking the portalled `.rs__option`. `initialData` sits in the
 * open effect's dependency list, so every render passes the same module-level
 * object — a fresh literal would re-run the effect forever.
 *
 * The number inputs sanitise anything non-numeric to "" in jsdom, so the
 * "must be a number" arm is reached through `initialData` (Number("abc") is
 * NaN) rather than by typing.
 */

const toastMock = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toastMock.showToast(...a),
  showApiError: vi.fn(),
}));

import PayrollItemModal from "../Components/ReusableModal/PayrollModal/NewIncomeItemModal";

// Every fixture is a module-level constant: `initialData` is a dependency of
// the modal's open effect, so a fresh object literal per render would loop.
const EMPTY = {};
const FLAT_ITEM = {
  id: "item-1",
  name: "Transport",
  type: "Flat Rate",
  rate: { rate: 250 },
  status: false,
};
const TIME_ITEM = {
  id: "item-2",
  name: "Overtime",
  unitType: "Time based",
  type: "Flat Rate", // `unitType` wins over the legacy `type` field
  rate: { unit: 30, unitMinutes: 15, duration: "minutes" },
};
const PERCENT_ITEM = {
  id: "item-3",
  name: "Pension",
  type: "Percentage based",
  rate: { unit: 8, duration: "basic_pay" },
};
const NAN_RATE_ITEM = { id: "item-4", name: "Broken", type: "Flat Rate", rate: { rate: "abc" } };
const NAN_UNIT_ITEM = {
  id: "item-6",
  name: "Broken hours",
  type: "Time based",
  rate: { unit: "abc", unitMinutes: 15, duration: "minutes" },
};
const NULL_RATE_ITEM = {
  id: "item-5",
  name: "Blank",
  type: "Time based",
  rate: { rate: null, unit: null, unitMinutes: null, duration: null },
};
// An item saved before the rate shape settled: no name, no type, no rate.
const BARE_ITEM = { id: "item-7" };
const EXISTING = [
  { id: "item-1", name: "Transport" },
  { id: "item-3", name: "Pension" },
];

const onSave = vi.fn();
const onClose = vi.fn();

const renderModal = (props = {}) =>
  render(
    <Provider store={configureStore({ reducer: { formDrafts: formDraftsReducer } })}>
      <PayrollItemModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        initialData={EMPTY}
        {...props}
      />
    </Provider>
  );

const nameInput = () => document.body.querySelector('input[name="name"]');
const field = (name) => document.body.querySelector(`input[name="${name}"]`);

// react-select renders its search input as `.rs__input` and portals the menu to
// document.body, so options are found on the body rather than in the modal.
const selectInputs = () => document.body.querySelectorAll(".rs__input");
const optionLabels = () =>
  [...document.body.querySelectorAll(".rs__option")].map((o) => o.textContent);
const openSelect = (index) => fireEvent.keyDown(selectInputs()[index], { key: "ArrowDown" });
const chooseOption = (index, label) => {
  openSelect(index);
  fireEvent.click([...document.body.querySelectorAll(".rs__option")].find((o) => o.textContent === label));
};

const saveButton = (label = "Save Income Item") => screen.getByRole("button", { name: label });

beforeEach(() => {
  vi.clearAllMocks();
  onSave.mockResolvedValue(undefined);
  Element.prototype.scrollIntoView = vi.fn();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the modal chrome", () => {
  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText("Add Income Item")).not.toBeInTheDocument();
  });

  it("titles itself for a new income item", () => {
    renderModal();
    expect(screen.getByText("Add Income Item")).toBeInTheDocument();
    expect(saveButton()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("titles itself for a new deduction", () => {
    renderModal({ isDeduction: true });
    expect(screen.getByText("Add Deduction")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Deduction" })).toBeInTheDocument();
  });

  it("titles itself for an edit", () => {
    renderModal({ mode: "edit", initialData: FLAT_ITEM });
    expect(screen.getByText("Edit Income Item")).toBeInTheDocument();
  });

  it("drops the save button and offers Close in view mode", () => {
    renderModal({ mode: "view", initialData: FLAT_ITEM });
    expect(screen.getByText("View Income Item")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save Income Item" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(nameInput()).toBeDisabled();
  });

  it("closes and clears the form from Cancel", () => {
    renderModal();
    fireEvent.change(nameInput(), { target: { value: "Typed" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(nameInput()).toHaveValue("");
  });

  it("closes and clears the form from Escape", () => {
    renderModal();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("pre-filling from an existing item", () => {
  it("starts an add blank and active", () => {
    renderModal();
    expect(nameInput()).toHaveValue("");
    expect(screen.getByText("Active")).toBeInTheDocument();
    // No unit type chosen yet, so none of the three rate sections is mounted.
    expect(field("rate.rate")).toBeNull();
  });

  it("reads the unit type off the legacy `type` field and keeps the stored status", () => {
    renderModal({ mode: "edit", initialData: FLAT_ITEM });
    expect(nameInput()).toHaveValue("Transport");
    expect(field("rate.rate")).toHaveValue(250);
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("prefers `unitType` over `type` when the item carries both", () => {
    renderModal({ mode: "edit", initialData: TIME_ITEM });
    expect(field("rate.unit")).toHaveValue(30);
    expect(field("rate.unitMinutes")).toHaveValue(15);
    expect(screen.getByText("Minutes")).toBeInTheDocument();
  });

  it("falls back on every field of an item that carries nothing but an id", () => {
    renderModal({ mode: "edit", initialData: BARE_ITEM });
    expect(nameInput()).toHaveValue("");
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(field("rate.rate")).toBeNull();
  });

  it("leaves every null rate field empty", () => {
    renderModal({ mode: "edit", initialData: NULL_RATE_ITEM });
    expect(field("rate.unit")).toHaveValue(null);
    expect(field("rate.unitMinutes")).toHaveValue(null);
  });
});

describe("the rate section for each unit type", () => {
  it("asks for a single rate on Flat Rate", () => {
    renderModal();
    chooseOption(0, "Flat Rate");
    expect(field("rate.rate")).toBeInTheDocument();
    expect(field("rate.unit")).toBeNull();
  });

  it("asks for a pay-per-duration pair on Time based", () => {
    renderModal();
    chooseOption(0, "Time based");
    expect(field("rate.unit")).toBeInTheDocument();
    expect(field("rate.unitMinutes")).toBeInTheDocument();
    openSelect(1);
    expect(optionLabels()).toEqual(["Minutes", "Hours"]);
  });

  it("asks for a percentage of another item on Percentage based", () => {
    renderModal({ existingItems: EXISTING });
    chooseOption(0, "Percentage based");
    expect(field("rate.unitMinutes")).toBeNull();
    openSelect(1);
    expect(optionLabels()).toEqual(["Basic Pay", "Transport", "Pension"]);
  });

  it("offers Basic Pay alone when no other items exist yet", () => {
    renderModal();
    chooseOption(0, "Percentage based");
    openSelect(1);
    expect(optionLabels()).toEqual(["Basic Pay"]);
  });

  it("keeps the item being edited out of its own percentage list", () => {
    renderModal({ mode: "edit", initialData: PERCENT_ITEM, existingItems: EXISTING });
    openSelect(1);
    expect(optionLabels()).toEqual(["Basic Pay", "Transport"]);
  });

  it("keeps the viewed item in the list, since view mode is not an edit", () => {
    renderModal({ mode: "view", initialData: PERCENT_ITEM, existingItems: EXISTING });
    // Disabled selects render no search input, so read the chosen value instead.
    expect(screen.getByText("Basic Pay")).toBeInTheDocument();
    expect(field("rate.unit")).toBeDisabled();
  });
});

describe("validation", () => {
  it("names the missing field rather than complaining generically", async () => {
    renderModal();
    fireEvent.click(saveButton());
    await waitFor(() => expect(toastMock.showToast).toHaveBeenCalledWith("Name is required", "error"));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("asks for a unit type once the name is filled", async () => {
    renderModal();
    fireEvent.change(nameInput(), { target: { value: "Bonus" } });
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Unit Type is required", "error")
    );
  });

  it("refuses a rate that is not a number at all", async () => {
    renderModal({ mode: "edit", initialData: NAN_RATE_ITEM });
    await waitFor(() => expect(nameInput()).not.toHaveValue(""));
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Rate must be a number", "error")
    );
  });

  it("refuses a pay amount that is not a number at all", async () => {
    renderModal({ mode: "edit", initialData: NAN_UNIT_ITEM });
    await waitFor(() => expect(nameInput()).not.toHaveValue(""));
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Unit must be a number", "error")
    );
  });

  // KNOWN DEFECT: the rate/unit/unitMinutes/duration rules are gated on
  // `when("unitType", ...)`, but they live inside the nested `rate` object, so
  // yup resolves that key against `rate.unitType` — which never exists. Every
  // one of those `then` branches (required, min) is therefore dead, and a Flat
  // Rate item saves with no rate at all.
  it("saves a Flat Rate item with no rate, because the rate rules never engage", async () => {
    renderModal();
    fireEvent.change(nameInput(), { target: { value: "Bonus" } });
    chooseOption(0, "Flat Rate");
    fireEvent.click(saveButton());
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].rate.rate).toBeUndefined();
  });

  it("saves a Time based item with no pay, minutes or duration for the same reason", async () => {
    renderModal();
    fireEvent.change(nameInput(), { target: { value: "Overtime" } });
    chooseOption(0, "Time based");
    fireEvent.click(saveButton());
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].rate).toMatchObject({ duration: "" });
    expect(onSave.mock.calls[0][0].rate.unitMinutes).toBeUndefined();
  });

  it("accepts a negative rate, since the minimum only applies inside the dead branch", async () => {
    renderModal();
    fireEvent.change(nameInput(), { target: { value: "Bonus" } });
    chooseOption(0, "Flat Rate");
    fireEvent.change(field("rate.rate"), { target: { value: "-5" } });
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ rate: expect.objectContaining({ rate: -5 }) })
      )
    );
  });

  it("clears a stale rate error when the unit type changes", async () => {
    // Time based and Percentage based share the `rate.unit` input, so the error
    // would survive the switch if the clearErrors effect were not running.
    renderModal({ mode: "edit", initialData: NAN_UNIT_ITEM });
    // The message only renders inside the Time based block, so it needs the
    // reset() that loads `initialData` to have landed first. Validation itself
    // runs either way -- which is why the toast-based test above survives this
    // and this one does not.
    await waitFor(() => {
      expect(nameInput()).toHaveValue("Broken hours");
      expect(field("rate.unit")).not.toBeNull();
    });
    fireEvent.click(saveButton());
    await screen.findByText("Unit must be a number");
    chooseOption(0, "Percentage based");
    await waitFor(() =>
      expect(screen.queryByText("Unit must be a number")).not.toBeInTheDocument()
    );
    expect(field("rate.unit")).toBeInTheDocument();
  });
});

describe("saving", () => {
  it("hands the whole form to onSave and closes on success", async () => {
    renderModal();
    fireEvent.change(nameInput(), { target: { value: "Bonus" } });
    chooseOption(0, "Flat Rate");
    fireEvent.change(field("rate.rate"), { target: { value: "500" } });
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Bonus",
          unitType: "Flat Rate",
          status: true,
          rate: expect.objectContaining({ rate: 500 }),
        })
      )
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toastMock.showToast).not.toHaveBeenCalled();
  });

  it("sends the switched-off status through", async () => {
    renderModal();
    fireEvent.change(nameInput(), { target: { value: "Bonus" } });
    chooseOption(0, "Flat Rate");
    fireEvent.change(field("rate.rate"), { target: { value: "0" } });
    fireEvent.click(screen.getByText("Active").closest(".input-switch-group").querySelector("input"));
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ status: false }))
    );
  });

  it("reports a rejected save as an income item failure and stays open", async () => {
    onSave.mockRejectedValue(new Error("boom"));
    renderModal({ mode: "edit", initialData: FLAT_ITEM });
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Failed to save income item", "error")
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("Edit Income Item")).toBeInTheDocument();
  });

  it("reports a rejected save as a deduction failure when it is one", async () => {
    onSave.mockRejectedValue(new Error("boom"));
    renderModal({ mode: "edit", initialData: FLAT_ITEM, isDeduction: true });
    fireEvent.click(screen.getByRole("button", { name: "Save Deduction" }));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Failed to save deduction", "error")
    );
  });

  it("swaps the save button for a spinner while the save is in flight", async () => {
    let release;
    onSave.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    renderModal({ mode: "edit", initialData: FLAT_ITEM });
    fireEvent.click(saveButton());
    const submit = () => document.body.querySelector('button[type="submit"]');
    await waitFor(() => expect(submit()).toBeDisabled());
    expect(submit()).not.toHaveTextContent("Save Income Item");
    release();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
