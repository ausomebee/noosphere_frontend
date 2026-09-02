import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../ReduxStore/features/authentication";

/**
 * The scheduler's Cancelled Appointments tab. It picks one of two endpoints
 * from the signed-in user's role name, flattens each record into a table row,
 * and hangs a read-only "cancellation details" panel off the row action.
 *
 * Almost every branch here is a fallback: the API sends appointments with any
 * combination of client, clinicians, services, session and cancellation
 * metadata missing, and each gap has its own default. The fixtures are
 * therefore paired -- one record that carries everything, one that carries
 * nothing -- and the row transform is read off the props the mocked table
 * receives rather than off rendered markup.
 *
 * The unsupported-role warning is guarded by import.meta.env.DEV, which Vitest
 * leaves true, so the quiet arm needs the env stubbed.
 */

const api = vi.hoisted(() => ({
  GetCancelledAppointmentByTenantId: vi.fn(),
  GetCancelledAppointmentByStaffId: vi.fn(),
}));

const probes = vi.hoisted(() => ({}));

vi.mock("../api/AppointmentApi", () => ({ default: api }));

vi.mock("../hooks/useFormatSettings", () => ({
  default: () => ({ dateFormat: "YYYY-MM-DD", timeFormat: "24-hour" }),
}));

vi.mock("../Components/Table/CustomTable", () => ({
  default: (props) => {
    probes.table = props;
    return <div data-testid="custom-table">{props.data.length}</div>;
  },
}));

import CancelledAppointments from "../Pages/Scheduler/SchdedulerSubs/AppointmentSubs/CancelledAppointments";

const listPayload = (rows) => ({ data: { data: rows } });

const richAppt = {
  id: "a1",
  clientId: "c1",
  client: { firstName: "Ada", lastName: "Lovelace" },
  clinicians: [{ fullName: "Grace Hopper" }, { fullName: "Alan Turing" }],
  appointmentServices: [
    { serviceCode: { code: "97153" }, modifiers: { modifier: "HN" } },
  ],
  session: { name: "Direct Therapy" },
  serviceLocation: "Home",
  colourCode: "#123456",
  date: "2030-04-15",
  startTime: "09:00",
  endTime: "10:00",
  canceledBy: "Grace Hopper",
  cancelTime: "2030-04-10T08:30:00Z",
  reasonForCancel: "Client unwell",
};

// No client, clinicians, services, session, colour or cancellation metadata:
// every default in the transform fires on this one.
const bareAppt = { id: "a2", date: "2030-04-16" };

const makeStore = (user) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "t",
        refreshToken: "rt",
        user: {
          id: "user-1",
          tenantId: "tenant-1",
          accessToken: "access-1",
          refreshToken: "refresh-1",
          role: { name: "Admin" },
          ...user,
        },
      },
    },
  });

const renderTab = async ({ user, state = null } = {}) => {
  const view = render(
    <Provider store={makeStore(user)}>
      <MemoryRouter initialEntries={[{ pathname: "/scheduler", state }]}>
        <CancelledAppointments />
      </MemoryRouter>
    </Provider>
  );
  await waitFor(() => expect(probes.table.loading).toBe(false));
  return view;
};

const rows = () => probes.table.data;

let warnSpy;
let errorSpy;

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(probes).forEach((k) => delete probes[k]);
  api.GetCancelledAppointmentByTenantId.mockResolvedValue(listPayload([]));
  api.GetCancelledAppointmentByStaffId.mockResolvedValue(listPayload([]));
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
  errorSpy.mockRestore();
  vi.unstubAllEnvs();
});

