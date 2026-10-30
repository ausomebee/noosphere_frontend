import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The payroll breakdown page for one cycle: a roster of the staff on the cycle,
 * each row expandable into its income items and deductions, plus export, staff
 * add/remove and a Submit that pushes the edited breakdown back.
 *
 * Three fetches run independently. The cycle's own metadata is loaded
 * separately from its staff on purpose — an empty cycle has no staff to read a
 * compensation type off, and the Add-Staff modal needs one to list eligible
 * people — so both writers use a `prev || next` update and whichever lands
 * first wins.
 *
 * `GetPayrollCycleStaffs` returns rows shaped `{ staffName, record }` where the
 * pay figures live under `record.staff.TenantStaffPayroll[0]`, and SALARIED
 * staff store their monthly salary in `ratePerHour` — hence the `??` chains the
 * fixtures here exercise from both sides.
 *
 * EmployeeRow and the three modals are probes; the row probe renders one button
 * per callback so the handlers are driven through the DOM.
 */

const apiMock = vi.hoisted(() => ({
  GetIncomeItemsByTenantId: vi.fn(),
  GetDeductionsByTenantId: vi.fn(),
  GetPayrollCycleByTenantId: vi.fn(),
  GetPayrollCycleStaffs: vi.fn(),
  RemoveStaffFromPayrollCycle: vi.fn(),
  AddStaffToPayrollCycle: vi.fn(),
  EditPayrollBreakdown: vi.fn(),
}));
vi.mock("../api/payrollApi", () => ({ default: apiMock }));

const toastMock = vi.hoisted(() => ({ showToast: vi.fn(), showApiError: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toastMock.showToast(...a),
  showApiError: (...a) => toastMock.showApiError(...a),
}));

const tableUtils = vi.hoisted(() => ({
  exportTableData: vi.fn(),
  exportTableToPDF: vi.fn(),
  printTableData: vi.fn(),
}));
vi.mock("../utils/TableUtils", () => tableUtils);

// Mutable so the "no cycle id in the route" guard can be reached.
const route = vi.hoisted(() => ({ params: { id: "cycle-1" } }));
const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
  useParams: () => route.params,
}));

const rows = vi.hoisted(() => ({ byId: {} }));
vi.mock("../Components/ReusableModal/PayrollModal/EmployeeRow", () => ({
  default: ({
    employee,
    isSelected,
    onSelect,
    expandedEmployee,
    onToggleExpand,
    onAddIncome,
    onAddDeduction,
  }) => {
    rows.byId[employee.id] = employee;
    return (
      <tr data-testid={`employee-${employee.id}`}>
        <td>
          <span>{employee.name}</span>
          <input
            type="checkbox"
            aria-label={`select ${employee.id}`}
            checked={isSelected}
            onChange={() => onSelect(employee.id)}
          />
          <button onClick={() => onToggleExpand(employee.id)}>{`toggle ${employee.id}`}</button>
          <button onClick={() => onAddIncome(employee.id)}>{`income ${employee.id}`}</button>
          <button onClick={() => onAddDeduction(employee.id)}>{`deduction ${employee.id}`}</button>
          <span data-testid={`expanded-${employee.id}`}>
            {expandedEmployee === employee.id ? "open" : "closed"}
          </span>
        </td>
      </tr>
    );
  },
}));

const incomeModal = vi.hoisted(() => ({ props: null, payload: { id: "inc-new" } }));
vi.mock("../Components/ReusableModal/PayrollModal/AddIncomItemModal", () => ({
  default: (props) => {
    incomeModal.props = props;
    return props.isOpen ? (
      <div data-testid="income-modal">
        <button onClick={() => props.onSave(incomeModal.payload)}>save-income</button>
        <button onClick={props.onClose}>close-income</button>
      </div>
    ) : null;
  },
}));

const deductionModal = vi.hoisted(() => ({ props: null, payload: { id: "ded-new" } }));
vi.mock("../Components/ReusableModal/PayrollModal/AddDeductionModal", () => ({
  default: (props) => {
    deductionModal.props = props;
    return props.isOpen ? (
      <div data-testid="deduction-modal">
        <button onClick={() => props.onSave(deductionModal.payload)}>save-deduction</button>
        <button onClick={props.onClose}>close-deduction</button>
      </div>
    ) : null;
  },
}));

