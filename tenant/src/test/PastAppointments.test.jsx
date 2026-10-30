import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../ReduxStore/features/authentication";

/**
 * The scheduler's Past Appointments tab. It loads the master appointments for
 * the tenant (or just the signed-in staff member's), expands each recurring
 * master into the occurrences that already happened, and lists them
 * most-recent-first.
 *
 * The record passes through two transforms on its way to a row -- one that
 * fills in the gaps the API leaves, and a second that flattens the result for
 * the table -- so several of the second one's fallbacks can only be reached by
 * a record shaped to slip through the first, which is what the fixtures below
 * are for. Dates are relative to today because the expansion window is, and a
 * fixed date would fall out of it.
 *
 * The table and the details modal are probes, so the row transform and the
 * filter predicates are asserted against the props the page hands down.
 */

const api = vi.hoisted(() => ({
  GetPastAppointmentByTenantId: vi.fn(),
  GetPastAppointmentByStaffId: vi.fn(),
}));

const navigate = vi.hoisted(() => vi.fn());
const probes = vi.hoisted(() => ({}));

vi.mock("../api/AppointmentApi", () => ({ default: api }));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigate };
});

vi.mock("../Components/Table/CustomTable", () => ({
  default: (props) => {
    probes.table = props;
    return <div data-testid="custom-table">{props.data.length}</div>;
  },
}));

vi.mock(
  "../Components/ReusableModal/SchedulerModal/PastAppointmentDetailsModal",
  () => ({
    default: (props) => {
      probes.details = props;
      return props.isOpen ? <div data-testid="details-modal" /> : null;
    },
  })
);

import PastAppointments from "../Pages/Scheduler/SchdedulerSubs/AppointmentSubs/PastAppointments";

const iso = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};

const yesterday = iso(-1);
const lastWeek = iso(-7);

const listPayload = (rows) => ({ data: { data: rows } });

const richAppt = {
  id: "a1",
  client: { firstName: "Ada", lastName: "Lovelace" },
  clinicians: [{ fullName: "Grace Hopper" }],
  appointmentServices: [
    { serviceCode: { code: "97153" }, modifiers: { modifier: "HN" } },
  ],
  session: { name: "Direct Therapy" },
  colourCode: "#123456",
  date: yesterday,
  startTime: "09:00",
  endTime: "10:00",
};

// No client, clinicians, services or session: every default in the first
// transform fires, and the second falls back on top of those.
const bareAppt = {
  id: "a2",
  date: lastWeek,
  startTime: "11:00",
  endTime: "12:00",
};

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
        <PastAppointments />
      </MemoryRouter>
    </Provider>
  );
  await waitFor(() => expect(probes.table.loading).toBe(false));
  return view;
};

const rows = () => probes.table.data;

