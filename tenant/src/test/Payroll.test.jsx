import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The payroll landing page: a table of payroll cycles, a button that opens the
 * new-cycle modal, and a per-row link into the cycle breakdown.
 *
 * The list endpoint is read defensively -- the page accepts either a wrapped
 * `{ data: [...] }` or a bare array, and falls back to an empty list for
 * anything else -- and every column has its own placeholder for a missing
 * field, so most of the tests here drive one oddly shaped record through and
 * read the row the table probe was handed.
 *
 * Two permissions gate more than a button: without `view_payroll_list` the page
 * is replaced wholesale by the access-denied panel (the fetch still runs, since
 * the effect is above the early return), and without `view_payroll_information`
 * the table is given no action text and no click handler at all.
 *
 * `useFormatSettings` is replaced by a fixed pair of settings so the formatted
 * date and currency in the assertions do not depend on the tenant's
 * preferences.
 */

const api = vi.hoisted(() => ({ GetPayrollCycleStats: vi.fn() }));
vi.mock("../api/payrollApi", () => ({ default: api }));

const toast = vi.hoisted(() => ({ showApiError: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: vi.fn(),
  showApiError: (...a) => toast.showApiError(...a),
}));

const nav = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => nav.navigate,
}));

vi.mock("../hooks/useFormatSettings", () => ({
  default: () => ({ dateFormat: "MM/DD/YYYY", timeFormat: "12h", currency: "USD" }),
}));

const table = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/Table/CustomTable", () => ({
  default: (received) => {
    table.props = received;
    return (
      <div data-testid="table" data-loading={String(received.loading)}>
        {received.data.map((row) => (
          <button key={row.id} onClick={() => received.onActionClick?.(row)}>
            {received.actionText || "no action"} {row.id}
          </button>
        ))}
      </div>
    );
  },
}));

const modal = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/ReusableModal/PayrollModal/NewPayrollModal", () => ({
  default: (received) => {
    modal.props = received;
    return received.isOpen ? <div data-testid="new-payroll-modal" /> : null;
  },
}));

vi.mock("../Components/AccessDenied/AccessDenied", () => ({
  default: () => <div data-testid="access-denied" />,
}));

import Payroll from "../Pages/Payroll/Payroll/Payroll";

const makeStore = (permissions, user = {}) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user: {
          id: "u-1",
          tenantId: "tenant-1",
          accessToken: "at",
          refreshToken: "rt",
          // An empty roleModuleAccesses means org owner, i.e. every permission.
          role: permissions
            ? { roleModuleAccesses: [{ module: "PAYROLL", permissions }] }
            : { roleModuleAccesses: [] },
          ...user,
        },
      },
    },
  });

const renderPage = ({ permissions, user } = {}) =>
  render(
    <Provider store={makeStore(permissions, user)}>
      <Payroll />
    </Provider>
  );

const cycle = (over = {}) => ({
  id: "pc-1",
  payrollDate: "2024-03-15T00:00:00.000Z",
  payPeriod: "Mar 1 - Mar 15",
  numberOfStaffs: 12,
  totalPayrollValue: 48250.5,
  ...over,
});