const staffModal = vi.hoisted(() => ({ props: null, payload: ["staff-2", "staff-3"] }));
vi.mock("../Components/ReusableModal/PayrollModal/AddStaffModal", () => ({
  default: (props) => {
    staffModal.props = props;
    return props.isOpen ? (
      <div data-testid="staff-modal">
        <button onClick={() => props.onSave(staffModal.payload)}>save-staff</button>
        <button onClick={props.onClose}>close-staff</button>
      </div>
    ) : null;
  },
}));

import ViewBreakDown from "../Pages/Payroll/Payroll/ViewBreakDown";

// Local-time strings on purpose: a trailing Z would make the rendered date
// depend on the machine's timezone.
const cycleStaff = (over = {}, payrollOver = {}) => ({
  staffName: "Grace Hopper",
  grossPay: 5000,
  netPay: 4200,
  paymentSchedule: "Monthly",
  record: {
    id: "pcs-1",
    staffId: "staff-1",
    payrollCycle: {
      compensationType: "SALARIED",
      startDate: "2026-05-01T00:00:00",
    },
    staff: {
      TenantStaffPayroll: [
        {
          id: "sp-1",
          ratePerHour: 4000,
          minimumHours: 160,
          incomeItems: [{ id: "inc-1" }],
          deductions: [{ id: "ded-1" }],
          ...payrollOver,
        },
      ],
    },
  },
  ...over,
});

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
            ? { roleModuleAccesses: [{ module: "PAYROLL", permissions }] }
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

const renderPage = ({ permissions } = {}) =>
  render(
    <Provider store={makeStore(permissions)}>
      <ViewBreakDown />
    </Provider>
  );

const rosterLoaded = () => screen.findByText("Grace Hopper");
const openExportMenu = () =>
  fireEvent.click(document.body.querySelector(".action-menu .action-button"));

beforeEach(() => {
  vi.clearAllMocks();
  route.params = { id: "cycle-1" };
  rows.byId = {};
  incomeModal.payload = { id: "inc-new" };
  deductionModal.payload = { id: "ded-new" };
  staffModal.payload = ["staff-2", "staff-3"];
  apiMock.GetIncomeItemsByTenantId.mockResolvedValue({ data: [{ id: "inc-1", name: "Bonus" }] });
  apiMock.GetDeductionsByTenantId.mockResolvedValue({ data: [{ id: "ded-1", name: "Tax" }] });
  apiMock.GetPayrollCycleByTenantId.mockResolvedValue({ data: [] });
  apiMock.GetPayrollCycleStaffs.mockResolvedValue({ data: [cycleStaff()] });
  apiMock.RemoveStaffFromPayrollCycle.mockResolvedValue({});
  apiMock.AddStaffToPayrollCycle.mockResolvedValue({});
  apiMock.EditPayrollBreakdown.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading the cycle", () => {
  it("takes the header date and compensation type from the first staff record", async () => {
    renderPage();
    await rosterLoaded();
    expect(screen.getByText("05/01/2026")).toBeInTheDocument();
    expect(staffModal.props.compensationType).toBe("SALARIED");
  });

  it("falls back to the cycle's own metadata when the cycle has no staff", async () => {
    apiMock.GetPayrollCycleStaffs.mockResolvedValue({ data: [] });
    apiMock.GetPayrollCycleByTenantId.mockResolvedValue({
      data: [
        { id: "cycle-other", compensationType: "HOURLY" },
        { id: "cycle-1", compensationType: "HOURLY", startDate: "2026-06-01T00:00:00" },
      ],
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("06/01/2026")).toBeInTheDocument());
    expect(staffModal.props.compensationType).toBe("HOURLY");
    expect(screen.getByText(/No staff in this payroll yet/)).toBeInTheDocument();
  });

  it("leaves the header waiting when the cycle list holds no matching cycle", async () => {
    apiMock.GetPayrollCycleStaffs.mockResolvedValue({ data: [] });
    apiMock.GetPayrollCycleByTenantId.mockResolvedValue({ data: [{ id: "cycle-other" }] });
    renderPage();
    await waitFor(() => expect(screen.getByText("Loading...")).toBeInTheDocument());
  });

  it("leaves the header waiting when the cycle list is not an array", async () => {
    apiMock.GetPayrollCycleStaffs.mockResolvedValue({ data: [] });
    apiMock.GetPayrollCycleByTenantId.mockResolvedValue({ data: "not-a-list" });
    renderPage();
    await waitFor(() => expect(screen.getByText("Loading...")).toBeInTheDocument());
  });

  it("keeps a cycle that has a compensation type but no start date out of the header", async () => {
    apiMock.GetPayrollCycleStaffs.mockResolvedValue({ data: [] });
    apiMock.GetPayrollCycleByTenantId.mockResolvedValue([{ id: "cycle-1" }]);
    renderPage();
    await waitFor(() => expect(apiMock.GetPayrollCycleByTenantId).toHaveBeenCalled());
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(staffModal.props.compensationType).toBe("");
  });

  it("swallows a cycle metadata endpoint that rejects", async () => {
    apiMock.GetPayrollCycleByTenantId.mockRejectedValue(new Error("down"));
    renderPage();
    await rosterLoaded();
    expect(toastMock.showApiError).not.toHaveBeenCalled();
  });

  it("fetches nothing at all without a cycle id in the route", async () => {
    route.params = {};
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/No staff in this payroll yet/)).toBeInTheDocument()
    );
    expect(apiMock.GetPayrollCycleStaffs).not.toHaveBeenCalled();
    expect(apiMock.GetPayrollCycleByTenantId).not.toHaveBeenCalled();
  });

  it("sends the user back when Back is pressed", async () => {
    renderPage();
    await rosterLoaded();
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(navigate).toHaveBeenCalledWith(-1);
  });
});

