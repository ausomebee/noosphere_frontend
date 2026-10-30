import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The Timesheets list: one fetch that sorts newest-first, a row transform, and
 * a two-item permission-gated dropdown.
 *
 * The endpoint is inconsistent about wrapping -- it sometimes answers with the
 * array itself and sometimes with `{ data: [...] }` -- and the hours column runs
 * through a formatter that trims a trailing ".00" but has its own zero guard, so
 * the fixtures below vary one field at a time. The table is a probe that records
 * its props and renders a button per dropdown item per row.
 *
 * The date column runs through the tenant's configured format, so the store is
 * preloaded with settings already marked loaded.
 */

const api = vi.hoisted(() => ({ GetTimeSheetByTenantId: vi.fn() }));
vi.mock("../api/billingAndPaymentsApi", () => ({ default: api }));

const settingsApi = vi.hoisted(() => ({ GetGeneralSettingsByTenantId: vi.fn() }));
vi.mock("../api/generalSettingsApi", () => ({ default: settingsApi }));

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

const table = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/Table/CustomTable", () => ({
  default: (received) => {
    table.props = received;
    const items = received.actions[0].items;
    return (
      <div data-testid="table" data-loading={String(received.loading)}>
        {received.data.map((row) => (
          <div key={row.id} data-testid={`row-${row.id}`}>
            {items.map((item, i) => (
              <button key={i} onClick={() => item.onClick(row)}>
                {`${item.label} ${row.id}`}
              </button>
            ))}
          </div>
        ))}
      </div>
    );
  },
}));

import TimeSheet from "../Pages/BillingAndPayment/TimeSheet/TimeSheet";

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
      <TimeSheet />
    </Provider>
  );

const session = (over = {}) => ({
  id: "ts-1",
  date: "2026-02-14T08:30:00.000Z",
  clinician: "Grace Hopper",
  clientName: "Ada Lovelace",
  totalHours: 2.5,
  sessionTypeName: "Direct Therapy",
  clientApprovalStatus: "APPROVED",
  supervisorApprovalStatus: "APPROVED",
  ...over,
});

