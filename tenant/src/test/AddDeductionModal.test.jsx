import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

/**
 * The payroll "Add Deduction" picker: a single react-select over the tenant's
 * deductions, which the caller may hand in already fetched or leave the modal
 * to fetch for itself.
 *
 * The interesting part is the option label. Each deduction's rate is rendered
 * differently depending on its type -- a flat dollar amount, a percentage, or a
 * per-duration rate -- and a deduction of any other type gets an empty pair of
 * brackets. Every one of those shapes, plus the zero and "hour" fallbacks for a
 * rate object that is missing its numbers, is a separate fixture below.
 *
 * `prefetchedItems` is a dependency of the fetch effect, so it is always passed
 * from a module-level constant here; a fresh array literal on each render would
 * re-run the fetch forever.
 */

const payroll = vi.hoisted(() => ({ getDeductions: vi.fn() }));
vi.mock("../api/payrollApi", () => ({
  default: { GetDeductionsByTenantId: payroll.getDeductions },
}));

const toast = vi.hoisted(() => ({ showToast: vi.fn(), showApiError: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: (...a) => toast.showApiError(...a),
}));

import AddDeductionModal from "../Components/ReusableModal/PayrollModal/AddDeductionModal";

const flatItem = {
  id: "ded-1",
  name: "Health insurance",
  type: "Flat Rate",
  rate: { rate: 500 },
};
const percentItem = {
  id: "ded-2",
  name: "Tax withholding",
  type: "Percentage based",
  rate: { unit: 12 },
};
const timeItem = {
  id: "ded-3",
  name: "Unpaid leave",
  type: "Time based",
  rate: { unit: 45, duration: "day" },
};

// Effect dependency: never a fresh literal.
const NOT_PREFETCHED = undefined;

const renderModal = ({ prefetchedItems = NOT_PREFETCHED, ...props } = {}) => {
  const onSave = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <AddDeductionModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      tenantId="tenant-1"
      accessToken="access-1"
      refreshToken="refresh-1"
      prefetchedItems={prefetchedItems}
      {...props}
    />
  );
  return { ...view, onSave, onClose };
};

const picker = () => document.body.querySelector(".select-input-wrapper");

const openMenu = () => {
  const input = picker().querySelector("input");
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
};

const lastMenu = () => {
  const menus = document.body.querySelectorAll(".rs__menu");
  return menus[menus.length - 1];
};

const menuLabels = () => {
  const menu = lastMenu();
  const options = menu.querySelectorAll(".rs__option");
  return options.length ? Array.from(options).map((o) => o.textContent) : [menu.textContent];
};

const choose = (label) => {
  openMenu();
  const option = Array.from(lastMenu().querySelectorAll(".rs__option")).find(
    (o) => o.textContent === label
  );
  if (!option) throw new Error(`no option "${label}"`);
  fireEvent.click(option);
};

const chosen = () => picker().querySelector(".rs__single-value")?.textContent ?? "";
const primary = () => document.body.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.body.querySelector(".modal-btn-secondary");
const submit = async () => act(async () => { fireEvent.click(primary()); });

beforeEach(() => {
  vi.clearAllMocks();
  payroll.getDeductions.mockResolvedValue({ data: [flatItem] });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the modal shell", () => {
  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(document.body.querySelector(".modal-content")).toBeNull();
    expect(payroll.getDeductions).not.toHaveBeenCalled();
  });

  it("titles itself and opens on no selection", async () => {
    renderModal();
    await waitFor(() => expect(payroll.getDeductions).toHaveBeenCalled());
    expect(document.body.querySelector(".modal-title-text")).toHaveTextContent(
      "Add Deduction"
    );
    expect(primary()).toHaveTextContent("Continue");
    expect(chosen()).toBe("");
  });

  it("closes and clears from Cancel", async () => {
    const { onClose, onSave } = renderModal();
    await waitFor(() => expect(picker()).not.toBeNull());
    choose("Health insurance ($500)");
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
    expect(chosen()).toBe("");
  });

  it("locks the Continue button while the caller is saving", async () => {
    renderModal({ loading: true });
    await waitFor(() => expect(payroll.getDeductions).toHaveBeenCalled());
    expect(primary()).toBeDisabled();
  });
});

