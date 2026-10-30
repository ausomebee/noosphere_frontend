import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The Payroll tab of a single staff member's Organisation profile: a settings
 * card, a history table and the shared PayrollModal opened either for editing
 * the settings or for viewing one historical cycle.
 *
 * Two independent fetches run on mount. Both are deliberately forgiving — a
 * staff member with no payroll configured yet is a valid empty state, so the
 * settings fetch swallows its own rejection and resets the card instead of
 * raising the error banner. The banner is only reachable from a failed *save*.
 *
 * The settings response is only trusted when it is `{status: "ok"}` wrapping a
 * non-empty array, so the fixtures below cover the not-ok, not-an-array and
 * empty-array shapes as well as the happy one.
 *
 * `savePayroll` re-throws so the modal can show the message itself; the modal
 * probe swallows that rejection or the click leaves one unhandled.
 */

const apiMock = vi.hoisted(() => ({
  GetAllStaffPayrollById: vi.fn(),
  GetStaffPayrollCycleStats: vi.fn(),
  UpdateTenantStaffPayroll: vi.fn(),
}));
vi.mock("../api/organisationStaffApis", () => ({ default: apiMock }));

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useParams: () => ({ tenantStaffId: "staff-1" }),
}));

const table = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/Table/CustomTable", () => ({
  default: (props) => {
    table.props = props;
    return (
      <div data-testid="history-table">
        {props.data.map((row) => (
          <button key={row.id} onClick={() => props.onActionClick(row)}>
            {`${props.actionText} ${row.id}`}
          </button>
        ))}
      </div>
    );
  },
}));

const modal = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/ReusableModal/OrganizationModal/PayRollModal", () => ({
  default: (props) => {
    modal.props = props;
    return props.isOpen ? (
      <div data-testid="payroll-modal">
        <button
          onClick={() =>
            Promise.resolve(
              props.onSave({ id: props.payrollSettings.id, payroll: { ratePerHour: "50" } })
            ).catch(() => {})
          }
        >
          save-payroll
        </button>
        <button onClick={props.onClose}>close-payroll</button>
      </div>
    ) : null;
  },
}));

import Payroll from "../Pages/Organisation/StaffAndTeams/StaffSingleTabs/Payroll";

const settingsResponse = (over = {}) => ({
  data: {
    status: "ok",
    data: [
      {
        id: "p1",
        paymentSchedule: "SALARIED",
        ratePerHour: "40",
        minimumHours: "160",
        incomeItems: [
          { id: "i1", name: "Transport", type: "Flat Rate", rate: { rate: 250 } },
          { id: "i2", name: "Pension", type: "Percentage based", rate: {} },
          { id: "i3", name: "Overtime", type: "Time based", rate: { unit: 20 } },
          { id: "i4", name: "Mystery", type: "Odd" },
        ],
        deductions: [{ id: "d1", name: "Tax", type: "Flat Rate", rate: {} }],
        ...over,
      },
    ],
  },
});

const historyResponse = (rows) => ({ data: { status: "ok", data: rows } });

const makeStore = (permissions) =>
  configureStore({
    reducer: { authentication: authReducer, generalSettings: generalSettingsReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user: {
          id: "user-1",
          tenantId: "tenant-1",
          accessToken: "at",
          refreshToken: "rt",
          // An empty accesses array is the org-owner case: full access.
          role: permissions
            ? { roleModuleAccesses: [{ module: "MY_ORGANIZATION", permissions }] }
            : { roleModuleAccesses: [] },
        },
      },
      generalSettings: {
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12-hour",
        currency: "USD",
        loaded: true,
      },
    },
  });

const renderTab = ({ permissions } = {}) =>
  render(
    <Provider store={makeStore(permissions)}>
      <Payroll />
    </Provider>
  );

// The card, not the heading: the heading renders before the fetch lands.
const settingsLoaded = () => screen.findByText("Income Items");
// The pencil is a bare div with an icon, so it has no role or name to match on.
const editButton = () => document.body.querySelector(".cursor-pointer");

