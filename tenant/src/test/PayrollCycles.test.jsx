import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The "Payroll Cycles" tab of Payroll settings: one fetch, a row menu whose
 * second entry is labelled from the row itself (Deactivate vs Activate), and
 * the cycle modal for add and edit.
 *
 * The transform between the endpoint and the table is where the branches are:
 * an interval of 1 is pluralised differently, `autoRun` and `isActive` are only
 * defaulted when they are genuinely absent rather than false, and the raw
 * record is kept alongside the display fields.
 *
 * Editing carries the row's current active flag into the payload, so an edit of
 * a deactivated cycle must not silently reactivate it — that is asserted rather
 * than assumed. CustomTable and the modal are probes; the table probe calls the
 * item's label function per row, since a static string would hide that arm.
 */

const apiMock = vi.hoisted(() => ({
  GetPayrollCycleByTenantId: vi.fn(),
  UpdatePayrollCycleActiveness: vi.fn(),
  CreatePayrollCycles: vi.fn(),
  UpdatePayrollCycles: vi.fn(),
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
            <span>
              {`${row.name}|${row.periodInterval}|${row.autoRunPayroll}|${String(row.status)}`}
            </span>
            {props.actions[0].items.map((item, i) => (
              <button key={i} onClick={() => item.onClick(row)}>
                {`${typeof item.label === "function" ? item.label(row) : item.label} ${row.id}`}
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

const cycleModal = vi.hoisted(() => ({ props: null, payload: {} }));
vi.mock("../Components/ReusableModal/PayrollModal/NewPayrollCycleModal", () => ({
  default: (props) => {
    cycleModal.props = props;
    return props.isOpen ? (
      <div data-testid="cycle-modal">
        <button onClick={() => props.onSave(cycleModal.payload)}>save-cycle</button>
        <button onClick={props.onClose}>close-cycle</button>
      </div>
    ) : null;
  },
}));

import PayrollCycles from "../Pages/Payroll/PayrollSetting/PayrollSettingsSubs/PayrollCycles";

const CYCLES = [
  {
    id: "1",
    name: "Month end",
    compensationType: "SALARIED",
    interval: 30,
    startDate: "2026-05-01",
    autoRun: true,
    isActive: true,
  },
  // Everything optional left out: name, type, interval, start date, autoRun and
  // isActive all fall back — and an interval of 1 is the singular arm.
  { id: "2" },
  { id: "3", name: "Weekly", interval: 1, autoRun: false, isActive: false },
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
      <PayrollCycles />
    </Provider>
  );

const loaded = () => screen.findByTestId("row-1");
const addButton = () => screen.getByRole("button", { name: "Add a new Cycle" });

beforeEach(() => {
  vi.clearAllMocks();
  cycleModal.payload = {
    name: "Fortnightly",
    appliesTo: "HOURLY",
    intervals: "14",
    startDate: "2026-07-01",
    autoRun: true,
  };
  apiMock.GetPayrollCycleByTenantId.mockResolvedValue({ data: CYCLES });
  apiMock.UpdatePayrollCycleActiveness.mockResolvedValue({});
  apiMock.CreatePayrollCycles.mockResolvedValue({});
  apiMock.UpdatePayrollCycles.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading the cycles", () => {
  it("asks for the tenant's cycles once the tenant is known", async () => {
    renderPage();
    await loaded();
    expect(apiMock.GetPayrollCycleByTenantId).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      accessToken: "at",
      refreshToken: "rt",
    });
  });

  it("fetches nothing while the user has no tenant", async () => {
    renderPage({ tenantId: null });
    await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
    expect(apiMock.GetPayrollCycleByTenantId).not.toHaveBeenCalled();
    expect(table.props.loading).toBe(true);
  });

  it("prints the interval, auto-run flag and status of a full record", async () => {
    renderPage();
    await loaded();
    expect(screen.getByTestId("row-1")).toHaveTextContent("Month end|30 days|Enabled|true");
    expect(table.props.data[0]).toMatchObject({
      compensationType: "SALARIED",
      intervals: 30,
      startDate: "2026-05-01",
      autoRun: true,
      hasActions: true,
      fullData: CYCLES[0],
    });
  });

  it("defaults every field a bare record leaves out", async () => {
    renderPage();
    await loaded();
    expect(screen.getByTestId("row-2")).toHaveTextContent("Unknown|1 days|Disabled|true");
    expect(table.props.data[1]).toMatchObject({
      compensationType: "",
      intervals: 1,
      startDate: "",
      autoRun: false,
    });
  });

  it("keeps an explicit false for auto-run and status, and singularises one day", async () => {
    renderPage();
    await loaded();
    expect(screen.getByTestId("row-3")).toHaveTextContent("Weekly|1 day|Disabled|false");
  });

  it("empties the table when the endpoint rejects", async () => {
    apiMock.GetPayrollCycleByTenantId.mockRejectedValue(new Error("down"));
    renderPage();
    await waitFor(() => expect(table.props.loading).toBe(false));
    expect(table.props.data).toEqual([]);
  });

  it("empties the table for a response with no list inside it", async () => {
    apiMock.GetPayrollCycleByTenantId.mockResolvedValue({ nope: true });
    renderPage();
    await waitFor(() => expect(table.props.loading).toBe(false));
    expect(table.props.data).toEqual([]);
  });
});

describe("the row menu", () => {
  it("labels the toggle from the row's own status", async () => {
    renderPage();
    await loaded();
    expect(screen.getByText("Deactivate 1")).toBeInTheDocument();
    expect(screen.getByText("Activate 3")).toBeInTheDocument();
  });

  it("offers nothing to a role with neither payroll-cycle permission", async () => {
    renderPage({ permissions: ["create_payroll_cycle"] });
    await loaded();
    expect(table.props.actions[0].items).toHaveLength(0);
    expect(screen.queryByText("Edit 1")).not.toBeInTheDocument();
  });

  it("offers only Edit to a role that may not deactivate", async () => {
    renderPage({ permissions: ["edit_payroll_cycle"] });
    await loaded();
    expect(screen.getByText("Edit 1")).toBeInTheDocument();
    expect(screen.queryByText("Deactivate 1")).not.toBeInTheDocument();
    expect(table.props.onToggleActive).toBeUndefined();
  });

  it("opens the modal on the clicked row", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByText("Edit 1"));
    expect(cycleModal.props.mode).toBe("edit");
    expect(cycleModal.props.initialData).toMatchObject({ id: "1", name: "Month end" });
  });
});

describe("activating and deactivating", () => {
  it("deactivates an active cycle from the row menu and reloads", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByText("Deactivate 1"));
    await waitFor(() =>
      expect(apiMock.UpdatePayrollCycleActiveness).toHaveBeenCalledWith({
        id: "1",
        isActive: false,
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toastMock.showToast).toHaveBeenCalledWith(
      "Payroll cycle deactivated successfully",
      "success"
    );
    expect(apiMock.GetPayrollCycleByTenantId.mock.calls.length).toBeGreaterThan(1);
  });

  it("activates an inactive cycle from the status switch", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByText("switch 3"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        "Payroll cycle activated successfully",
        "success"
      )
    );
  });

  it("reports a failed toggle", async () => {
    apiMock.UpdatePayrollCycleActiveness.mockRejectedValue(new Error("nope"));
    renderPage();
    await loaded();
    fireEvent.click(screen.getByText("switch 1"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        "Failed to update payroll cycle status",
        "error"
      )
    );
  });
});

