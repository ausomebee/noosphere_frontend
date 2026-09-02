import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import AddPayerModal from "../Components/ReusableModal/BillingAndPaymentModal/AddPayerModal";
import formDraftsReducer from "../ReduxStore/features/formDraftsSlice";

/**
 * The arms of AddPayerModal that the original modifier-focused suite does not
 * reach: the two-tab wizard's footer buttons, the gate that refuses to advance
 * past an incomplete Payer Info tab, the service-code picker's side effects, and
 * a full round trip through save.
 *
 * Both tabs are always mounted -- the inactive one is merely hidden -- so fields
 * are located through the `.input-group` that carries their label rather than by
 * a document-wide placeholder lookup, which would otherwise be ambiguous
 * ("Rate per Unit" exists on both the service code and each of its modifiers).
 *
 * Every picker is react-select. Where an option list is long (countries,
 * states) it is filtered by typing and confirmed with Enter; where it is short
 * the first option is taken with an arrow key. `initialData` is passed from a
 * module-level constant because it sits in the open effect's dependency list.
 */

const toast = vi.hoisted(() => vi.fn());
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...args) => toast(...args),
  showApiError: vi.fn(),
}));

const NO_INITIAL_DATA = {};

const INSURANCE_TYPES = [
  { id: "ins-1", name: "PPO", isActive: true },
  { id: "ins-2", name: "Retired HMO", isActive: false },
];

const SERVICE_CODES = [
  {
    id: "sc-1",
    code: "97153",
    description: "Adaptive behaviour treatment",
    modifiers: [{ modifier: "HN", ratePerUnit: 5 }],
  },
];

const ROUNDING_RULES = [{ id: "rr-1", ruleName: "8-minute rule" }];

const onSave = vi.fn();
const onClose = vi.fn();

const renderModal = (props = {}) => {
  const store = configureStore({ reducer: { formDrafts: formDraftsReducer } });
  return render(
    <Provider store={store}>
      <AddPayerModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        mode="add"
        initialData={NO_INITIAL_DATA}
        insuranceTypes={INSURANCE_TYPES}
        serviceCodes={SERVICE_CODES}
        roundingRules={ROUNDING_RULES}
        {...props}
      />
    </Provider>
  );
};

// A labelled field's wrapper; `nth` picks between repeated labels (the service
// code's own "Rate per Unit" versus a modifier's).
const group = (label, nth = 0) =>
  Array.from(document.body.querySelectorAll(".input-group")).filter((el) =>
    el.querySelector("label")?.textContent.startsWith(label)
  )[nth];

const comboboxFor = (label, nth = 0) =>
  group(label, nth).querySelector("input[role='combobox']");

const textFor = (label, nth = 0) =>
  group(label, nth).querySelector("input, textarea");

const typeInto = (label, value, nth = 0) =>
  fireEvent.change(textFor(label, nth), { target: { value } });

// react-select highlights the first match as soon as the input is filtered, so
// Enter alone confirms it.
const searchAndPick = (label, text, nth = 0) => {
  const combobox = comboboxFor(label, nth);
  fireEvent.change(combobox, { target: { value: text } });
  fireEvent.keyDown(combobox, { key: "Enter" });
};

const pickFirst = (label, nth = 0) => {
  const combobox = comboboxFor(label, nth);
  fireEvent.keyDown(combobox, { key: "ArrowDown" });
  fireEvent.keyDown(combobox, { key: "Enter" });
};

const primaryButton = () => document.body.querySelector('button[type="submit"]');
const secondaryButton = () =>
  document.body.querySelector("button.modal-btn-secondary");

const fillPayerInfo = () => {
  typeInto("Payer Name", "Acme Health");
  typeInto("Email", "billing@acme.test");
  typeInto("Phone Number", "555-0100");
  pickFirst("Insurance Type");
  typeInto("TPL Code", "TPL-9");
  typeInto("Carrier Payer ID", "CPID-9");
  typeInto("Address", "1 Market St");
  typeInto("City", "Arlington");
  searchAndPick("Country", "United States");
  searchAndPick("State", "Virginia");
  typeInto("ZIP", "22201");
};

