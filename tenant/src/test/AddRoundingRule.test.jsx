import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import AddRoundingRule from "../Components/ReusableModal/BillingAndPaymentModal/AddRoundingRule";
import formDraftsReducer from "../ReduxStore/features/formDraftsSlice";

/**
 * The rounding-rule modal from Billing & Payments → Settings. A rule is either
 * "standard" — one of three named presets, where the rule's name IS the preset
 * and an effect mirrors the picker into the hidden name field — or "custom",
 * which swaps in a name, a description and three numeric fields that only then
 * become required.
 *
 * The record the API returns has none of that structure: it stores the preset's
 * label in `ruleName`, the standard unit in `standardUnit`, and the two
 * rounding numbers under a nested `roundingRule`. `transformRoundingRuleToFormData`
 * infers the rule type by looking the name up in the preset list, which is why
 * the fixtures below vary the name rather than setting a type.
 *
 * The rule picker is react-select, so it is driven through its portalled option
 * nodes; the rule-type radios carry no `htmlFor` on their labels, so the inputs
 * themselves are clicked.
 */

const toastMock = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toastMock.showToast(...a),
  showApiError: vi.fn(),
}));

// `initialData` sits in the on-open reset effect's dependency list, and the
// component's own `= {}` default builds a fresh object on every render — which
// re-fires the effect forever. Every render here therefore passes one stable
// object, the way the real caller does. See the note in the final report.
const NO_RECORD = {};

const renderModal = (props = {}) => {
  const store = configureStore({ reducer: { formDrafts: formDraftsReducer } });
  const onSave = props.onSave ?? vi.fn().mockResolvedValue(undefined);
  const onClose = props.onClose ?? vi.fn();
  const view = render(
    <Provider store={store}>
      <AddRoundingRule
        isOpen
        mode="add"
        initialData={NO_RECORD}
        {...props}
        onSave={onSave}
        onClose={onClose}
      />
    </Provider>
  );
  return { ...view, onSave, onClose, store };
};

const groupsFor = (label) =>
  Array.from(document.body.querySelectorAll(".input-group")).filter(
    (g) => g.querySelector(".input-group-label")?.textContent.replace(/\*$/, "").trim() === label
  );

const controlFor = (label, index = 0) =>
  groupsFor(label)[index].querySelector("input, textarea");

const chooseStandardRule = (optionText) => {
  fireEvent.keyDown(controlFor("Select Rounding Rule"), { key: "ArrowDown" });
  const option = Array.from(document.body.querySelectorAll(".rs__option")).find(
    (o) => o.textContent === optionText
  );
  fireEvent.click(option);
};

// The RadioInput label carries no htmlFor, so the input itself is the target.
const pickRuleType = (value) =>
  fireEvent.click(document.body.querySelector(`input[type="radio"][value="${value}"]`));

// The three unlabelled number fields, in the order the custom form lays them
// out: minutes per unit, units, minutes per rounding step.
const numberInputs = () =>
  Array.from(document.body.querySelectorAll('input[type="number"]'));

const activeSwitch = () =>
  document.body.querySelector('.input-switch-group input[type="checkbox"]');

const save = () => fireEvent.click(screen.getByRole("button", { name: "Save Rule" }));

