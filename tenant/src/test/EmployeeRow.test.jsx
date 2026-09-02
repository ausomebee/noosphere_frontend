import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

import EmployeeRow from "../Components/ReusableModal/PayrollModal/EmployeeRow";

/**
 * One staff line in the payroll preview and breakdown tables: a summary row
 * that is always visible, and a detail panel that unfolds beneath it.
 *
 * The panel's Basic Pay block is chosen by `paymentSchedule`: HOURLY and DAILY
 * staff show a single hourly rate, SALARIED staff show a monthly rate plus a
 * minimum-hours field, and anything else shows neither. Each of those fields
 * reads a pair of aliases (`monthlyRate` / `basicPay`, `minHoursPerMonth` /
 * `numberOfHours`) because the two callers map their records slightly
 * differently.
 *
 * Income and deduction lines are rendered by the same three helpers, so a
 * fixture that leaves out `amount` falls through to the `rate` object and is
 * read by `type`. Gross and net pay are formatted with the tenant's currency,
 * but the per-line unit symbol is hard-coded to USD — the test for a non-USD
 * tenant pins that difference rather than asserting it is correct.
 *
 * The component renders `<tr>` fragments, so every render is wrapped in a
 * table body to keep the DOM valid.
 */

const store = () =>
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
      generalSettings: {
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12-hour",
        currency: "USD",
        loaded: true,
      },
    },
  });

const nairaStore = () =>
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
      generalSettings: {
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12-hour",
        currency: "NGN",
        loaded: true,
      },
    },
  });

const employee = (over = {}) => ({
  id: "emp-1",
  name: "Grace Hopper",
  paymentSchedule: "SALARIED",
  grossPay: 5000,
  netPay: 4200,
  hourlyRate: 40,
  monthlyRate: 6400,
  minHoursPerMonth: 160,
  basicPay: 7000,
  numberOfHours: 120,
  additionalIncomes: [],
  additionalDeductions: [],
  ...over,
});

const handlers = {
  onSelect: vi.fn(),
  onToggleExpand: vi.fn(),
  onAddIncome: vi.fn(),
  onAddDeduction: vi.fn(),
};

const renderRow = (emp, { expanded = false, selected = false, makeStore = store } = {}) =>
  render(
    <Provider store={makeStore()}>
      <table>
        <tbody>
          <EmployeeRow
            employee={emp}
            isSelected={selected}
            expandedEmployee={expanded ? emp.id : null}
            {...handlers}
          />
        </tbody>
      </table>
    </Provider>
  );

const valueOf = (labelText) =>
  screen.getByText(labelText).parentElement.querySelector("input").value;
const amounts = () =>
  [...document.body.querySelectorAll("input[type='number']")].map((i) => i.value);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the summary row", () => {
  it("prints the name, schedule and both pay figures in the tenant's currency", () => {
    renderRow(employee());
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("SALARIED")).toBeInTheDocument();
    expect(screen.getByText("$5,000.00")).toBeInTheDocument();
    expect(screen.getByText("$4,200.00")).toBeInTheDocument();
  });

  it("zeroes gross and net pay that are missing", () => {
    renderRow(employee({ grossPay: undefined, netPay: 0 }));
    expect(screen.getAllByText("$0.00")).toHaveLength(2);
  });

  it("uses the tenant's own currency symbol", () => {
    renderRow(employee(), { makeStore: nairaStore });
    expect(screen.getByText("₦5,000.00")).toBeInTheDocument();
  });

  it("reports a selection change to its owner", () => {
    renderRow(employee());
    fireEvent.click(document.body.querySelector("input[type='checkbox']"));
    expect(handlers.onSelect).toHaveBeenCalledWith("emp-1");
  });

  it("shows the checkbox already ticked when the row is selected", () => {
    renderRow(employee(), { selected: true });
    expect(document.body.querySelector("input[type='checkbox']")).toBeChecked();
  });

  it("asks its owner to expand, and turns the chevron once expanded", () => {
    const { rerender } = renderRow(employee());
    const chevron = () => document.body.querySelector("td button svg");
    expect(chevron().getAttribute("class")).not.toContain("rotate-180");
    fireEvent.click(document.body.querySelector("td button"));
    expect(handlers.onToggleExpand).toHaveBeenCalledWith("emp-1");

    rerender(
      <Provider store={store()}>
        <table>
          <tbody>
            <EmployeeRow
              employee={employee()}
              isSelected={false}
              expandedEmployee="emp-1"
              {...handlers}
            />
          </tbody>
        </table>
      </Provider>
    );
    expect(chevron().getAttribute("class")).toContain("rotate-180");
  });

  it("keeps the detail panel out of the DOM while collapsed", () => {
    renderRow(employee());
    expect(screen.queryByText("Gross Income")).not.toBeInTheDocument();
  });
});