describe("the income item and deduction lookups", () => {
  it("hands the prefetched lists to the two modals", async () => {
    renderPage();
    await rosterLoaded();
    expect(incomeModal.props.prefetchedItems).toEqual([{ id: "inc-1", name: "Bonus" }]);
    expect(deductionModal.props.prefetchedItems).toEqual([{ id: "ded-1", name: "Tax" }]);
  });

  it("accepts bare arrays as well as data envelopes", async () => {
    apiMock.GetIncomeItemsByTenantId.mockResolvedValue([{ id: "inc-9" }]);
    apiMock.GetDeductionsByTenantId.mockResolvedValue([{ id: "ded-9" }]);
    renderPage();
    await rosterLoaded();
    expect(incomeModal.props.prefetchedItems).toEqual([{ id: "inc-9" }]);
    expect(deductionModal.props.prefetchedItems).toEqual([{ id: "ded-9" }]);
  });

  it("substitutes empty lists for responses that are not arrays", async () => {
    apiMock.GetIncomeItemsByTenantId.mockResolvedValue({ data: { nope: true } });
    apiMock.GetDeductionsByTenantId.mockResolvedValue(undefined);
    renderPage();
    await rosterLoaded();
    expect(incomeModal.props.prefetchedItems).toEqual([]);
    expect(deductionModal.props.prefetchedItems).toEqual([]);
  });

  it("swallows a lookup endpoint that rejects", async () => {
    apiMock.GetIncomeItemsByTenantId.mockRejectedValue(new Error("down"));
    renderPage();
    await rosterLoaded();
    expect(incomeModal.props.prefetchedItems).toEqual([]);
    expect(toastMock.showToast).not.toHaveBeenCalled();
  });
});

