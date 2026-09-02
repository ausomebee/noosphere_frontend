import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The read-only payer detail page reached from Billing & Payments → Settings →
 * Payers. It stitches four independent fetches together: insurance types (to
 * name the payer's insurance), rounding rules and tenant service codes (both
 * only used to feed the two modals), and the payer itself.
 *
 * The payer fetch deliberately depends on the insurance-type state, so it runs
 * once against an empty lookup on mount and again once the lookup lands. That
 * means the endpoint is called more than once per render and assertions here
 * check the payload rather than the call count.
 *
 * `GetSInglePayerById` returns a bare ARRAY, not an envelope — the page reads
 * `response[0]` and treats a missing element as a hard failure, which it
 * swallows, so a failed load is visible only as the "Unknown Payer" breadcrumb.
 *
 * CustomTable and both modals are probes: the table renders one button per row
 * action so the menu handlers can be fired through the DOM, and each modal
 * records the props it was handed and offers a save button that submits a
 * payload the test parks on the probe first.
 */

const apiMock = vi.hoisted(() => ({
  GetInsuranceTypeByTenantId: vi.fn(),
  GetRoundingRuleByTenantId: vi.fn(),
  GetTenantServiceCodeByTenantId: vi.fn(),
  GetSInglePayerById: vi.fn(),
  UpdatePayerServiceCodeActiveness: vi.fn(),
  UpdatePayer: vi.fn(),
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
  useParams: () => ({ id: "payer-1" }),
}));

// One button per row action, so the dropdown handlers can be fired through the
// DOM instead of being pulled off the recorded props and called bare.
const table = vi.hoisted(() => ({ last: null }));
vi.mock("../Components/Table/CustomTable", () => ({
  default: (props) => {
    table.last = props;
    return (
      <div data-testid="service-code-table">
        {props.data.map((row) => (
          <div key={row.id} data-testid={`row-${row.id}`}>
            <span>{`${row.name}|${row.code}|${row.rates}|${row.modifiers}`}</span>
            {(props.actions?.(row)?.[0]?.items ?? []).map((item) => (
              <button key={item.label} onClick={item.onClick}>
                {`${item.label} ${row.id}`}
              </button>
            ))}
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
        <button onClick={() => props.onSave(payerModal.payload).catch(() => {})}>
          save-payer
        </button>
        <button onClick={props.onClose}>close-payer</button>
        <button onClick={props.onDelete}>delete-payer</button>
      </div>
    ) : null;
  },
}));

const serviceCodeModal = vi.hoisted(() => ({ props: null, payload: {} }));
vi.mock("../Components/ReusableModal/BillingAndPaymentModal/AddSingleServiceCode", () => ({
  default: (props) => {
    serviceCodeModal.props = props;
    return props.isOpen ? (
      <div data-testid="service-code-modal">
        <button onClick={() => props.onSave(serviceCodeModal.payload)}>
          save-service-code
        </button>
        <button onClick={props.onClose}>close-service-code</button>
      </div>
    ) : null;
  },
}));

import SingleViewPayer from "../Pages/BillingAndPayment/Settings/SettingSubs/SingleViewPayer";

const basePayer = (over = {}) => ({
  id: "payer-1",
  payerName: "Acme Health",
  email: "billing@acme.test",
  insuranceTypeId: "ins-1",
  phone: "555-0100",
  tplCode: "TPL-9",
  carrierPayerId: "CAR-9",
  address: "1 Main St",
  city: "Austin",
  state: "TX",
  zip: "78701",
  country: "USA",
  isActive: true,
  // The join key: a PayerServiceCode names a tenant service code by id, and the
  // code/description are read off the payer's own `serviceCodes` list.
  PayerServiceCodes: [
    {
      id: "psc-1",
      serviceCodeId: "sc-1",
      ratePerUnit: 25,
      unitCurrency: "USD",
      roundingRuleId: "rr-1",
      billable: true,
      isActive: true,
      modifiers: [{ modifier: "HO", ratePerUnit: 2 }],
    },
  ],
  serviceCodes: [{ serviceCodeId: "sc-1", code: "97153", description: "Direct Therapy" }],
  ...over,
});

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
          email: "sam@example.com",
          // An empty accesses array is the org-owner case: full access.
          role: permissions
            ? { roleModuleAccesses: [{ module: "BILLING_AND_PAYMENT", permissions }] }
            : { roleModuleAccesses: [] },
        },
      },
    },
  });