let errorSpy;

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(probes).forEach((k) => delete probes[k]);
  api.GetPastAppointmentByTenantId.mockResolvedValue(listPayload([]));
  api.GetPastAppointmentByStaffId.mockResolvedValue(listPayload([]));
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe("loading the list", () => {
  it("asks for the whole tenant's past appointments for an admin", async () => {
    await renderTab();
    expect(api.GetPastAppointmentByTenantId).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
    expect(api.GetPastAppointmentByStaffId).not.toHaveBeenCalled();
  });

  it("asks only for their own for anyone else", async () => {
    await renderTab({ user: { role: { name: "Therapist" } } });
    expect(api.GetPastAppointmentByStaffId).toHaveBeenCalledWith({
      staffId: "user-1",
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
  });

  it("treats a session with no role at all as a client", async () => {
    await renderTab({ user: { role: undefined } });
    expect(api.GetPastAppointmentByStaffId).toHaveBeenCalled();
  });

  it("keeps an empty table when the response carries no rows", async () => {
    api.GetPastAppointmentByTenantId.mockResolvedValue({ data: {} });
    await renderTab();
    expect(rows()).toEqual([]);
  });

  it("swallows a failing fetch and logs it", async () => {
    api.GetPastAppointmentByTenantId.mockRejectedValue(new Error("down"));
    await renderTab();
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to load past appointments:",
      expect.any(Error)
    );
    expect(rows()).toEqual([]);
  });
});

describe("table rows", () => {
  it("reads the client, clinician, service and session off a full record", async () => {
    api.GetPastAppointmentByTenantId.mockResolvedValue(
      listPayload([richAppt])
    );
    await renderTab();

    expect(rows()[0]).toMatchObject({
      id: "a1",
      clientName: "Ada Lovelace",
      therapistName: "Grace Hopper",
      serviceType: "97153 (HN)",
      sessionType: "Direct Therapy",
      dateTime: yesterday,
      time: "09:00 - 10:00",
      therapistNames: ["Grace Hopper"],
      serviceTypes: ["97153 (HN)"],
      hasActions: true,
    });
  });

  it("fills in every gap on a record that carries nothing", async () => {
    api.GetPastAppointmentByTenantId.mockResolvedValue(listPayload([bareAppt]));
    await renderTab();

    expect(rows()[0]).toMatchObject({
      clientName: "Unknown Client",
      therapistName: "Unassigned",
      serviceType: "N/A",
      sessionType: "Unknown Session",
      therapistNames: [],
      serviceTypes: [],
    });
  });

  it("says a service code is unknown, and drops an absent modifier", async () => {
    api.GetPastAppointmentByTenantId.mockResolvedValue(
      listPayload([{ ...richAppt, appointmentServices: [{}] }])
    );
    await renderTab();
    expect(rows()[0].serviceType).toBe("Unknown");
  });

  it("names a session Unknown when the record's own session has no name", async () => {
    api.GetPastAppointmentByTenantId.mockResolvedValue(
      listPayload([{ ...richAppt, session: {} }])
    );
    await renderTab();
    expect(rows()[0].sessionType).toBe("Unknown");
  });

  it("builds a name from whichever half the client record carries", async () => {
    api.GetPastAppointmentByTenantId.mockResolvedValue(
      listPayload([{ ...richAppt, client: { lastName: "Lovelace" } }])
    );
    await renderTab();
    expect(rows()[0].clientName).toBe("Lovelace");
  });

  it("puts the most recent appointment first", async () => {
    api.GetPastAppointmentByTenantId.mockResolvedValue(
      listPayload([bareAppt, richAppt])
    );
    await renderTab();
    expect(rows().map((r) => r.id)).toEqual(["a1", "a2"]);
  });

  it("expands a recurring master into one row per occurrence already past", async () => {
    api.GetPastAppointmentByTenantId.mockResolvedValue(
      listPayload([
        {
          ...richAppt,
          date: iso(-5),
          isRecurring: true,
          recurrence: { type: "day", endType: "after", occurrences: 3 },
        },
      ])
    );
    await renderTab();
    expect(rows()).toHaveLength(3);
  });
});

describe("filters", () => {
  beforeEach(() => {
    api.GetPastAppointmentByTenantId.mockResolvedValue(
      listPayload([richAppt, bareAppt])
    );
  });

  it("offers the distinct clinicians, sessions, services and dates", async () => {
    await renderTab();
    const [clinician, session, service, date] = probes.table.filters;

    expect(clinician.filterValues.map((v) => v.value)).toEqual([
      "Grace Hopper",
      "Unassigned",
    ]);
    expect(session.filterValues.map((v) => v.value)).toEqual([
      "Direct Therapy",
      "Unknown Session",
    ]);
    expect(service.filterValues).toEqual([
      { value: "97153 (HN)", label: "97153 (HN)" },
    ]);
    expect(date.filterValues).toHaveLength(2);
    expect(date.filterValues[0].label).toMatch(/^\w{3} \d{2}, \d{4}$/);
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
    expect(clinician.filterFunction(row, "Unassigned")).toBe(false);
    expect(session.filterFunction(row, "Direct Therapy")).toBe(true);
    expect(session.filterFunction(row, "Assessment")).toBe(false);
    expect(service.filterFunction(row, "97153 (HN)")).toBe(true);
    expect(service.filterFunction(row, "97155")).toBe(false);
    expect(date.filterFunction(row, yesterday)).toBe(true);
    expect(date.filterFunction(row, lastWeek)).toBe(false);
  });
});

describe("leaving the tab", () => {
  beforeEach(() => {
    api.GetPastAppointmentByTenantId.mockResolvedValue(
      listPayload([richAppt])
    );
  });

  it("sends a row's action straight to the timesheets", async () => {
    await renderTab();
    act(() => probes.table.onActionClick(rows()[0]));
    expect(navigate).toHaveBeenCalledWith("/billing/timesheets");
  });

  it("opens the details of the appointment a notification named", async () => {
    await renderTab({ state: { focusId: "a1" } });
    await waitFor(() => expect(probes.details.isOpen).toBe(true));
    expect(probes.details.appointment).toMatchObject({
      id: "a1",
      clientName: "Ada Lovelace",
    });
  });

  it("opens nothing without a focus id", async () => {
    await renderTab();
    expect(probes.details.isOpen).toBe(false);
  });

  it("closes the details again", async () => {
    await renderTab({ state: { focusId: "a1" } });
    await waitFor(() => expect(probes.details.isOpen).toBe(true));
    act(() => probes.details.onClose());
    expect(probes.details.isOpen).toBe(false);
  });

  it("closes the details and routes to the timesheets", async () => {
    await renderTab({ state: { focusId: "a1" } });
    await waitFor(() => expect(probes.details.isOpen).toBe(true));
    act(() => probes.details.onViewTimesheet());

    expect(probes.details.isOpen).toBe(false);
    expect(navigate).toHaveBeenCalledWith("/billing/timesheets");
  });
});
