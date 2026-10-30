import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The Cancelled Appointments report: one fetch whose endpoint depends on the
 * signed-in role, a transform that flattens each appointment into a table row,
 * four filter definitions, and a hand-rolled "Cancellation details" overlay
 * opened from the table's "See more" action.
 *
 * Almost every branch lives in the transform's `||` chains, so the shared table
 * is a probe: it records the props it was handed, which lets each row be read
 * back exactly as the report built it and lets the four `filterFunction`
 * predicates be exercised on both arms without driving a react-select. The
 * probe also renders a button per row so the overlay can still be opened
 * through the DOM.
 *
 * The transform reads the tenant's date and time formats out of redux, so the
 * store is preloaded with them rather than letting the settings hook fetch.
 */

const api = vi.hoisted(() => ({
  GetCancelledAppointmentByTenantId: vi.fn(),
  GetCancelledAppointmentByStaffId: vi.fn(),
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
    return (
      <div data-testid="table" data-loading={String(received.loading)}>
        {received.data.map((row) => (
          <button key={row.id} onClick={() => received.onActionClick(row)}>
            {received.actionText} {row.id}
          </button>
        ))}
      </div>
    );
  },
}));

vi.mock("../api/generalSettingsApi", () => ({
  default: { GetGeneralSettingsByTenantId: vi.fn().mockResolvedValue({ data: null }) },
}));

import CancelledAppointmentsReport from "../Pages/Reports/ReportSubs/CancelledAppointmentsReport";

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
      <CancelledAppointmentsReport />
    </Provider>
  );

const appointment = (over = {}) => ({
  id: "ap-1",
  client: { firstName: "Ada", lastName: "Lovelace" },
  clinicians: [{ fullName: "Grace Hopper" }],
  appointmentServices: [{ serviceCode: { code: "97153" } }],
  session: { name: "Direct Therapy" },
  date: "2026-03-10T00:00:00.000Z",
  startTime: "09:00",
  endTime: "10:30",
  cancelTime: "2026-03-09T14:45:00.000Z",
  canceledBy: "Grace Hopper",
  reasonForCancel: "Client unwell",
  ...over,
});

const rows = () => table.props.data;