const renderPage = ({ permissions } = {}) =>
  render(
    <Provider store={makeStore(permissions)}>
      <SingleViewPayer />
    </Provider>
  );

// "Acme Health" itself appears twice (breadcrumb + grid), so wait on a label.
const loaded = () => screen.findByText("Payer Name");

const fieldValue = (label) =>
  screen.getByText(label).nextElementSibling?.textContent?.trim() ?? "";

beforeEach(() => {
  vi.clearAllMocks();
  payerModal.payload = {};
  serviceCodeModal.payload = {};
  apiMock.GetInsuranceTypeByTenantId.mockResolvedValue({
    data: [{ id: "ins-1", name: "PPO", description: "Preferred", isActive: true }],
  });
  apiMock.GetRoundingRuleByTenantId.mockResolvedValue({
    data: [
      { id: "rr-1", ruleName: "8 Minute Rule", description: "Eight", isActive: true },
      { id: "rr-2", ruleName: "Retired Rule", description: "Old", isActive: false },
    ],
  });
  apiMock.GetTenantServiceCodeByTenantId.mockResolvedValue({
    data: [
      { id: "sc-1", code: "97153", description: "Direct Therapy", isActive: true, modifiers: [{ modifier: "HO" }] },
      { id: "sc-2", code: "97155", description: "Protocol Mod", isActive: true, modifiers: null },
      { id: "sc-3", code: "00000", description: "Retired", isActive: false },
    ],
  });
  apiMock.GetSInglePayerById.mockResolvedValue([basePayer()]);
  apiMock.UpdatePayer.mockResolvedValue({});
  apiMock.UpdatePayerServiceCodeActiveness.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading the payer", () => {
  it("shows a section loader until the payer arrives", async () => {
    renderPage();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    await loaded();
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });

  it("asks for the route id with the caller's tokens", async () => {
    renderPage();
    await loaded();
    expect(apiMock.GetSInglePayerById).toHaveBeenCalledWith({
      id: "payer-1",
      accessToken: "at",
      refreshToken: "rt",
    });
  });

  it("names the insurance type from the loaded insurance types", async () => {
    renderPage();
    await loaded();
    await waitFor(() => expect(fieldValue("Insurance Type")).toBe("PPO"));
  });

  it("labels an insurance type it cannot resolve as Unknown", async () => {
    apiMock.GetSInglePayerById.mockResolvedValue([basePayer({ insuranceTypeId: "ins-gone" })]);
    renderPage();
    await loaded();
    await waitFor(() =>
      expect(apiMock.GetSInglePayerById).toHaveBeenCalledTimes(2)
    );
    expect(fieldValue("Insurance Type")).toBe("Unknown");
  });

  it("treats an empty response array as a payer that does not exist", async () => {
    apiMock.GetSInglePayerById.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByText("Unknown Payer")).toBeInTheDocument());
    // The loader still clears — the failure is swallowed in the finally block.
    await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());
  });

  it("swallows a payer endpoint that rejects", async () => {
    apiMock.GetSInglePayerById.mockRejectedValue(new Error("gateway"));
    renderPage();
    await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());
    expect(screen.getByText("Unknown Payer")).toBeInTheDocument();
    expect(toastMock.showToast).not.toHaveBeenCalled();
  });

  it("sends the user back when Back is pressed", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(navigate).toHaveBeenCalledWith(-1);
  });
});

describe("the payer information grid", () => {
  it("joins the address parts into one line", async () => {
    renderPage();
    await loaded();
    expect(fieldValue("Address")).toBe("1 Main St, Austin, TX 78701");
    expect(fieldValue("Payer Email")).toBe("billing@acme.test");
    expect(fieldValue("Phone")).toBe("555-0100");
    expect(fieldValue("TPL Code")).toBe("TPL-9");
    expect(fieldValue("Carrier Payer ID")).toBe("CAR-9");
  });

  it("keeps the street alone when one address part is missing", async () => {
    apiMock.GetSInglePayerById.mockResolvedValue([basePayer({ zip: "" })]);
    renderPage();
    await loaded();
    expect(fieldValue("Address")).toBe("1 Main St");
  });

  it("shows a dash for every field the payer left blank", async () => {
    apiMock.GetSInglePayerById.mockResolvedValue([
      { id: "payer-1", isActive: true, PayerServiceCodes: [], serviceCodes: [] },
    ]);
    renderPage();
    await waitFor(() => expect(fieldValue("Payer Email")).toBe("--"));
    expect(fieldValue("Payer Name")).toBe("--");
    expect(fieldValue("Phone")).toBe("--");
    expect(fieldValue("TPL Code")).toBe("--");
    expect(fieldValue("Carrier Payer ID")).toBe("--");
    expect(fieldValue("Address")).toBe("--");
  });
});

