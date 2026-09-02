import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The "Income Items" tab of Payroll settings: one fetch, a permission-gated
 * row menu, the shared PayrollItemModal for add/view/edit and a delete
 * confirmation.
 *
 * Most of the branch weight is in `formatRateDisplay`, which turns a stored
 * rate object into the "Rate" column. A Percentage based item names the thing
 * it is a percentage OF by looking `rate.duration` up in the same response —
 * so the fixtures below include an item pointing at a sibling, one pointing at
 * the synthetic "basic_pay" reference, and one pointing at an id that is not in
 * the list.
 *
 * CustomTable and both modals are probes. The delete probe keeps its buttons
 * mounted while closed so the `!rowToDelete` guard in the confirm handler can
 * be reached at all; every other probe follows the usual open/closed pattern.
 */

const apiMock = vi.hoisted(() => ({
  GetIncomeItemsByTenantId: vi.fn(),
  UpdateIncomeItemsActiveness: vi.fn(),
  CreateIncomeItems: vi.fn(),
  UpdateIncomeItems: vi.fn(),
  DeleteIncomeItem: vi.fn(),
}));
vi.mock("../api/payrollApi", () => ({ default: apiMock }));

const toastMock = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toastMock.showToast(...a),
  showApiError: vi.fn(),
}));

const table = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/Table/CustomTable", () => ({
  default: (props) => {
    table.props = props;
    return (
      <div data-testid="table">
        {props.data.map((row) => (
          <div key={row.id} data-testid={`row-${row.id}`}>
            <span>{`${row.name}|${row.unitType}|${row.rates}|${String(row.status)}`}</span>
            {props.actions[0].items.map((item) => (
              <button key={item.label} onClick={() => item.onClick(row)}>
                {`${item.label} ${row.id}`}
              </button>
            ))}
            {props.onToggleActive && (
              <button onClick={() => props.onToggleActive(row)}>{`switch ${row.id}`}</button>
            )}
          </div>
        ))}
      </div>
    );
  },
}));

const itemModal = vi.hoisted(() => ({ props: null, payload: {} }));
vi.mock("../Components/ReusableModal/PayrollModal/NewIncomeItemModal", () => ({
  default: (props) => {
    itemModal.props = props;
    return props.isOpen ? (
      <div data-testid="item-modal">
        <button onClick={() => props.onSave(itemModal.payload)}>save-item</button>
        <button onClick={props.onClose}>close-item</button>
      </div>
    ) : null;
  },
}));

const deleteModal = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/ReusableModal/PipelineModal/DeleteConfirmationModal", () => ({
  default: (props) => {
    deleteModal.props = props;
    return (
      <div data-testid="delete-modal" data-open={String(props.isOpen)}>
        <button onClick={props.onConfirm}>confirm-delete</button>
        <button onClick={props.onClose}>close-delete</button>
      </div>
    );
  },
}));

import IncomeItems from "../Pages/Payroll/PayrollSetting/PayrollSettingsSubs/IncomeItems";

// One fixture per arm of formatRateDisplay plus the name/type/status fallbacks.
const ITEMS = [
  { id: "1", name: "Transport", type: "Flat Rate", rate: { rate: 250 }, isActive: true },
  { id: "2", type: "Percentage based", rate: { unit: 8, duration: "basic_pay" } },
  { id: "3", name: "Ref", type: "Percentage based", rate: { unit: 5, duration: "1" } },
  { id: "4", name: "Dangling", type: "Percentage based", rate: { unit: 5, duration: "gone" } },
  { id: "5", name: "No duration", type: "Percentage based", rate: {} },
  { id: "6", name: "Hourly", type: "Time based", rate: { unit: 20, duration: "hours" } },
  { id: "7", name: "Per minute", type: "Time based", rate: {} },
  { id: "8", name: "Free", type: "Flat Rate", rate: {} },
  { id: "9", name: "Untyped", isActive: false },
];

const makeStore = (permissions, tenantId) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user: {
          id: "user-1",
          tenantId,
          accessToken: "at",
          refreshToken: "rt",
          // An empty accesses array is the org-owner case: full access.
          role: permissions
            ? { roleModuleAccesses: [{ module: "PAYROLL", permissions }] }
            : { roleModuleAccesses: [] },
        },
      },
    },
  });