// Loading the report and waiting for the one fetch it makes to settle.
const load = async (data, user = admin) => {
  api.GetCancelledAppointmentByTenantId.mockResolvedValue({ data: { data } });
  api.GetCancelledAppointmentByStaffId.mockResolvedValue({ data: { data } });
  const view = renderReport(user);
  await waitFor(() => expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false"));
  return view;
};

beforeEach(() => {
  vi.clearAllMocks();
  table.props = null;
  api.GetCancelledAppointmentByTenantId.mockResolvedValue({ data: { data: [] } });
  api.GetCancelledAppointmentByStaffId.mockResolvedValue({ data: { data: [] } });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("choosing an endpoint", () => {
  it("asks for the whole tenant's cancellations for an Admin", async () => {
    await load([]);
    expect(api.GetCancelledAppointmentByTenantId).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(api.GetCancelledAppointmentByStaffId).not.toHaveBeenCalled();
  });

  it("asks for the whole tenant's cancellations for an Owner", async () => {
    await load([], { ...admin, role: { name: "Owner" } });
    expect(api.GetCancelledAppointmentByTenantId).toHaveBeenCalled();
  });

  it("asks only for the signed-in clinician's cancellations for any other role", async () => {
    await load([], { ...admin, role: { name: "Therapist" } });
    expect(api.GetCancelledAppointmentByStaffId).toHaveBeenCalledWith({
      staffId: "staff-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(api.GetCancelledAppointmentByTenantId).not.toHaveBeenCalled();
  });

  it("treats a user with no role at all as a clinician", async () => {
    await load([], { ...admin, role: undefined });
    expect(api.GetCancelledAppointmentByStaffId).toHaveBeenCalled();
  });

  it("stops loading without fetching when there is neither a tenant nor a user id", async () => {
    renderReport({ role: { name: "Admin" } });
    await waitFor(() =>
      expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false")
    );
    expect(api.GetCancelledAppointmentByTenantId).not.toHaveBeenCalled();
    expect(api.GetCancelledAppointmentByStaffId).not.toHaveBeenCalled();
  });

  it("empties the table when the fetch rejects", async () => {
    api.GetCancelledAppointmentByTenantId.mockRejectedValue(new Error("500"));
    renderReport();
    await waitFor(() =>
      expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false")
    );
    expect(rows()).toEqual([]);
  });

  it("treats a response with no data envelope as an empty list", async () => {
    api.GetCancelledAppointmentByTenantId.mockResolvedValue({});
    renderReport();
    await waitFor(() =>
      expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false")
    );
    expect(rows()).toEqual([]);
  });

  it("ignores a payload that is not a list", async () => {
    api.GetCancelledAppointmentByTenantId.mockResolvedValue({
      data: { data: { message: "no results" } },
    });
    renderReport();
    await waitFor(() =>
      expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false")
    );
    expect(rows()).toEqual([]);
  });
});

describe("the row transform", () => {
  it("flattens a fully populated appointment", async () => {
    await load([appointment()]);
    expect(rows()[0]).toMatchObject({
      id: "ap-1",
      clientName: "Ada Lovelace",
      therapistName: "Grace Hopper",
      serviceType: "97153",
      sessionType: "Direct Therapy",
      date: "03/10/2026",
      time: "09:00 AM - 10:30 AM",
      hasActions: true,
      therapistNames: ["Grace Hopper"],
      serviceTypes: ["97153"],
    });
  });

  it("joins several clinicians and service codes with commas", async () => {
    await load([
      appointment({
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
    await load([appointment({ appointmentServices: [{}] })]);
    expect(rows()[0].serviceType).toBe("Unknown");
    expect(rows()[0].serviceTypes).toEqual(["Unknown"]);
  });

  it("falls back to N/A for every list the appointment omits", async () => {
    await load([
      appointment({
        client: null,
        clinicians: undefined,
        appointmentServices: undefined,
        session: undefined,
        serviceLocation: undefined,
        date: undefined,
      }),
    ]);
    expect(rows()[0]).toMatchObject({
      clientName: "N/A",
      therapistName: "N/A",
      serviceType: "N/A",
      sessionType: "N/A",
      date: "N/A",
    });
  });

  it("uses the service location when the appointment has no named session", async () => {
    await load([appointment({ session: null, serviceLocation: "Telehealth" })]);
    expect(rows()[0].sessionType).toBe("Telehealth");
  });

  it("names a client from whichever half exists", async () => {
    await load([
      appointment({ id: "a", client: { firstName: "Ada" } }),
      appointment({ id: "b", client: { lastName: "Lovelace" } }),
      appointment({ id: "c", client: {} }),
    ]);
    expect(rows().map((r) => r.clientName)).toEqual(["Ada", "Lovelace", "N/A"]);
  });

  it("dashes out the time when the appointment has no start or end", async () => {
    await load([appointment({ startTime: null, endTime: null })]);
    expect(rows()[0].time).toBe("N/A - N/A");
  });

  it("splits the cancellation stamp into its date and its time", async () => {
    await load([appointment()]);
    expect(rows()[0].cancellation).toEqual({
      cancelledBy: "Grace Hopper",
      dateOfCancellation: "03/09/2026",
      // formatDateTime returns "date time period"; the report drops the date
      // half and keeps the rest.
      timeOfCancellation: expect.stringMatching(/^\d{2}:\d{2} (AM|PM)$/),
      reason: "Client unwell",
    });
  });

  it("fills in the cancellation details the appointment never recorded", async () => {
    await load([
      appointment({ cancelTime: null, canceledBy: undefined, reasonForCancel: undefined }),
    ]);
    expect(rows()[0].cancellation).toEqual({
      cancelledBy: "N/A",
      dateOfCancellation: "N/A",
      timeOfCancellation: "N/A",
      reason: "No reason provided",
    });
  });
});

describe("the filter definitions", () => {
  const byValue = (value) => table.props.filters.find((f) => f.value === value);

  beforeEach(async () => {
    await load([
      appointment({
        id: "a",
        clinicians: [{ fullName: "Grace Hopper" }, { fullName: "Alan Turing" }],
      }),
      appointment({
        id: "b",
        clinicians: [{ fullName: "Grace Hopper" }],
        session: { name: "Assessment" },
        appointmentServices: [{ serviceCode: { code: "97151" } }],
        date: "2026-04-01T00:00:00.000Z",
      }),
    ]);
  });

  it("offers each distinct therapist once", () => {
    expect(byValue("therapistNames").filterValues).toEqual([
      { value: "Grace Hopper", label: "Grace Hopper" },
      { value: "Alan Turing", label: "Alan Turing" },
    ]);
  });

  it("offers each distinct session type, service type and date", () => {
    expect(byValue("sessionType").filterValues.map((o) => o.value)).toEqual([
      "Direct Therapy",
      "Assessment",
    ]);
    expect(byValue("serviceTypes").filterValues.map((o) => o.value)).toEqual(["97153", "97151"]);
    expect(byValue("date").filterValues.map((o) => o.value)).toEqual(["03/10/2026", "04/01/2026"]);
  });

  it("keeps only the rows a chosen therapist worked on", () => {
    const { filterFunction } = byValue("therapistNames");
    expect(rows().filter((r) => filterFunction(r, "Alan Turing")).map((r) => r.id)).toEqual(["a"]);
  });

  it("keeps only the rows matching a chosen session type, service type or date", () => {
    expect(rows().filter((r) => byValue("sessionType").filterFunction(r, "Assessment")).map((r) => r.id)).toEqual(["b"]);
    expect(rows().filter((r) => byValue("serviceTypes").filterFunction(r, "97151")).map((r) => r.id)).toEqual(["b"]);
    expect(rows().filter((r) => byValue("date").filterFunction(r, "03/10/2026")).map((r) => r.id)).toEqual(["a"]);
  });

  it("keeps every row when a filter is cleared", () => {
    for (const f of table.props.filters) {
      expect(rows().every((r) => f.filterFunction(r, ""))).toBe(true);
    }
  });
});

describe("the cancellation details overlay", () => {
  it("stays shut until a row's action is used", async () => {
    await load([appointment()]);
    expect(screen.queryByText("Cancellation details")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "See more ap-1" }));
    expect(screen.getByText("Cancellation details")).toBeInTheDocument();
  });

  it("shows the chosen row's cancellation", async () => {
    await load([appointment()]);
    fireEvent.click(screen.getByRole("button", { name: "See more ap-1" }));
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("03/09/2026")).toBeInTheDocument();
    expect(screen.getByText("Client unwell")).toBeInTheDocument();
  });

  it("closes again on the cross", async () => {
    await load([appointment()]);
    fireEvent.click(screen.getByRole("button", { name: "See more ap-1" }));
    fireEvent.click(screen.getByRole("button", { name: "×" }));
    expect(screen.queryByText("Cancellation details")).not.toBeInTheDocument();
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
    expect(screen.getByText("Cancelled Appointments")).toBeInTheDocument();
  });

  it("gives the table its six columns", async () => {
    await load([]);
    expect(table.props.columns.map((c) => c.key)).toEqual([
      "clientName",
      "therapistName",
      "serviceType",
      "sessionType",
      "date",
      "time",
    ]);
  });
});