describe("the service code table", () => {
  it("resolves each configured code against the payer's service code list", async () => {
    renderPage();
    await loaded();
    expect(screen.getByTestId("row-psc-1")).toHaveTextContent(
      "Direct Therapy|97153|$25.00|HO"
    );
  });

  it("labels a configured code with no matching service code as Unknown", async () => {
    apiMock.GetSInglePayerById.mockResolvedValue([
      basePayer({
        PayerServiceCodes: [{ id: "psc-9", serviceCodeId: "sc-missing" }],
        serviceCodes: [],
      }),
    ]);
    renderPage();
    await loaded();
    // No rate, no currency and no modifier array: every fallback fires at once.
    expect(screen.getByTestId("row-psc-9")).toHaveTextContent("Unknown|Unknown|$0.00|");
  });

  it("copes with a payer whose service code fields are not arrays", async () => {
    apiMock.GetSInglePayerById.mockResolvedValue([
      basePayer({ PayerServiceCodes: null, serviceCodes: null }),
    ]);
    renderPage();
    await loaded();
    expect(screen.getByTestId("service-code-table")).toBeEmptyDOMElement();
  });
});

describe("the lookups the modals depend on", () => {
  const openAdd = async () => {
    renderPage();
    await loaded();
    const add = screen.getByRole("button", { name: "Add Service Code" });
    await waitFor(() => expect(add).not.toBeDisabled());
    fireEvent.click(add);
  };

  it("offers only the active rounding rules and service codes", async () => {
    await openAdd();
    expect(serviceCodeModal.props.roundingRules).toEqual([
      { id: "rr-1", ruleName: "8 Minute Rule", description: "Eight", fullData: expect.any(Object) },
    ]);
    expect(serviceCodeModal.props.serviceCodes.map((sc) => sc.id)).toEqual(["sc-1", "sc-2"]);
  });

  it("substitutes an empty modifier list for a service code that has none", async () => {
    await openAdd();
    expect(serviceCodeModal.props.serviceCodes[1].modifiers).toEqual([]);
  });

  it("carries on when the lookup endpoints return no data array", async () => {
    apiMock.GetInsuranceTypeByTenantId.mockResolvedValue({});
    apiMock.GetRoundingRuleByTenantId.mockResolvedValue({});
    apiMock.GetTenantServiceCodeByTenantId.mockResolvedValue({});
    await openAdd();
    expect(serviceCodeModal.props.roundingRules).toEqual([]);
    expect(serviceCodeModal.props.serviceCodes).toEqual([]);
    expect(fieldValue("Insurance Type")).toBe("Unknown");
  });

  it("carries on when every lookup endpoint rejects", async () => {
    apiMock.GetInsuranceTypeByTenantId.mockRejectedValue(new Error("down"));
    apiMock.GetRoundingRuleByTenantId.mockRejectedValue(new Error("down"));
    apiMock.GetTenantServiceCodeByTenantId.mockRejectedValue(new Error("down"));
    await openAdd();
    expect(serviceCodeModal.props.roundingRules).toEqual([]);
    expect(toastMock.showToast).not.toHaveBeenCalled();
  });
});