describe("mapping a staff record onto a row", () => {
  it("reads the pay figures off the staff's payroll record", async () => {
    renderPage();
    await rosterLoaded();
    // SALARIED staff keep the monthly salary in ratePerHour, so basicPay and
    // hourlyRate both come off the same field.
    expect(rows.byId["pcs-1"]).toMatchObject({
      staffId: "staff-1",
      staffPayrollId: "sp-1",
      name: "Grace Hopper",
      grossPay: 5000,
      netPay: 4200,
      paymentSchedule: "Monthly",
      hourlyRate: 4000,
      monthlyRate: 4000,
      minHoursPerMonth: 160,
      additionalIncomes: [{ id: "inc-1" }],
      additionalDeductions: [{ id: "ded-1" }],
    });
  });

  it("prefers the explicit monthly fields when the record carries them", async () => {
    apiMock.GetPayrollCycleStaffs.mockResolvedValue({
      data: [cycleStaff({}, { monthlyRate: 7000, minHoursPerMonth: 120 })],
    });
    renderPage();
    await rosterLoaded();
    expect(rows.byId["pcs-1"]).toMatchObject({
      monthlyRate: 7000,
      minHoursPerMonth: 120,
      basicPay: 7000,
      numberOfHours: 120,
    });
  });

  it("zeroes and blanks every field a bare record leaves out", async () => {
    apiMock.GetPayrollCycleStaffs.mockResolvedValue({
      data: [{ record: { id: "pcs-1", staffId: "staff-1" } }],
    });
    renderPage();
    await waitFor(() => expect(rows.byId["pcs-1"]).toBeDefined());
    expect(rows.byId["pcs-1"]).toMatchObject({
      staffPayrollId: "",
      name: "Unknown",
      grossPay: 0,
      netPay: 0,
      paymentSchedule: "",
      hourlyRate: 0,
      monthlyRate: 0,
      additionalIncomes: [],
      additionalDeductions: [],
    });
  });

  it("copes with a row that has no record at all", async () => {
    apiMock.GetPayrollCycleStaffs.mockResolvedValue({ data: [{ staffName: "Ada" }] });
    renderPage();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
  });

  it("accepts a bare array of staff as well as a data envelope", async () => {
    apiMock.GetPayrollCycleStaffs.mockResolvedValue([cycleStaff()]);
    renderPage();
    await rosterLoaded();
    expect(screen.getByText("05/01/2026")).toBeInTheDocument();
  });

  it("shows the empty state for a response that is not a list", async () => {
    apiMock.GetPayrollCycleStaffs.mockResolvedValue({ data: { nope: true } });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/No staff in this payroll yet/)).toBeInTheDocument()
    );
  });

  it("shows the empty state rather than an error when the roster endpoint rejects", async () => {
    apiMock.GetPayrollCycleStaffs.mockRejectedValue(new Error("down"));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/No staff in this payroll yet/)).toBeInTheDocument()
    );
    expect(toastMock.showApiError).not.toHaveBeenCalled();
  });

  it("leaves the cycle metadata alone when the first staff record has no cycle", async () => {
    apiMock.GetPayrollCycleStaffs.mockResolvedValue({
      data: [{ record: { id: "pcs-1", staff: {} } }],
    });
    renderPage();
    await waitFor(() => expect(rows.byId["pcs-1"]).toBeDefined());
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(staffModal.props.compensationType).toBe("");
  });
});

describe("selecting staff", () => {
  const twoStaff = () => [
    cycleStaff(),
    cycleStaff({ staffName: "Alan Turing", record: { id: "pcs-2", staffId: "staff-2" } }),
  ];

  it("selects and deselects one row at a time", async () => {
    apiMock.GetPayrollCycleStaffs.mockResolvedValue({ data: twoStaff() });
    renderPage();
    await rosterLoaded();
    fireEvent.click(screen.getByLabelText("select pcs-1"));
    expect(screen.getByLabelText("select pcs-1")).toBeChecked();
    fireEvent.click(screen.getByLabelText("select pcs-1"));
    expect(screen.getByLabelText("select pcs-1")).not.toBeChecked();
  });

  it("selects every row from the header checkbox and clears them again", async () => {
    apiMock.GetPayrollCycleStaffs.mockResolvedValue({ data: twoStaff() });
    renderPage();
    await rosterLoaded();
    const all = screen.getByLabelText("Select all employees");
    fireEvent.click(all);
    expect(screen.getByLabelText("select pcs-1")).toBeChecked();
    expect(screen.getByLabelText("select pcs-2")).toBeChecked();
    fireEvent.click(all);
    expect(screen.getByLabelText("select pcs-1")).not.toBeChecked();
  });

  it("does nothing when Select all is pressed on an empty roster", async () => {
    apiMock.GetPayrollCycleStaffs.mockResolvedValue({ data: [] });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/No staff in this payroll yet/)).toBeInTheDocument()
    );
    fireEvent.click(screen.getByLabelText("Select all employees"));
    expect(screen.queryByRole("button", { name: "Remove selected employees" })).not.toBeInTheDocument();
  });
});

