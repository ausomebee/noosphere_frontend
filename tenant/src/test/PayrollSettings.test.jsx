import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The payroll settings page: three permission-gated tabs over three list
 * panels. All of its behaviour is gating and tab selection, so the panels are
 * probes and permissions run for real off a seeded auth slice.
 *
 * Unlike the main settings page each tab here is gated on a single key rather
 * than a pair. An empty `roleModuleAccesses` means org owner and grants
 * everything, so every restricted case seeds an explicit non-empty set. A role
 * with none of the three keys gets no page whatsoever, not an empty tab bar.
 *
 * The active tab persists in sessionStorage under "tab:tenant:payrollSettings",
 * cleared before each test and seeded directly where the restore path is under
 * test.
 */

vi.mock("../Pages/Payroll/PayrollSetting/PayrollSettingsSubs/IncomeItems", () => ({
  default: () => <div data-testid="income-panel" />,
}));
vi.mock("../Pages/Payroll/PayrollSetting/PayrollSettingsSubs/Deductions", () => ({
  default: () => <div data-testid="deductions-panel" />,
}));
vi.mock("../Pages/Payroll/PayrollSetting/PayrollSettingsSubs/PayrollCycles", () => ({
  default: () => <div data-testid="cycles-panel" />,
}));

import PayrollSettings from "../Pages/Payroll/PayrollSetting/PayrollSettings";

const makeStore = (permissions) =>
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
          tenantId: "t-1",
          accessToken: "at",
          refreshToken: "rt",
          role: permissions
            ? { roleModuleAccesses: [{ module: "PAYROLL", permissions }] }
            : { roleModuleAccesses: [] },
        },
      },
    },
  });

const renderPage = ({ permissions } = {}) =>
  render(
    <Provider store={makeStore(permissions)}>
      <PayrollSettings />
    </Provider>
  );

const tabs = () => Array.from(document.body.querySelectorAll(".tabs .tab"));
const tabLabels = () => tabs().map((t) => t.textContent);
const activeTabLabels = () =>
  tabs()
    .filter((t) => t.classList.contains("active"))
    .map((t) => t.textContent);
const tabNamed = (label) => tabs().find((t) => t.textContent === label);
const storedTab = () => sessionStorage.getItem("tab:tenant:payrollSettings");

const INCOME = "Income Items";
const DEDUCTIONS = "Deductions";
const CYCLES = "Payroll Cycles";

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe("the page for a full-access role", () => {
  it("offers all three tabs and opens on the first", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Payroll Settings" })
    ).toBeInTheDocument();
    expect(tabLabels()).toEqual([INCOME, DEDUCTIONS, CYCLES]);
    expect(activeTabLabels()).toEqual([INCOME]);
    expect(screen.getByTestId("income-panel")).toBeInTheDocument();
  });

  it("swaps to the deductions panel", () => {
    renderPage();
    fireEvent.click(tabNamed(DEDUCTIONS));
    expect(activeTabLabels()).toEqual([DEDUCTIONS]);
    expect(screen.getByTestId("deductions-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("income-panel")).toBeNull();
  });

  it("swaps to the payroll cycles panel", () => {
    renderPage();
    fireEvent.click(tabNamed(CYCLES));
    expect(activeTabLabels()).toEqual([CYCLES]);
    expect(screen.getByTestId("cycles-panel")).toBeInTheDocument();
  });

  it("swaps back to the income items panel", () => {
    renderPage();
    fireEvent.click(tabNamed(CYCLES));
    fireEvent.click(tabNamed(INCOME));
    expect(screen.getByTestId("income-panel")).toBeInTheDocument();
  });
});

describe("permission gating", () => {
  it("shows only the income tab for an income-only role", () => {
    renderPage({ permissions: ["view_income_items_list"] });
    expect(tabLabels()).toEqual([INCOME]);
    expect(screen.getByTestId("income-panel")).toBeInTheDocument();
  });

  it("shows only the deductions tab for a deductions-only role", () => {
    renderPage({ permissions: ["view_deductions_list"] });
    expect(tabLabels()).toEqual([DEDUCTIONS]);
    expect(screen.getByTestId("deductions-panel")).toBeInTheDocument();
  });

  it("opens on the cycles tab when it is the only one left", () => {
    renderPage({ permissions: ["view_payroll_cycles_list"] });
    expect(tabLabels()).toEqual([CYCLES]);
    expect(activeTabLabels()).toEqual([CYCLES]);
    expect(screen.getByTestId("cycles-panel")).toBeInTheDocument();
  });

  it("keeps the tabs in their declared order for a partial role", () => {
    renderPage({ permissions: ["view_payroll_cycles_list", "view_income_items_list"] });
    expect(tabLabels()).toEqual([INCOME, CYCLES]);
  });

  it("renders nothing at all for a role with none of the three", () => {
    const { container } = renderPage({ permissions: ["view_payroll_list"] });
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("heading", { name: "Payroll Settings" })).toBeNull();
  });
});

describe("remembering the tab", () => {
  it("writes the chosen tab to session storage", () => {
    renderPage();
    fireEvent.click(tabNamed(DEDUCTIONS));
    expect(storedTab()).toBe("deductions");
  });

  it("reopens on the tab that was stored", () => {
    sessionStorage.setItem("tab:tenant:payrollSettings", "payrollCycles");
    renderPage();
    expect(activeTabLabels()).toEqual([CYCLES]);
    expect(screen.getByTestId("cycles-panel")).toBeInTheDocument();
  });

  // A stored tab the current role can no longer see falls back to the first
  // tab that is left rather than rendering an empty panel.
  it("falls back to the first visible tab when the stored one is now hidden", () => {
    sessionStorage.setItem("tab:tenant:payrollSettings", "payrollCycles");
    renderPage({ permissions: ["view_deductions_list"] });
    expect(activeTabLabels()).toEqual([DEDUCTIONS]);
    expect(screen.getByTestId("deductions-panel")).toBeInTheDocument();
  });
});