describe("activating and deactivating a configured service code", () => {
  it("offers Deactivate for a live row and Activate for a dormant one", async () => {
    apiMock.GetSInglePayerById.mockResolvedValue([
      basePayer({
        PayerServiceCodes: [
          { id: "psc-1", serviceCodeId: "sc-1", isActive: true },
          { id: "psc-2", serviceCodeId: "sc-1", isActive: false },
        ],
      }),
    ]);
    renderPage();
    await loaded();
    expect(screen.getByRole("button", { name: "Deactivate psc-1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activate psc-2" })).toBeInTheDocument();
  });

  it("flips the row's activeness and refetches the payer", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Deactivate psc-1" }));
    await waitFor(() =>
      expect(apiMock.UpdatePayerServiceCodeActiveness).toHaveBeenCalledWith({
        id: "psc-1",
        isActive: false,
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        "Service code deactivated successfully",
        "success"
      )
    );
  });

  it("phrases the toast the other way round when reactivating", async () => {
    apiMock.GetSInglePayerById.mockResolvedValue([
      basePayer({
        PayerServiceCodes: [{ id: "psc-1", serviceCodeId: "sc-1", isActive: false }],
      }),
    ]);
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Activate psc-1" }));
    await waitFor(() =>
      expect(apiMock.UpdatePayerServiceCodeActiveness).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true })
      )
    );
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        "Service code activated successfully",
        "success"
      )
    );
  });

  it("warns and reloads the payer when the flip fails", async () => {
    apiMock.UpdatePayerServiceCodeActiveness.mockRejectedValue(new Error("nope"));
    renderPage();
    await loaded();
    const before = apiMock.GetSInglePayerById.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Deactivate psc-1" }));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        "Failed to update service code status",
        "error"
      )
    );
    expect(apiMock.GetSInglePayerById.mock.calls.length).toBeGreaterThan(before);
  });
});

describe("permissions", () => {
  it("hides the edit pencil from a role without edit_payer", async () => {
    renderPage({ permissions: ["add_service_code"] });
    await loaded();
    expect(document.body.querySelector(".billing-info-card svg")).toBeNull();
  });

  it("hides Add Service Code from a role without add_service_code", async () => {
    renderPage({ permissions: ["edit_payer"] });
    await loaded();
    expect(screen.queryByRole("button", { name: "Add Service Code" })).not.toBeInTheDocument();
  });

  it("gives a row no actions at all when the role grants neither", async () => {
    renderPage({ permissions: ["edit_payer"] });
    await loaded();
    expect(screen.queryByRole("button", { name: /psc-1/ })).not.toBeInTheDocument();
  });

  it("offers only Edit to a role that cannot deactivate", async () => {
    renderPage({ permissions: ["edit_service_code"] });
    await loaded();
    expect(screen.getByRole("button", { name: "Edit psc-1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Deactivate psc-1" })).not.toBeInTheDocument();
  });
});

describe("editing the payer", () => {
  const openPayerModal = async () => {
    renderPage();
    await loaded();
    fireEvent.click(document.body.querySelector(".billing-info-card .cursor-pointer"));
  };

  it("hands the raw payer record to the modal in edit mode", async () => {
    await openPayerModal();
    expect(screen.getByTestId("payer-modal")).toBeInTheDocument();
    expect(payerModal.props.mode).toBe("edit");
    expect(payerModal.props.initialData).toMatchObject({ payerName: "Acme Health" });
  });

  it("sends the edited payer with its existing service codes and closes", async () => {
    payerModal.payload = {
      payerName: "Acme Health Plus",
      email: "new@acme.test",
      phoneNumber: "555-0199",
      insuranceType: "ins-1",
      tplCode: "TPL-9",
      carrierPayerId: "CAR-9",
      address: "2 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
      country: "USA",
    };
    await openPayerModal();
    fireEvent.click(screen.getByText("save-payer"));
    await waitFor(() =>
      expect(apiMock.UpdatePayer).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "payer-1",
          tenantId: "tenant-1",
          payerName: "Acme Health Plus",
          insuranceTypeId: "ins-1",
          isActive: true,
        })
      )
    );
    // The existing row keeps its id and is sent in the backend's shape.
    expect(apiMock.UpdatePayer.mock.calls[0][0].serviceCodes).toEqual([
      expect.objectContaining({ id: "psc-1", serviceCodeId: "sc-1", modifiers: ["HO"] }),
    ]);
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Payer updated successfully", "success")
    );
    expect(screen.queryByTestId("payer-modal")).not.toBeInTheDocument();
  });

  it("refuses a save with no insurance type and leaves the modal open", async () => {
    payerModal.payload = { payerName: "Acme", insuranceType: "" };
    await openPayerModal();
    fireEvent.click(screen.getByText("save-payer"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Failed to update payer", "error")
    );
    expect(apiMock.UpdatePayer).not.toHaveBeenCalled();
    expect(screen.getByTestId("payer-modal")).toBeInTheDocument();
  });

  it("warns when the update endpoint rejects", async () => {
    apiMock.UpdatePayer.mockRejectedValue(new Error("500"));
    payerModal.payload = { payerName: "Acme", insuranceType: "ins-1" };
    await openPayerModal();
    fireEvent.click(screen.getByText("save-payer"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Failed to update payer", "error")
    );
    expect(screen.getByTestId("payer-modal")).toBeInTheDocument();
  });

  it("closes on the modal's own close and delete handlers", async () => {
    await openPayerModal();
    fireEvent.click(screen.getByText("close-payer"));
    expect(screen.queryByTestId("payer-modal")).not.toBeInTheDocument();

    fireEvent.click(document.body.querySelector(".billing-info-card .cursor-pointer"));
    fireEvent.click(screen.getByText("delete-payer"));
    expect(screen.queryByTestId("payer-modal")).not.toBeInTheDocument();
  });
});