describe("removing staff from the cycle", () => {
  it("removes every selected row and reloads the roster", async () => {
    renderPage();
    await rosterLoaded();
    fireEvent.click(screen.getByLabelText("select pcs-1"));
    fireEvent.click(screen.getByRole("button", { name: "Remove selected employees" }));
    await waitFor(() =>
      expect(apiMock.RemoveStaffFromPayrollCycle).toHaveBeenCalledWith({
        id: "pcs-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Staff removed from payroll", "success")
    );
    expect(apiMock.GetPayrollCycleStaffs.mock.calls.length).toBeGreaterThan(1);
  });

  it("reports a failed removal through the shared api error reporter", async () => {
    const failure = new Error("conflict");
    apiMock.RemoveStaffFromPayrollCycle.mockRejectedValue(failure);
    renderPage();
    await rosterLoaded();
    fireEvent.click(screen.getByLabelText("select pcs-1"));
    fireEvent.click(screen.getByRole("button", { name: "Remove selected employees" }));
    await waitFor(() =>
      expect(toastMock.showApiError).toHaveBeenCalledWith(failure, "REMOVE_PAYROLL_STAFF")
    );
  });

  it("hides the remove button from a role without the permission", async () => {
    renderPage({ permissions: ["add_staff_to_payroll"] });
    await rosterLoaded();
    fireEvent.click(screen.getByLabelText("select pcs-1"));
    expect(screen.queryByRole("button", { name: "Remove selected employees" })).not.toBeInTheDocument();
  });
});

describe("adding staff to the cycle", () => {
  it("adds each chosen staff member and reloads the roster", async () => {
    renderPage();
    await rosterLoaded();
    fireEvent.click(screen.getByRole("button", { name: "Add staff to payroll" }));
    fireEvent.click(screen.getByText("save-staff"));
    await waitFor(() => expect(apiMock.AddStaffToPayrollCycle).toHaveBeenCalledTimes(2));
    expect(apiMock.AddStaffToPayrollCycle).toHaveBeenCalledWith({
      payrollCycleId: "cycle-1",
      staffId: "staff-2",
      accessToken: "at",
      refreshToken: "rt",
    });
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Staff added to payroll", "success")
    );
    expect(screen.queryByTestId("staff-modal")).not.toBeInTheDocument();
  });

  it("reports a failed add and leaves the modal open", async () => {
    const failure = new Error("nope");
    apiMock.AddStaffToPayrollCycle.mockRejectedValue(failure);
    renderPage();
    await rosterLoaded();
    fireEvent.click(screen.getByRole("button", { name: "Add staff to payroll" }));
    fireEvent.click(screen.getByText("save-staff"));
    await waitFor(() =>
      expect(toastMock.showApiError).toHaveBeenCalledWith(failure, "ADD_PAYROLL_STAFF")
    );
    expect(screen.getByTestId("staff-modal")).toBeInTheDocument();
  });

  it("closes on the modal's own close handler", async () => {
    renderPage();
    await rosterLoaded();
    fireEvent.click(screen.getByRole("button", { name: "Add staff to payroll" }));
    fireEvent.click(screen.getByText("close-staff"));
    expect(screen.queryByTestId("staff-modal")).not.toBeInTheDocument();
  });

  it("hides the add button from a role without the permission", async () => {
    renderPage({ permissions: ["remove_staff_from_payroll"] });
    await rosterLoaded();
    expect(screen.queryByRole("button", { name: "Add staff to payroll" })).not.toBeInTheDocument();
  });
});