const fillServiceCode = () => {
  searchAndPick("Service Code", "97153");
  pickFirst("Rounding Rule");
  pickFirst("Unit Currency");
  typeInto("Rate per Unit", "40");
};

const goToServiceCodeTab = async () => {
  fireEvent.click(primaryButton());
  await waitFor(() =>
    expect(screen.getByRole("tab", { name: "Service Code" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  onSave.mockResolvedValue(undefined);
  // react-select scrolls its highlighted option into view, which jsdom has no
  // implementation for.
  Element.prototype.scrollIntoView = vi.fn();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("what the footer offers in each mode", () => {
  it("titles and labels the add flow one tab at a time", async () => {
    renderModal();
    expect(screen.getByText("Add a Payer")).toBeInTheDocument();
    expect(primaryButton()).toHaveTextContent("Next");
    expect(secondaryButton()).toHaveTextContent("Cancel");

    fillPayerInfo();
    await goToServiceCodeTab();
    expect(primaryButton()).toHaveTextContent("Save Payer");
    expect(secondaryButton()).toHaveTextContent("Previous");
  });

  it("goes back to the payer info tab", async () => {
    renderModal();
    fillPayerInfo();
    await goToServiceCodeTab();
    fireEvent.click(secondaryButton());
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Payer Info" })).toHaveAttribute(
        "aria-selected",
        "true"
      )
    );
    expect(secondaryButton()).toHaveTextContent("Cancel");
  });

  it("cancels out of the payer info tab", () => {
    renderModal();
    fireEvent.click(secondaryButton());
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("offers only a Close button in view mode", () => {
    renderModal({ mode: "view" });
    expect(screen.getByText("View Payer")).toBeInTheDocument();
    expect(primaryButton()).toHaveTextContent("Close");
    expect(secondaryButton()).toBeNull();
    // View mode drops the payer info tab entirely.
    expect(screen.queryByRole("tab", { name: "Payer Info" })).not.toBeInTheDocument();
    fireEvent.click(primaryButton());
    expect(onClose).toHaveBeenCalled();
  });

  it("waits for an edit to be touched before offering to save it", () => {
    renderModal({ mode: "edit", initialData: NO_INITIAL_DATA });
    expect(screen.getByText("Edit a Payer")).toBeInTheDocument();
    expect(primaryButton()).toHaveTextContent("Next");

    typeInto("Payer Name", "Acme Health Renamed");
    expect(primaryButton()).toHaveTextContent("Save Changes");
  });
});

describe("the gate on the payer info tab", () => {
  it("names the first missing field instead of advancing", async () => {
    renderModal();
    fireEvent.click(primaryButton());
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Payer Name is required", "error")
    );
    expect(screen.getByRole("tab", { name: "Payer Info" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("works down the tab, naming the next gap each time", async () => {
    renderModal();
    typeInto("Payer Name", "Acme Health");
    fireEvent.click(primaryButton());
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Email is required", "error")
    );
  });

  it("never gets as far as the gate with a malformed email", () => {
    // The footer button submits the form, so the email field's own type
    // constraint refuses before any of the schema's rules are consulted.
    renderModal();
    fillPayerInfo();
    typeInto("Email", "not-an-email");
    fireEvent.click(primaryButton());
    expect(textFor("Email").checkValidity()).toBe(false);
    expect(toast).not.toHaveBeenCalled();
    expect(screen.getByRole("tab", { name: "Payer Info" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });
});

describe("the country and state pair", () => {
  it("keeps the state picker shut until a country is chosen", () => {
    renderModal();
    expect(comboboxFor("State")).toBeDisabled();
    searchAndPick("Country", "United States");
    expect(comboboxFor("State")).toBeEnabled();
  });

  it("drops the old state when the country changes", () => {
    renderModal();
    searchAndPick("Country", "United States");
    searchAndPick("State", "Virginia");
    expect(group("State")).toHaveTextContent("Virginia");

    searchAndPick("Country", "Canada");
    expect(group("State")).not.toHaveTextContent("Virginia");
  });
});

describe("choosing a service code", () => {
  it("fills the description and the modifiers from the chosen code", async () => {
    renderModal();
    fillPayerInfo();
    await goToServiceCodeTab();
    searchAndPick("Service Code", "97153");
    await waitFor(() =>
      expect(textFor("Description")).toHaveValue("Adaptive behaviour treatment")
    );
    expect(group("Modifier")).toHaveTextContent("HN");
    expect(textFor("Rate per Unit", 1)).toHaveValue(5);
  });

  it("reveals a custom code field and clears the row for a custom entry", async () => {
    renderModal();
    fillPayerInfo();
    await goToServiceCodeTab();
    searchAndPick("Service Code", "97153");
    await waitFor(() =>
      expect(textFor("Description")).toHaveValue("Adaptive behaviour treatment")
    );

    searchAndPick("Service Code", "Others (Custom)");
    expect(await screen.findByPlaceholderText("Enter Custom Code")).toBeInTheDocument();
    await waitFor(() => expect(textFor("Description")).toHaveValue(""));
    expect(group("Modifier")).not.toHaveTextContent("HN");
  });

  it("offers only the insurance types that are still active", () => {
    renderModal();
    fireEvent.keyDown(comboboxFor("Insurance Type"), { key: "ArrowDown" });
    const options = Array.from(document.body.querySelectorAll(".rs__option"));
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("PPO");
  });
});

describe("more than one service code", () => {
  it("only offers to remove a row once there is a second one", async () => {
    renderModal();
    fillPayerInfo();
    await goToServiceCodeTab();
    expect(
      screen.queryByRole("button", { name: "Remove Service Code" })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add Service Code" }));
    expect(
      screen.getAllByRole("button", { name: "Remove Service Code" })
    ).toHaveLength(2);
  });

  it("removes the added row again", async () => {
    renderModal();
    fillPayerInfo();
    await goToServiceCodeTab();
    fireEvent.click(screen.getByRole("button", { name: "Add Service Code" }));
    fireEvent.click(
      screen.getAllByRole("button", { name: "Remove Service Code" })[1]
    );
    expect(
      screen.queryByRole("button", { name: "Remove Service Code" })
    ).not.toBeInTheDocument();
  });
});

describe("saving a payer", () => {
  it("hands the caller a payload shaped for the backend", async () => {
    renderModal();
    fillPayerInfo();
    await goToServiceCodeTab();
    fillServiceCode();
    fireEvent.click(primaryButton());

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const payload = onSave.mock.calls[0][0];
    expect(payload).toMatchObject({
      payerName: "Acme Health",
      email: "billing@acme.test",
      phoneNumber: "555-0100",
      insuranceType: "ins-1",
      tplCode: "TPL-9",
      carrierPayerId: "CPID-9",
      address: "1 Market St",
      city: "Arlington",
      state: "Virginia",
      zip: "22201",
      country: "United States",
    });
    // A code picked off the list is sent by id, with its modifiers flattened to
    // bare strings.
    expect(payload.serviceCodes[0]).toMatchObject({
      serviceCodeId: "sc-1",
      code: "97153",
      roundingRuleId: "rr-1",
      unitCurrency: "USD",
      ratePerUnit: 40,
      modifiers: ["HN"],
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("refuses to save a service code row that is still incomplete", async () => {
    renderModal();
    fillPayerInfo();
    await goToServiceCodeTab();
    fireEvent.click(primaryButton());
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps the modal open and reports a save the caller rejected", async () => {
    onSave.mockRejectedValue(new Error("Payer already exists"));
    renderModal();
    fillPayerInfo();
    await goToServiceCodeTab();
    fillServiceCode();
    fireEvent.click(primaryButton());

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Failed to save payer", "error")
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