describe("adding a service code", () => {
  const openAdd = async () => {
    renderPage();
    await loaded();
    const add = screen.getByRole("button", { name: "Add Service Code" });
    await waitFor(() => expect(add).not.toBeDisabled());
    fireEvent.click(add);
  };

  it("opens in add mode with nothing prefilled", async () => {
    await openAdd();
    expect(serviceCodeModal.props.mode).toBe("add");
    expect(serviceCodeModal.props.initialData).toEqual({});
  });

  it("names the new row from the tenant service code it points at", async () => {
    serviceCodeModal.payload = {
      serviceCodeId: "sc-2",
      code: "ignored",
      description: "ignored too",
      unitCurrency: "USD",
      ratePerUnit: 12,
      roundingRule: "rr-1",
      billable: true,
      modifiers: [{ modifier: "KX", ratePerUnit: 1 }],
    };
    await openAdd();
    fireEvent.click(screen.getByText("save-service-code"));
    await waitFor(() => expect(apiMock.UpdatePayer).toHaveBeenCalled());
    // The tenant service code wins over whatever the modal echoed back.
    expect(screen.getByText(/Protocol Mod\|97155\|\$12\.00\|KX/)).toBeInTheDocument();
    expect(toastMock.showToast).toHaveBeenCalledWith(
      "Service code updated successfully",
      "success"
    );
  });

  it("falls back to the payload's own code when it matches no tenant service code", async () => {
    serviceCodeModal.payload = {
      serviceCodeId: "",
      code: "CUSTOM1",
      description: "A custom code",
      unitCurrency: "USD",
      ratePerUnit: 5,
      roundingRule: "rr-1",
      billable: false,
      modifiers: null,
    };
    await openAdd();
    fireEvent.click(screen.getByText("save-service-code"));
    await waitFor(() => expect(apiMock.UpdatePayer).toHaveBeenCalled());
    expect(screen.getByText(/A custom code\|CUSTOM1\|\$5\.00\|/)).toBeInTheDocument();
    // No serviceCodeId, so the backend shape carries modifier objects, not codes.
    const sent = apiMock.UpdatePayer.mock.calls[0][0].serviceCodes;
    expect(sent[1]).toMatchObject({ code: "CUSTOM1", modifiers: [] });
    expect(sent[1].serviceCodeId).toBeUndefined();
  });

  it("says Unknown when the payload names nothing at all", async () => {
    serviceCodeModal.payload = { serviceCodeId: "", unitCurrency: "USD", ratePerUnit: 0 };
    await openAdd();
    fireEvent.click(screen.getByText("save-service-code"));
    await waitFor(() => expect(apiMock.UpdatePayer).toHaveBeenCalled());
    expect(screen.getByText(/Unknown\|Unknown\|\$0\.00\|/)).toBeInTheDocument();
  });

  it("warns and keeps the modal open when the update fails", async () => {
    apiMock.UpdatePayer.mockRejectedValue(new Error("500"));
    serviceCodeModal.payload = { serviceCodeId: "sc-1", ratePerUnit: 1, unitCurrency: "USD" };
    await openAdd();
    fireEvent.click(screen.getByText("save-service-code"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        "Failed to update service code",
        "error"
      )
    );
    expect(screen.getByTestId("service-code-modal")).toBeInTheDocument();
  });

  it("drops the modal on its own close handler", async () => {
    await openAdd();
    fireEvent.click(screen.getByText("close-service-code"));
    expect(screen.queryByTestId("service-code-modal")).not.toBeInTheDocument();
  });
});