describe("adding and editing a cycle", () => {
  it("hides the add button from a role without the permission", async () => {
    renderPage({ permissions: ["edit_payroll_cycle"] });
    await loaded();
    expect(screen.queryByRole("button", { name: "Add a new Cycle" })).not.toBeInTheDocument();
  });

  it("opens a blank modal from the add button", async () => {
    renderPage();
    await loaded();
    fireEvent.click(addButton());
    expect(cycleModal.props.mode).toBe("add");
    expect(cycleModal.props.initialData).toEqual({});
  });

  it("creates a cycle and reloads the list", async () => {
    renderPage();
    await loaded();
    fireEvent.click(addButton());
    fireEvent.click(screen.getByText("save-cycle"));
    await waitFor(() =>
      expect(apiMock.CreatePayrollCycles).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        name: "Fortnightly",
        compensationType: "HOURLY",
        interval: 14,
        startDate: "2026-07-01",
        autoRun: true,
        isActive: true,
        isDeleted: false,
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toastMock.showToast).toHaveBeenCalledWith(
      "Payroll cycle created successfully",
      "success"
    );
    expect(screen.queryByTestId("cycle-modal")).not.toBeInTheDocument();
    expect(apiMock.GetPayrollCycleByTenantId.mock.calls.length).toBeGreaterThan(1);
  });

  it("keeps a deactivated cycle deactivated through an edit", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByText("Edit 3"));
    fireEvent.click(screen.getByText("save-cycle"));
    await waitFor(() =>
      expect(apiMock.UpdatePayrollCycles).toHaveBeenCalledWith(
        expect.objectContaining({ id: "3", isActive: false })
      )
    );
    expect(toastMock.showToast).toHaveBeenCalledWith(
      "Payroll cycle updated successfully",
      "success"
    );
    expect(apiMock.CreatePayrollCycles).not.toHaveBeenCalled();
  });

  it("reports a failed create and leaves the modal open", async () => {
    apiMock.CreatePayrollCycles.mockRejectedValue(new Error("nope"));
    renderPage();
    await loaded();
    fireEvent.click(addButton());
    fireEvent.click(screen.getByText("save-cycle"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Failed to create payroll cycle", "error")
    );
    expect(screen.getByTestId("cycle-modal")).toBeInTheDocument();
  });

  it("reports a failed update", async () => {
    apiMock.UpdatePayrollCycles.mockRejectedValue(new Error("nope"));
    renderPage();
    await loaded();
    fireEvent.click(screen.getByText("Edit 1"));
    fireEvent.click(screen.getByText("save-cycle"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Failed to update payroll cycle", "error")
    );
  });

  it("closes the modal on its own close handler", async () => {
    renderPage();
    await loaded();
    fireEvent.click(addButton());
    fireEvent.click(screen.getByText("close-cycle"));
    expect(screen.queryByTestId("cycle-modal")).not.toBeInTheDocument();
  });
});
