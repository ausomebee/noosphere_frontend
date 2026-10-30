import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The Rescheduled Appointments report: one fetch whose endpoint depends on
 * whether the signed-in user is Staff, a transform that flattens each request
 * into a row carrying both the old and the new slot, and four filters.
 *
 * There is no modal and no row action here, so the whole subject is the
 * transform and the filter predicates. The shared table is a probe that
 * records the props it was handed, which is how each row is read back exactly
 * as the report built it and how both arms of every `filterFunction` are
 * exercised without driving a react-select.
 *
 * Times are rendered through the tenant's format setting, so the store is
 * preloaded with it rather than letting the settings hook fetch.
 */

const api = vi.hoisted(() => ({
  GetRescheduleAppointmentReqByTenantId: vi.fn(),
  GetRescheduleAppointmentReqByStaffId: vi.fn(),
}));
vi.mock("../api/AppointmentApi", () => ({ default: api }));

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

vi.mock("../api/generalSettingsApi", () => ({
  default: { GetGeneralSettingsByTenantId: vi.fn().mockResolvedValue({ data: null }) },
}));

import RescheduledAppointmentsReport from "../Pages/Reports/ReportSubs/RescheduledAppointmentsReport";

const makeStore = (user) =>
  configureStore({
    reducer: { authentication: authReducer, generalSettings: generalSettingsReducer },
    preloadedState: {
      authentication: { isAuthenticated: true, loading: false, error: null, token: "at", user },
      generalSettings: {
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12-hour",
        currency: "USD",
        loaded: true,
      },
    },
  });

const admin = {
  id: "staff-1",
  tenantId: "tenant-1",
  accessToken: "at",
  refreshToken: "rt",
  role: { name: "Admin", roleModuleAccesses: [] },
};

const renderReport = (user = admin) =>
  render(
    <Provider store={makeStore(user)}>
      <RescheduledAppointmentsReport />
    </Provider>
  );

const request = (over = {}) => ({
  id: "rq-1",
  client: { firstName: "Ada", lastName: "Lovelace" },
  clinicians: [{ fullName: "Grace Hopper" }],
  appointmentServices: [{ serviceCode: { code: "97153" } }],
  session: { name: "Direct Therapy" },
  previousDate: "2026-03-01",
  previousStartTime: "09:00",
  previousEndTime: "10:00",
  date: "2026-03-08",
  startTime: "13:00",
  endTime: "14:30",
  ...over,
});

const rows = () => table.props.data;

