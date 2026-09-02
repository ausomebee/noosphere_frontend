import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The Payers & Insurance panel inside Billing & Payments → Settings: two
 * permission-gated tabs over the same shape of table, plus the payer and
 * insurance-type modals that create, edit and deactivate their rows.
 *
 * Four fetches run on mount. Payers are fetched again whenever the insurance
 * types land, because a payer row that has no `insuranceTypeName` of its own is
 * named by looking its `insuranceTypeId` up in that list — so the payer
 * endpoint is called more than once per render and assertions here check the
 * payload rather than the call count.
 *
 * `mode` is a single piece of state shared by both modals, so a "view" save is
 * a no-op that just closes, and the delete handlers refuse to run unless the
 * panel is in edit mode with a row selected.
 *
 * The active tab is remembered in sessionStorage by `usePersistedTab`, which is
 * cleared between tests so each one starts on its role's first visible tab.
 * CustomTable is a probe that renders one button per row action, plus one for
 * the Status switch when the role is allowed to flip it.
 */

const apiMock = vi.hoisted(() => ({
  GetInsuranceTypeByTenantId: vi.fn(),
  GetPayerByTenantId: vi.fn(),
  GetTenantServiceCodeByTenantId: vi.fn(),
  GetRoundingRuleByTenantId: vi.fn(),
  UpdateInsuranceTypeActiveness: vi.fn(),
  UpdatePayerActiveness: vi.fn(),
  UpdateInsuranceType: vi.fn(),
  CreateInsuranceType: vi.fn(),
  UpdatePayer: vi.fn(),
  CreatePayer: vi.fn(),
}));
vi.mock("../api/billingAndPaymentsApi", () => ({ default: apiMock }));

const toastMock = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toastMock.showToast(...a),
  showApiError: vi.fn(),
}));

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