describe("loading the deductions", () => {
  it("fetches with the tenant and tokens it was handed", async () => {
    renderModal();
    await waitFor(() =>
      expect(payroll.getDeductions).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        accessToken: "access-1",
        refreshToken: "refresh-1",
      })
    );
  });

  it("fetches nothing without a tenant", async () => {
    renderModal({ tenantId: null });
    await waitFor(() => expect(picker()).not.toBeNull());
    expect(payroll.getDeductions).not.toHaveBeenCalled();
  });

  it("shows a loader in place of the picker until the fetch settles", async () => {
    let release;
    payroll.getDeductions.mockReturnValue(new Promise((r) => { release = r; }));
    renderModal();
    expect(await screen.findByRole("status")).toBeInTheDocument();
    expect(picker()).toBeNull();
    await act(async () => { release({ data: [flatItem] }); });
    expect(screen.queryByRole("status")).toBeNull();
    expect(picker()).not.toBeNull();
  });

  it("reads a response that is a bare list", async () => {
    payroll.getDeductions.mockResolvedValue([percentItem]);
    renderModal();
    await waitFor(() => expect(picker()).not.toBeNull());
    openMenu();
    await waitFor(() => expect(menuLabels()).toEqual(["Tax withholding (12%)"]));
  });

  it("treats a response that is neither a list nor a wrapper as empty", async () => {
    payroll.getDeductions.mockResolvedValue({ items: [flatItem] });
    renderModal();
    await waitFor(() => expect(picker()).not.toBeNull());
    openMenu();
    expect(menuLabels()[0]).toContain("No deductions found");
  });

  it("treats an empty response as no items at all", async () => {
    payroll.getDeductions.mockResolvedValue(null);
    renderModal();
    await waitFor(() => expect(picker()).not.toBeNull());
    openMenu();
    expect(menuLabels()[0]).toContain("No deductions found");
  });

  it("reports a failed fetch and leaves the picker empty", async () => {
    const err = new Error("500");
    payroll.getDeductions.mockRejectedValue(err);
    renderModal();
    await waitFor(() =>
      expect(toast.showApiError).toHaveBeenCalledWith(err, "LOAD_DEDUCTIONS")
    );
    openMenu();
    expect(menuLabels()[0]).toContain("No deductions found");
  });

  it("skips the fetch entirely when the caller prefetched the items", async () => {
    const PREFETCHED = [percentItem];
    renderModal({ prefetchedItems: PREFETCHED });
    await waitFor(() => expect(picker()).not.toBeNull());
    expect(payroll.getDeductions).not.toHaveBeenCalled();
    openMenu();
    expect(menuLabels()).toEqual(["Tax withholding (12%)"]);
  });

  // An empty prefetched array means "the caller has nothing", not "do not
  // fetch", so the modal falls back to fetching for itself.
  it("fetches anyway when the prefetched list is empty", async () => {
    const NONE_PREFETCHED = [];
    renderModal({ prefetchedItems: NONE_PREFETCHED });
    await waitFor(() => expect(picker()).not.toBeNull());
    openMenu();
    await waitFor(() => expect(menuLabels()).toEqual(["Health insurance ($500)"]));
  });
});

describe("the option labels", () => {
  const openOn = async (items) => {
    const view = renderModal({ prefetchedItems: items });
    await waitFor(() => expect(picker()).not.toBeNull());
    openMenu();
    return view;
  };

  const FLAT = [flatItem];
  const PERCENT = [percentItem];
  const TIMED = [timeItem];
  const UNTYPED = [{ id: "ded-4", name: "Union dues", type: "Other" }];
  const RATELESS = [
    { id: "ded-5", name: "Flat, no rate", type: "Flat Rate" },
    { id: "ded-6", name: "Percent, no unit", type: "Percentage based", rate: {} },
    { id: "ded-7", name: "Timed, no unit", type: "Time based", rate: {} },
  ];

  it("prices a flat rate deduction in dollars", async () => {
    await openOn(FLAT);
    expect(menuLabels()).toEqual(["Health insurance ($500)"]);
  });

  it("prices a percentage deduction as a percentage", async () => {
    await openOn(PERCENT);
    expect(menuLabels()).toEqual(["Tax withholding (12%)"]);
  });

  it("prices a time based deduction per its own duration", async () => {
    await openOn(TIMED);
    expect(menuLabels()).toEqual(["Unpaid leave ($45 per day)"]);
  });

  it("leaves the brackets empty for a deduction of an unrecognised type", async () => {
    await openOn(UNTYPED);
    expect(menuLabels()).toEqual(["Union dues ()"]);
  });

  it("falls back to zero, and to an hour, for a deduction with no numbers", async () => {
    await openOn(RATELESS);
    expect(menuLabels()).toEqual([
      "Flat, no rate ($0)",
      "Percent, no unit (0%)",
      "Timed, no unit ($0 per hour)",
    ]);
  });

  it("hides a deduction that has been switched off", async () => {
    const MIXED = [flatItem, { ...percentItem, isActive: false }, { ...timeItem, isActive: true }];
    await openOn(MIXED);
    expect(menuLabels()).toEqual(["Health insurance ($500)", "Unpaid leave ($45 per day)"]);
  });
});

describe("choosing a deduction", () => {
  it("refuses to continue with nothing chosen", async () => {
    const { onSave, onClose } = renderModal();
    await waitFor(() => expect(payroll.getDeductions).toHaveBeenCalled());
    await submit();
    expect(await screen.findByText("Please select a deduction item")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(toast.showToast).toHaveBeenCalledWith("Please select a deduction item", "error");
  });

  it("hands the whole deduction back and closes", async () => {
    const { onSave, onClose } = renderModal();
    await waitFor(() => expect(picker()).not.toBeNull());
    choose("Health insurance ($500)");
    expect(chosen()).toBe("Health insurance ($500)");
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(flatItem));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(chosen()).toBe("");
  });

  // The chosen id is looked up in a map rebuilt from the current list, so a
  // deduction that disappears between choosing and continuing closes the modal
  // without saving anything.
  it("saves nothing when the chosen deduction is no longer on offer", async () => {
    const FIRST = [flatItem];
    const REPLACED = [percentItem];
    const onSave = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(
      <AddDeductionModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        tenantId="tenant-1"
        prefetchedItems={FIRST}
      />
    );
    await waitFor(() => expect(picker()).not.toBeNull());
    choose("Health insurance ($500)");
    rerender(
      <AddDeductionModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        tenantId="tenant-1"
        prefetchedItems={REPLACED}
      />
    );
    await submit();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSave).not.toHaveBeenCalled();
  });
});