describe("the basic pay block", () => {
  it("shows a single hourly rate for hourly staff", () => {
    renderRow(employee({ paymentSchedule: "HOURLY" }), { expanded: true });
    expect(valueOf("Hourly Rate")).toBe("40");
    expect(screen.queryByText("Monthly Rate")).not.toBeInTheDocument();
  });

  it("shows the same block for daily staff", () => {
    renderRow(employee({ paymentSchedule: "DAILY" }), { expanded: true });
    expect(screen.getByText("Hourly Rate")).toBeInTheDocument();
  });

  it("blanks an hourly rate of zero rather than printing it", () => {
    renderRow(employee({ paymentSchedule: "HOURLY", hourlyRate: 0 }), { expanded: true });
    expect(valueOf("Hourly Rate")).toBe("");
  });

  it("shows the monthly rate and minimum hours for salaried staff", () => {
    renderRow(employee(), { expanded: true });
    expect(valueOf("Monthly Rate")).toBe("6400");
    expect(valueOf("Min Hours/Month")).toBe("160");
    expect(screen.queryByText("Hourly Rate")).not.toBeInTheDocument();
  });

  it("falls back to the basicPay and numberOfHours aliases", () => {
    renderRow(employee({ monthlyRate: 0, minHoursPerMonth: 0 }), { expanded: true });
    expect(valueOf("Monthly Rate")).toBe("7000");
    expect(valueOf("Min Hours/Month")).toBe("120");
  });

  it("blanks both fields when neither alias carries a figure", () => {
    renderRow(employee({ monthlyRate: 0, basicPay: 0, minHoursPerMonth: 0, numberOfHours: 0 }), {
      expanded: true,
    });
    expect(valueOf("Monthly Rate")).toBe("");
    expect(valueOf("Min Hours/Month")).toBe("");
  });

  it("shows no basic pay fields at all for an unrecognised schedule", () => {
    renderRow(employee({ paymentSchedule: "CONTRACT" }), { expanded: true });
    expect(screen.getByText("Basic Pay")).toBeInTheDocument();
    expect(screen.queryByText("Hourly Rate")).not.toBeInTheDocument();
    expect(screen.queryByText("Monthly Rate")).not.toBeInTheDocument();
  });
});