beforeEach(() => {
  vi.clearAllMocks();
  apiMock.GetAllStaffPayrollById.mockResolvedValue(settingsResponse());
  apiMock.GetStaffPayrollCycleStats.mockResolvedValue(
    historyResponse([
      { id: "c1", payrollDate: "2026-05-01T00:00:00", payPeriod: "2026-05-31T00:00:00", totalPayrollValue: 5000 },
      { id: "c2", payrollDate: "2026-06-01T00:00:00", payPeriod: "2026-06-30T00:00:00" },
    ])
  );
  apiMock.UpdateTenantStaffPayroll.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("loading the settings card", () => {
  it("spins in place of the card until the settings land", async () => {
    renderTab();
    expect(document.body.querySelector(".loading-spinner")).toBeInTheDocument();
    await settingsLoaded();
    expect(document.body.querySelector(".loading-spinner")).toBeNull();
  });

  it("fills the card from the first payroll record", async () => {
    renderTab();
    await settingsLoaded();
    await waitFor(() => expect(screen.getByText("SALARIED")).toBeInTheDocument());
    expect(screen.getByText("$40")).toBeInTheDocument();
    expect(screen.getByText("160")).toBeInTheDocument();
    expect(screen.getByText("$250")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("$20 per hour")).toBeInTheDocument();
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
  });

  it("falls back on every figure the record leaves out", async () => {
    apiMock.GetAllStaffPayrollById.mockResolvedValue(
      settingsResponse({
        id: undefined,
        paymentSchedule: "",
        ratePerHour: "",
        minimumHours: "",
        incomeItems: "not-a-list",
        deductions: undefined,
      })
    );
    renderTab();
    await waitFor(() => expect(screen.getByText("No income items")).toBeInTheDocument());
    expect(screen.getByText("No deductions")).toBeInTheDocument();
    expect(screen.getByText("$0")).toBeInTheDocument();
  });

  it("hides the minimum-hours row for an hourly staff member", async () => {
    apiMock.GetAllStaffPayrollById.mockResolvedValue(
      settingsResponse({ paymentSchedule: "HOURLY" })
    );
    renderTab();
    await waitFor(() => expect(screen.getByText("HOURLY")).toBeInTheDocument());
    expect(screen.queryByText("Minimum Hours")).not.toBeInTheDocument();
  });

  it("hides the minimum-hours row for a daily staff member", async () => {
    apiMock.GetAllStaffPayrollById.mockResolvedValue(
      settingsResponse({ paymentSchedule: "DAILY" })
    );
    renderTab();
    await waitFor(() => expect(screen.getByText("DAILY")).toBeInTheDocument());
    expect(screen.queryByText("Minimum Hours")).not.toBeInTheDocument();
  });

  it("shows the empty card when the response is not ok", async () => {
    apiMock.GetAllStaffPayrollById.mockResolvedValue({ data: { status: "error", data: [] } });
    renderTab();
    await waitFor(() => expect(screen.getByText("No income items")).toBeInTheDocument());
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("shows the empty card when the payload is not a list", async () => {
    apiMock.GetAllStaffPayrollById.mockResolvedValue({ data: { status: "ok", data: "nope" } });
    renderTab();
    await waitFor(() => expect(screen.getByText("No income items")).toBeInTheDocument());
  });

  it("shows the empty card when the list is empty", async () => {
    apiMock.GetAllStaffPayrollById.mockResolvedValue({ data: { status: "ok", data: [] } });
    renderTab();
    await waitFor(() => expect(screen.getByText("No income items")).toBeInTheDocument());
  });

  it("shows the empty card when the endpoint answers with nothing at all", async () => {
    apiMock.GetAllStaffPayrollById.mockResolvedValue(undefined);
    renderTab();
    await waitFor(() => expect(screen.getByText("No income items")).toBeInTheDocument());
  });

  it("treats a rejected settings fetch as an empty card, not an error", async () => {
    apiMock.GetAllStaffPayrollById.mockRejectedValue(new Error("down"));
    renderTab();
    await waitFor(() => expect(screen.getByText("No income items")).toBeInTheDocument());
    expect(screen.queryByText("Oops!")).not.toBeInTheDocument();
    expect(console.error).toHaveBeenCalledWith("Failed to fetch payroll settings:", "down");
  });

  it("stays quiet about a rejected settings fetch outside development", async () => {
    vi.stubEnv("DEV", false);
    apiMock.GetAllStaffPayrollById.mockRejectedValue(new Error("down"));
    renderTab();
    await waitFor(() => expect(screen.getByText("No income items")).toBeInTheDocument());
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe("the payroll history table", () => {
  it("formats each cycle's dates, period and value", async () => {
    renderTab();
    await waitFor(() => expect(table.props.data).toHaveLength(2));
    expect(table.props.data[0]).toMatchObject({
      payrollDate: "05/01/2026",
      payPeriod: "05/01/2026 - 05/31/2026",
      totalPayrollValue: "$5000",
      hasActions: true,
    });
    // A cycle with no value at all still shows a figure rather than "$undefined".
    expect(table.props.data[1].totalPayrollValue).toBe("$0");
  });

  it("leaves the table empty when the response is not ok", async () => {
    apiMock.GetStaffPayrollCycleStats.mockResolvedValue({ data: { status: "error" } });
    renderTab();
    await waitFor(() => expect(table.props.loading).toBe(false));
    expect(table.props.data).toEqual([]);
  });

  it("leaves the table empty when the history endpoint answers with nothing", async () => {
    apiMock.GetStaffPayrollCycleStats.mockResolvedValue(undefined);
    renderTab();
    await waitFor(() => expect(table.props.loading).toBe(false));
    expect(table.props.data).toEqual([]);
  });

  it("leaves the table empty when the history fetch rejects", async () => {
    apiMock.GetStaffPayrollCycleStats.mockRejectedValue(new Error("history down"));
    renderTab();
    await waitFor(() => expect(table.props.loading).toBe(false));
    expect(table.props.data).toEqual([]);
    expect(console.error).toHaveBeenCalledWith("Failed to fetch payroll history:", "history down");
  });
});

describe("opening the modal", () => {
  it("opens for editing from the pencil", async () => {
    renderTab();
    await settingsLoaded();
    fireEvent.click(editButton());
    expect(modal.props.modalMode).toBe("edit");
    expect(modal.props.selectedPayroll).toBeNull();
    expect(modal.props.tenantStaffId).toBe("staff-1");
  });

  it("hides the pencil from a role that may not edit payroll settings", async () => {
    renderTab({ permissions: ["view_staff"] });
    await settingsLoaded();
    expect(screen.getByText("SALARIED")).toBeInTheDocument();
    expect(editButton()).toBeNull();
  });

  it("opens for viewing from a history row", async () => {
    renderTab();
    await waitFor(() => expect(table.props.data).toHaveLength(2));
    fireEvent.click(screen.getByText("View BreakDown c1"));
    expect(modal.props.modalMode).toBe("view");
    expect(modal.props.selectedPayroll).toMatchObject({ id: "c1" });
  });

  it("closes and forgets both the mode and the selected cycle", async () => {
    renderTab();
    await waitFor(() => expect(table.props.data).toHaveLength(2));
    fireEvent.click(screen.getByText("View BreakDown c1"));
    fireEvent.click(screen.getByText("close-payroll"));
    expect(screen.queryByTestId("payroll-modal")).not.toBeInTheDocument();
    expect(modal.props.modalMode).toBeNull();
    expect(modal.props.selectedPayroll).toBeNull();
  });
});

describe("saving the settings", () => {
  it("updates the record and reloads the card", async () => {
    renderTab();
    await settingsLoaded();
    fireEvent.click(editButton());
    fireEvent.click(screen.getByText("save-payroll"));
    await waitFor(() =>
      expect(apiMock.UpdateTenantStaffPayroll).toHaveBeenCalledWith({
        id: "p1",
        payroll: { ratePerHour: "50" },
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    await waitFor(() =>
      expect(apiMock.GetAllStaffPayrollById.mock.calls.length).toBeGreaterThan(1)
    );
    expect(screen.queryByText("Oops!")).not.toBeInTheDocument();
  });

  it("raises the error banner with the server's own message", async () => {
    apiMock.UpdateTenantStaffPayroll.mockRejectedValue({
      response: { data: { message: "Rate is out of range" } },
    });
    renderTab();
    await settingsLoaded();
    fireEvent.click(editButton());
    fireEvent.click(screen.getByText("save-payroll"));
    await waitFor(() => expect(screen.getByText("Oops!")).toBeInTheDocument());
  });

  it("raises the banner for a failure that carries no message", async () => {
    apiMock.UpdateTenantStaffPayroll.mockRejectedValue(new Error("socket hang up"));
    renderTab();
    await settingsLoaded();
    fireEvent.click(editButton());
    fireEvent.click(screen.getByText("save-payroll"));
    await waitFor(() => expect(screen.getByText("Oops!")).toBeInTheDocument());
    expect(
      screen.getByText("Something went wrong loading payroll settings. Please try again.")
    ).toBeInTheDocument();
  });
});
