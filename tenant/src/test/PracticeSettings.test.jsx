import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../ReduxStore/features/authentication";

/**
 * The organisation's Practice Settings page: five permission-gated tabs, two of
 * which (diagnosis codes and session types) this page owns outright -- their
 * fetches, their table columns, their row menus and the create/update/toggle
 * handlers behind two modals. The other three tabs are whole billing pages
 * mounted wholesale, so they are probes here.
 *
 * Both modals are probes too: the page's job is to decide which one to mount,
 * in which mode, seeded with which row, and to turn what comes back into a
 * payload -- so the tests call the recorded `onSave` rather than filling a
 * form. `CustomTable` is left real, because the row menus and the Status
 * switch are the only way to reach the toggle handlers.
 *
 * The active tab lives in sessionStorage, which is cleared between tests so one
 * test's tab cannot leak into the next.
 */

const api = vi.hoisted(() => ({
  GetDiagnosisCodeByTenantId: vi.fn(),
  GetSessionTypeByTenantId: vi.fn(),
  CreateDiagnosisCode: vi.fn(),
  UpdateDiagnosisCode: vi.fn(),
  UpdateActiveDiagnosisCode: vi.fn(),
  CreateOrganizationSessionType: vi.fn(),
  UpdateOrganizationSessionType: vi.fn(),
  UpdateActiveSessionTypeByTenantId: vi.fn(),
}));
vi.mock("../api/organisationApis", () => ({ default: api }));

const toast = vi.hoisted(() => vi.fn());
vi.mock("../Helper/ShowToast", () => ({ showToast: toast, showApiError: vi.fn() }));

const probes = vi.hoisted(() => {
  const props = {};
  const modal = (name) => (received) => {
    props[name] = received;
    return received.isOpen ? <div data-testid={`${name}-modal`} /> : null;
  };
  return { props, modal };
});
vi.mock("../Components/ReusableModal/OrganizationModal/AddSessionTypeModal", () => ({
  default: probes.modal("session"),
}));
vi.mock("../Components/ReusableModal/OrganizationModal/AddDiagnosisCode", () => ({
  default: probes.modal("diagnosis"),
}));
vi.mock("../Pages/BillingAndPayment/Settings/SettingSubs/ServiceCodes", () => ({
  default: () => <div data-testid="service-codes" />,
}));
vi.mock("../Pages/BillingAndPayment/Settings/SettingSubs/RoundingRules", () => ({
  default: () => <div data-testid="rounding-rules" />,
}));
vi.mock("../Pages/BillingAndPayment/Settings/SettingSubs/PayersAndInsurance", () => ({
  default: () => <div data-testid="payers-insurance" />,
}));

import PracticeSettings from "../Pages/Organisation/PracticeSettings/PracticeSettings";

const store = ({ permissions, tenantId = "tenant-1" } = {}) =>
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
          tenantId,
          accessToken: "at",
          refreshToken: "rt",
          // An empty accesses array is the org-owner case: every permission.
          role: permissions
            ? { roleModuleAccesses: [{ module: "MY_ORGANIZATION", permissions }] }
            : { roleModuleAccesses: [] },
        },
      },
    },
  });

const renderPage = (opts) =>
  render(
    <Provider store={store(opts)}>
      <PracticeSettings />
    </Provider>
  );

const code = (over = {}) => ({
  id: "dx-1",
  code: "F84.0",
  description: "Autistic disorder",
  isActive: true,
  ...over,
});

const session = (over = {}) => ({
  id: "st-1",
  name: "Direct therapy",
  category: "Direct",
  isBillable: true,
  isActive: true,
  sessionTypeServices: [{ serviceCode: { code: "97153" }, modifiers: { modifier: "HN" } }],
  ...over,
});

const withCodes = (rows) =>
  api.GetDiagnosisCodeByTenantId.mockResolvedValue({ data: { data: rows } });
const withSessions = (rows) =>
  api.GetSessionTypeByTenantId.mockResolvedValue({ data: { data: rows } });

const tab = (name) => screen.getByRole("button", { name });
const goTo = (name) => fireEvent.click(tab(name));