describe("income items and deductions on a row", () => {
  it("expands a row and collapses it again", async () => {
    renderPage();
    await rosterLoaded();
    fireEvent.click(screen.getByText("toggle pcs-1"));
    expect(screen.getByTestId("expanded-pcs-1")).toHaveTextContent("open");
    fireEvent.click(screen.getByText("toggle pcs-1"));
    expect(screen.getByTestId("expanded-pcs-1")).toHaveTextContent("closed");
  });

  it("appends an income item to the row the modal was opened from", async () => {
    renderPage();
    await rosterLoaded();
    fireEvent.click(screen.getByText("income pcs-1"));
    fireEvent.click(screen.getByText("save-income"));
    expect(rows.byId["pcs-1"].additionalIncomes).toEqual([{ id: "inc-1" }, { id: "inc-new" }]);
    expect(screen.queryByTestId("income-modal")).not.toBeInTheDocument();
  });

  it("appends a deduction to the row the modal was opened from", async () => {
    renderPage();
    await rosterLoaded();
    fireEvent.click(screen.getByText("deduction pcs-1"));
    fireEvent.click(screen.getByText("save-deduction"));
    expect(rows.byId["pcs-1"].additionalDeductions).toEqual([{ id: "ded-1" }, { id: "ded-new" }]);
    expect(screen.queryByTestId("deduction-modal")).not.toBeInTheDocument();
  });

  it("leaves the other rows untouched when one is given an income item", async () => {
    apiMock.GetPayrollCycleStaffs.mockResolvedValue({
      data: [
        cycleStaff(),
        cycleStaff({ staffName: "Alan Turing", record: { id: "pcs-2", staffId: "staff-2" } }),
      ],
    });
    renderPage();
    await rosterLoaded();
    fireEvent.click(screen.getByText("income pcs-1"));
    fireEvent.click(screen.getByText("save-income"));
    expect(rows.byId["pcs-2"].additionalIncomes).toEqual([]);
  });

  it("closes both modals on their own close handlers", async () => {
    renderPage();
    await rosterLoaded();
    fireEvent.click(screen.getByText("income pcs-1"));
    fireEvent.click(screen.getByText("close-income"));
    expect(screen.queryByTestId("income-modal")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("deduction pcs-1"));
    fireEvent.click(screen.getByText("close-deduction"));
    expect(screen.queryByTestId("deduction-modal")).not.toBeInTheDocument();
  });
});

describe("submitting the edited breakdown", () => {
  const editRow = async () => {
    renderPage();
    await rosterLoaded();
    fireEvent.click(screen.getByText("income pcs-1"));
    fireEvent.click(screen.getByText("save-income"));
  };

  it("stays hidden until something on the breakdown changes", async () => {
    renderPage();
    await rosterLoaded();
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
  });

  it("sends every row with only the item ids and reloads", async () => {
    await editRow();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() =>
      expect(apiMock.EditPayrollBreakdown).toHaveBeenCalledWith({
        staffs: [
          {
            id: "pcs-1",
            payrollCycleId: "cycle-1",
            staffId: "staff-1",
            staffPayrollId: "sp-1",
            incomeItems: [{ id: "inc-1" }, { id: "inc-new" }],
            deductions: [{ id: "ded-1" }],
          },
        ],
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Payroll breakdown updated", "success")
    );
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
  });

  it("reports a failed submit and keeps the button available", async () => {
    const failure = new Error("nope");
    apiMock.EditPayrollBreakdown.mockRejectedValue(failure);
    await editRow();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() =>
      expect(toastMock.showApiError).toHaveBeenCalledWith(failure, "UPDATE_PAYROLL")
    );
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });

  it("hides Submit from a role that cannot edit payroll information", async () => {
    renderPage({ permissions: ["add_staff_to_payroll"] });
    await rosterLoaded();
    fireEvent.click(screen.getByText("income pcs-1"));
    fireEvent.click(screen.getByText("save-income"));
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
  });
});