const tables = vi.hoisted(() => ({ byName: {} }));
vi.mock("../Components/Table/CustomTable", () => ({
  default: (props) => {
    tables.byName[props.tableName] = props;
    return (
      <div data-testid={`table-${props.tableName.replace(/\s+/g, "-")}`}>
        {props.data.map((row) => (
          <div key={row.id} data-testid={`row-${row.id}`}>
            <span>{`${row.payerName ?? row.name}|${row.insuranceTypeName ?? row.description}`}</span>
            {(props.actions?.(row)?.[0]?.items ?? []).map((item) => (
              <button key={item.label} onClick={item.onClick}>
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

const payerModal = vi.hoisted(() => ({ props: null, payload: {} }));
vi.mock("../Components/ReusableModal/BillingAndPaymentModal/AddPayerModal", () => ({
  default: (props) => {
    payerModal.props = props;
    return props.isOpen ? (
      <div data-testid="payer-modal">
        {/* handlePayerSave re-throws so the modal can react; swallow it here or
            the click leaves an unhandled rejection behind. */}
        <button onClick={() => Promise.resolve(props.onSave(payerModal.payload)).catch(() => {})}>
          save-payer
        </button>
        <button onClick={props.onDelete}>delete-payer</button>
        <button onClick={props.onClose}>close-payer</button>
      </div>
    ) : null;
  },
}));

const insuranceModal = vi.hoisted(() => ({ props: null, payload: {} }));
vi.mock("../Components/ReusableModal/BillingAndPaymentModal/AddInsuranceTypeModal", () => ({
  default: (props) => {
    insuranceModal.props = props;
    return props.isOpen ? (
      <div data-testid="insurance-modal">
        <button
          onClick={() => Promise.resolve(props.onSave(insuranceModal.payload)).catch(() => {})}
        >
          save-insurance
        </button>
        <button onClick={props.onDelete}>delete-insurance</button>
        <button onClick={props.onClose}>close-insurance</button>
      </div>
    ) : null;
  },
}));

import PayersAndInsurance from "../Pages/BillingAndPayment/Settings/SettingSubs/PayersAndInsurance";

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
          id: "user-1",
          tenantId: "tenant-1",
          accessToken: "at",
          refreshToken: "rt",
          // An empty accesses array is the org-owner case: full access.
          role: permissions
            ? { roleModuleAccesses: [{ module: "BILLING_AND_PAYMENT", permissions }] }
            : { roleModuleAccesses: [] },
        },
      },
    },
  });

const renderPanel = ({ permissions } = {}) =>
  render(
    <Provider store={makeStore(permissions)}>
      <PayersAndInsurance />
    </Provider>
  );

const payersLoaded = () => screen.findByTestId("row-payer-1");
const openInsuranceTab = () =>
  fireEvent.click(screen.getByRole("button", { name: "Insurance Types" }));

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  tables.byName = {};
  payerModal.payload = {};
  insuranceModal.payload = {};
  apiMock.GetInsuranceTypeByTenantId.mockResolvedValue({
    data: [{ id: "ins-1", name: "PPO", description: "Preferred", isActive: true }],
  });
  apiMock.GetPayerByTenantId.mockResolvedValue({
    data: [
      {
        id: "payer-1",
        payerName: "Acme Health",
        insuranceTypeId: "ins-1",
        isActive: true,
        email: "billing@acme.test",
        phone: "555-0100",
      },
    ],
  });
  apiMock.GetTenantServiceCodeByTenantId.mockResolvedValue({
    data: [
      { id: "sc-1", code: "97153", description: "Direct", isActive: true, modifiers: { a: "HO", b: "HN" } },
      { id: "sc-2", code: "00000", description: "Retired", isActive: false },
    ],
  });
  apiMock.GetRoundingRuleByTenantId.mockResolvedValue({
    data: [
      { id: "rr-1", ruleName: "8 Minute Rule", isActive: true },
      { id: "rr-2", ruleName: "Old Rule", isActive: false },
    ],
  });
  apiMock.UpdateInsuranceTypeActiveness.mockResolvedValue({});
  apiMock.UpdatePayerActiveness.mockResolvedValue({});
  apiMock.UpdateInsuranceType.mockResolvedValue({ id: "ins-1" });
  apiMock.CreateInsuranceType.mockResolvedValue({ id: "ins-2" });
  apiMock.UpdatePayer.mockResolvedValue({ id: "payer-1" });
  apiMock.CreatePayer.mockResolvedValue({ id: "payer-2" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the tab bar", () => {
  it("opens on the payers tab for a role that can see both lists", async () => {
    renderPanel();
    await payersLoaded();
    expect(screen.getByTestId("table-Payers")).toBeInTheDocument();
    expect(screen.queryByTestId("table-Insurance-Types")).not.toBeInTheDocument();
  });

  it("switches to the insurance types tab and back", async () => {
    renderPanel();
    await payersLoaded();
    openInsuranceTab();
    expect(screen.getByTestId("table-Insurance-Types")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Payers" }));
    expect(screen.getByTestId("table-Payers")).toBeInTheDocument();
  });

  it("opens on the insurance types tab for a role that cannot see payers", async () => {
    renderPanel({ permissions: ["view_insurance_list"] });
    await screen.findByTestId("table-Insurance-Types");
    expect(screen.queryByRole("button", { name: "Payers" })).not.toBeInTheDocument();
  });

  it("renders nothing at all for a role with neither list", () => {
    const { container } = renderPanel({ permissions: ["edit_payer"] });
    expect(container).toBeEmptyDOMElement();
  });

  it("remembers the chosen tab for the next mount", async () => {
    const first = renderPanel();
    await payersLoaded();
    openInsuranceTab();
    first.unmount();

    renderPanel();
    await screen.findByTestId("table-Insurance-Types");
  });
});

describe("loading the two lists", () => {
  it("names a payer's insurance type from the insurance list", async () => {
    renderPanel();
    await payersLoaded();
    await waitFor(() =>
      expect(screen.getByTestId("row-payer-1")).toHaveTextContent("Acme Health|PPO")
    );
  });

  it("prefers a name the payer endpoint supplied itself", async () => {
    apiMock.GetPayerByTenantId.mockResolvedValue({
      data: [{ id: "payer-1", payerName: "Acme Health", insuranceTypeName: "HMO" }],
    });
    renderPanel();
    await payersLoaded();
    expect(screen.getByTestId("row-payer-1")).toHaveTextContent("Acme Health|HMO");
  });

  it("labels an insurance type it cannot resolve as Unknown", async () => {
    apiMock.GetPayerByTenantId.mockResolvedValue({
      data: [{ id: "payer-1", payerName: "Acme Health", insuranceTypeId: "ins-gone" }],
    });
    renderPanel();
    await payersLoaded();
    expect(screen.getByTestId("row-payer-1")).toHaveTextContent("Acme Health|Unknown");
  });

  it("shows an empty table when the endpoints return no data array", async () => {
    apiMock.GetPayerByTenantId.mockResolvedValue({});
    apiMock.GetInsuranceTypeByTenantId.mockResolvedValue({});
    apiMock.GetTenantServiceCodeByTenantId.mockResolvedValue({});
    apiMock.GetRoundingRuleByTenantId.mockResolvedValue({});
    renderPanel();
    await waitFor(() => expect(tables.byName.Payers.data).toEqual([]));
    openInsuranceTab();
    expect(tables.byName["Insurance Types"].data).toEqual([]);
    // The two modal lookups fall back the same way.
    expect(payerModal.props.serviceCodes).toEqual([]);
    expect(payerModal.props.roundingRules).toEqual([]);
  });

  it("shows empty tables rather than an error when every endpoint rejects", async () => {
    apiMock.GetPayerByTenantId.mockRejectedValue(new Error("down"));
    apiMock.GetInsuranceTypeByTenantId.mockRejectedValue(new Error("down"));
    apiMock.GetTenantServiceCodeByTenantId.mockRejectedValue(new Error("down"));
    apiMock.GetRoundingRuleByTenantId.mockRejectedValue(new Error("down"));
    renderPanel();
    await waitFor(() => expect(tables.byName.Payers.loading).toBe(false));
    expect(tables.byName.Payers.data).toEqual([]);
    expect(toastMock.showToast).not.toHaveBeenCalled();
  });

  it("hands the payer modal only the active service codes and rounding rules", async () => {
    renderPanel();
    await payersLoaded();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Add a Payer" })).not.toBeDisabled()
    );
    fireEvent.click(screen.getByRole("button", { name: "Add a Payer" }));
    // The service code's modifiers arrive as an object map and are flattened.
    expect(payerModal.props.serviceCodes).toEqual([
      {
        id: "sc-1",
        code: "97153",
        description: "Direct",
        modifiers: [{ modifier: "HO" }, { modifier: "HN" }],
      },
    ]);
    expect(payerModal.props.roundingRules).toEqual([
      { id: "rr-1", ruleName: "8 Minute Rule", description: undefined, fullData: expect.any(Object) },
    ]);
  });

  it("gives a service code with no modifiers an empty list", async () => {
    apiMock.GetTenantServiceCodeByTenantId.mockResolvedValue({
      data: [{ id: "sc-1", code: "97153", description: "Direct", isActive: true }],
    });
    renderPanel();
    await payersLoaded();
    await waitFor(() => expect(payerModal.props.serviceCodes[0].modifiers).toEqual([]));
  });
});

describe("the payer row menu", () => {
  it("routes to the payer detail page from View", async () => {
    renderPanel();
    await payersLoaded();
    fireEvent.click(screen.getByRole("button", { name: "View payer-1" }));
    expect(navigate).toHaveBeenCalledWith(
      "/organization/practice-settings/view-payer/payer-1/Acme Health"
    );
  });

  it("offers Deactivate for a live payer and Activate for a dormant one", async () => {
    apiMock.GetPayerByTenantId.mockResolvedValue({
      data: [
        { id: "payer-1", payerName: "Acme", isActive: true },
        { id: "payer-2", payerName: "Beta", isActive: false },
      ],
    });
    renderPanel();
    await payersLoaded();
    expect(screen.getByRole("button", { name: "Deactivate payer-1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activate payer-2" })).toBeInTheDocument();
  });

  it("flips a payer's activeness and refetches", async () => {
    renderPanel();
    await payersLoaded();
    fireEvent.click(screen.getByRole("button", { name: "Deactivate payer-1" }));
    await waitFor(() =>
      expect(apiMock.UpdatePayerActiveness).toHaveBeenCalledWith({
        id: "payer-1",
        isActive: false,
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        "Payer deactivated successfully",
        "success"
      )
    );
  });

  it("phrases the toast the other way round when reactivating a payer", async () => {
    apiMock.GetPayerByTenantId.mockResolvedValue({
      data: [{ id: "payer-1", payerName: "Acme Health", isActive: false }],
    });
    renderPanel();
    await payersLoaded();
    fireEvent.click(screen.getByRole("button", { name: "Activate payer-1" }));
    await waitFor(() =>
      expect(apiMock.UpdatePayerActiveness).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true })
      )
    );
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        "Payer activated successfully",
        "success"
      )
    );
  });

  it("warns when flipping a payer fails", async () => {
    apiMock.UpdatePayerActiveness.mockRejectedValue(new Error("nope"));
    renderPanel();
    await payersLoaded();
    fireEvent.click(screen.getByRole("button", { name: "Deactivate payer-1" }));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Failed to update payer status", "error")
    );
  });

  it("flips the same payer from the Status switch", async () => {
    renderPanel();
    await payersLoaded();
    fireEvent.click(screen.getByRole("button", { name: "switch payer-1" }));
    await waitFor(() => expect(apiMock.UpdatePayerActiveness).toHaveBeenCalled());
  });

  it("withholds the Status switch and the menu from a role with no payer rights", async () => {
    renderPanel({ permissions: ["view_payers_list"] });
    await payersLoaded();
    expect(screen.queryByRole("button", { name: "switch payer-1" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /payer-1/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add a Payer" })).not.toBeInTheDocument();
  });
});

describe("the insurance type row menu", () => {
  const openInsurance = async () => {
    renderPanel();
    await payersLoaded();
    openInsuranceTab();
  };

  it("opens the modal in view mode from View", async () => {
    await openInsurance();
    fireEvent.click(screen.getByRole("button", { name: "View ins-1" }));
    expect(insuranceModal.props.mode).toBe("view");
    expect(insuranceModal.props.initialData).toMatchObject({ name: "PPO" });
  });

  it("opens the modal in edit mode from Edit", async () => {
    await openInsurance();
    fireEvent.click(screen.getByRole("button", { name: "Edit ins-1" }));
    expect(insuranceModal.props.mode).toBe("edit");
  });

  it("flips an insurance type's activeness and refetches", async () => {
    await openInsurance();
    fireEvent.click(screen.getByRole("button", { name: "Deactivate ins-1" }));
    await waitFor(() =>
      expect(apiMock.UpdateInsuranceTypeActiveness).toHaveBeenCalledWith({
        id: "ins-1",
        isActive: false,
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        "Insurance type deactivated successfully",
        "success"
      )
    );
  });

  it("offers Activate for a dormant insurance type", async () => {
    apiMock.GetInsuranceTypeByTenantId.mockResolvedValue({
      data: [{ id: "ins-1", name: "PPO", isActive: false }],
    });
    await openInsurance();
    fireEvent.click(screen.getByRole("button", { name: "Activate ins-1" }));
    await waitFor(() =>
      expect(apiMock.UpdateInsuranceTypeActiveness).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true })
      )
    );
  });

  it("warns when flipping an insurance type fails", async () => {
    apiMock.UpdateInsuranceTypeActiveness.mockRejectedValue(new Error("nope"));
    await openInsurance();
    fireEvent.click(screen.getByRole("button", { name: "switch ins-1" }));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        "Failed to update insurance type status",
        "error"
      )
    );
  });

  it("withholds the switch, the menu and the add button from a read-only role", async () => {
    renderPanel({ permissions: ["view_insurance_list"] });
    await screen.findByTestId("table-Insurance-Types");
    expect(screen.queryByRole("button", { name: "switch ins-1" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ins-1/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add an Insurance Type" })
    ).not.toBeInTheDocument();
  });
});

describe("saving an insurance type", () => {
  const openAdd = async () => {
    renderPanel();
    await payersLoaded();
    openInsuranceTab();
    fireEvent.click(screen.getByRole("button", { name: "Add an Insurance Type" }));
  };

  const openEdit = async () => {
    renderPanel();
    await payersLoaded();
    openInsuranceTab();
    fireEvent.click(screen.getByRole("button", { name: "Edit ins-1" }));
  };

  it("creates a new one from the add button", async () => {
    insuranceModal.payload = { name: "HMO", description: "Health maintenance" };
    await openAdd();
    expect(insuranceModal.props.mode).toBe("add");
    expect(insuranceModal.props.initialData).toEqual({});
    fireEvent.click(screen.getByText("save-insurance"));
    await waitFor(() =>
      expect(apiMock.CreateInsuranceType).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        name: "HMO",
        description: "Health maintenance",
        isActive: true,
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        "Insurance type saved successfully",
        "success"
      )
    );
    expect(screen.queryByTestId("insurance-modal")).not.toBeInTheDocument();
  });

  it("blanks a description the modal left out", async () => {
    insuranceModal.payload = { name: "HMO" };
    await openAdd();
    fireEvent.click(screen.getByText("save-insurance"));
    await waitFor(() =>
      expect(apiMock.CreateInsuranceType).toHaveBeenCalledWith(
        expect.objectContaining({ description: "" })
      )
    );
  });

  it("updates the selected row and keeps its activeness", async () => {
    insuranceModal.payload = { name: "PPO renamed" };
    await openEdit();
    fireEvent.click(screen.getByText("save-insurance"));
    await waitFor(() =>
      expect(apiMock.UpdateInsuranceType).toHaveBeenCalledWith(
        expect.objectContaining({ id: "ins-1", isActive: true, name: "PPO renamed" })
      )
    );
    expect(apiMock.CreateInsuranceType).not.toHaveBeenCalled();
  });

  it("just closes when the modal is only being viewed", async () => {
    renderPanel();
    await payersLoaded();
    openInsuranceTab();
    fireEvent.click(screen.getByRole("button", { name: "View ins-1" }));
    fireEvent.click(screen.getByText("save-insurance"));
    await waitFor(() => expect(screen.queryByTestId("insurance-modal")).not.toBeInTheDocument());
    expect(apiMock.UpdateInsuranceType).not.toHaveBeenCalled();
    expect(apiMock.CreateInsuranceType).not.toHaveBeenCalled();
  });

  it("warns and keeps the modal open when the save fails", async () => {
    apiMock.CreateInsuranceType.mockRejectedValue(new Error("500"));
    insuranceModal.payload = { name: "HMO" };
    await openAdd();
    fireEvent.click(screen.getByText("save-insurance"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        "Failed to save insurance type",
        "error"
      )
    );
    expect(screen.getByTestId("insurance-modal")).toBeInTheDocument();
  });

  it("deactivates the selected row from the modal's delete", async () => {
    await openEdit();
    fireEvent.click(screen.getByText("delete-insurance"));
    await waitFor(() =>
      expect(apiMock.UpdateInsuranceTypeActiveness).toHaveBeenCalledWith({
        id: "ins-1",
        isActive: false,
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        "Insurance type deactivated successfully",
        "success"
      )
    );
  });

  it("refuses to delete from the add modal, where no row is selected", async () => {
    await openAdd();
    fireEvent.click(screen.getByText("delete-insurance"));
    expect(apiMock.UpdateInsuranceTypeActiveness).not.toHaveBeenCalled();
    expect(screen.getByTestId("insurance-modal")).toBeInTheDocument();
  });

  it("warns when the deactivation fails", async () => {
    apiMock.UpdateInsuranceTypeActiveness.mockRejectedValue(new Error("nope"));
    await openEdit();
    fireEvent.click(screen.getByText("delete-insurance"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        "Failed to deactivate insurance type",
        "error"
      )
    );
  });

  it("closes on the modal's own close handler", async () => {
    await openEdit();
    fireEvent.click(screen.getByText("close-insurance"));
    expect(screen.queryByTestId("insurance-modal")).not.toBeInTheDocument();
  });
});

describe("saving a payer", () => {
  const fullPayer = {
    payerName: "Beta Health",
    email: "b@beta.test",
    phoneNumber: "555-0111",
    insuranceType: "ins-1",
    tplCode: "TPL-1",
    carrierPayerId: "CAR-1",
    address: "3 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
    country: "USA",
    serviceCodes: [{ code: "97153" }],
  };

  const openAdd = async () => {
    renderPanel();
    await payersLoaded();
    const add = screen.getByRole("button", { name: "Add a Payer" });
    await waitFor(() => expect(add).not.toBeDisabled());
    fireEvent.click(add);
  };

  const openEdit = async () => {
    renderPanel();
    await payersLoaded();
    fireEvent.click(screen.getByRole("button", { name: "Edit payer-1" }));
  };

  it("creates a new payer from the add button", async () => {
    payerModal.payload = fullPayer;
    await openAdd();
    expect(payerModal.props.mode).toBe("add");
    expect(payerModal.props.initialData).toEqual({});
    fireEvent.click(screen.getByText("save-payer"));
    await waitFor(() =>
      expect(apiMock.CreatePayer).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "tenant-1",
          payerName: "Beta Health",
          phone: "555-0111",
          insuranceTypeId: "ins-1",
          isActive: true,
        })
      )
    );
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Payer saved successfully", "success")
    );
    expect(screen.queryByTestId("payer-modal")).not.toBeInTheDocument();
  });

  it("updates the selected payer and keeps its activeness", async () => {
    payerModal.payload = fullPayer;
    await openEdit();
    expect(payerModal.props.mode).toBe("edit");
    expect(payerModal.props.initialData).toMatchObject({ payerName: "Acme Health" });
    fireEvent.click(screen.getByText("save-payer"));
    await waitFor(() =>
      expect(apiMock.UpdatePayer).toHaveBeenCalledWith(
        expect.objectContaining({ id: "payer-1", isActive: true })
      )
    );
    expect(apiMock.CreatePayer).not.toHaveBeenCalled();
  });

  it("refuses a save with no insurance type and leaves the modal open", async () => {
    payerModal.payload = { ...fullPayer, insuranceType: "" };
    await openAdd();
    fireEvent.click(screen.getByText("save-payer"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Failed to save payer", "error")
    );
    expect(apiMock.CreatePayer).not.toHaveBeenCalled();
    expect(screen.getByTestId("payer-modal")).toBeInTheDocument();
  });

  it("warns when the create endpoint rejects", async () => {
    apiMock.CreatePayer.mockRejectedValue(new Error("500"));
    payerModal.payload = fullPayer;
    await openAdd();
    fireEvent.click(screen.getByText("save-payer"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Failed to save payer", "error")
    );
    expect(screen.getByTestId("payer-modal")).toBeInTheDocument();
  });

  it("deactivates the selected payer from the modal's delete", async () => {
    await openEdit();
    fireEvent.click(screen.getByText("delete-payer"));
    await waitFor(() =>
      expect(apiMock.UpdatePayerActiveness).toHaveBeenCalledWith({
        id: "payer-1",
        isActive: false,
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        "Payer deactivated successfully",
        "success"
      )
    );
  });

  it("refuses to delete from the add modal, where no row is selected", async () => {
    await openAdd();
    fireEvent.click(screen.getByText("delete-payer"));
    expect(apiMock.UpdatePayerActiveness).not.toHaveBeenCalled();
    expect(screen.getByTestId("payer-modal")).toBeInTheDocument();
  });

  it("warns when the payer deactivation fails", async () => {
    apiMock.UpdatePayerActiveness.mockRejectedValue(new Error("nope"));
    await openEdit();
    fireEvent.click(screen.getByText("delete-payer"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Failed to deactivate payer", "error")
    );
  });

  it("closes on the modal's own close handler", async () => {
    await openEdit();
    fireEvent.click(screen.getByText("close-payer"));
    expect(screen.queryByTestId("payer-modal")).not.toBeInTheDocument();
  });

  it("turns an open payer edit into a no-op once an insurance type is viewed", async () => {
    // `mode` is one piece of state shared by both modals, and neither modal is
    // scoped to its tab -- so viewing an insurance type while a payer edit is
    // still open silently downgrades the payer save to a view-mode close.
    payerModal.payload = fullPayer;
    await openEdit();
    openInsuranceTab();
    fireEvent.click(screen.getByRole("button", { name: "View ins-1" }));
    expect(screen.getByTestId("payer-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByText("save-payer"));
    await waitFor(() => expect(screen.queryByTestId("payer-modal")).not.toBeInTheDocument());
    expect(apiMock.UpdatePayer).not.toHaveBeenCalled();
    expect(apiMock.CreatePayer).not.toHaveBeenCalled();
  });
});
