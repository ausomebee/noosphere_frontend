import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The Authorization tab of the client panel. It loads the client's
 * authorizations and the tenant's service codes on mount, reshapes both into
 * the flat rows and per-authorization service arrays that AccordionTableRobust
 * wants, and owns every write: create, full edit, inline service-code save,
 * activate/deactivate and soft delete.
 *
 * Almost none of that reshaping is visible in the tab's own markup -- it leaves
 * through props -- so the table is replaced by a probe that both records the
 * props it was handed and renders each column through its own `render`
 * function, which is the only way the status badge and the utilization bar are
 * reached at all. The authorization modal and the delete modal are probes too,
 * so their onSubmit/onConfirm callbacks can be invoked directly; several of
 * those callbacks deliberately re-throw so the real modal stays open, and the
 * tests assert the rejection rather than swallowing it.
 *
 * Dates are written with an explicit local time ("2020-01-15T12:00:00") so the
 * formatted output does not slide a day in timezones behind UTC.
 */

const api = vi.hoisted(() => ({
  GetAllClientAuthorizationByTenantClientId: vi.fn(),
  GetSingleClientAuthorizationById: vi.fn(),
  CreateClientAuthorization: vi.fn(),
  UpdateClientAuthorization: vi.fn(),
  SetClientAuthorizationActive: vi.fn(),
  SoftDeleteClientAuthorization: vi.fn(),
}));
vi.mock("../api/clientPanelApis", () => ({ default: api }));

const billingApi = vi.hoisted(() => ({
  GetTenantServiceCodeByTenantId: vi.fn(),
}));
vi.mock("../api/billingAndPaymentsApi", () => ({ default: billingApi }));

const toastMock = vi.hoisted(() => ({ showToast: vi.fn(), showApiError: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toastMock.showToast(...a),
  showApiError: (...a) => toastMock.showApiError(...a),
}));

// Mutable so a test can render the tab with no tenantClientId in the URL.
const routeParams = vi.hoisted(() => ({ current: { tenantClientId: "tc-1" } }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useParams: () => routeParams.current,
}));

const probes = vi.hoisted(() => ({ props: {} }));