beforeEach(() => {
  vi.clearAllMocks();
  // react-select scrolls the focused option into view; jsdom has no layout.
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("opening", () => {
  it("titles itself for each mode", () => {
    const add = renderModal();
    expect(screen.getByText("Add a Rounding Rule")).toBeInTheDocument();
    add.unmount();

    const edit = renderModal({ mode: "edit", initialData: { ruleName: "Midpoint Rule" } });
    expect(screen.getByText("Edit Rounding Rule")).toBeInTheDocument();
    edit.unmount();

    renderModal({ mode: "view", initialData: { ruleName: "Midpoint Rule" } });
    expect(screen.getByText("View Rounding Rule")).toBeInTheDocument();
  });

  it("disables both footer buttons while a save is in flight", () => {
    renderModal({ loading: true });
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    // The primary renders a spinner in place of its label while loading.
    expect(document.body.querySelector(".modal-btn[type=submit]")).toBeDisabled();
  });

  it("locks the fields in view mode", () => {
    renderModal({ mode: "view", initialData: { ruleName: "Midpoint Rule" } });
    expect(document.body.querySelector('input[type="radio"][value="standard"]')).toBeDisabled();
    expect(activeSwitch()).toBeDisabled();
    // KNOWN DEFECT: the modal asks for the primary button to be disabled in
    // view mode, but ReusableModal has no `primaryButtonDisabled` prop, so the
    // request is silently dropped and a viewer can still submit.
    expect(screen.getByRole("button", { name: "Save Rule" })).not.toBeDisabled();
  });
});

describe("the rule type toggle", () => {
  it("opens on standard with only the preset picker showing", () => {
    renderModal();
    expect(groupsFor("Select Rounding Rule")).toHaveLength(1);
    expect(groupsFor("Rule Name")).toHaveLength(0);
    expect(groupsFor("Description")).toHaveLength(0);
  });

  it("swaps in the custom fields and back again", () => {
    renderModal();
    pickRuleType("custom");
    expect(groupsFor("Rule Name")).toHaveLength(1);
    expect(groupsFor("Description")).toHaveLength(1);
    expect(numberInputs()).toHaveLength(3);
    expect(groupsFor("Select Rounding Rule")).toHaveLength(0);

    pickRuleType("standard");
    expect(groupsFor("Rule Name")).toHaveLength(0);
    expect(groupsFor("Select Rounding Rule")).toHaveLength(1);
  });
});

describe("the standard rule picker", () => {
  it("explains the preset that was chosen", async () => {
    renderModal();
    expect(screen.queryByText(/Round up when/)).not.toBeInTheDocument();
    chooseStandardRule("8 Minute Rule");
    await waitFor(() =>
      expect(
        screen.getByText("Round up when time is more than 8 min into the next 15 min block")
      ).toBeInTheDocument()
    );
  });

  it("leaves the blurb blank for a stored preset it has no wording for", () => {
    renderModal({
      mode: "edit",
      initialData: { ruleType: "standard", ruleName: "Retired Preset" },
    });
    // The paragraph is still rendered, just empty.
    const blurb = document.body.querySelector(".modal-content p.text-center");
    expect(blurb).toBeInTheDocument();
    expect(blurb).toHaveTextContent("");
  });
});

describe("prefilling from a stored rule", () => {
  it("treats a record whose name is a known preset as standard", () => {
    renderModal({ mode: "edit", initialData: { ruleName: "Midpoint Rule", isActive: true } });
    expect(document.body.querySelector('input[type="radio"][value="standard"]')).toBeChecked();
    expect(screen.getByText("Midpoint Rule")).toBeInTheDocument();
  });

  it("falls back to parentRole when the record carries no rule name", () => {
    renderModal({
      mode: "edit",
      initialData: { ruleType: "standard", parentRole: "Exact Time Reporting" },
    });
    expect(screen.getByText("Bill only what was delivered")).toBeInTheDocument();
  });

  it("unpacks a custom rule's nested numbers", () => {
    renderModal({
      mode: "edit",
      initialData: {
        ruleName: "House Rule",
        description: "Round to the nearest ten",
        standardUnit: 15,
        roundingRule: { unit: 1, unitMinute: 10 },
        isActive: true,
      },
    });
    expect(document.body.querySelector('input[type="radio"][value="custom"]')).toBeChecked();
    expect(controlFor("Rule Name")).toHaveValue("House Rule");
    expect(controlFor("Description")).toHaveValue("Round to the nearest ten");
    expect(numberInputs().map((i) => i.value)).toEqual(["15", "1", "10"]);
  });

  it("reads the standard unit off `minutes` when the record has no standardUnit", () => {
    renderModal({
      mode: "edit",
      initialData: { ruleName: "House Rule", minutes: 20 },
    });
    expect(numberInputs()[0]).toHaveValue(20);
  });

  it("zeroes the numbers a custom record never stored", () => {
    renderModal({ mode: "edit", initialData: { ruleName: "House Rule" } });
    expect(numberInputs().map((i) => i.value)).toEqual(["0", "0", "0"]);
  });

  it("shows a deactivated rule with its switch off", () => {
    renderModal({ mode: "edit", initialData: { ruleName: "Midpoint Rule", isActive: false } });
    expect(activeSwitch()).not.toBeChecked();
  });

  it("defaults a brand new rule to standard, active and unnamed", () => {
    renderModal();
    expect(document.body.querySelector('input[type="radio"][value="standard"]')).toBeChecked();
    expect(activeSwitch()).toBeChecked();
    // Nothing chosen yet, so the picker is still showing its placeholder.
    expect(document.body.querySelector(".rs__placeholder")).toHaveTextContent(
      "Select Rounding Rule"
    );
  });
});

describe("saving a standard rule", () => {
  it("sends the preset as both the name and the parent, and nothing custom", async () => {
    const { onSave, onClose } = renderModal();
    chooseStandardRule("Midpoint Rule");
    await waitFor(() => expect(screen.getByText("Midpoint Rule")).toBeInTheDocument());
    save();
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        ruleType: "standard",
        ruleName: "Midpoint Rule",
        active: true,
        parentRole: "Midpoint Rule",
      })
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("records a rule saved in the off position", async () => {
    const { onSave } = renderModal();
    chooseStandardRule("8 Minute Rule");
    await waitFor(() => expect(screen.getByText("8 Minute Rule")).toBeInTheDocument());
    fireEvent.click(activeSwitch());
    save();
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ active: false }))
    );
  });

  it("refuses a standard rule with no preset chosen", async () => {
    const { onSave } = renderModal();
    save();
    await waitFor(() => expect(toastMock.showToast).toHaveBeenCalled());
    expect(toastMock.showToast.mock.calls[0][1]).toBe("error");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("clears the saved draft once the rule is accepted", async () => {
    const { store, onSave } = renderModal();
    chooseStandardRule("8 Minute Rule");
    await waitFor(() => expect(store.getState().formDrafts["add-rounding-rule"]).toBeDefined());
    save();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    await waitFor(() =>
      expect(store.getState().formDrafts["add-rounding-rule"]).toBeUndefined()
    );
  });
});