describe("editing a configured service code", () => {
  const openEdit = async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Edit psc-1" }));
  };

  it("transforms the table row back into the modal's form shape", async () => {
    await openEdit();
    expect(serviceCodeModal.props.mode).toBe("edit");
    expect(serviceCodeModal.props.initialData).toEqual({
      code: "97153",
      description: "Direct Therapy",
      unitCurrency: "USD",
      ratePerUnit: 25,
      roundingRule: "rr-1",
      modifiers: [{ modifier: "HO", ratePerUnit: 2 }],
      billable: true,
      serviceCodeId: "sc-1",
    });
  });

  it("supplies defaults for a row that carries almost nothing", async () => {
    apiMock.GetSInglePayerById.mockResolvedValue([
      basePayer({
        PayerServiceCodes: [{ id: "psc-1", modifiers: [{}] }],
        serviceCodes: [],
      }),
    ]);
    await openEdit();
    expect(serviceCodeModal.props.initialData).toMatchObject({
      code: "Unknown",
      description: "",
      unitCurrency: "USD",
      ratePerUnit: 0,
      roundingRule: "",
      billable: false,
      serviceCodeId: "",
      modifiers: [{ modifier: "", ratePerUnit: 0 }],
    });
  });

  it("rewrites the edited row in place and leaves the others alone", async () => {
    apiMock.GetSInglePayerById.mockResolvedValue([
      basePayer({
        PayerServiceCodes: [
          basePayer().PayerServiceCodes[0],
          { id: "psc-2", serviceCodeId: "sc-2", ratePerUnit: 9, unitCurrency: "USD" },
        ],
        serviceCodes: [
          { serviceCodeId: "sc-1", code: "97153", description: "Direct Therapy" },
          { serviceCodeId: "sc-2", code: "97155", description: "Protocol Mod" },
        ],
      }),
    ]);
    serviceCodeModal.payload = {
      serviceCodeId: "sc-1",
      code: "97153",
      description: "Direct Therapy (revised)",
      unitCurrency: "USD",
      ratePerUnit: 30,
      roundingRule: "rr-1",
      billable: false,
      modifiers: [{ modifier: "HN", ratePerUnit: 3 }],
    };
    await openEdit();
    fireEvent.click(screen.getByText("save-service-code"));
    await waitFor(() => expect(apiMock.UpdatePayer).toHaveBeenCalled());
    expect(screen.getByTestId("row-psc-1")).toHaveTextContent(
      "Direct Therapy (revised)|97153|$30.00|HN"
    );
    expect(screen.getByTestId("row-psc-2")).toHaveTextContent("Protocol Mod|97155|$9.00|");
  });

  it("keeps the row's own name and code when the payload names neither", async () => {
    serviceCodeModal.payload = {
      unitCurrency: "USD",
      ratePerUnit: 40,
      roundingRule: "rr-1",
      billable: true,
      modifiers: "not-an-array",
    };
    await openEdit();
    fireEvent.click(screen.getByText("save-service-code"));
    await waitFor(() => expect(apiMock.UpdatePayer).toHaveBeenCalled());
    expect(screen.getByTestId("row-psc-1")).toHaveTextContent(
      "Direct Therapy|97153|$40.00|"
    );
  });
});

describe("a tenant the store does not know", () => {
  it("skips every tenant-scoped lookup and the payer itself", async () => {
    render(
      <Provider
        store={configureStore({
          reducer: { authentication: authReducer },
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
          },
        })}
      >
        <SingleViewPayer />
      </Provider>
    );

    // Nothing ever resolves, so the page is left on its section loader.
    await waitFor(() =>
      expect(screen.queryByText("Payer Name")).not.toBeInTheDocument()
    );
    expect(apiMock.GetInsuranceTypeByTenantId).not.toHaveBeenCalled();
    expect(apiMock.GetRoundingRuleByTenantId).not.toHaveBeenCalled();
    expect(apiMock.GetTenantServiceCodeByTenantId).not.toHaveBeenCalled();
    // The payer fetch is gated on the tenant too, so the page stays unnamed.
    expect(apiMock.GetSInglePayerById).not.toHaveBeenCalled();
  });
});