// Renders every column through its own `render` so the status badge and the
// utilization bar -- which exist only inside those callbacks -- are exercised.
vi.mock("../Components/Table/AccordionTableRobust", () => ({
  default: (received) => {
    probes.props.table = received;
    return (
      <div data-testid="auth-table">
        {received.data.map((row) => (
          <div key={row.id} data-testid={`row-${row.id}`}>
            {received.columns.map((col) => (
              <span key={col.key} data-testid={`${row.id}-${col.key}`}>
                {col.render ? col.render(row) : row[col.key]}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  },
}));

// One component backs both the add and the edit modal, so each records under
// its own mode instead of overwriting a single slot.
vi.mock("../Components/ReusableModal/ClientModal/ClientAuthorizationModal", () => ({
  default: (received) => {
    probes.props[received.mode] = received;
    return received.isOpen ? <div data-testid={`${received.mode}-modal`} /> : null;
  },
}));

vi.mock("../Components/ReusableModal/OrganizationModal/DeleteModal", () => ({
  default: (received) => {
    probes.props.delete = received;
    return received.isOpen ? (
      <div data-testid="delete-modal">
        <p>{received.message}</p>
      </div>
    ) : null;
  },
}));

import AuthorizationTab from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/Authorization";

const store = ({ permissions, accessToken = "at", tenantId = "tenant-1" } = {}) =>
  configureStore({
    reducer: { authentication: authReducer, generalSettings: generalSettingsReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: accessToken,
        user: {
          id: "user-1",
          tenantId,
          accessToken,
          refreshToken: "rt",
          // An empty accesses array means org owner: every permission granted.
          role: permissions
            ? { roleModuleAccesses: [{ module: "CLIENTS", permissions }] }
            : { roleModuleAccesses: [] },
        },
      },
      // Pre-loaded so useFormatSettings does not reach for the settings API.
      generalSettings: {
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12-hour",
        currency: "USD",
        loaded: true,
      },
    },
  });

const renderTab = (options) =>
  render(
    <Provider store={store(options)}>
      <AuthorizationTab />
    </Provider>
  );

/** One authorization as the API returns it, before the tab reshapes it. */
const authRecord = (over = {}) => ({
  id: "auth-1",
  title: "2020 ABA Plan",
  authorizationNumber: "AN-1",
  // Spans the present day so the derived status of the default row is "Active".
  startDate: "2020-01-15T12:00:00",
  endDate: "2999-12-31T12:00:00",
  isActive: true,
  payerDetails: { payerName: "Blue Shield" },
  clientAuthorizationServices: [
    {
      serviceCodeId: "sc-1",
      serviceCode: { code: "97153", description: "Adaptive behavior" },
      modifiers: "HO",
      units: 100,
      usedUnit: 40,
      per: "WEEK",
    },
  ],
  ...over,
});

const serviceCodeRecord = (over = {}) => ({
  id: "sc-1",
  code: "97153",
  description: "Adaptive behavior",
  isActive: true,
  isDeleted: false,
  ...over,
});

const waitForTable = () => waitFor(() => expect(screen.getByTestId("auth-table")).toBeInTheDocument());

beforeEach(() => {
  vi.clearAllMocks();
  routeParams.current = { tenantClientId: "tc-1" };
  probes.props = {};
  api.GetAllClientAuthorizationByTenantClientId.mockResolvedValue({
    data: { data: [authRecord()] },
  });
  api.GetSingleClientAuthorizationById.mockResolvedValue({ data: authRecord() });
  api.CreateClientAuthorization.mockResolvedValue({});
  api.UpdateClientAuthorization.mockResolvedValue({});
  api.SetClientAuthorizationActive.mockResolvedValue({});
  api.SoftDeleteClientAuthorization.mockResolvedValue({});
  billingApi.GetTenantServiceCodeByTenantId.mockResolvedValue({
    data: [serviceCodeRecord()],
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading the authorizations", () => {
  it("shows a section loader until the fetch settles", async () => {
    let release;
    api.GetAllClientAuthorizationByTenantClientId.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve({ data: { data: [] } });
      })
    );
    renderTab();
    expect(screen.getByRole("status")).toHaveTextContent("Loading...");
    release();
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });

  it("invites the user to create one when the client has no authorizations", async () => {
    api.GetAllClientAuthorizationByTenantClientId.mockResolvedValue({ data: { data: [] } });
    renderTab();
    expect(await screen.findByText(/No authorizations found/)).toBeInTheDocument();
    expect(screen.queryByTestId("auth-table")).not.toBeInTheDocument();
  });

  it("treats a response with no data envelope as an empty list", async () => {
    api.GetAllClientAuthorizationByTenantClientId.mockResolvedValue({});
    renderTab();
    expect(await screen.findByText(/No authorizations found/)).toBeInTheDocument();
  });

  it("leaves the list empty when the fetch rejects", async () => {
    api.GetAllClientAuthorizationByTenantClientId.mockRejectedValue(new Error("boom"));
    renderTab();
    expect(await screen.findByText(/No authorizations found/)).toBeInTheDocument();
    expect(console.error).toHaveBeenCalledWith(
      "Failed to fetch authorizations:",
      expect.any(Error)
    );
  });

  it("fetches nothing at all without a tenantClientId in the URL", async () => {
    routeParams.current = {};
    renderTab();
    await waitFor(() =>
      expect(api.GetAllClientAuthorizationByTenantClientId).not.toHaveBeenCalled()
    );
    expect(billingApi.GetTenantServiceCodeByTenantId).not.toHaveBeenCalled();
    // The add button is the only control left, and it is unusable.
    expect(screen.getByRole("button", { name: /Add Authorization/ })).toBeDisabled();
  });

  it("bails out of both fetches when the session has no access token", async () => {
    renderTab({ accessToken: null });
    await waitFor(() => expect(screen.getByText(/No authorizations found/)).toBeInTheDocument());
    expect(api.GetAllClientAuthorizationByTenantClientId).not.toHaveBeenCalled();
    expect(billingApi.GetTenantServiceCodeByTenantId).not.toHaveBeenCalled();
  });
});

describe("the rows handed to the table", () => {
  const row = () => probes.props.table.data[0];

  it("flattens a fully populated authorization", async () => {
    renderTab();
    await waitForTable();
    expect(row()).toMatchObject({
      id: "auth-1",
      name: "2020 ABA Plan",
      insuranceCompany: "Blue Shield",
      startDate: "01/15/2020",
      endDate: "12/31/2999",
      isActive: true,
    });
    // 40 of 100 authorized units.
    expect(row().utilization).toBe(40);
  });

  it("falls back to placeholders for a bare authorization record", async () => {
    api.GetAllClientAuthorizationByTenantClientId.mockResolvedValue({
      data: {
        data: [
          {
            id: "auth-2",
            startDate: null,
            endDate: null,
            isActive: false,
          },
        ],
      },
    });
    renderTab();
    await waitForTable();
    expect(row()).toMatchObject({
      name: "Untitled",
      insuranceCompany: "—",
      startDate: "—",
      endDate: "—",
      isActive: false,
      // No services at all, so there is nothing to divide by.
      utilization: 0,
    });
  });

  it("counts a service that reports no units as zero on both sides", async () => {
    api.GetAllClientAuthorizationByTenantClientId.mockResolvedValue({
      data: {
        data: [
          authRecord({
            clientAuthorizationServices: [
              { serviceCodeId: "sc-1" },
              { serviceCodeId: "sc-2", units: 50, usedUnit: 45 },
            ],
          }),
        ],
      },
    });
    renderTab();
    await waitForTable();
    expect(row().utilization).toBe(90);
  });

  it("treats an authorization with an undefined isActive as active", async () => {
    api.GetAllClientAuthorizationByTenantClientId.mockResolvedValue({
      data: { data: [authRecord({ isActive: undefined })] },
    });
    renderTab();
    await waitForTable();
    expect(row().isActive).toBe(true);
  });
});

describe("the derived status", () => {
  const statusOf = async (over) => {
    api.GetAllClientAuthorizationByTenantClientId.mockResolvedValue({
      data: { data: [authRecord(over)] },
    });
    renderTab();
    await waitForTable();
    return probes.props.table.data[0].status;
  };

  it("calls an authorization whose end date has passed expired", async () => {
    expect(
      await statusOf({ startDate: "2000-01-01T12:00:00", endDate: "2001-01-01T12:00:00" })
    ).toBe("Expired");
  });

  it("calls an authorization that has not started yet pending", async () => {
    expect(
      await statusOf({ startDate: "2999-01-01T12:00:00", endDate: "2999-12-31T12:00:00" })
    ).toBe("Pending");
  });

  it("calls a started open-ended authorization active", async () => {
    expect(await statusOf({ startDate: "2000-01-01T12:00:00", endDate: null })).toBe("Active");
  });
});

describe("the rendered columns", () => {
  it("badges the status with its own lowercase class", async () => {
    renderTab();
    await waitForTable();
    const badge = screen.getByTestId("auth-1-status").firstElementChild;
    expect(badge).toHaveTextContent("Active");
    expect(badge).toHaveClass("status-badge", "active");
  });

  it("draws the utilization bar in blue below the eighty percent mark", async () => {
    renderTab();
    await waitForTable();
    const fill = screen.getByTestId("auth-1-utilization").querySelector(".utilization-fill-inline");
    expect(fill).toHaveStyle({ width: "40%", backgroundColor: "#004ABA" });
    expect(screen.getByTestId("auth-1-utilization")).toHaveTextContent("40%");
  });

  it("turns the utilization bar red once the authorization is nearly spent", async () => {
    api.GetAllClientAuthorizationByTenantClientId.mockResolvedValue({
      data: {
        data: [
          authRecord({
            clientAuthorizationServices: [
              { serviceCodeId: "sc-1", units: 100, usedUnit: 95 },
            ],
          }),
        ],
      },
    });
    renderTab();
    await waitForTable();
    const fill = screen.getByTestId("auth-1-utilization").querySelector(".utilization-fill-inline");
    expect(fill).toHaveStyle({ backgroundColor: "#D92D20" });
  });
});

describe("the per-authorization service rows", () => {
  const services = () => probes.props.table.initialServiceData["auth-1"];

  it("expands a service into its editable shape", async () => {
    renderTab();
    await waitForTable();
    expect(services()[0]).toEqual({
      serviceCode: "sc-1",
      serviceCodeDisplay: "97153 - Adaptive behavior",
      serviceCodeShort: "97153",
      modifier: "HO",
      units: "100",
      usedUnits: 40,
      per: "WEEK",
      utilization: 40,
    });
  });

  it("labels a service whose code lookup came back empty", async () => {
    api.GetAllClientAuthorizationByTenantClientId.mockResolvedValue({
      data: {
        data: [authRecord({ clientAuthorizationServices: [{ id: "svc-blank" }] })],
      },
    });
    renderTab();
    await waitForTable();
    expect(services()[0]).toEqual({
      serviceCode: "",
      serviceCodeDisplay: "— - No description",
      serviceCodeShort: "",
      modifier: "",
      units: "0",
      usedUnits: 0,
      per: "SESSION",
      utilization: 0,
    });
  });

  it("keys an authorization with no services to an empty array", async () => {
    api.GetAllClientAuthorizationByTenantClientId.mockResolvedValue({
      data: { data: [authRecord({ clientAuthorizationServices: null })] },
    });
    renderTab();
    await waitForTable();
    expect(services()).toEqual([]);
  });
});

describe("the service-code dropdown data", () => {
  it("keeps only the active, undeleted codes and labels them", async () => {
    billingApi.GetTenantServiceCodeByTenantId.mockResolvedValue({
      data: [
        serviceCodeRecord(),
        serviceCodeRecord({ id: "sc-2", code: "97155", isActive: false }),
        serviceCodeRecord({ id: "sc-3", code: "97156", isDeleted: true }),
      ],
    });
    renderTab();
    await waitForTable();
    await waitFor(() => expect(probes.props.table.serviceCodes).toHaveLength(1));
    expect(probes.props.table.serviceCodes[0]).toEqual({
      id: "sc-1",
      code: "97153",
      description: "Adaptive behavior",
      label: "97153 - Adaptive behavior",
      value: "sc-1",
    });
    expect(probes.props.table.loadingServiceCodes).toBe(false);
  });

  it("hands the table an empty list when the codes response carries no data", async () => {
    billingApi.GetTenantServiceCodeByTenantId.mockResolvedValue({});
    renderTab();
    await waitForTable();
    expect(probes.props.table.serviceCodes).toEqual([]);
  });

  it("swallows a rejected service-code fetch and still renders the table", async () => {
    billingApi.GetTenantServiceCodeByTenantId.mockRejectedValue(new Error("nope"));
    renderTab();
    await waitForTable();
    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        "Failed to load service codes:",
        expect.any(Error)
      )
    );
    expect(probes.props.table.serviceCodes).toEqual([]);
  });
});

describe("creating an authorization", () => {
  it("maps the modal payload onto the create call and refetches", async () => {
    renderTab();
    await waitForTable();
    fireEvent.click(screen.getByRole("button", { name: /Add Authorization/ }));
    expect(screen.getByTestId("add-modal")).toBeInTheDocument();

    await probes.props.add.onSubmit({
      title: "New plan",
      authNumber: "AN-9",
      startDate: "2024-02-01",
      endDate: "2024-08-01",
      payer: "payer-1",
      insuranceType: "ins-1",
      service: [{ serviceCodeId: "sc-1", units: 5 }],
    });

    expect(api.CreateClientAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantClientId: "tc-1",
        title: "New plan",
        authorizationNumber: "AN-9",
        endDate: "2024-08-01",
        insuranceType: "ins-1",
        serviceCodes: [{ serviceCodeId: "sc-1", units: 5 }],
        accessToken: "at",
      })
    );
    expect(toastMock.showToast).toHaveBeenCalledWith(
      "Authorization added successfully",
      "success"
    );
    await waitFor(() =>
      expect(api.GetAllClientAuthorizationByTenantClientId).toHaveBeenCalledTimes(2)
    );
    await waitFor(() => expect(screen.queryByTestId("add-modal")).not.toBeInTheDocument());
  });

  it("nulls out an omitted end date and insurance type", async () => {
    renderTab();
    await waitForTable();
    await probes.props.add.onSubmit({
      title: "New plan",
      authNumber: "AN-9",
      startDate: "2024-02-01",
      payer: "payer-1",
      service: [],
    });
    expect(api.CreateClientAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({ endDate: null, insuranceType: null })
    );
  });

  it("re-throws a failed create so the modal can stay open", async () => {
    api.CreateClientAuthorization.mockRejectedValue(new Error("409"));
    renderTab();
    await waitForTable();
    fireEvent.click(screen.getByRole("button", { name: /Add Authorization/ }));
    await expect(probes.props.add.onSubmit({ service: [] })).rejects.toThrow("409");
    expect(toastMock.showToast).not.toHaveBeenCalled();
    expect(screen.getByTestId("add-modal")).toBeInTheDocument();
  });

  it("closes the add modal on cancel", async () => {
    renderTab();
    await waitForTable();
    fireEvent.click(screen.getByRole("button", { name: /Add Authorization/ }));
    fireEvent.click(screen.getByRole("button", { name: /Add Authorization/ }));
    probes.props.add.onClose();
    await waitFor(() => expect(screen.queryByTestId("add-modal")).not.toBeInTheDocument());
  });
});

describe("editing an authorization", () => {
  it("loads the single record, seeds the form and saves it back", async () => {
    renderTab();
    await waitForTable();
    await probes.props.table.onEdit({ id: "auth-1" });

    expect(api.GetSingleClientAuthorizationById).toHaveBeenCalledWith(
      expect.objectContaining({ id: "auth-1", accessToken: "at" })
    );
    await waitFor(() => expect(screen.getByTestId("edit-modal")).toBeInTheDocument());
    expect(probes.props.edit.initialData).toEqual({
      title: "2020 ABA Plan",
      authNumber: "AN-1",
      startDate: "2020-01-15",
      endDate: "2999-12-31",
      payer: "",
      insuranceType: "",
      service: [{ serviceCodeId: "sc-1", modifier: "HO", units: "100", per: "WEEK" }],
    });

    await probes.props.edit.onSubmit({
      title: "Renamed",
      authNumber: "AN-1",
      startDate: "2020-01-15",
      endDate: "",
      payer: "payer-1",
      insuranceType: "",
      service: [{ serviceCodeId: "sc-1", units: 100 }],
    });

    expect(api.UpdateClientAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "auth-1",
        title: "Renamed",
        // Both blanks are sent as an explicit null, not "".
        endDate: null,
        insuranceType: null,
        serviceCodes: [{ serviceCodeId: "sc-1", units: 100 }],
      })
    );
    expect(toastMock.showToast).toHaveBeenCalledWith(
      "Authorization updated successfully",
      "success"
    );
    await waitFor(() => expect(screen.queryByTestId("edit-modal")).not.toBeInTheDocument());
  });

  it("blanks every field the loaded record does not carry", async () => {
    api.GetSingleClientAuthorizationById.mockResolvedValue({
      data: { id: "auth-1", clientAuthorizationServices: [{ serviceCodeId: "sc-9" }] },
    });
    renderTab();
    await waitForTable();
    await probes.props.table.onEdit({ id: "auth-1" });
    await waitFor(() => expect(screen.getByTestId("edit-modal")).toBeInTheDocument());
    expect(probes.props.edit.initialData).toEqual({
      title: "",
      authNumber: "",
      startDate: "",
      endDate: "",
      payer: "",
      insuranceType: "",
      service: [{ serviceCodeId: "sc-9", modifier: "", units: "", per: "SESSION" }],
    });
  });

  it("hands the closed edit modal an empty object before anything is selected", async () => {
    renderTab();
    await waitForTable();
    expect(probes.props.edit.isOpen).toBe(false);
    expect(probes.props.edit.initialData).toEqual({});
  });

  it("holds a loading overlay while the single record is in flight", async () => {
    let release;
    api.GetSingleClientAuthorizationById.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve({ data: authRecord() });
      })
    );
    renderTab();
    await waitForTable();
    const editing = probes.props.table.onEdit({ id: "auth-1" });
    expect(await screen.findByText("Loading authorization details...")).toBeInTheDocument();
    release();
    await editing;
    await waitFor(() =>
      expect(screen.queryByText("Loading authorization details...")).not.toBeInTheDocument()
    );
  });

  it("keeps the edit modal shut when the record cannot be loaded", async () => {
    api.GetSingleClientAuthorizationById.mockRejectedValue(new Error("404"));
    renderTab();
    await waitForTable();
    await probes.props.table.onEdit({ id: "auth-1" });
    expect(screen.queryByTestId("edit-modal")).not.toBeInTheDocument();
    expect(console.error).toHaveBeenCalledWith(
      "Failed to fetch authorization:",
      expect.any(Error)
    );
  });

  it("keeps the edit modal shut when the record comes back empty", async () => {
    api.GetSingleClientAuthorizationById.mockResolvedValue({});
    renderTab();
    await waitForTable();
    await probes.props.table.onEdit({ id: "auth-1" });
    expect(screen.queryByTestId("edit-modal")).not.toBeInTheDocument();
  });

  it("skips the fetch entirely for a row with no id", async () => {
    renderTab();
    await waitForTable();
    await probes.props.table.onEdit({ id: "" });
    expect(api.GetSingleClientAuthorizationById).not.toHaveBeenCalled();
    expect(screen.queryByTestId("edit-modal")).not.toBeInTheDocument();
  });

  it("re-throws a failed edit save", async () => {
    api.UpdateClientAuthorization.mockRejectedValue(new Error("500"));
    renderTab();
    await waitForTable();
    await probes.props.table.onEdit({ id: "auth-1" });
    await waitFor(() => expect(screen.getByTestId("edit-modal")).toBeInTheDocument());
    await expect(probes.props.edit.onSubmit({ service: [] })).rejects.toThrow("500");
    expect(screen.getByTestId("edit-modal")).toBeInTheDocument();
  });

  it("clears the loaded record when the edit modal is dismissed", async () => {
    renderTab();
    await waitForTable();
    await probes.props.table.onEdit({ id: "auth-1" });
    await waitFor(() => expect(screen.getByTestId("edit-modal")).toBeInTheDocument());
    probes.props.edit.onClose();
    await waitFor(() => expect(probes.props.edit.initialData).toEqual({}));
  });
});

