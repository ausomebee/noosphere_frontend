import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import AddPayerModal from "../Components/ReusableModal/BillingAndPaymentModal/AddPayerModal";
import formDraftsReducer from "../ReduxStore/features/formDraftsSlice";

/**
 * First coverage for AddPayerModal, added alongside the extraction of
 * ServiceCodeModifiers out of a Controller render prop.
 *
 * These are behaviour-preservation tests, not a bug reproduction: the old
 * arrangement was a lint violation rather than a live crash, and it passes
 * these same tests. What they pin down is that the refactor kept the modifier
 * rows working — add, remove, a second service code on top of existing
 * modifiers, and the read-only view mode.
 */

const noop = () => {};

const renderModal = (props = {}) => {
  const store = configureStore({ reducer: { formDrafts: formDraftsReducer } });
  const view = render(
    <Provider store={store}>
      <AddPayerModal
        isOpen
        onClose={noop}
        onSave={noop}
        mode="add"
        insuranceTypes={[{ id: "i1", name: "PPO" }]}
        serviceCodes={[{ id: "sc1", code: "97153", description: "Direct" }]}
        roundingRules={[{ id: "r1", name: "8-minute rule" }]}
        {...props}
      />
    </Provider>
  );
  return { ...view, store };
};

// The service-code fields live on the second tab.
const openServiceCodeTab = () => {
  fireEvent.click(screen.getByRole("tab", { name: /service code/i }));
};

const modifierRows = () =>
  document.body.querySelectorAll('[aria-label="Remove Modifier"]');

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

describe("AddPayerModal service-code modifiers", () => {
  it("opens on the payer info tab", () => {
    renderModal();
    expect(screen.getByRole("tab", { name: /payer info/i })).toBeInTheDocument();
  });

  it("adds a modifier row without tearing the modal down", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderModal();
    openServiceCodeTab();

    const before = modifierRows().length;
    fireEvent.click(screen.getAllByText("Add Modifier")[0]);
    expect(modifierRows().length).toBe(before + 1);

    // Guards against a hook-order regression, which surfaces as a React
    // error rather than a thrown assertion.
    expect(spy).not.toHaveBeenCalledWith(
      expect.stringContaining("Rendered more hooks")
    );
    spy.mockRestore();
  });

  it("removes a modifier row again", () => {
    renderModal();
    openServiceCodeTab();

    fireEvent.click(screen.getAllByText("Add Modifier")[0]);
    fireEvent.click(screen.getAllByText("Add Modifier")[0]);
    const withTwo = modifierRows().length;
    expect(withTwo).toBeGreaterThanOrEqual(2);

    fireEvent.click(modifierRows()[0]);
    expect(modifierRows().length).toBe(withTwo - 1);
  });

  it("adds a second service code while the first already has modifiers", () => {
    // The sequence most likely to expose a hook-order problem: a service code
    // carrying modifiers, then another service code appended alongside it.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderModal();
    openServiceCodeTab();

    fireEvent.click(screen.getAllByText("Add Modifier")[0]);
    fireEvent.click(screen.getByText("Add Service Code"));

    expect(screen.getAllByText("Add Modifier").length).toBeGreaterThan(1);
    expect(spy).not.toHaveBeenCalledWith(
      expect.stringContaining("Rendered more hooks")
    );
    spy.mockRestore();
  });

  it("hides the row controls in view mode", () => {
    renderModal({
      mode: "view",
      initialData: {
        name: "Acme Health",
        serviceCodes: [
          { codeSelection: "97153", ratePerUnit: 10, modifiers: [{ modifier: "HN", ratePerUnit: 5 }] },
        ],
      },
    });
    openServiceCodeTab();
    expect(modifierRows().length).toBe(0);
  });
});