const listed = () =>
  waitFor(() => expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false"));

const rowFor = async (over, options) => {
  api.GetTimeSheetByTenantId.mockResolvedValue({ data: [session(over)] });
  renderPage(options);
  await listed();
  return table.props.data[0];
};

beforeEach(() => {
  vi.clearAllMocks();
  table.props = null;
  api.GetTimeSheetByTenantId.mockResolvedValue({ data: [session()] });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("access", () => {
  it("refuses a role that cannot view the timesheet list", async () => {
    renderPage({ permissions: ["view_timesheet_details"] });
    expect(screen.queryByTestId("table")).not.toBeInTheDocument();
    // The guard sits below the effect, so the fetch still runs underneath it.
    await waitFor(() => expect(api.GetTimeSheetByTenantId).toHaveBeenCalled());
  });

  it("leaves a read-only role with no row actions at all", async () => {
    renderPage({ permissions: ["view_timesheets_list"] });
    await listed();
    expect(table.props.actions[0].items).toEqual([]);
  });

  it("offers only the row action the role is granted", async () => {
    renderPage({ permissions: ["view_timesheets_list", "nudge_client_for_approval"] });
    await listed();
    expect(table.props.actions[0].items.map((i) => i.label)).toEqual([
      "Nudge client for approval",
    ]);
  });

  it("gives an org owner both row actions", async () => {
    renderPage();
    await listed();
    expect(table.props.actions[0].items.map((i) => i.label)).toEqual([
      "View",
      "Nudge client for approval",
    ]);
  });
});

describe("loading the timesheets", () => {
  it("asks for the tenant's timesheets and maps each into a row", async () => {
    renderPage();
    await listed();
    expect(api.GetTimeSheetByTenantId).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(table.props.data[0]).toMatchObject({
      id: "ts-1",
      dateTime: "02/14/2026",
      therapist: "Grace Hopper",
      clientName: "Ada Lovelace",
      hours: "2.50",
      sessionType: "Direct Therapy",
      clientStatusText: "APPROVED",
      internalStatusText: "APPROVED",
      hasActions: true,
    });
  });

  it("accepts a bare array in place of a wrapped response", async () => {
    api.GetTimeSheetByTenantId.mockResolvedValue([session()]);
    renderPage();
    await listed();
    expect(table.props.data).toHaveLength(1);
  });

  it("puts the newest session first", async () => {
    api.GetTimeSheetByTenantId.mockResolvedValue({
      data: [
        session({ id: "ts-old", date: "2026-01-01T00:00:00.000Z" }),
        session({ id: "ts-new", date: "2026-03-01T00:00:00.000Z" }),
        session({ id: "ts-mid", date: "2026-02-01T00:00:00.000Z" }),
      ],
    });
    renderPage();
    await listed();
    expect(table.props.data.map((r) => r.id)).toEqual(["ts-new", "ts-mid", "ts-old"]);
  });

  it("shows an empty table when the response carries no sessions", async () => {
    api.GetTimeSheetByTenantId.mockResolvedValue({});
    renderPage();
    await listed();
    expect(table.props.data).toEqual([]);
  });

  it("leaves the table empty when the fetch fails", async () => {
    api.GetTimeSheetByTenantId.mockRejectedValue(new Error("500"));
    renderPage();
    await listed();
    expect(table.props.data).toEqual([]);
  });

  it("survives a failure that carries no message", async () => {
    api.GetTimeSheetByTenantId.mockRejectedValue(new Error(""));
    renderPage();
    await listed();
    expect(table.props.data).toEqual([]);
  });

  it("stops without fetching when there is no tenant", async () => {
    renderPage({ user: { tenantId: undefined } });
    await listed();
    expect(api.GetTimeSheetByTenantId).not.toHaveBeenCalled();
  });

  it("stops without fetching when there is no access token", async () => {
    renderPage({ user: { accessToken: undefined } });
    await listed();
    expect(api.GetTimeSheetByTenantId).not.toHaveBeenCalled();
  });

  it("stops without fetching when there is no refresh token", async () => {
    renderPage({ user: { refreshToken: undefined } });
    await listed();
    expect(api.GetTimeSheetByTenantId).not.toHaveBeenCalled();
  });
});

describe("the row transform", () => {
  it("trims a whole number of hours down to the integer", async () => {
    expect(await rowFor({ totalHours: 3 })).toMatchObject({ hours: "3" });
  });

  it("keeps the fractional part of a partial hour", async () => {
    expect(await rowFor({ totalHours: 1.256 })).toMatchObject({ hours: "1.26" });
  });

  it("reads a zero-hour session as a plain zero", async () => {
    expect(await rowFor({ totalHours: 0 })).toMatchObject({ hours: "0" });
  });

  it("reads a session with no recorded hours as a plain zero", async () => {
    expect(await rowFor({ totalHours: null })).toMatchObject({ hours: "0" });
  });

  it("treats a session neither side has acted on as pending", async () => {
    expect(
      await rowFor({ clientApprovalStatus: null, supervisorApprovalStatus: "" })
    ).toMatchObject({ clientStatusText: "PENDING", internalStatusText: "PENDING" });
  });

  it("renders the date in the tenant's configured format", async () => {
    expect(await rowFor({}, { dateFormat: "DD/MM/YYYY" })).toMatchObject({
      dateTime: "14/02/2026",
    });
  });

  it("keeps the original session on the row", async () => {
    expect((await rowFor({})).rawData).toMatchObject({ clinician: "Grace Hopper" });
  });
});

describe("row actions", () => {
  it("opens a timesheet's own page", async () => {
    renderPage();
    await listed();
    fireEvent.click(screen.getByRole("button", { name: "View ts-1" }));
    expect(navigate).toHaveBeenCalledWith("/billing/timesheets/ts-1");
  });

  it("confirms a nudge naming the client", async () => {
    renderPage();
    await listed();
    fireEvent.click(screen.getByRole("button", { name: "Nudge client for approval ts-1" }));
    expect(toast.showToast).toHaveBeenCalledWith(
      "Nudge sent for session with Ada Lovelace",
      "success"
    );
  });
});

describe("the filter definitions", () => {
  it("offers a filter for every column the table can group by", async () => {
    renderPage();
    await listed();
    expect(table.props.filters.map((f) => f.value)).toEqual([
      "dateTime",
      "therapist",
      "clientName",
      "sessionType",
      "clientStatusText",
      "internalStatusText",
    ]);
  });
});