describe("the inline service-code save", () => {
  it("converts the edited rows into an update payload and refetches", async () => {
    renderTab();
    await waitForTable();
    await probes.props.table.onSave({
      "auth-1": [
        { serviceCode: "sc-1", modifier: "HO", units: "12", per: "WEEK" },
        { serviceCode: "sc-2", modifier: "", units: "not-a-number", per: "" },
      ],
    });
    expect(api.UpdateClientAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "auth-1",
        serviceCodes: [
          { serviceCodeId: "sc-1", modifiers: "HO", units: 12, per: "WEEK" },
          // A blank modifier is sent as null and an unparseable unit count as 0.
          { serviceCodeId: "sc-2", modifiers: null, units: 0, per: "SESSION" },
        ],
      })
    );
    expect(toastMock.showToast).toHaveBeenCalledWith(
      "Service codes updated successfully",
      "success"
    );
    expect(api.GetAllClientAuthorizationByTenantClientId).toHaveBeenCalledTimes(2);
  });

  it("reports and re-throws a failed inline save", async () => {
    const failure = new Error("422");
    api.UpdateClientAuthorization.mockRejectedValue(failure);
    renderTab();
    await waitForTable();
    await expect(probes.props.table.onSave({ "auth-1": [] })).rejects.toThrow("422");
    expect(toastMock.showApiError).toHaveBeenCalledWith(failure, "UPDATE_SERVICE_CODES");
  });
});