const renderPage = ({ permissions, tenantId = "tenant-1" } = {}) =>
  render(
    <Provider store={makeStore(permissions, tenantId)}>
      <IncomeItems />
    </Provider>
  );

const loaded = () => screen.findByTestId("row-1");

beforeEach(() => {
  vi.clearAllMocks();
  itemModal.payload = { name: "Bonus", unitType: "Flat Rate", rate: { rate: "500" }, status: true };
  apiMock.GetIncomeItemsByTenantId.mockResolvedValue({ data: ITEMS });
  apiMock.UpdateIncomeItemsActiveness.mockResolvedValue({});
  apiMock.CreateIncomeItems.mockResolvedValue({});
  apiMock.UpdateIncomeItems.mockResolvedValue({});
  apiMock.DeleteIncomeItem.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading the list", () => {
  it("asks for the tenant's income items once the tenant is known", async () => {
    renderPage();
    await loaded();
    expect(apiMock.GetIncomeItemsByTenantId).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(table.props.loading).toBe(false);
  });

  it("fetches nothing while the user has no tenant", async () => {
    renderPage({ tenantId: null });
    await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
    expect(apiMock.GetIncomeItemsByTenantId).not.toHaveBeenCalled();
    // The initial loading flag is never cleared, because nothing was fetched.
    expect(table.props.loading).toBe(true);
  });

  it("empties the table when the endpoint rejects", async () => {
    apiMock.GetIncomeItemsByTenantId.mockRejectedValue(new Error("down"));
    renderPage();
    await waitFor(() => expect(table.props.loading).toBe(false));
    expect(table.props.data).toEqual([]);
  });

  it("empties the table for a response with no list inside it", async () => {
    apiMock.GetIncomeItemsByTenantId.mockResolvedValue({ nope: true });
    renderPage();
    await waitFor(() => expect(table.props.loading).toBe(false));
    expect(table.props.data).toEqual([]);
  });
});

describe("the rate column", () => {
  it("prints a flat rate, falling back to zero when none is stored", async () => {
    renderPage();
    await loaded();
    expect(screen.getByTestId("row-1")).toHaveTextContent("Transport|Flat Rate|$250|true");
    expect(screen.getByTestId("row-8")).toHaveTextContent("Free|Flat Rate|$0|true");
  });

  it("names the synthetic basic-pay reference directly", async () => {
    renderPage();
    await loaded();
    expect(screen.getByTestId("row-2")).toHaveTextContent("Unknown|Percentage based|8% of Basic Pay");
  });

  it("names a sibling item a percentage points at", async () => {
    renderPage();
    await loaded();
    expect(screen.getByTestId("row-3")).toHaveTextContent("5% of Transport");
  });

  it("says Unknown Item for a reference that is no longer in the list", async () => {
    renderPage();
    await loaded();
    expect(screen.getByTestId("row-4")).toHaveTextContent("5% of Unknown Item");
    expect(screen.getByTestId("row-5")).toHaveTextContent("0% of Unknown Item");
  });

  it("reads a time-based rate per hour or per minute", async () => {
    renderPage();
    await loaded();
    expect(screen.getByTestId("row-6")).toHaveTextContent("$20 per hour");
    expect(screen.getByTestId("row-7")).toHaveTextContent("$0 per minute");
  });

  it("leaves the rate blank for an item with no type at all", async () => {
    renderPage();
    await loaded();
    expect(screen.getByTestId("row-9")).toHaveTextContent("Untyped|||false");
  });
});

describe("the row menu", () => {
  it("offers view, edit and delete to a role that may edit", async () => {
    renderPage();
    await loaded();
    expect(screen.getByText("View 1")).toBeInTheDocument();
    expect(screen.getByText("Edit 1")).toBeInTheDocument();
    expect(screen.getByText("Delete 1")).toBeInTheDocument();
  });

  it("leaves only View to a role that may not edit", async () => {
    renderPage({ permissions: ["add_income_item"] });
    await loaded();
    expect(screen.getByText("View 1")).toBeInTheDocument();
    expect(screen.queryByText("Edit 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete 1")).not.toBeInTheDocument();
  });

  it("opens the modal read-only on View", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByText("View 1"));
    expect(itemModal.props.mode).toBe("view");
    expect(itemModal.props.initialData).toMatchObject({ id: "1", name: "Transport" });
    expect(itemModal.props.isDeduction).toBe(false);
  });

  it("opens the modal for editing on Edit", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByText("Edit 1"));
    expect(itemModal.props.mode).toBe("edit");
    expect(itemModal.props.existingItems).toHaveLength(ITEMS.length);
  });
});

