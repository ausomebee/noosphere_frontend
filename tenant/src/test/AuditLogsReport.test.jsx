import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The Audit Logs report: it walks every page of the activity log endpoint on
 * mount -- unfiltered, unlike the login-only report next door -- and flattens
 * each entry into a table row.
 *
 * The row transform is the bulk of the subject: every displayed column falls
 * back through one or two alternative fields before landing on an em dash, and
 * the actor is either named outright or assembled from the admin relation. The
 * fixtures below strip one source at a time. The shared table is a probe that
 * records the rows it was handed.
 *
 * Paging is sequential and driven by `meta.totalPages` on the first response
 * only, so the multi-page test hands back a different body per call.
 */

const reportsApi = vi.hoisted(() => ({ getActivityLogs: vi.fn() }));
vi.mock("../api/reportsApi", () => ({ default: reportsApi }));

const showApiError = vi.hoisted(() => vi.fn());
vi.mock("../Helper/ShowToast", () => ({ showApiError, showToast: vi.fn() }));

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

import AuditLogsReport from "../Pages/Reports/ReportSubs/AuditLogsReport";

const makeStore = (user) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: { isAuthenticated: true, loading: false, error: null, token: "at", user },
    },
  });

const signedIn = {
  id: "user-1",
  tenantId: "tenant-1",
  accessToken: "at",
  refreshToken: "rt",
  role: { roleModuleAccesses: [] },
};

const renderReport = (user = signedIn) =>
  render(
    <Provider store={makeStore(user)}>
      <AuditLogsReport />
    </Provider>
  );

const log = (over = {}) => ({
  logId: "log-1",
  createdAt: "2026-05-06T14:05:00",
  accessedBy: "ada@example.com",
  feature: "CLIENTS",
  action: "UPDATE",
  details: "Client c-1 renamed",
  ipAddress: "10.0.0.1",
  userAgent: "Firefox",
  outcome: "SUCCESS",
  ...over,
});

const page = (logs, meta) => ({ data: logs, meta });

const settled = () =>
  waitFor(() => expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false"));

// Render one log and read back the row the transform produced for it.
const rowFor = async (over) => {
  reportsApi.getActivityLogs.mockResolvedValue(page([log(over)]));
  renderReport();
  await settled();
  return table.props.data[0];
};

beforeEach(() => {
  vi.clearAllMocks();
  table.props = null;
  reportsApi.getActivityLogs.mockResolvedValue(page([log()]));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading the logs", () => {
  it("asks for the first page of every activity log on mount", async () => {
    renderReport();
    await settled();
    expect(reportsApi.getActivityLogs).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      page: 1,
      limit: 100,
      accessToken: "at",
      refreshToken: "rt",
    });
  });

  it("stops after one page when the response names no total", async () => {
    renderReport();
    await settled();
    expect(reportsApi.getActivityLogs).toHaveBeenCalledTimes(1);
  });

  it("walks every remaining page and appends the rows", async () => {
    reportsApi.getActivityLogs
      .mockResolvedValueOnce(page([log({ logId: "log-1" })], { totalPages: 3 }))
      .mockResolvedValueOnce(page([log({ logId: "log-2" })]))
      .mockResolvedValueOnce(page([log({ logId: "log-3" })]));
    renderReport();
    await settled();
    expect(reportsApi.getActivityLogs).toHaveBeenCalledTimes(3);
    expect(table.props.data.map((r) => r.id)).toEqual(["log-1", "log-2", "log-3"]);
  });

  it("tolerates a later page that carries no rows", async () => {
    reportsApi.getActivityLogs
      .mockResolvedValueOnce(page([log()], { totalPages: 2 }))
      .mockResolvedValueOnce({});
    renderReport();
    await settled();
    expect(table.props.data).toHaveLength(1);
  });

  it("shows an empty table when the first page carries no rows", async () => {
    reportsApi.getActivityLogs.mockResolvedValue({});
    renderReport();
    await settled();
    expect(table.props.data).toEqual([]);
  });

  it("reports a refused fetch and leaves the table empty", async () => {
    const boom = new Error("403");
    reportsApi.getActivityLogs.mockRejectedValue(boom);
    renderReport();
    await settled();
    expect(showApiError).toHaveBeenCalledWith(boom, "LOAD_AUDIT_LOGS");
    expect(table.props.data).toEqual([]);
  });

  it("never fetches without a tenant, and leaves the table spinning", async () => {
    renderReport({ ...signedIn, tenantId: undefined });
    await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
    expect(reportsApi.getActivityLogs).not.toHaveBeenCalled();
    expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "true");
  });

  it("never fetches without an access token", async () => {
    renderReport({ ...signedIn, accessToken: undefined });
    await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
    expect(reportsApi.getActivityLogs).not.toHaveBeenCalled();
  });

  it("goes back to the reports index", async () => {
    renderReport();
    await settled();
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(navigate).toHaveBeenCalledWith("/reports");
  });
});

describe("the row transform", () => {
  it("formats the timestamp and takes every column from the log itself", async () => {
    expect(await rowFor({})).toEqual({
      id: "log-1",
      timestamp: { date: "05/06/2026", time: "02:05PM" },
      accessedBy: "ada@example.com",
      feature: "CLIENTS",
      action: "UPDATE",
      object: "Client c-1 renamed",
      ipAddress: "10.0.0.1",
      userAgent: "Firefox",
      outcome: "SUCCESS",
    });
  });

  it("names the admin the log was raised for when the API named no actor", async () => {
    expect(
      await rowFor({ accessedBy: "", admin: { firstName: "Grace", lastName: "Hopper" } })
    ).toMatchObject({ accessedBy: "Grace Hopper" });
  });

  it("dashes the actor when the admin relation carries no name either", async () => {
    expect(
      await rowFor({ accessedBy: null, admin: { firstName: "", lastName: "" } })
    ).toMatchObject({ accessedBy: "—" });
  });

  it("falls back to the module name when the log names no feature", async () => {
    expect(await rowFor({ feature: null, module: "SCHEDULER" })).toMatchObject({
      feature: "SCHEDULER",
    });
  });

  it("falls back to the reason when the log carries no details", async () => {
    expect(await rowFor({ details: null, reason: "Token expired" })).toMatchObject({
      object: "Token expired",
    });
  });

  it("dashes every column a bare log cannot fill", async () => {
    expect(
      await rowFor({
        accessedBy: null,
        feature: null,
        module: null,
        action: null,
        details: null,
        reason: null,
        ipAddress: null,
        userAgent: null,
        outcome: null,
      })
    ).toMatchObject({
      accessedBy: "—",
      feature: "—",
      action: "—",
      object: "—",
      ipAddress: "—",
      userAgent: "—",
      outcome: "—",
    });
  });
});
