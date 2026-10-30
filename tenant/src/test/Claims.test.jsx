import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The Claims list: one fetch, a row transform that flattens three nested
 * relations into four columns, and four filter predicates.
 *
 * The endpoint is inconsistent about wrapping -- it sometimes answers with the
 * array itself and sometimes with `{ data: [...] }` -- and each column reaches
 * through optional relations before falling back to "N/A", so the fixtures
 * below strip one relation at a time. The table is a probe that records its
 * props, which lets the four predicates be exercised on both arms without
 * driving a react-select.
 *
 * The date column runs through the tenant's configured format, so the store is
 * preloaded with settings already marked loaded.
 */

const api = vi.hoisted(() => ({ GetClaimsByTenantId: vi.fn() }));
vi.mock("../api/billingAndPaymentsApi", () => ({ default: api }));

const settingsApi = vi.hoisted(() => ({ GetGeneralSettingsByTenantId: vi.fn() }));
vi.mock("../api/generalSettingsApi", () => ({ default: settingsApi }));

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

const table = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/Table/CustomTable", () => ({
  default: (received) => {
    table.props = received;
    return <div data-testid="table" data-loading={String(received.loading)} />;
  },
}));

import Claims from "../Pages/BillingAndPayment/Claims/Claims";

const makeStore = (permissions, user = {}, dateFormat = "MM/DD/YYYY") =>
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
          role: permissions
            ? { roleModuleAccesses: [{ module: "BILLINGS_PAYMENTS", permissions }] }
            : { roleModuleAccesses: [] },
          ...user,
        },
      },
      generalSettings: { dateFormat, timeFormat: "12-hour", currency: "USD", loaded: true },
    },
  });

const renderPage = ({ permissions, user, dateFormat } = {}) =>
  render(
    <Provider store={makeStore(permissions, user, dateFormat)}>
      <Claims />
    </Provider>
  );

// A claim as the endpoint returns it: the approver, the client and the payer
// each arrive through a different relation.
const claim = (over = {}) => ({
  id: "cl-1",
  date: "2026-02-14T08:30:00.000Z",
  approver: { fullName: "Grace Hopper" },
  clientName: "Ada Lovelace",
  authorizationsUsed: [{ payerDetails: { payerName: "Blue Cross" } }],
  ...over,
});

const listed = () =>
  waitFor(() => expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false"));

const rowFor = async (over, options) => {
  api.GetClaimsByTenantId.mockResolvedValue({ data: [claim(over)] });
  renderPage(options);
  await listed();
  return table.props.data[0];
};

beforeEach(() => {
  vi.clearAllMocks();
  table.props = null;
  api.GetClaimsByTenantId.mockResolvedValue({ data: [claim()] });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("access", () => {
  it("refuses a role that cannot view claims", async () => {
    renderPage({ permissions: ["can_create_claims"] });
    expect(screen.queryByTestId("table")).not.toBeInTheDocument();
    // The guard sits below the effect, so the fetch still runs underneath it.
    await waitFor(() => expect(api.GetClaimsByTenantId).toHaveBeenCalled());
  });

  it("shows the table to a role granted the claims permission", async () => {
    renderPage({ permissions: ["can_view_claims"] });
    await listed();
    expect(screen.getByText("Claims")).toBeInTheDocument();
    expect(table.props.showActions).toBe(true);
  });
});

describe("loading the claims", () => {
  it("asks for the tenant's claims and maps each into a row", async () => {
    renderPage();
    await listed();
    expect(api.GetClaimsByTenantId).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(table.props.data[0]).toEqual({
      id: "cl-1",
      date: "02/14/2026",
      createdBy: "Grace Hopper",
      clientName: "Ada Lovelace",
      payer: "Blue Cross",
      hasActions: true,
    });
  });

  it("accepts a bare array in place of a wrapped response", async () => {
    api.GetClaimsByTenantId.mockResolvedValue([claim()]);
    renderPage();
    await listed();
    expect(table.props.data).toHaveLength(1);
  });

  it("shows an empty table when the response carries no claims", async () => {
    api.GetClaimsByTenantId.mockResolvedValue({});
    renderPage();
    await listed();
    expect(table.props.data).toEqual([]);
  });

  it("empties the table when the fetch fails", async () => {
    api.GetClaimsByTenantId.mockRejectedValue(new Error("500"));
    renderPage();
    await listed();
    expect(table.props.data).toEqual([]);
  });

  it("never fetches without a tenant", async () => {
    renderPage({ user: { tenantId: undefined } });
    await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
    expect(api.GetClaimsByTenantId).not.toHaveBeenCalled();
    expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "true");
  });

  it("never fetches without an access token", async () => {
    renderPage({ user: { accessToken: undefined } });
    await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
    expect(api.GetClaimsByTenantId).not.toHaveBeenCalled();
  });
});

describe("the row transform", () => {
  it("marks an unapproved claim's creator as N/A", async () => {
    expect(await rowFor({ approver: null })).toMatchObject({ createdBy: "N/A" });
  });

  it("marks an approver with no name as N/A", async () => {
    expect(await rowFor({ approver: {} })).toMatchObject({ createdBy: "N/A" });
  });

  it("marks a claim with no client name as N/A", async () => {
    expect(await rowFor({ clientName: "" })).toMatchObject({ clientName: "N/A" });
  });

  it("marks a claim that used no authorization as having no payer", async () => {
    expect(await rowFor({ authorizationsUsed: [] })).toMatchObject({ payer: "N/A" });
  });

  it("marks an authorization with no payer details as having no payer", async () => {
    expect(await rowFor({ authorizationsUsed: [{}] })).toMatchObject({ payer: "N/A" });
  });

  it("reads the payer off the first authorization only", async () => {
    expect(
      await rowFor({
        authorizationsUsed: [
          { payerDetails: { payerName: "Aetna" } },
          { payerDetails: { payerName: "Cigna" } },
        ],
      })
    ).toMatchObject({ payer: "Aetna" });
  });

  it("renders the date in the tenant's configured format", async () => {
    expect(await rowFor({}, { dateFormat: "YYYY-MM-DD" })).toMatchObject({
      date: "2026-02-14",
    });
  });
});

describe("the filters", () => {
  it("keeps every row when a filter is left unset", async () => {
    renderPage();
    await listed();
    const row = table.props.data[0];
    expect(table.props.filters.map((f) => f.value)).toEqual([
      "payer",
      "clientName",
      "createdBy",
      "date",
    ]);
    for (const filter of table.props.filters) {
      expect(filter.filterFunction(row, "")).toBe(true);
    }
  });

  it("matches a row on each filter's own column", async () => {
    renderPage();
    await listed();
    const row = table.props.data[0];
    const by = (value) => table.props.filters.find((f) => f.value === value).filterFunction;
    expect(by("payer")(row, "Blue Cross")).toBe(true);
    expect(by("payer")(row, "Aetna")).toBe(false);
    expect(by("clientName")(row, "Ada Lovelace")).toBe(true);
    expect(by("clientName")(row, "Someone else")).toBe(false);
    expect(by("createdBy")(row, "Grace Hopper")).toBe(true);
    expect(by("createdBy")(row, "Someone else")).toBe(false);
    expect(by("date")(row, "02/14/2026")).toBe(true);
    expect(by("date")(row, "01/01/2026")).toBe(false);
  });
});

describe("opening a claim", () => {
  it("routes to the claim's own page", async () => {
    renderPage();
    await listed();
    act(() => table.props.onActionClick(table.props.data[0]));
    expect(navigate).toHaveBeenCalledWith("/billing/claims/view/cl-1");
  });
});