const openRowMenu = (index = 0) =>
  fireEvent.click(document.body.querySelectorAll(".action-cell .action-button")[index]);

const settled = () => waitFor(() => expect(api.GetSessionTypeByTenantId).toHaveBeenCalled());

// The filter picker is react-select, so its choices only exist once the menu
// is opened, and the menu is portalled out of the table.
const filterChoices = () => {
  const input = document.body.querySelector(".filter-label input");
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
  const menus = document.body.querySelectorAll(".rs__menu");
  return Array.from(menus[menus.length - 1].querySelectorAll(".rs__option")).map(
    (o) => o.textContent
  );
};

const cellText = (rowIndex, colIndex) =>
  document.body.querySelectorAll("tbody tr")[rowIndex].querySelectorAll("td")[colIndex]
    .textContent;

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  Object.keys(probes.props).forEach((k) => delete probes.props[k]);
  withCodes([]);
  withSessions([]);
  api.CreateDiagnosisCode.mockResolvedValue({ data: { data: code({ id: "dx-new" }) } });
  api.UpdateDiagnosisCode.mockResolvedValue({ data: { data: code() } });
  api.UpdateActiveDiagnosisCode.mockResolvedValue({ data: { data: code({ isActive: false }) } });
  api.CreateOrganizationSessionType.mockResolvedValue({ data: { data: session({ id: "st-new" }) } });
  api.UpdateOrganizationSessionType.mockResolvedValue({ data: { data: session() } });
  api.UpdateActiveSessionTypeByTenantId.mockResolvedValue({
    data: { data: session({ isActive: false }) },
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("which tabs are shown", () => {
  it("shows all five to a role with full access, opening on the first", async () => {
    renderPage();
    await settled();
    [
      "Diagnosis Codes",
      "Session Types",
      "Service Codes",
      "Rounding Rules",
      "Payers & Insurance",
    ].forEach((label) => expect(tab(label)).toBeInTheDocument());
    expect(tab("Diagnosis Codes")).toHaveClass("appointment-sched-view-button-active");
  });

  it("renders nothing at all for a role granted none of them", () => {
    const { container } = renderPage({ permissions: ["view_staff_list"] });
    expect(container).toBeEmptyDOMElement();
  });

  it("opens on the only tab a narrow role can see", async () => {
    renderPage({ permissions: ["view_session_types"] });
    await settled();
    expect(screen.queryByRole("button", { name: "Diagnosis Codes" })).not.toBeInTheDocument();
    expect(tab("Session Types")).toHaveClass("appointment-sched-view-button-active");
  });

  it("remembers the chosen tab across a remount", async () => {
    const first = renderPage();
    await settled();
    goTo("Rounding Rules");
    first.unmount();
    renderPage();
    expect(screen.getByTestId("rounding-rules")).toBeInTheDocument();
  });

  it("ignores a remembered tab the current role cannot see", async () => {
    sessionStorage.setItem("tab:tenant:practiceSettings", "payersInsurance");
    renderPage({ permissions: ["view_diagnosis_codes"] });
    await settled();
    expect(tab("Diagnosis Codes")).toHaveClass("appointment-sched-view-button-active");
  });

  it("mounts each billing page on its own tab", async () => {
    renderPage();
    await settled();
    goTo("Service Codes");
    expect(screen.getByTestId("service-codes")).toBeInTheDocument();
    goTo("Rounding Rules");
    expect(screen.getByTestId("rounding-rules")).toBeInTheDocument();
    goTo("Payers & Insurance");
    expect(screen.getByTestId("payers-insurance")).toBeInTheDocument();
    goTo("Diagnosis Codes");
    expect(screen.queryByTestId("payers-insurance")).not.toBeInTheDocument();
  });
});

describe("the two fetches on mount", () => {
  it("asks both endpoints for the current tenant", async () => {
    renderPage();
    const args = { tenantId: "tenant-1", accessToken: "at", refreshToken: "rt" };
    await waitFor(() => expect(api.GetDiagnosisCodeByTenantId).toHaveBeenCalledWith(args));
    expect(api.GetSessionTypeByTenantId).toHaveBeenCalledWith(args);
  });

  it("fetches nothing without a tenant", async () => {
    renderPage({ tenantId: null });
    await waitFor(() => expect(tab("Diagnosis Codes")).toBeInTheDocument());
    expect(api.GetDiagnosisCodeByTenantId).not.toHaveBeenCalled();
    expect(api.GetSessionTypeByTenantId).not.toHaveBeenCalled();
  });

  it("treats a response that is not a list as an empty table", async () => {
    api.GetDiagnosisCodeByTenantId.mockResolvedValue({ data: { data: { nope: true } } });
    renderPage();
    await settled();
    expect(document.body.querySelectorAll("tbody tr td[colspan]").length).toBeGreaterThan(0);
  });

  it("stays quiet and empty when a fetch fails", async () => {
    api.GetDiagnosisCodeByTenantId.mockRejectedValue(new Error("500"));
    api.GetSessionTypeByTenantId.mockRejectedValue(new Error("500"));
    renderPage();
    await settled();
    await waitFor(() => expect(document.body.querySelector(".loading-spinner")).toBeNull());
    expect(toast).not.toHaveBeenCalled();
  });
});

describe("the diagnosis codes table", () => {
  it("puts each stored code in a row with a live status switch", async () => {
    withCodes([code()]);
    renderPage();
    expect(await screen.findByText("Autistic disorder")).toBeInTheDocument();
    expect(screen.getByText("F84.0")).toBeInTheDocument();
    const toggle = document.body.querySelector(".switch input");
    expect(toggle).toBeChecked();
    expect(toggle).not.toBeDisabled();
  });

  it("disables the status switch for a role that may not deactivate", async () => {
    withCodes([code()]);
    renderPage({ permissions: ["view_diagnosis_codes"] });
    await screen.findByText("Autistic disorder");
    expect(document.body.querySelector(".switch input")).toBeDisabled();
  });

  it("offers the row menu only the actions the role was granted", async () => {
    withCodes([code()]);
    renderPage({ permissions: ["view_diagnosis_codes", "edit_diagnosis_codes"] });
    await screen.findByText("Autistic disorder");
    openRowMenu();
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.queryByText("Deactivate")).not.toBeInTheDocument();
  });

  it("offers Deactivate on an active code and Activate on an inactive one", async () => {
    withCodes([code(), code({ id: "dx-2", code: "F84.1", isActive: false })]);
    renderPage();
    await screen.findByText("F84.1");
    openRowMenu(0);
    expect(screen.getByText("Deactivate")).toBeInTheDocument();
    openRowMenu(1);
    expect(screen.getByText("Activate")).toBeInTheDocument();
  });
});

describe("the session types table", () => {
  const showSessions = async (rows) => {
    withSessions(rows);
    renderPage();
    await settled();
    goTo("Session Types");
  };

  it("joins the CPT codes with their modifiers", async () => {
    await showSessions([session()]);
    expect(await screen.findByText("97153 (HN)")).toBeInTheDocument();
  });

  it("names a service that carries no code", async () => {
    await showSessions([session({ sessionTypeServices: [{ modifiers: {} }] })]);
    expect(await screen.findByText("N/A")).toBeInTheDocument();
  });

  it("dashes a session type with no services and one whose services are malformed", async () => {
    await showSessions([
      session({ id: "st-1", name: "Empty", sessionTypeServices: [] }),
      session({ id: "st-2", name: "Broken", sessionTypeServices: "none" }),
    ]);
    await screen.findByText("Empty");
    expect(screen.getAllByText("-")).toHaveLength(2);
  });

  it("truncates a long list of CPT codes", async () => {
    await showSessions([
      session({
        sessionTypeServices: [
          { serviceCode: { code: "97153" } },
          { serviceCode: { code: "97155" } },
          { serviceCode: { code: "97156" } },
          { serviceCode: { code: "97158" } },
        ],
      }),
    ]);
    expect(await screen.findByText("97153, 97155, 97156,...")).toBeInTheDocument();
  });

  // The Billable column's render is declared as `(value) => ...` but CustomTable
  // hands every render function the whole row, so a row object is always truthy
  // and the column reads "Yes" even for a session type that is not billable.
  it("always reads Billable as Yes, even when the record says otherwise", async () => {
    await showSessions([session({ isBillable: false })]);
    await screen.findByText("Direct therapy");
    expect(cellText(0, 3)).toBe("Yes");
  });

  // The diagnosis tab passes an empty filter list, which makes CustomTable fall
  // back to deriving the choices from its own text columns.
  it("names its own filters, where the diagnosis tab borrows its column headers", async () => {
    await showSessions([session()]);
    await screen.findByText("Direct therapy");
    expect(filterChoices()).toEqual(["Category", "Service", "Status", "Clear Filters"]);
    goTo("Diagnosis Codes");
    expect(filterChoices()).toEqual(["Diagnosis Description", "Code", "Clear Filters"]);
  });
});

describe("adding a record", () => {
  it("opens the diagnosis modal in add mode with nothing behind it", async () => {
    renderPage();
    await settled();
    fireEvent.click(tab("Add Diagnosis Code"));
    await screen.findByTestId("diagnosis-modal");
    expect(probes.props.diagnosis.mode).toBe("add");
    expect(probes.props.diagnosis.initialData).toEqual({});
    expect(screen.queryByTestId("session-modal")).not.toBeInTheDocument();
  });

  it("opens the session modal from the session types tab", async () => {
    renderPage();
    await settled();
    goTo("Session Types");
    fireEvent.click(tab("Add Session Type"));
    await screen.findByTestId("session-modal");
    expect(probes.props.session.mode).toBe("add");
  });

  it("withholds the add button from a role that may only look", async () => {
    renderPage({ permissions: ["view_diagnosis_codes", "view_session_types"] });
    await settled();
    expect(screen.queryByRole("button", { name: /Add Diagnosis Code/ })).not.toBeInTheDocument();
    goTo("Session Types");
    expect(screen.queryByRole("button", { name: /Add Session Type/ })).not.toBeInTheDocument();
  });

  it("closes the modal and forgets the row it was opened on", async () => {
    withCodes([code()]);
    renderPage();
    await screen.findByText("Autistic disorder");
    openRowMenu();
    fireEvent.click(screen.getByText("Edit"));
    await screen.findByTestId("diagnosis-modal");
    act(() => probes.props.diagnosis.onClose());
    expect(screen.queryByTestId("diagnosis-modal")).not.toBeInTheDocument();
    fireEvent.click(tab("Add Diagnosis Code"));
    await screen.findByTestId("diagnosis-modal");
    expect(probes.props.diagnosis.initialData).toEqual({});
  });
});

describe("saving a diagnosis code", () => {
  const openAdd = async () => {
    renderPage();
    await settled();
    fireEvent.click(tab("Add Diagnosis Code"));
    await screen.findByTestId("diagnosis-modal");
  };

  const save = (data) =>
    act(async () => {
      await probes.props.diagnosis.onSave(data);
    });

  it("creates a code under the current tenant and appends it", async () => {
    await openAdd();
    await save({ diagnosisCode: "F84.0", description: "Autistic disorder", status: true });
    expect(api.CreateDiagnosisCode).toHaveBeenCalledWith({
      code: "F84.0",
      description: "Autistic disorder",
      tenantId: "tenant-1",
      isActive: true,
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast).toHaveBeenCalledWith("Diagnosis code created successfully", "success");
    expect(await screen.findByText("Autistic disorder")).toBeInTheDocument();
    expect(screen.queryByTestId("diagnosis-modal")).not.toBeInTheDocument();
  });

  it("reads a create response that is not wrapped in a data envelope", async () => {
    api.CreateDiagnosisCode.mockResolvedValue({ data: code({ description: "Flat response" }) });
    await openAdd();
    await save({ diagnosisCode: "F84.0", description: "Flat response", status: true });
    expect(await screen.findByText("Flat response")).toBeInTheDocument();
  });

  it("updates the code the row menu was opened on and leaves the others alone", async () => {
    withCodes([code(), code({ id: "dx-2", code: "F84.1", description: "Second code" })]);
    api.UpdateDiagnosisCode.mockResolvedValue({
      data: { data: code({ description: "Renamed code" }) },
    });
    renderPage();
    await screen.findByText("Autistic disorder");
    openRowMenu(0);
    fireEvent.click(screen.getByText("Edit"));
    await screen.findByTestId("diagnosis-modal");
    expect(probes.props.diagnosis.mode).toBe("edit");
    expect(probes.props.diagnosis.initialData.id).toBe("dx-1");
    await save({ diagnosisCode: "F84.0", description: "Renamed code", status: true });
    expect(api.UpdateDiagnosisCode).toHaveBeenCalledWith(
      expect.objectContaining({ id: "dx-1", description: "Renamed code" })
    );
    expect(api.CreateDiagnosisCode).not.toHaveBeenCalled();
    expect(await screen.findByText("Renamed code")).toBeInTheDocument();
    expect(screen.getByText("Second code")).toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith("Diagnosis code updated successfully", "success");
  });

  it("names the mode in the message when a save is refused", async () => {
    api.CreateDiagnosisCode.mockRejectedValue(new Error("Duplicate code"));
    await openAdd();
    await save({ diagnosisCode: "F84.0" });
    expect(toast).toHaveBeenCalledWith("Failed to add diagnosis code", "error");
    expect(screen.getByTestId("diagnosis-modal")).toBeInTheDocument();
  });

  it("names the edit mode when an update is refused", async () => {
    withCodes([code()]);
    api.UpdateDiagnosisCode.mockRejectedValue(new Error("Locked"));
    renderPage();
    await screen.findByText("Autistic disorder");
    openRowMenu();
    fireEvent.click(screen.getByText("Edit"));
    await screen.findByTestId("diagnosis-modal");
    await save({ diagnosisCode: "F84.0" });
    expect(toast).toHaveBeenCalledWith("Failed to edit diagnosis code", "error");
  });
});

describe("saving a session type", () => {
  const openAdd = async () => {
    renderPage();
    await settled();
    goTo("Session Types");
    fireEvent.click(tab("Add Session Type"));
    await screen.findByTestId("session-modal");
  };

  const save = (data) =>
    act(async () => {
      await probes.props.session.onSave(data);
    });

  it("creates a session type under the current tenant", async () => {
    await openAdd();
    await save({ name: "Direct therapy", category: "Direct" });
    expect(api.CreateOrganizationSessionType).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      name: "Direct therapy",
      category: "Direct",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast).toHaveBeenCalledWith("Session type created successfully", "success");
    expect(await screen.findByText("Direct therapy")).toBeInTheDocument();
  });

  it("reads a create response that is not wrapped in a data envelope", async () => {
    api.CreateOrganizationSessionType.mockResolvedValue({
      data: session({ name: "Flat response" }),
    });
    await openAdd();
    await save({ name: "Flat response" });
    expect(await screen.findByText("Flat response")).toBeInTheDocument();
  });

  it("updates the session type the row menu was opened on", async () => {
    withSessions([session(), session({ id: "st-2", name: "Second type" })]);
    api.UpdateOrganizationSessionType.mockResolvedValue({
      data: { data: session({ name: "Renamed type" }) },
    });
    renderPage();
    await settled();
    goTo("Session Types");
    await screen.findByText("Direct therapy");
    openRowMenu(0);
    fireEvent.click(screen.getByText("Edit"));
    await screen.findByTestId("session-modal");
    expect(probes.props.session.initialData.id).toBe("st-1");
    await save({ name: "Renamed type" });
    expect(api.UpdateOrganizationSessionType).toHaveBeenCalledWith(
      expect.objectContaining({ id: "st-1", name: "Renamed type", tenantId: "tenant-1" })
    );
    expect(await screen.findByText("Renamed type")).toBeInTheDocument();
    expect(screen.getByText("Second type")).toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith("Session type updated successfully", "success");
  });

  it("names the mode in the message when a save is refused", async () => {
    api.CreateOrganizationSessionType.mockRejectedValue(new Error("Duplicate"));
    await openAdd();
    await save({ name: "Direct therapy" });
    expect(toast).toHaveBeenCalledWith("Failed to add session type", "error");
  });
});

describe("switching a record on and off", () => {
  it("deactivates a diagnosis code from the row menu", async () => {
    withCodes([code()]);
    renderPage();
    await screen.findByText("Autistic disorder");
    openRowMenu();
    await act(async () => {
      fireEvent.click(screen.getByText("Deactivate"));
    });
    expect(api.UpdateActiveDiagnosisCode).toHaveBeenCalledWith({
      id: "dx-1",
      active: false,
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast).toHaveBeenCalledWith("Diagnosis code deactivated successfully", "success");
    expect(document.body.querySelector(".switch input")).not.toBeChecked();
  });

  it("activates an inactive diagnosis code", async () => {
    withCodes([code({ isActive: false })]);
    api.UpdateActiveDiagnosisCode.mockResolvedValue({ data: code({ isActive: true }) });
    renderPage();
    await screen.findByText("Autistic disorder");
    openRowMenu();
    await act(async () => {
      fireEvent.click(screen.getByText("Activate"));
    });
    expect(api.UpdateActiveDiagnosisCode).toHaveBeenCalledWith(
      expect.objectContaining({ active: true })
    );
    expect(toast).toHaveBeenCalledWith("Diagnosis code activated successfully", "success");
  });

  it("flips a diagnosis code from the status switch", async () => {
    withCodes([code()]);
    renderPage();
    await screen.findByText("Autistic disorder");
    await act(async () => {
      fireEvent.click(document.body.querySelector(".switch input"));
    });
    expect(api.UpdateActiveDiagnosisCode).toHaveBeenCalledWith(
      expect.objectContaining({ id: "dx-1", active: false })
    );
  });

  it("reports a refused diagnosis code toggle", async () => {
    withCodes([code()]);
    api.UpdateActiveDiagnosisCode.mockRejectedValue(new Error("Locked"));
    renderPage();
    await screen.findByText("Autistic disorder");
    openRowMenu();
    await act(async () => {
      fireEvent.click(screen.getByText("Deactivate"));
    });
    expect(toast).toHaveBeenCalledWith("Failed to toggle status", "error");
  });

  it("deactivates a session type from the row menu", async () => {
    withSessions([session()]);
    renderPage();
    await settled();
    goTo("Session Types");
    await screen.findByText("Direct therapy");
    openRowMenu();
    await act(async () => {
      fireEvent.click(screen.getByText("Deactivate"));
    });
    expect(api.UpdateActiveSessionTypeByTenantId).toHaveBeenCalledWith({
      id: "st-1",
      active: false,
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast).toHaveBeenCalledWith("Session type deactivated successfully", "success");
  });

  it("activates an inactive session type", async () => {
    withSessions([session({ isActive: false })]);
    api.UpdateActiveSessionTypeByTenantId.mockResolvedValue({ data: session({ isActive: true }) });
    renderPage();
    await settled();
    goTo("Session Types");
    await screen.findByText("Direct therapy");
    openRowMenu();
    await act(async () => {
      fireEvent.click(screen.getByText("Activate"));
    });
    expect(toast).toHaveBeenCalledWith("Session type activated successfully", "success");
  });

  it("flips a session type from the status switch", async () => {
    withSessions([session()]);
    renderPage();
    await settled();
    goTo("Session Types");
    await screen.findByText("Direct therapy");
    await act(async () => {
      fireEvent.click(document.body.querySelector(".switch input"));
    });
    expect(api.UpdateActiveSessionTypeByTenantId).toHaveBeenCalledWith(
      expect.objectContaining({ id: "st-1", active: false })
    );
  });

  it("reports a refused session type toggle", async () => {
    withSessions([session()]);
    api.UpdateActiveSessionTypeByTenantId.mockRejectedValue(new Error("Locked"));
    renderPage();
    await settled();
    goTo("Session Types");
    await screen.findByText("Direct therapy");
    openRowMenu();
    await act(async () => {
      fireEvent.click(screen.getByText("Deactivate"));
    });
    expect(toast).toHaveBeenCalledWith("Failed to toggle status", "error");
  });

  it("disables the session type switch for a role that may not deactivate", async () => {
    withSessions([session()]);
    renderPage({ permissions: ["view_session_types"] });
    await settled();
    await screen.findByText("Direct therapy");
    expect(document.body.querySelector(".switch input")).toBeDisabled();
  });
});