describe("the income and deduction lines", () => {
  it("prefers an explicit amount over the rate object", () => {
    renderRow(
      employee({ additionalIncomes: [{ id: "i1", name: "Bonus", amount: 300, rate: { rate: 1 } }] }),
      { expanded: true }
    );
    expect(screen.getByText("Bonus")).toBeInTheDocument();
    expect(amounts()).toContain("300");
  });

  it("zeroes an amount that is not a number", () => {
    renderRow(employee({ additionalIncomes: [{ id: "i1", name: "Bonus", amount: "many" }] }), {
      expanded: true,
    });
    expect(amounts()).toContain("0");
  });

  it("reads a flat rate, a time-based rate and a percentage off the rate object", () => {
    renderRow(
      employee({
        additionalIncomes: [
          { id: "i1", name: "Transport", type: "Flat Rate", rate: { rate: 250 } },
          { id: "i2", name: "Overtime", type: "Time based", rate: { unit: 20 } },
          { id: "i3", name: "Pension", type: "Percentage based", rate: { unit: 8 } },
        ],
      }),
      { expanded: true }
    );
    expect(amounts()).toEqual(expect.arrayContaining(["250", "20", "8"]));
  });

  it("zeroes a rate whose type it does not recognise, and one with no rate at all", () => {
    renderRow(
      employee({
        additionalIncomes: [
          { id: "i1", name: "Mystery", type: "Odd", rate: { rate: 9 } },
          { id: "i2", name: "Bare" },
        ],
      }),
      { expanded: true }
    );
    const shown = amounts();
    expect(shown.filter((v) => v === "0")).toHaveLength(2);
  });

  it("titles a nameless line from its type, and an anonymous one Item", () => {
    renderRow(
      employee({
        additionalIncomes: [{ id: "i1", type: "flat_rate" }, { id: "i2" }],
      }),
      { expanded: true }
    );
    expect(screen.getByText("Flat Rate")).toBeInTheDocument();
    expect(screen.getByText("Item")).toBeInTheDocument();
  });

  it("marks a percentage line with % and everything else with a currency symbol", () => {
    renderRow(
      employee({
        additionalIncomes: [
          { id: "i1", name: "Pension", type: "Percentage based", rate: { unit: 8 } },
          { id: "i2", name: "Levy", unitType: "percentage_based", amount: 3 },
          { id: "i3", name: "Transport", type: "Flat Rate", rate: { rate: 250 } },
        ],
      }),
      { expanded: true }
    );
    const symbols = [...document.body.querySelectorAll(".custom-time-label")].map(
      (s) => s.textContent
    );
    expect(symbols.filter((s) => s === "%")).toHaveLength(2);
    expect(symbols).toContain("$");
  });

  it("keeps the hard-coded dollar unit symbol even for a non-USD tenant", () => {
    renderRow(
      employee({
        additionalIncomes: [{ id: "i1", name: "Transport", type: "Flat Rate", rate: { rate: 250 } }],
      }),
      { expanded: true, makeStore: nairaStore }
    );
    expect(screen.getByText("₦5,000.00")).toBeInTheDocument();
    const symbols = [...document.body.querySelectorAll(".custom-time-label")].map(
      (s) => s.textContent
    );
    expect(symbols).toContain("$");
    expect(symbols).not.toContain("₦");
  });

  it("lists deductions under their own heading", () => {
    renderRow(
      employee({ additionalDeductions: [{ id: "d1", name: "Tax", type: "Flat Rate", rate: { rate: 90 } }] }),
      { expanded: true }
    );
    expect(screen.getByText("Deduction")).toBeInTheDocument();
    expect(screen.getByText("Tax")).toBeInTheDocument();
    expect(amounts()).toContain("90");
  });

  it("renders both sections for an employee with neither list", () => {
    renderRow(employee({ additionalIncomes: undefined, additionalDeductions: undefined }), {
      expanded: true,
    });
    expect(screen.getByText("Gross Income")).toBeInTheDocument();
    expect(screen.getByText("Deduction")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Add" })).toHaveLength(2);
  });
});

describe("the two Add buttons", () => {
  it("asks its owner to add an income item, then a deduction", () => {
    renderRow(employee(), { expanded: true });
    const [addIncome, addDeduction] = screen.getAllByRole("button", { name: "Add" });
    fireEvent.click(addIncome);
    expect(handlers.onAddIncome).toHaveBeenCalledWith("emp-1");
    fireEvent.click(addDeduction);
    expect(handlers.onAddDeduction).toHaveBeenCalledWith("emp-1");
  });

  it("keeps the two sections separate", () => {
    const { container } = renderRow(
      employee({
        additionalIncomes: [{ id: "i1", name: "Bonus", amount: 1 }],
        additionalDeductions: [{ id: "d1", name: "Tax", amount: 2 }],
      }),
      { expanded: true }
    );
    const panel = container.querySelector("td[colspan='6'] > div > div");
    expect(within(panel).getByText("Bonus")).toBeInTheDocument();
    expect(within(panel).getByText("Tax")).toBeInTheDocument();
  });
});
