import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The Login Logs report: it walks every page of the activity log endpoint on
 * mount and flattens each entry into a table row.
 *
 * The interesting part is the row transform. A log's `details` arrives either as
 * an object, as a JSON string, or not at all, and each displayed column then
 * falls back through several sources before landing on an em dash -- so the
 * fixtures below strip one source at a time rather than varying everything at
 * once. The shared table is a probe that serialises the rows it was handed,
 * which reads a row back exactly as the transform built it.
 *
 * Paging is sequential and driven by `meta.totalPages` from the first response,
 * so the multi-page test hands back a different body per call.
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
    return (
      <div data-testid="table" data-loading={String(received.loading)}>
        {received.data.map((row) => (
          <div key={row.id} data-testid={`row-${row.id}`}>
            {JSON.stringify(row)}
          </div>
        ))}
      </div>
    );
  },
}));

import LoginLogsReport from "../Pages/Reports/ReportSubs/LoginLogsReport";

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
      <LoginLogsReport />
    </Provider>
  );

const log = (over = {}) => ({
  logId: "log-1",
  createdAt: "2026-05-06T14:05:00",
  accessedBy: "ada@example.com",
  ipAddress: "10.0.0.1",
  userAgent: "Firefox",
  outcome: "SUCCESS",
  action: "LOGIN",
  ...over,
});

const page = (logs, meta) => ({ data: logs, meta });

const settled = () =>
  waitFor(() => expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false"));

const row = (id = "log-1") => JSON.parse(screen.getByTestId(`row-${id}`).textContent);

// Render one log and read back the row the transform produced for it.
const rowFor = async (over) => {
  reportsApi.getActivityLogs.mockResolvedValue(page([log(over)]));
  renderReport();
  await settled();
  return row();
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
  it("asks for the first page of login logs on mount", async () => {
    renderReport();
    await settled();
    expect(reportsApi.getActivityLogs).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      page: 1,
      limit: 100,
      featureNames: "login",
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
    expect(reportsApi.getActivityLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 3 })
    );
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
    expect(showApiError).toHaveBeenCalledWith(boom, "LOAD_LOGIN_LOGS");
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
      ipAddress: "10.0.0.1",
      userAgent: "Firefox",
      outcome: "SUCCESS",
    });
  });

  it("prefers the details object over the log's own columns", async () => {
    expect(
      await rowFor({
        details: {
          email: "ignored@example.com",
          ipAddress: "192.168.1.5",
          userAgent: "Chrome",
          outcome: "FAILURE",
        },
      })
    ).toMatchObject({
      // `accessedBy` still wins over the details email when the API named it.
      accessedBy: "ada@example.com",
      ipAddress: "192.168.1.5",
      userAgent: "Chrome",
      outcome: "FAILURE",
    });
  });

  it("parses a details payload that arrived as a JSON string", async () => {
    expect(
      await rowFor({
        accessedBy: null,
        details: JSON.stringify({ email: "grace@example.com", ip: "172.16.0.9" }),
      })
    ).toMatchObject({ accessedBy: "grace@example.com", ipAddress: "172.16.0.9" });
  });

  it("ignores a details string that is not JSON at all", async () => {
    expect(await rowFor({ details: "not json" })).toMatchObject({
      accessedBy: "ada@example.com",
      ipAddress: "10.0.0.1",
    });
  });

  it("ignores a details field that is neither object nor string", async () => {
    expect(await rowFor({ details: 0 })).toMatchObject({ ipAddress: "10.0.0.1" });
  });

  it("names the admin the log was raised for when the API named no actor", async () => {
    expect(
      await rowFor({ accessedBy: "", admin: { firstName: "Grace", lastName: "Hopper" } })
    ).toMatchObject({ accessedBy: "Grace Hopper" });
  });

  it("falls past a nameless admin to the email in the details", async () => {
    expect(
      await rowFor({
        accessedBy: null,
        admin: { firstName: "", lastName: "" },
        details: { email: "fallback@example.com" },
      })
    ).toMatchObject({ accessedBy: "fallback@example.com" });
  });

  it("dashes every column a bare log cannot fill", async () => {
    expect(
      await rowFor({
        accessedBy: null,
        ipAddress: null,
        userAgent: null,
        outcome: null,
        action: null,
        details: null,
      })
    ).toMatchObject({
      accessedBy: "—",
      ipAddress: "—",
      userAgent: "—",
      outcome: "—",
    });
  });

  it("falls back to the log's action when no outcome was recorded", async () => {
    expect(await rowFor({ outcome: null })).toMatchObject({ outcome: "LOGIN" });
  });
});