describe("adding and editing an item", () => {
  it("hides the add button from a role without the permission", async () => {
    renderPage({ permissions: ["edit_income_item"] });
    await loaded();
    expect(screen.queryByRole("button", { name: "Add an Income Item" })).not.toBeInTheDocument();
  });

  it("opens a blank modal from the add button", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Add an Income Item" }));
    expect(itemModal.props.mode).toBe("add");
    expect(itemModal.props.initialData).toEqual({});
  });

  it("creates a flat-rate item and reloads the list", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Add an Income Item" }));
    fireEvent.click(screen.getByText("save-item"));
    await waitFor(() =>
      expect(apiMock.CreateIncomeItems).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        name: "Bonus",
        type: "Flat Rate",
        rate: { rate: 500 },
        isActive: true,
        isDeleted: false,
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    // The modal closes and the list reloads only once the create resolves, so
    // the call having been made is not yet proof either has happened.
    await waitFor(() =>
      expect(screen.queryByTestId("item-modal")).not.toBeInTheDocument()
    );
    expect(toastMock.showToast).toHaveBeenCalledWith("Income item created successfully", "success");
    expect(apiMock.GetIncomeItemsByTenantId.mock.calls.length).toBeGreaterThan(1);
  });

  it("zeroes a flat rate that is not a number", async () => {
    itemModal.payload = { name: "Bonus", unitType: "Flat Rate", rate: { rate: "" }, status: true };
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Add an Income Item" }));
    fireEvent.click(screen.getByText("save-item"));
    await waitFor(() =>
      expect(apiMock.CreateIncomeItems).toHaveBeenCalledWith(
        expect.objectContaining({ rate: { rate: 0 } })
      )
    );
  });

  it("sends the three time-based fields together", async () => {
    itemModal.payload = {
      name: "Overtime",
      unitType: "Time based",
      rate: { unit: "30", unitMinutes: "15", duration: "minutes" },
      status: false,
    };
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Add an Income Item" }));
    fireEvent.click(screen.getByText("save-item"));
    await waitFor(() =>
      expect(apiMock.CreateIncomeItems).toHaveBeenCalledWith(
        expect.objectContaining({
          rate: { unit: 30, unitMinutes: 15, duration: "minutes" },
          isActive: false,
        })
      )
    );
  });

  it("defaults every missing time-based field", async () => {
    itemModal.payload = { name: "Overtime", unitType: "Time based", rate: {}, status: true };
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Add an Income Item" }));
    fireEvent.click(screen.getByText("save-item"));
    await waitFor(() =>
      expect(apiMock.CreateIncomeItems).toHaveBeenCalledWith(
        expect.objectContaining({ rate: { unit: 0, unitMinutes: 0, duration: "" } })
      )
    );
  });

  it("sends the percentage pair and nothing else", async () => {
    itemModal.payload = {
      name: "Pension",
      unitType: "Percentage based",
      rate: { unit: "8", duration: "basic_pay" },
      status: true,
    };
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Add an Income Item" }));
    fireEvent.click(screen.getByText("save-item"));
    await waitFor(() =>
      expect(apiMock.CreateIncomeItems).toHaveBeenCalledWith(
        expect.objectContaining({ rate: { unit: 8, duration: "basic_pay" } })
      )
    );
  });

  it("sends an empty rate for a type it does not recognise", async () => {
    itemModal.payload = { name: "Odd", unitType: "Something else", rate: {}, status: true };
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Add an Income Item" }));
    fireEvent.click(screen.getByText("save-item"));
    await waitFor(() =>
      expect(apiMock.CreateIncomeItems).toHaveBeenCalledWith(expect.objectContaining({ rate: {} }))
    );
  });

  it("updates the clicked row and carries its id", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByText("Edit 1"));
    fireEvent.click(screen.getByText("save-item"));
    await waitFor(() =>
      expect(apiMock.UpdateIncomeItems).toHaveBeenCalledWith(expect.objectContaining({ id: "1" }))
    );
    expect(toastMock.showToast).toHaveBeenCalledWith("Income item updated successfully", "success");
    expect(apiMock.CreateIncomeItems).not.toHaveBeenCalled();
  });

  it("reports a failed create and leaves the modal open", async () => {
    apiMock.CreateIncomeItems.mockRejectedValue(new Error("nope"));
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Add an Income Item" }));
    fireEvent.click(screen.getByText("save-item"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Failed to create income item", "error")
    );
    expect(screen.getByTestId("item-modal")).toBeInTheDocument();
  });

  it("reports a failed update", async () => {
    apiMock.UpdateIncomeItems.mockRejectedValue(new Error("nope"));
    renderPage();
    await loaded();
    fireEvent.click(screen.getByText("Edit 1"));
    fireEvent.click(screen.getByText("save-item"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Failed to update income item", "error")
    );
  });

  it("closes the modal on its own close handler", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Add an Income Item" }));
    fireEvent.click(screen.getByText("close-item"));
    expect(screen.queryByTestId("item-modal")).not.toBeInTheDocument();
  });
});