describe("saving a custom rule", () => {
  const fillCustom = () => {
    pickRuleType("custom");
    fireEvent.change(controlFor("Rule Name"), { target: { value: "House Rule" } });
    fireEvent.change(controlFor("Description"), { target: { value: "Round to ten" } });
    const [minutes, unit, unitMinutes] = numberInputs();
    fireEvent.change(minutes, { target: { value: "15" } });
    fireEvent.change(unit, { target: { value: "1" } });
    fireEvent.change(unitMinutes, { target: { value: "10" } });
  };

  it("sends the numbers coerced and no parent preset", async () => {
    const { onSave } = renderModal();
    fillCustom();
    save();
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        ruleType: "custom",
        ruleName: "House Rule",
        active: true,
        description: "Round to ten",
        minutes: 15,
        unit: 1,
        unitMinutes: 10,
      })
    );
  });

  it("refuses a custom rule whose numbers are still at zero", async () => {
    const { onSave } = renderModal();
    pickRuleType("custom");
    fireEvent.change(controlFor("Rule Name"), { target: { value: "House Rule" } });
    fireEvent.change(controlFor("Description"), { target: { value: "Round to ten" } });
    save();
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        expect.stringContaining("Must be 1 or greater"),
        "error"
      )
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a custom rule with no description", async () => {
    const { onSave } = renderModal();
    fillCustom();
    fireEvent.change(controlFor("Description"), { target: { value: "" } });
    save();
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        expect.stringContaining("Description is required"),
        "error"
      )
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it("warns and stays open when the caller's save throws", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("500"));
    const { onClose } = renderModal({ onSave });
    fillCustom();
    save();
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Failed to save rounding rule", "error")
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("cancelling", () => {
  it("empties the form back to its defaults and closes", () => {
    const { onClose } = renderModal({
      mode: "edit",
      initialData: { ruleName: "House Rule", description: "Round to ten" },
    });
    expect(controlFor("Rule Name")).toHaveValue("House Rule");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    // Reset puts the form back on the standard branch, so the custom fields go.
    expect(groupsFor("Rule Name")).toHaveLength(0);
  });
});