describe("choosing an endpoint", () => {
  it("asks for the whole tenant's cancellations for an admin", async () => {
    await renderTab();
    expect(api.GetCancelledAppointmentByTenantId).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
  });

  it("asks for the whole tenant's cancellations for an owner too", async () => {
    await renderTab({ user: { role: { name: "Owner" } } });
    expect(api.GetCancelledAppointmentByTenantId).toHaveBeenCalled();
  });

  it("asks only for a therapist's own cancellations", async () => {
    await renderTab({ user: { role: { name: "Therapist" } } });
    expect(api.GetCancelledAppointmentByStaffId).toHaveBeenCalledWith({
      staffId: "user-1",
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
  });

  it("does the same for a clinician", async () => {
    await renderTab({ user: { role: { name: "Clinician" } } });
    expect(api.GetCancelledAppointmentByStaffId).toHaveBeenCalled();
  });

  it("fetches nothing for a role it does not serve, and says so in dev", async () => {
    await renderTab({ user: { role: { name: "Biller" } } });
    expect(api.GetCancelledAppointmentByTenantId).not.toHaveBeenCalled();
    expect(api.GetCancelledAppointmentByStaffId).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "Role Biller not supported for fetching appointments"
    );
    expect(rows()).toEqual([]);
  });

  it("keeps that warning out of a production build", async () => {
    vi.stubEnv("DEV", false);
    // A session with no role at all is treated as a client, which is also
    // unserved -- so this covers the role fallback as well.
    await renderTab({ user: { role: undefined } });
    expect(warnSpy).not.toHaveBeenCalled();
    expect(rows()).toEqual([]);
  });

  it("fetches nothing at all without a tenant or a user", async () => {
    await renderTab({ user: { id: undefined, tenantId: undefined } });
    expect(api.GetCancelledAppointmentByTenantId).not.toHaveBeenCalled();
    expect(rows()).toEqual([]);
  });
});

describe("reading the payload", () => {
  it("keeps an empty table when the response carries no rows", async () => {
    api.GetCancelledAppointmentByTenantId.mockResolvedValue({ data: {} });
    await renderTab();
    expect(rows()).toEqual([]);
  });

  it("complains and empties the table when the rows are not a list", async () => {
    api.GetCancelledAppointmentByTenantId.mockResolvedValue({
      data: { data: { oops: true } },
    });
    await renderTab();
    expect(errorSpy).toHaveBeenCalledWith(
      "API response data is not an array:",
      { oops: true }
    );
    expect(rows()).toEqual([]);
  });

  it("swallows a failing fetch and logs it", async () => {
    api.GetCancelledAppointmentByTenantId.mockRejectedValue(new Error("down"));
    await renderTab();
    expect(errorSpy).toHaveBeenCalledWith(
      "Error fetching cancelled appointments:",
      expect.any(Error)
    );
    expect(rows()).toEqual([]);
  });
});

describe("table rows", () => {
  it("reads the client, clinicians, services and session off a full record", async () => {
    api.GetCancelledAppointmentByTenantId.mockResolvedValue(
      listPayload([richAppt])
    );
    await renderTab();

    expect(rows()[0]).toMatchObject({
      id: "a1",
      clientId: "c1",
      clientName: "Ada Lovelace",
      therapistName: "Grace Hopper, Alan Turing",
      serviceType: "97153 (HN)",
      sessionType: "Direct Therapy",
      time: "09:00 - 10:00",
      hasActions: true,
      therapistNames: ["Grace Hopper", "Alan Turing"],
      serviceTypes: ["97153 (HN)"],
    });
  });

  it("fills in every gap on a record that carries nothing", async () => {
    api.GetCancelledAppointmentByTenantId.mockResolvedValue(
      listPayload([bareAppt])
    );
    await renderTab();

    expect(rows()[0]).toMatchObject({
      clientName: "N/A",
      therapistName: "N/A",
      serviceType: "N/A",
      // toTableRow supplies the session when the record names none.
      sessionType: "Unknown Session",
      time: "N/A - N/A",
      therapistNames: [],
      serviceTypes: [],
      cancellation: {
        cancelledBy: "N/A",
        dateOfCancellation: "N/A",
        timeOfCancellation: "N/A",
        reason: "No reason provided",
      },
    });
  });

  it("falls back to the service location when the session has no name", async () => {
    api.GetCancelledAppointmentByTenantId.mockResolvedValue(
      listPayload([{ ...richAppt, session: {} }])
    );
    await renderTab();
    expect(rows()[0].sessionType).toBe("Home");
  });

  it("says N/A when there is neither a session name nor a location", async () => {
    api.GetCancelledAppointmentByTenantId.mockResolvedValue(
      listPayload([{ ...richAppt, session: {}, serviceLocation: undefined }])
    );
    await renderTab();
    expect(rows()[0].sessionType).toBe("N/A");
  });

  it("records who cancelled, when, and why", async () => {
    api.GetCancelledAppointmentByTenantId.mockResolvedValue(
      listPayload([richAppt])
    );
    await renderTab();

    const { cancellation } = rows()[0];
    expect(cancellation.cancelledBy).toBe("Grace Hopper");
    expect(cancellation.reason).toBe("Client unwell");
    expect(cancellation.dateOfCancellation).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(cancellation.timeOfCancellation).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe("filters", () => {
  beforeEach(() => {
    api.GetCancelledAppointmentByTenantId.mockResolvedValue(
      listPayload([richAppt, bareAppt])
    );
  });

  it("offers the distinct clinicians, sessions, services and dates", async () => {
    await renderTab();
    const [clinician, session, service, date] = probes.table.filters;

    expect(clinician.filterValues.map((v) => v.value)).toEqual([
      "Grace Hopper",
      "Alan Turing",
    ]);
    expect(session.filterValues.map((v) => v.value)).toEqual([
      "Direct Therapy",
      "Unknown Session",
    ]);
    expect(service.filterValues).toEqual([
      { value: "97153 (HN)", label: "97153 (HN)" },
    ]);
    expect(date.filterValues).toHaveLength(2);
  });

  it("keeps every row while a filter is left unset", async () => {
    await renderTab();
    const row = rows()[0];
    probes.table.filters.forEach((f) => {
      expect(f.filterFunction(row, "")).toBe(true);
    });
  });

  it("matches a row on each of the four filters", async () => {
    await renderTab();
    const [clinician, session, service, date] = probes.table.filters;
    const row = rows().find((r) => r.id === "a1");

    expect(clinician.filterFunction(row, "Grace Hopper")).toBe(true);
    expect(clinician.filterFunction(row, "Katherine Johnson")).toBe(false);
    expect(session.filterFunction(row, "Direct Therapy")).toBe(true);
    expect(session.filterFunction(row, "Assessment")).toBe(false);
    expect(service.filterFunction(row, "97153 (HN)")).toBe(true);
    expect(service.filterFunction(row, "97155")).toBe(false);
    expect(date.filterFunction(row, row.date)).toBe(true);
    expect(date.filterFunction(row, "1999-01-01")).toBe(false);
  });
});

describe("the cancellation details panel", () => {
  beforeEach(() => {
    api.GetCancelledAppointmentByTenantId.mockResolvedValue(
      listPayload([richAppt])
    );
  });

  it("stays shut until a row asks for it", async () => {
    await renderTab();
    expect(screen.queryByText("Cancellation details")).not.toBeInTheDocument();
  });

  it("shows the details of the row that was clicked", async () => {
    await renderTab();
    act(() => probes.table.onActionClick(rows()[0]));

    expect(screen.getByText("Cancellation details")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("Client unwell")).toBeInTheDocument();
  });

  it("falls back to N/A for a row carrying no cancellation at all", async () => {
    await renderTab();
    act(() => probes.table.onActionClick({ id: "ghost" }));

    expect(screen.getAllByText("N/A")).toHaveLength(3);
    expect(screen.getByText("No reason provided")).toBeInTheDocument();
  });

  it("closes again", async () => {
    await renderTab();
    act(() => probes.table.onActionClick(rows()[0]));
    fireEvent.click(screen.getByText("×"));

    expect(screen.queryByText("Cancellation details")).not.toBeInTheDocument();
  });
});

describe("arriving from a notification", () => {
  it("opens the details of the appointment the notification named", async () => {
    api.GetCancelledAppointmentByTenantId.mockResolvedValue(
      listPayload([richAppt])
    );
    await renderTab({ state: { focusId: "a1" } });

    await waitFor(() =>
      expect(screen.getByText("Cancellation details")).toBeInTheDocument()
    );
    expect(screen.getByText("Client unwell")).toBeInTheDocument();
  });

  it("opens nothing when the notification names a row that is not here", async () => {
    api.GetCancelledAppointmentByTenantId.mockResolvedValue(
      listPayload([richAppt])
    );
    await renderTab({ state: { focusId: "somewhere-else" } });

    expect(screen.queryByText("Cancellation details")).not.toBeInTheDocument();
  });
});