describe("activating and deactivating", () => {
  it("deactivates a row that is currently active", async () => {
    renderTab();
    await waitForTable();
    await probes.props.table.onDeactivate({ id: "auth-1", isActive: true });
    expect(api.SetClientAuthorizationActive).toHaveBeenCalledWith(
      expect.objectContaining({ id: "auth-1", active: false })
    );
    expect(toastMock.showToast).toHaveBeenCalledWith(
      "Authorization deactivated successfully",
      "success"
    );
  });

  it("reactivates a row that is currently inactive", async () => {
    renderTab();
    await waitForTable();
    await probes.props.table.onDeactivate({ id: "auth-1", isActive: false });
    expect(api.SetClientAuthorizationActive).toHaveBeenCalledWith(
      expect.objectContaining({ active: true })
    );
    expect(toastMock.showToast).toHaveBeenCalledWith(
      "Authorization activated successfully",
      "success"
    );
  });

  it("surfaces a failed status change without re-throwing", async () => {
    const failure = new Error("503");
    api.SetClientAuthorizationActive.mockRejectedValue(failure);
    renderTab();
    await waitForTable();
    await probes.props.table.onDeactivate({ id: "auth-1", isActive: true });
    expect(toastMock.showApiError).toHaveBeenCalledWith(failure, "UPDATE_AUTH_STATUS");
    expect(toastMock.showToast).not.toHaveBeenCalled();
  });
});