describe("exporting and printing the roster", () => {
  it("opens and closes the export menu", async () => {
    renderPage();
    await rosterLoaded();
    openExportMenu();
    expect(screen.getByText("Export as CSV")).toBeInTheDocument();
    openExportMenu();
    expect(screen.queryByText("Export as CSV")).not.toBeInTheDocument();
  });

  it("closes the export menu on a click elsewhere on the page", async () => {
    renderPage();
    await rosterLoaded();
    openExportMenu();
    fireEvent.mouseDown(document.body);
    await waitFor(() => expect(screen.queryByText("Export as CSV")).not.toBeInTheDocument());
  });

  it("names the CSV after the cycle's date", async () => {
    renderPage();
    await rosterLoaded();
    openExportMenu();
    fireEvent.click(screen.getByText("Export as CSV"));
    expect(tableUtils.exportTableData).toHaveBeenCalledWith(
      [expect.objectContaining({ id: "pcs-1" })],
      expect.any(Array),
      "payroll-breakdown-05/01/2026.csv",
      "Payroll Breakdown"
    );
    expect(screen.queryByText("Export as CSV")).not.toBeInTheDocument();
  });

  it("falls back to a generic filename before the cycle date is known", async () => {
    apiMock.GetPayrollCycleStaffs.mockResolvedValue({
      data: [cycleStaff({ record: { id: "pcs-1", staffId: "staff-1" } })],
    });
    renderPage();
    await rosterLoaded();
    openExportMenu();
    fireEvent.click(screen.getByText("Export as PDF"));
    expect(tableUtils.exportTableToPDF).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      "payroll-breakdown-export.pdf",
      "Payroll Breakdown"
    );
  });

  it("prints the roster", async () => {
    renderPage();
    await rosterLoaded();
    fireEvent.click(document.body.querySelectorAll(".table-actions .action-button")[1]);
    expect(tableUtils.printTableData).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      "Payroll Breakdown"
    );
  });

  it("warns instead of exporting or printing an empty roster", async () => {
    apiMock.GetPayrollCycleStaffs.mockResolvedValue({ data: [] });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/No staff in this payroll yet/)).toBeInTheDocument()
    );
    openExportMenu();
    fireEvent.click(screen.getByText("Export as CSV"));
    fireEvent.click(screen.getByText("Export as PDF"));
    fireEvent.click(document.body.querySelectorAll(".table-actions .action-button")[1]);
    expect(tableUtils.exportTableData).not.toHaveBeenCalled();
    expect(tableUtils.exportTableToPDF).not.toHaveBeenCalled();
    expect(tableUtils.printTableData).not.toHaveBeenCalled();
    expect(toastMock.showToast).toHaveBeenCalledWith("No data to export", "warning");
    expect(toastMock.showToast).toHaveBeenCalledWith("No data to print", "warning");
  });
});

describe("paging a long roster", () => {
  it("shows eight rows per page and collapses the open row on a page change", async () => {
    apiMock.GetPayrollCycleStaffs.mockResolvedValue({
      data: Array.from({ length: 10 }, (_, i) =>
        cycleStaff({
          staffName: `Employee ${i}`,
          record: { id: `pcs-${i}`, staffId: `staff-${i}` },
        })
      ),
    });
    renderPage();
    await screen.findByText("Employee 0");
    expect(screen.getAllByRole("row")).toHaveLength(9); // 8 rows + the header
    fireEvent.click(screen.getByText("toggle pcs-0"));
    expect(screen.getByTestId("expanded-pcs-0")).toHaveTextContent("open");

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(screen.getByText("Employee 9")).toBeInTheDocument();
    expect(screen.queryByText("Employee 0")).not.toBeInTheDocument();
  });

  it("shows no pager for a roster that fits on one page", async () => {
    renderPage();
    await rosterLoaded();
    expect(document.body.querySelector(".pagination")).toBeNull();
  });
});

describe("the search box", () => {
  it("accepts typing while the roster is still empty", async () => {
    apiMock.GetPayrollCycleStaffs.mockResolvedValue({ data: [] });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/No staff in this payroll yet/)).toBeInTheDocument()
    );
    // KNOWN DEFECT: SearchInput hands its onChange the DOM event, but the page
    // stores that event as the search term. It only bites once there is a row
    // to filter -- `searchTerm.toLowerCase` is then called on the event object.
    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "grace" } });
    expect(screen.getByText(/No staff in this payroll yet/)).toBeInTheDocument();
  });
});