const listed = () =>
  waitFor(() => expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false"));

const row = () => table.props.data[0];

beforeEach(() => {
  vi.clearAllMocks();
  table.props = null;
  modal.props = null;
  api.GetPayrollCycleStats.mockResolvedValue({ data: [cycle()] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading the cycles", () => {
  it("asks for the tenant's cycles and maps each into a row", async () => {
    renderPage();
    await listed();
    expect(api.GetPayrollCycleStats).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(row()).toEqual({
      id: "pc-1",
      date: "03/15/2024",
      payPeriod: "Mar 1 - Mar 15",
      noOfStaff: "12",
      totalPayrollValue: "$48,250.50",
      hasActions: true,
    });
  });

  it("reads a response that is a bare array rather than a wrapped one", async () => {
    api.GetPayrollCycleStats.mockResolvedValue([cycle({ id: "pc-2" })]);
    renderPage();
    await listed();
    expect(table.props.data).toHaveLength(1);
    expect(row().id).toBe("pc-2");
  });

  it("shows an empty table for a response that is not a list", async () => {
    api.GetPayrollCycleStats.mockResolvedValue({ data: { message: "nothing here" } });
    renderPage();
    await listed();
    expect(table.props.data).toEqual([]);
  });

  it("shows an empty table when the endpoint answers with nothing", async () => {
    api.GetPayrollCycleStats.mockResolvedValue(null);
    renderPage();
    await listed();
    expect(table.props.data).toEqual([]);
  });

  it("reports a refused load and leaves the table empty", async () => {
    const failure = new Error("500");
    api.GetPayrollCycleStats.mockRejectedValue(failure);
    renderPage();
    await listed();
    expect(toast.showApiError).toHaveBeenCalledWith(failure, "LOAD_PAYROLL");
    expect(table.props.data).toEqual([]);
  });

  it("never fetches without a tenant", async () => {
    renderPage({ user: { tenantId: undefined } });
    await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
    expect(api.GetPayrollCycleStats).not.toHaveBeenCalled();
    expect(table.props.data).toEqual([]);
    expect(table.props.loading).toBe(false);
  });
});

describe("the columns' placeholders", () => {
  const withRow = async (over) => {
    api.GetPayrollCycleStats.mockResolvedValue({ data: [cycle(over)] });
    renderPage();
    await listed();
    return row();
  };

  it("dashes out a cycle with no payroll date", async () => {
    expect((await withRow({ payrollDate: null })).date).toBe("-");
  });

  it("dashes out a cycle with no pay period", async () => {
    expect((await withRow({ payPeriod: "" })).payPeriod).toBe("-");
  });

  it("counts an absent staff figure as zero", async () => {
    expect((await withRow({ numberOfStaffs: undefined })).noOfStaff).toBe("0");
  });

  it("keeps a genuine zero staff count", async () => {
    expect((await withRow({ numberOfStaffs: 0 })).noOfStaff).toBe("0");
  });

  it("shows a zero total rather than a blank when the value is missing", async () => {
    expect((await withRow({ totalPayrollValue: null })).totalPayrollValue).toBe("$0.00");
  });

  it("keeps a genuine zero total", async () => {
    expect((await withRow({ totalPayrollValue: 0 })).totalPayrollValue).toBe("$0.00");
  });
});

describe("permissions", () => {
  it("shows the whole page to an org owner", async () => {
    renderPage();
    await listed();
    expect(screen.queryByTestId("access-denied")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New Payroll" })).toBeInTheDocument();
    expect(table.props.actionText).toBe("View Breakdown");
    expect(table.props.onActionClick).toBeTypeOf("function");
  });

  it("replaces the page with the access-denied panel without the list permission", async () => {
    renderPage({ permissions: ["create_new_payroll"] });
    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
    expect(screen.queryByTestId("table")).not.toBeInTheDocument();
    // The fetch effect still runs -- it sits above the early return.
    await waitFor(() => expect(api.GetPayrollCycleStats).toHaveBeenCalled());
  });

  it("hides the New Payroll button from a viewer", async () => {
    renderPage({ permissions: ["view_payroll_list", "view_payroll_information"] });
    await listed();
    expect(screen.queryByRole("button", { name: "New Payroll" })).not.toBeInTheDocument();
  });

  it("gives the table no row action without the breakdown permission", async () => {
    renderPage({ permissions: ["view_payroll_list"] });
    await listed();
    expect(table.props.actionText).toBeUndefined();
    expect(table.props.onActionClick).toBeUndefined();
  });
});

describe("opening a breakdown", () => {
  it("navigates to the cycle's breakdown page", async () => {
    renderPage();
    await listed();
    fireEvent.click(screen.getByRole("button", { name: "View Breakdown pc-1" }));
    expect(nav.navigate).toHaveBeenCalledWith("/payroll/payroll/view-breakdown/pc-1");
  });
});

describe("running a new payroll", () => {
  it("opens the modal from the New Payroll button", async () => {
    renderPage();
    await listed();
    fireEvent.click(screen.getByRole("button", { name: "New Payroll" }));
    expect(await screen.findByTestId("new-payroll-modal")).toBeInTheDocument();
  });

  it("closes the modal on dismissal without reloading", async () => {
    renderPage();
    await listed();
    fireEvent.click(screen.getByRole("button", { name: "New Payroll" }));
    await screen.findByTestId("new-payroll-modal");
    act(() => modal.props.onClose());
    expect(screen.queryByTestId("new-payroll-modal")).not.toBeInTheDocument();
    expect(api.GetPayrollCycleStats).toHaveBeenCalledTimes(1);
  });

  it("closes the modal and reloads the list once a cycle is saved", async () => {
    renderPage();
    await listed();
    fireEvent.click(screen.getByRole("button", { name: "New Payroll" }));
    await screen.findByTestId("new-payroll-modal");
    await act(async () => modal.props.onSave());
    expect(screen.queryByTestId("new-payroll-modal")).not.toBeInTheDocument();
    expect(api.GetPayrollCycleStats).toHaveBeenCalledTimes(2);
  });
});