describe("deleting an authorization", () => {
  it("names the row in the confirmation before deleting it", async () => {
    renderTab();
    await waitForTable();
    probes.props.table.onDelete({ id: "auth-1", name: "2020 ABA Plan" });
    await waitFor(() => expect(screen.getByTestId("delete-modal")).toBeInTheDocument());
    expect(screen.getByText(/"2020 ABA Plan" will be removed/)).toBeInTheDocument();

    await probes.props.delete.onConfirm();
    expect(api.SoftDeleteClientAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({ id: "auth-1" })
    );
    expect(toastMock.showToast).toHaveBeenCalledWith(
      "Authorization deleted successfully",
      "success"
    );
    expect(api.GetAllClientAuthorizationByTenantClientId).toHaveBeenCalledTimes(2);
  });

  it("does nothing when confirm fires with no row held", async () => {
    renderTab();
    await waitForTable();
    expect(probes.props.delete.isOpen).toBe(false);
    expect(probes.props.delete.message).toBe("");
    await probes.props.delete.onConfirm();
    expect(api.SoftDeleteClientAuthorization).not.toHaveBeenCalled();
  });

  it("re-throws a failed delete so the confirmation stays open", async () => {
    const failure = new Error("500");
    api.SoftDeleteClientAuthorization.mockRejectedValue(failure);
    renderTab();
    await waitForTable();
    probes.props.table.onDelete({ id: "auth-1", name: "2020 ABA Plan" });
    await waitFor(() => expect(screen.getByTestId("delete-modal")).toBeInTheDocument());
    await expect(probes.props.delete.onConfirm()).rejects.toThrow("500");
    expect(toastMock.showApiError).toHaveBeenCalledWith(failure, "DELETE_AUTHORIZATION");
    expect(screen.getByTestId("delete-modal")).toBeInTheDocument();
  });

  it("releases the held row when the confirmation is dismissed", async () => {
    renderTab();
    await waitForTable();
    probes.props.table.onDelete({ id: "auth-1", name: "2020 ABA Plan" });
    await waitFor(() => expect(screen.getByTestId("delete-modal")).toBeInTheDocument());
    probes.props.delete.onClose();
    await waitFor(() => expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument());
  });
});