const load = async (data, user = admin) => {
  api.GetRescheduleAppointmentReqByTenantId.mockResolvedValue({ data: { data } });
  api.GetRescheduleAppointmentReqByStaffId.mockResolvedValue({ data: { data } });
  const view = renderReport(user);
  await waitFor(() => expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false"));
  return view;
};

beforeEach(() => {
  vi.clearAllMocks();
  table.props = null;
  api.GetRescheduleAppointmentReqByTenantId.mockResolvedValue({ data: { data: [] } });
  api.GetRescheduleAppointmentReqByStaffId.mockResolvedValue({ data: { data: [] } });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("choosing an endpoint", () => {
  it("asks only for the signed-in clinician's requests when the role is Staff", async () => {
    await load([], { ...admin, role: { name: "Staff" } });
    expect(api.GetRescheduleAppointmentReqByStaffId).toHaveBeenCalledWith({
      staffId: "staff-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(api.GetRescheduleAppointmentReqByTenantId).not.toHaveBeenCalled();
  });

  it("asks for the whole tenant's requests for any other role", async () => {
    await load([]);
    expect(api.GetRescheduleAppointmentReqByTenantId).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(api.GetRescheduleAppointmentReqByStaffId).not.toHaveBeenCalled();
  });

  it("treats a user with no role at all as tenant-wide", async () => {
    await load([], { ...admin, role: undefined });
    expect(api.GetRescheduleAppointmentReqByTenantId).toHaveBeenCalled();
  });

  it("stops loading without fetching when there is neither a tenant nor a user id", async () => {
    renderReport({ role: { name: "Admin" } });
    await waitFor(() =>
      expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false")
    );
    expect(api.GetRescheduleAppointmentReqByTenantId).not.toHaveBeenCalled();
    expect(api.GetRescheduleAppointmentReqByStaffId).not.toHaveBeenCalled();
  });

  it("empties the table when the fetch rejects", async () => {
    api.GetRescheduleAppointmentReqByTenantId.mockRejectedValue(new Error("500"));
    renderReport();
    await waitFor(() =>
      expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false")
    );
    expect(rows()).toEqual([]);
  });

  it("treats a response with no data envelope as an empty list", async () => {
    api.GetRescheduleAppointmentReqByTenantId.mockResolvedValue({});
    renderReport();
    await waitFor(() =>
      expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false")
    );
    expect(rows()).toEqual([]);
  });

  it("holds the table in its loading state until the request lands", async () => {
    let release;
    api.GetRescheduleAppointmentReqByTenantId.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    renderReport();
    expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "true");
    release({ data: { data: [] } });
    await waitFor(() =>
      expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false")
    );
  });
});

describe("the row transform", () => {
  it("flattens a fully populated request into its old and new slots", async () => {
    await load([request()]);
    expect(rows()[0]).toEqual({
      id: "rq-1",
      clientName: "Ada Lovelace",
      therapistName: "Grace Hopper",
      serviceType: "97153",
      sessionType: "Direct Therapy",
      prevDateTime: { date: "2026-03-01", time: "09:00 AM - 10:00 AM" },
      newDateTime: { date: "2026-03-08", time: "01:00 PM - 02:30 PM" },
      date: "2026-03-08",
      hasActions: false,
      hasCheckbox: false,
      therapistNames: ["Grace Hopper"],
      serviceTypes: ["97153"],
    });
  });

  it("joins several clinicians and service codes with commas", async () => {
    await load([
      request({
        clinicians: [{ fullName: "Grace Hopper" }, { fullName: "Alan Turing" }],
        appointmentServices: [
          { serviceCode: { code: "97153" } },
          { serviceCode: { code: "97155" } },
        ],
      }),
    ]);
    expect(rows()[0].therapistName).toBe("Grace Hopper, Alan Turing");
    expect(rows()[0].serviceType).toBe("97153, 97155");
  });

  it("calls a service line with no code Unknown", async () => {
    await load([request({ appointmentServices: [{}] })]);
    expect(rows()[0].serviceType).toBe("Unknown");
    expect(rows()[0].serviceTypes).toEqual(["Unknown"]);
  });

  it("falls back to N/A for every list and name the request omits", async () => {
    await load([
      request({
        client: null,
        clinicians: undefined,
        appointmentServices: undefined,
        session: undefined,
        previousDate: undefined,
        date: undefined,
      }),
    ]);
    expect(rows()[0]).toMatchObject({
      clientName: "N/A",
      therapistName: "N/A",
      serviceType: "N/A",
      sessionType: "N/A",
      prevDateTime: expect.objectContaining({ date: "N/A" }),
      newDateTime: expect.objectContaining({ date: "N/A" }),
    });
  });

  it("names a client from whichever half exists", async () => {
    await load([
      request({ id: "a", client: { firstName: "Ada" } }),
      request({ id: "b", client: { lastName: "Lovelace" } }),
      request({ id: "c", client: {} }),
    ]);
    expect(rows().map((r) => r.clientName)).toEqual(["Ada", "Lovelace", "N/A"]);
  });

  it("says N/A for a previous slot that is only half recorded", async () => {
    await load([
      request({ id: "a", previousEndTime: null }),
      request({ id: "b", previousStartTime: null }),
    ]);
    expect(rows().map((r) => r.prevDateTime.time)).toEqual(["N/A", "N/A"]);
  });

  it("still renders a new slot with no times, one half at a time", async () => {
    await load([request({ startTime: null, endTime: null })]);
    expect(rows()[0].newDateTime.time).toBe("N/A - N/A");
  });
});

describe("the filter definitions", () => {
  const byValue = (value) => table.props.filters.find((f) => f.value === value);

  beforeEach(async () => {
    await load([
      request({
        id: "a",
        clinicians: [{ fullName: "Grace Hopper" }, { fullName: "Alan Turing" }],
      }),
      request({
        id: "b",
        clinicians: [{ fullName: "Grace Hopper" }],
        session: { name: "Assessment" },
        appointmentServices: [{ serviceCode: { code: "97151" } }],
        date: "2026-04-01",
      }),
    ]);
  });

  it("offers each distinct therapist once", () => {
    expect(byValue("therapistNames").filterValues.map((o) => o.value)).toEqual([
      "Grace Hopper",
      "Alan Turing",
    ]);
  });

  it("offers each distinct session type, service type and date", () => {
    expect(byValue("sessionType").filterValues.map((o) => o.value)).toEqual([
      "Direct Therapy",
      "Assessment",
    ]);
    expect(byValue("serviceTypes").filterValues.map((o) => o.value)).toEqual(["97153", "97151"]);
    expect(byValue("date").filterValues.map((o) => o.value)).toEqual(["2026-03-08", "2026-04-01"]);
  });

  it("keeps only the rows matching the chosen therapist, session, service or date", () => {
    expect(rows().filter((r) => byValue("therapistNames").filterFunction(r, "Alan Turing")).map((r) => r.id)).toEqual(["a"]);
    expect(rows().filter((r) => byValue("sessionType").filterFunction(r, "Assessment")).map((r) => r.id)).toEqual(["b"]);
    expect(rows().filter((r) => byValue("serviceTypes").filterFunction(r, "97151")).map((r) => r.id)).toEqual(["b"]);
    expect(rows().filter((r) => byValue("date").filterFunction(r, "2026-04-01")).map((r) => r.id)).toEqual(["b"]);
  });

  it("keeps every row when a filter is cleared", () => {
    for (const f of table.props.filters) {
      expect(rows().every((r) => f.filterFunction(r, ""))).toBe(true);
    }
  });
});

describe("the page chrome", () => {
  it("returns to the reports index", async () => {
    await load([]);
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(navigate).toHaveBeenCalledWith("/reports");
  });

  it("names the report and its parent section", async () => {
    await load([]);
    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.getByText("Rescheduled Appointments")).toBeInTheDocument();
  });

  it("gives the table two day_time columns for the old and new slots", async () => {
    await load([]);
    expect(table.props.columns.filter((c) => c.type === "day_time").map((c) => c.key)).toEqual([
      "prevDateTime",
      "newDateTime",
    ]);
  });
});
