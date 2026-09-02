import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The preview a user sees before a manual payroll cycle is created: the staff
 * who fall inside the chosen window, each row expandable, rows removable, and a
 * Save that turns the whole list into one CreateManualPayrollCycle call.
 *
 * All three fetches go out together in one Promise.all, so a single rejection
 * loses the roster as well as the income/deduction lookups — hence one
 * `showApiError` arm rather than three. Each response is unwrapped with
 * `res?.data || res || []`, which is exercised here from all three sides: a
 * data envelope, a bare array, and a response that is neither.
 *
 * The staff rows arrive as `{ staff: { TenantStaffPayroll: [...] } }` and every
 * pay figure is read out of that first payroll record, so the fixtures include
 * a fully-populated staff member and a bare one to drive both sides of the
 * `||` fallbacks. EmployeeRow and the two item modals are probes; the row probe
 * renders one button per callback so the handlers are driven through the DOM.
 */

const apiMock = vi.hoisted(() => ({
  GetStaffWithPayrollByDate: vi.fn(),
  GetIncomeItemsByTenantId: vi.fn(),
  GetDeductionsByTenantId: vi.fn(),
  CreateManualPayrollCycle: vi.fn(),
}));
vi.mock("../api/payrollApi", () => ({ default: apiMock }));

const toastMock = vi.hoisted(() => ({ showToast: vi.fn(), showApiError: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toastMock.showToast(...a),
  showApiError: (...a) => toastMock.showApiError(...a),
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

import PreviewPayrollModal from "../Components/ReusableModal/PayrollModal/PreviewPayrollModal";

// Module-level so the fetch effect, which depends on this object, runs once.
const PAYROLL_WINDOW = { from: "2026-05-01", to: "2026-05-31", compensationType: "salaried" };

const staffRow = (over = {}, payrollOver = {}) => ({
  staffName: "Grace Hopper",
  grossPay: 5000,
  netPay: 4200,
  paymentSchedule: "Monthly",
  staff: {
    id: "staff-1",
    fullName: "Grace H",
    TenantStaffPayroll: [
      {
        id: "sp-1",
        ratePerHour: 40,
        monthlyRate: 6400,
        minimumHours: 160,
        incomeItems: [{ id: "inc-1" }],
        deductions: [{ id: "ded-1" }],
        ...payrollOver,
      },
    ],
  },
  ...over,
});

const makeStore = () =>
  configureStore({
    reducer: { authentication: authReducer, generalSettings: generalSettingsReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user: { id: "user-1", tenantId: "tenant-1", accessToken: "at", refreshToken: "rt" },
      },
      // `loaded` keeps useFormatSettings from firing its own settings fetch.
      generalSettings: {
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12-hour",
        currency: "USD",
        loaded: true,
      },
    },
  });

const onClose = vi.fn();
const onSave = vi.fn();

const renderModal = (props = {}) =>
  render(
    <Provider store={makeStore()}>
      <PreviewPayrollModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        payrollData={PAYROLL_WINDOW}
        tenantId="tenant-1"
        accessToken="at"
        refreshToken="rt"
        {...props}
      />
    </Provider>
  );

const rosterLoaded = () => screen.findByText("Grace Hopper");
const emptyRoster = () => screen.findByText("No staff found for this payroll period");

beforeEach(() => {
  vi.clearAllMocks();
  rows.byId = {};
  incomeModal.payload = { id: "inc-new" };
  deductionModal.payload = { id: "ded-new" };
  apiMock.GetStaffWithPayrollByDate.mockResolvedValue({ data: [staffRow()] });
  apiMock.GetIncomeItemsByTenantId.mockResolvedValue({ data: [{ id: "inc-1", name: "Bonus" }] });
  apiMock.GetDeductionsByTenantId.mockResolvedValue({ data: [{ id: "ded-1", name: "Tax" }] });
  apiMock.CreateManualPayrollCycle.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading the preview", () => {
  it("asks for the staff who fall inside the chosen window", async () => {
    renderModal();
    await rosterLoaded();
    expect(apiMock.GetStaffWithPayrollByDate).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      startDate: "2026-05-01",
      endDate: "2026-05-31",
      paymentSchedule: "salaried",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(screen.getByText(/05\/01\/2026/)).toBeInTheDocument();
  });

  it("shows the loader until the three fetches land", async () => {
    renderModal();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    await rosterLoaded();
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });

  it("fetches nothing while it is closed", () => {
    renderModal({ isOpen: false });
    expect(apiMock.GetStaffWithPayrollByDate).not.toHaveBeenCalled();
    expect(screen.queryByText("Preview Payroll")).not.toBeInTheDocument();
  });

  it("fetches nothing without a payroll window", async () => {
    renderModal({ payrollData: null });
    await emptyRoster();
    expect(apiMock.GetStaffWithPayrollByDate).not.toHaveBeenCalled();
    // Both ends of the range fall back to the formatter's own N/A.
    expect(screen.getByText("Payroll Cycle: (N/A — N/A)")).toBeInTheDocument();
  });

  it("fetches nothing without a tenant", async () => {
    renderModal({ tenantId: undefined });
    await emptyRoster();
    expect(apiMock.GetStaffWithPayrollByDate).not.toHaveBeenCalled();
  });

  it("accepts bare arrays as well as data envelopes", async () => {
    apiMock.GetStaffWithPayrollByDate.mockResolvedValue([staffRow()]);
    apiMock.GetIncomeItemsByTenantId.mockResolvedValue([{ id: "inc-9" }]);
    apiMock.GetDeductionsByTenantId.mockResolvedValue([{ id: "ded-9" }]);
    renderModal();
    await rosterLoaded();
    expect(incomeModal.props.prefetchedItems).toEqual([{ id: "inc-9" }]);
    expect(deductionModal.props.prefetchedItems).toEqual([{ id: "ded-9" }]);
  });

  it("substitutes empty lists for responses that are not lists", async () => {
    apiMock.GetStaffWithPayrollByDate.mockResolvedValue({ data: { nope: true } });
    apiMock.GetIncomeItemsByTenantId.mockResolvedValue({ data: { nope: true } });
    apiMock.GetDeductionsByTenantId.mockResolvedValue({ data: "not-a-list" });
    renderModal();
    await emptyRoster();
    expect(incomeModal.props.prefetchedItems).toEqual([]);
    expect(deductionModal.props.prefetchedItems).toEqual([]);
  });

  it("treats a null response as an empty roster", async () => {
    apiMock.GetStaffWithPayrollByDate.mockResolvedValue(null);
    renderModal();
    await emptyRoster();
  });

  it("reports a rejected fetch through the shared api error reporter", async () => {
    const failure = new Error("down");
    apiMock.GetIncomeItemsByTenantId.mockRejectedValue(failure);
    renderModal();
    await waitFor(() =>
      expect(toastMock.showApiError).toHaveBeenCalledWith(failure, "LOAD_PAYROLL")
    );
    await emptyRoster();
  });
});

describe("mapping a staff record onto a row", () => {
  it("reads every figure off the staff's first payroll record", async () => {
    renderModal();
    await rosterLoaded();
    expect(rows.byId["staff-1"]).toMatchObject({
      name: "Grace Hopper",
      grossPay: 5000,
      netPay: 4200,
      paymentSchedule: "Monthly",
      hourlyRate: 40,
      monthlyRate: 6400,
      minHoursPerMonth: 160,
      basicPay: 6400,
      numberOfHours: 160,
      payrollId: "sp-1",
      additionalIncomes: [{ id: "inc-1" }],
      additionalDeductions: [{ id: "ded-1" }],
    });
  });

  it("falls back to the staff's own name and payment schedule", async () => {
    apiMock.GetStaffWithPayrollByDate.mockResolvedValue({
      data: [staffRow({ staffName: undefined, paymentSchedule: undefined }, { paymentSchedule: "Weekly" })],
    });
    renderModal();
    await screen.findByText("Grace H");
    expect(rows.byId["staff-1"].paymentSchedule).toBe("Weekly");
  });

  it("zeroes and blanks every field a bare record leaves out", async () => {
    apiMock.GetStaffWithPayrollByDate.mockResolvedValue({ data: [{ staff: { id: "staff-2" } }] });
    renderModal();
    await screen.findByText("Unknown");
    expect(rows.byId["staff-2"]).toMatchObject({
      grossPay: 0,
      netPay: 0,
      paymentSchedule: "",
      hourlyRate: 0,
      monthlyRate: 0,
      minHoursPerMonth: 0,
      payrollId: "",
      additionalIncomes: [],
      additionalDeductions: [],
    });
  });

  it("copes with a row that carries no staff object at all", async () => {
    apiMock.GetStaffWithPayrollByDate.mockResolvedValue({ data: [{ staffName: "Ada" }] });
    renderModal();
    await screen.findByText("Ada");
    expect(rows.byId[undefined].payrollId).toBe("");
  });

  it("empties the roster again when the modal closes", async () => {
    const { rerender } = renderModal();
    await rosterLoaded();
    rerender(
      <Provider store={makeStore()}>
        <PreviewPayrollModal
          isOpen={false}
          onClose={onClose}
          onSave={onSave}
          payrollData={PAYROLL_WINDOW}
          tenantId="tenant-1"
          accessToken="at"
          refreshToken="rt"
        />
      </Provider>
    );
    expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument();
  });
});

describe("selecting and removing staff", () => {
  const twoStaff = () => [
    staffRow(),
    staffRow({ staffName: "Alan Turing", staff: { id: "staff-2" } }),
  ];

  it("selects and deselects one row at a time", async () => {
    apiMock.GetStaffWithPayrollByDate.mockResolvedValue({ data: twoStaff() });
    renderModal();
    await rosterLoaded();
    fireEvent.click(screen.getByLabelText("select staff-1"));
    expect(screen.getByLabelText("select staff-1")).toBeChecked();
    fireEvent.click(screen.getByLabelText("select staff-1"));
    expect(screen.getByLabelText("select staff-1")).not.toBeChecked();
  });

  it("selects every row from the header checkbox and clears them again", async () => {
    apiMock.GetStaffWithPayrollByDate.mockResolvedValue({ data: twoStaff() });
    renderModal();
    await rosterLoaded();
    const all = document.body.querySelector(".custom-table thead input[type='checkbox']");
    fireEvent.click(all);
    expect(screen.getByLabelText("select staff-2")).toBeChecked();
    fireEvent.click(all);
    expect(screen.getByLabelText("select staff-2")).not.toBeChecked();
  });

  it("leaves the header checkbox inert on an empty roster", async () => {
    apiMock.GetStaffWithPayrollByDate.mockResolvedValue({ data: [] });
    renderModal();
    await emptyRoster();
    fireEvent.click(document.body.querySelector(".custom-table thead input[type='checkbox']"));
    expect(screen.queryByRole("button", { name: "Remove from Payroll" })).not.toBeInTheDocument();
  });

  it("drops the selected rows from the preview", async () => {
    apiMock.GetStaffWithPayrollByDate.mockResolvedValue({ data: twoStaff() });
    renderModal();
    await rosterLoaded();
    fireEvent.click(screen.getByLabelText("select staff-1"));
    fireEvent.click(screen.getByRole("button", { name: "Remove from Payroll" }));
    expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument();
    expect(screen.getByText("Alan Turing")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove from Payroll" })).not.toBeInTheDocument();
  });

  it("offers no remove button until something is selected", async () => {
    renderModal();
    await rosterLoaded();
    expect(screen.queryByRole("button", { name: "Remove from Payroll" })).not.toBeInTheDocument();
  });
});

describe("income items and deductions on a row", () => {
  it("expands a row and collapses it again", async () => {
    renderModal();
    await rosterLoaded();
    fireEvent.click(screen.getByText("toggle staff-1"));
    expect(screen.getByTestId("expanded-staff-1")).toHaveTextContent("open");
    fireEvent.click(screen.getByText("toggle staff-1"));
    expect(screen.getByTestId("expanded-staff-1")).toHaveTextContent("closed");
  });

  it("appends an income item to the row the modal was opened from", async () => {
    renderModal();
    await rosterLoaded();
    fireEvent.click(screen.getByText("income staff-1"));
    fireEvent.click(screen.getByText("save-income"));
    expect(rows.byId["staff-1"].additionalIncomes).toEqual([{ id: "inc-1" }, { id: "inc-new" }]);
    expect(screen.queryByTestId("income-modal")).not.toBeInTheDocument();
  });

  it("appends a deduction to the row the modal was opened from", async () => {
    renderModal();
    await rosterLoaded();
    fireEvent.click(screen.getByText("deduction staff-1"));
    fireEvent.click(screen.getByText("save-deduction"));
    expect(rows.byId["staff-1"].additionalDeductions).toEqual([{ id: "ded-1" }, { id: "ded-new" }]);
  });

  it("leaves the other rows untouched", async () => {
    apiMock.GetStaffWithPayrollByDate.mockResolvedValue({
      data: [staffRow(), staffRow({ staffName: "Alan Turing", staff: { id: "staff-2" } })],
    });
    renderModal();
    await rosterLoaded();
    fireEvent.click(screen.getByText("income staff-1"));
    fireEvent.click(screen.getByText("save-income"));
    expect(rows.byId["staff-2"].additionalIncomes).toEqual([]);
    fireEvent.click(screen.getByText("deduction staff-1"));
    fireEvent.click(screen.getByText("save-deduction"));
    expect(rows.byId["staff-2"].additionalDeductions).toEqual([]);
  });

  it("closes both modals on their own close handlers", async () => {
    renderModal();
    await rosterLoaded();
    fireEvent.click(screen.getByText("income staff-1"));
    fireEvent.click(screen.getByText("close-income"));
    expect(screen.queryByTestId("income-modal")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("deduction staff-1"));
    fireEvent.click(screen.getByText("close-deduction"));
    expect(screen.queryByTestId("deduction-modal")).not.toBeInTheDocument();
  });
});

describe("paging a long roster", () => {
  it("shows eight rows per page and collapses the open row on a page change", async () => {
    apiMock.GetStaffWithPayrollByDate.mockResolvedValue({
      data: Array.from({ length: 10 }, (_, i) =>
        staffRow({ staffName: `Employee ${i}`, staff: { id: `staff-${i}` } })
      ),
    });
    renderModal();
    await screen.findByText("Employee 0");
    expect(screen.getAllByTestId(/^employee-/)).toHaveLength(8);
    fireEvent.click(screen.getByText("toggle staff-0"));
    expect(screen.getByTestId("expanded-staff-0")).toHaveTextContent("open");

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(screen.getByText("Employee 9")).toBeInTheDocument();
    expect(screen.queryByText("Employee 0")).not.toBeInTheDocument();
  });
});

describe("saving the preview as a cycle", () => {
  it("sends one entry per row with only the item ids", async () => {
    renderModal();
    await rosterLoaded();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(apiMock.CreateManualPayrollCycle).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        compensationType: "SALARIED",
        startDate: "2026-05-01",
        endDate: "2026-05-31",
        staffs: [
          {
            id: "staff-1",
            payrollId: "sp-1",
            deductions: [{ id: "ded-1" }],
            incomeItems: [{ id: "inc-1" }],
          },
        ],
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toastMock.showToast).toHaveBeenCalledWith(
      "Payroll cycle created successfully",
      "success"
    );
    expect(onSave).toHaveBeenCalled();
  });

  it("refuses to save an empty preview", async () => {
    apiMock.GetStaffWithPayrollByDate.mockResolvedValue({ data: [] });
    renderModal();
    await emptyRoster();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("No staff in payroll to save", "error")
    );
    expect(apiMock.CreateManualPayrollCycle).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("reports a rejected save and keeps the preview open", async () => {
    const failure = new Error("nope");
    apiMock.CreateManualPayrollCycle.mockRejectedValue(failure);
    renderModal();
    await rosterLoaded();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(toastMock.showApiError).toHaveBeenCalledWith(failure, "SAVE_PAYROLL")
    );
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
  });

  it("closes from Cancel without saving", async () => {
    renderModal();
    await rosterLoaded();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(apiMock.CreateManualPayrollCycle).not.toHaveBeenCalled();
  });
});