describe("permission gating", () => {
  it("blocks the whole list from a role that cannot view authorizations", async () => {
    renderTab({ permissions: ["view_client"] });
    await waitFor(() =>
      expect(
        screen.getByText("You don't have permission to view authorization details.")
      ).toBeInTheDocument()
    );
    expect(screen.queryByTestId("auth-table")).not.toBeInTheDocument();
    // The add button sits outside the gate, so it is still on screen.
    expect(screen.getByRole("button", { name: /Add Authorization/ })).toBeEnabled();
  });

  it("withholds every row action from a view-only role", async () => {
    renderTab({ permissions: ["view_authorization"] });
    await waitForTable();
    expect(probes.props.table.isEditMode).toBe(false);
    expect(probes.props.table.onEdit).toBeUndefined();
    expect(probes.props.table.onSave).toBeUndefined();
    expect(probes.props.table.onDelete).toBeUndefined();
    expect(probes.props.table.onDeactivate).toBeUndefined();
  });

  it("hands each row action through only when its own permission is granted", async () => {
    renderTab({
      permissions: ["view_authorization", "edit_authorization", "delete_authorization"],
    });
    await waitForTable();
    expect(probes.props.table.isEditMode).toBe(true);
    expect(probes.props.table.onEdit).toBeInstanceOf(Function);
    expect(probes.props.table.onSave).toBeInstanceOf(Function);
    expect(probes.props.table.onDelete).toBeInstanceOf(Function);
    // Deactivation was not granted, so that one alone stays undefined.
    expect(probes.props.table.onDeactivate).toBeUndefined();
  });
});