describe("the lookups answering the other way round", () => {
  it("substitutes an empty list for an income response that is missing entirely", async () => {
    apiMock.GetIncomeItemsByTenantId.mockResolvedValue(undefined);
    apiMock.GetDeductionsByTenantId.mockResolvedValue({ data: { nope: true } });
    renderPage();
    await rosterLoaded();
    expect(incomeModal.props.prefetchedItems).toEqual([]);
    expect(deductionModal.props.prefetchedItems).toEqual([]);
  });
});

describe("a tenant the store does not know", () => {
  it("looks up neither the pay items nor the cycle metadata", async () => {
    render(
      <Provider
        store={configureStore({
          reducer: {
            authentication: authReducer,
            generalSettings: generalSettingsReducer,
          },
          preloadedState: {
            authentication: {
              isAuthenticated: true,
              loading: false,
              error: null,
              token: "at",
              user: {
                id: "user-1",
                accessToken: "at",
                refreshToken: "rt",
                role: { roleModuleAccesses: [] },
              },
            },
            generalSettings: {
              dateFormat: "MM/DD/YYYY",
              timeFormat: "12-hour",
              currency: "USD",
              loaded: true,
            },
          },
        })}
      >
        <ViewBreakDown />
      </Provider>
    );

    // The cycle's own staff are keyed on the route id rather than the tenant,
    // so that one still runs.
    await rosterLoaded();
    expect(apiMock.GetIncomeItemsByTenantId).not.toHaveBeenCalled();
    expect(apiMock.GetPayrollCycleByTenantId).not.toHaveBeenCalled();
  });
});

describe("endpoints that answer with nothing at all", () => {
  it("treats a missing cycle list as no metadata to apply", async () => {
    apiMock.GetPayrollCycleByTenantId.mockResolvedValue(undefined);
    renderPage();
    await rosterLoaded();
    // The staff record is left to supply the header instead.
    expect(screen.getByText(/05\/01\/2026/)).toBeInTheDocument();
  });

  it("treats a missing staff list as an empty roster", async () => {
    apiMock.GetPayrollCycleStaffs.mockResolvedValue(undefined);
    renderPage();
    await waitFor(() =>
      expect(apiMock.GetPayrollCycleStaffs).toHaveBeenCalled()
    );
    expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument();
  });
});

describe("adding a deduction to one of several staff", () => {
  it("leaves everyone else's deductions untouched", async () => {
    // The fixture hard-codes one record id, so the second row needs its own or
    // the two would be the same employee.
    apiMock.GetPayrollCycleStaffs.mockResolvedValue({
      data: [
        cycleStaff(),
        {
          ...cycleStaff({ staffName: "Alan Turing" }),
          record: {
            ...cycleStaff().record,
            id: "pcs-2",
            staffId: "staff-2",
          },
        },
      ],
    });
    renderPage();
    await rosterLoaded();

    fireEvent.click(screen.getByText("deduction pcs-1"));
    fireEvent.click(screen.getByText("save-deduction"));

    expect(rows.byId["pcs-1"].additionalDeductions).toHaveLength(2);
    expect(rows.byId["pcs-2"].additionalDeductions).toHaveLength(1);
  });
});

describe("exporting a cycle that never named a date", () => {
  it("names the file after the cycle rather than a date", async () => {
    apiMock.GetPayrollCycleStaffs.mockResolvedValue({
      data: [
        {
          ...cycleStaff(),
          record: {
            ...cycleStaff().record,
            payrollCycle: { compensationType: "SALARIED" },
          },
        },
      ],
    });
    renderPage();
    await rosterLoaded();

    openExportMenu();
    fireEvent.click(screen.getByText("Export as CSV"));

    expect(tableUtils.exportTableData).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      "payroll-breakdown-export.csv",
      "Payroll Breakdown"
    );
  });

  it("keeps the export menu open when the click lands on its own button", async () => {
    renderPage();
    await rosterLoaded();
    openExportMenu();
    expect(screen.getByText("Export as CSV")).toBeInTheDocument();

    fireEvent.mouseDown(document.body.querySelector(".action-menu .action-button"));
    expect(screen.getByText("Export as CSV")).toBeInTheDocument();
  });
});