describe("the status switch", () => {
  it("deactivates an active item and reloads", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByText("switch 1"));
    await waitFor(() =>
      expect(apiMock.UpdateIncomeItemsActiveness).toHaveBeenCalledWith({
        id: "1",
        isActive: false,
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toastMock.showToast).toHaveBeenCalledWith(
      "Income item deactivated successfully",
      "success"
    );
  });

  it("activates an inactive item", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByText("switch 9"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        "Income item activated successfully",
        "success"
      )
    );
  });

  it("reports a failed toggle", async () => {
    apiMock.UpdateIncomeItemsActiveness.mockRejectedValue(new Error("nope"));
    renderPage();
    await loaded();
    fireEvent.click(screen.getByText("switch 1"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        "Failed to update income item status",
        "error"
      )
    );
  });

  it("withholds the switch from a role that may not deactivate", async () => {
    renderPage({ permissions: ["edit_income_item"] });
    await loaded();
    expect(table.props.onToggleActive).toBeUndefined();
    expect(screen.queryByText("switch 1")).not.toBeInTheDocument();
  });
});

describe("deleting an item", () => {
  it("names the row in the confirmation and deletes it", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByText("Delete 1"));
    expect(deleteModal.props.isOpen).toBe(true);
    expect(deleteModal.props.message).toContain("Transport");
    fireEvent.click(screen.getByText("confirm-delete"));
    await waitFor(() =>
      expect(apiMock.DeleteIncomeItem).toHaveBeenCalledWith({
        id: "1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toastMock.showToast).toHaveBeenCalledWith("Income item deleted successfully", "success");
    await waitFor(() => expect(deleteModal.props.isOpen).toBe(false));
  });

  it("falls back to a generic noun while no row is queued", async () => {
    renderPage();
    await loaded();
    expect(deleteModal.props.message).toContain("this income item");
  });

  it("does nothing when confirmed with no row queued", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByText("confirm-delete"));
    await waitFor(() => expect(deleteModal.props.loading).toBe(false));
    expect(apiMock.DeleteIncomeItem).not.toHaveBeenCalled();
  });

  it("surfaces the server's own message on a failed delete", async () => {
    apiMock.DeleteIncomeItem.mockRejectedValue(new Error("row is referenced"));
    renderPage();
    await loaded();
    fireEvent.click(screen.getByText("Delete 1"));
    fireEvent.click(screen.getByText("confirm-delete"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("row is referenced", "error")
    );
    expect(deleteModal.props.isOpen).toBe(true);
  });

  it("falls back to a generic message when the failure carries none", async () => {
    apiMock.DeleteIncomeItem.mockRejectedValue({});
    renderPage();
    await loaded();
    fireEvent.click(screen.getByText("Delete 1"));
    fireEvent.click(screen.getByText("confirm-delete"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Failed to delete income item", "error")
    );
  });

  it("drops the queued row when the confirmation is dismissed", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByText("Delete 1"));
    fireEvent.click(screen.getByText("close-delete"));
    expect(deleteModal.props.isOpen).toBe(false);
  });
});
