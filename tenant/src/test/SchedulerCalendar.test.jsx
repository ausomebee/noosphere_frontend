import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../ReduxStore/features/authentication";

/**
 * The scheduler's Calendar page. It is a data loader rather than a view: it
 * pulls session types, clients, staff and every appointment, rewrites each raw
 * appointment into the card shape the calendar understands, counts how many
 * appointments each person has, and then hands all of it to CalendarScheduler.
 *
 * Nothing it produces is rendered here -- CalendarScheduler is the only child
 * and it is a probe, so the tests read the normalised cards, the counts and the
 * filter callback straight off its props. Appointment cards only reach the
 * calendar once a client or staff filter is applied, so most assertions call
 * the page's own `fetchAppointmentsByFilter` first.
 *
 * The four fetches each swallow their own failure and carry on; only a payload
 * that is not a list at all escapes to the outer handler and replaces the page
 * with an error, which is the one path that renders anything of its own.
 */

const api = vi.hoisted(() => ({
  GetSessionTypeActiveByTenantId: vi.fn(),
  GetClientByTenantId: vi.fn(),
  GetTenantStaffByTenantId: vi.fn(),
  GetAllAppointments: vi.fn(),
}));

const scheduler = vi.hoisted(() => ({ props: null }));

vi.mock("../api/AppointmentApi", () => ({ default: api }));

vi.mock("../Components/CalendarScheduler/CalendarScheduler", () => ({
  default: (props) => {
    scheduler.props = props;
    return <div data-testid="calendar-scheduler" />;
  },
}));

import Calendar from "../Pages/Scheduler/SchdedulerSubs/Calendar";

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const today = iso(new Date());

const listPayload = (rows) => ({ data: { data: rows } });

// A raw appointment with every optional field filled in, so each normaliser
// takes the "value present" side.
const rawAppt = {
  id: "a1",
  clientId: "c1",
  client: { firstName: "Ada", lastName: "Lovelace" },
  clinicians: [{ id: 7, fullName: "Grace Hopper" }],
  appointmentServices: [
    {
      serviceCode: {
        id: "sc1",
        code: "97153",
        modifiers: { modifier1: "HN" },
      },
    },
  ],
  sessionId: "st1",
  date: today,
  startTime: "9:00:00",
  endTime: "10:00",
  colourCode: "#123456",
  serviceLocation: "Home",
  isBillable: false,
  requiresTravel: true,
  isCanceled: true,
  rescheduled: true,
  rescheduleAccepted: true,
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
          ...user,
        },
      },
    },
  });

const renderCalendar = async ({ user } = {}) => {
  const view = render(
    <Provider store={makeStore(user)}>
      <Calendar />
    </Provider>
  );
  await waitFor(() => expect(scheduler.props.loading).toBe(false));
  return view;
};

// Cards are only handed to the calendar once a filter is applied.
const filterBy = (criteria) =>
  act(() => scheduler.props.fetchAppointmentsByFilter(criteria));

const firstCard = () => scheduler.props.appointments[0];

// A role with a non-empty module access restricts the page; an empty one is
// the org-owner case and grants everything.
const roleWith = (...permissions) => ({
  role: { roleModuleAccesses: [{ module: "SCHEDULER", permissions }] },
});

let consoleError;

beforeEach(() => {
  vi.clearAllMocks();
  scheduler.props = null;
  delete window.CALENDAR_DEBUG;

  api.GetSessionTypeActiveByTenantId.mockResolvedValue(listPayload([]));
  api.GetClientByTenantId.mockResolvedValue(listPayload([]));
  api.GetTenantStaffByTenantId.mockResolvedValue(listPayload([]));
  api.GetAllAppointments.mockResolvedValue(listPayload([]));

  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe("initial load", () => {
  it("hands the fetched session types, staff and clients to the calendar", async () => {
    api.GetSessionTypeActiveByTenantId.mockResolvedValue(
      listPayload([{ id: "st1", name: "Direct Therapy" }])
    );
    api.GetTenantStaffByTenantId.mockResolvedValue(
      listPayload([{ id: 7, fullName: "Grace Hopper" }])
    );
    api.GetClientByTenantId.mockResolvedValue(
      listPayload([{ clientId: "c1", firstName: "Ada", lastName: "Lovelace" }])
    );
    await renderCalendar();

    expect(scheduler.props.sessionTypes).toHaveLength(1);
    expect(scheduler.props.staff[0].fullName).toBe("Grace Hopper");
    expect(scheduler.props.clients[0].fullName).toBe("Ada Lovelace");
    expect(screen.getByTestId("calendar-scheduler")).toBeInTheDocument();
  });

  it("does not fetch anything without a tenant", async () => {
    await renderCalendar({ user: { tenantId: undefined } });
    expect(api.GetAllAppointments).not.toHaveBeenCalled();
    expect(scheduler.props.staff).toEqual([]);
  });

  it("does not fetch anything without an access token", async () => {
    await renderCalendar({ user: { accessToken: undefined } });
    expect(api.GetAllAppointments).not.toHaveBeenCalled();
  });

  it("treats a response with no data envelope as an empty list", async () => {
    api.GetSessionTypeActiveByTenantId.mockResolvedValue({});
    api.GetClientByTenantId.mockResolvedValue({ data: {} });
    api.GetTenantStaffByTenantId.mockResolvedValue(undefined);
    api.GetAllAppointments.mockResolvedValue({ data: {} });
    await renderCalendar();

    expect(scheduler.props.sessionTypes).toEqual([]);
    expect(scheduler.props.staff).toEqual([]);
    expect(scheduler.props.clients).toEqual([]);
  });

  it("publishes a debug snapshot on the window", async () => {
    await renderCalendar();
    expect(window.CALENDAR_DEBUG).toEqual({
      staffWithCounts: [],
      clientsWithCounts: [],
      filteredAppointments: 0,
    });
  });
});

describe("fetch failures", () => {
  const expectLogged = (message) =>
    expect(consoleError).toHaveBeenCalledWith(message, expect.any(Error));

  it("carries on when the session type fetch fails", async () => {
    api.GetSessionTypeActiveByTenantId.mockRejectedValue(new Error("down"));
    await renderCalendar();
    expectLogged("Failed to fetch session types:");
    expect(screen.getByTestId("calendar-scheduler")).toBeInTheDocument();
  });

  it("carries on when the client fetch fails", async () => {
    api.GetClientByTenantId.mockRejectedValue(new Error("down"));
    await renderCalendar();
    expectLogged("Failed to fetch clients:");
  });

  it("carries on when the staff fetch fails", async () => {
    api.GetTenantStaffByTenantId.mockRejectedValue(new Error("down"));
    await renderCalendar();
    expectLogged("Failed to fetch staff:");
  });

  it("carries on when the appointment fetch fails", async () => {
    api.GetAllAppointments.mockRejectedValue(new Error("down"));
    await renderCalendar();
    expectLogged("Failed to fetch appointments:");
  });

  it("replaces the page when the appointment payload is not a list", async () => {
    api.GetAllAppointments.mockResolvedValue({ data: { data: { oops: 1 } } });
    render(
      <Provider store={makeStore()}>
        <Calendar />
      </Provider>
    );

    await waitFor(() =>
      expect(screen.getByText(/Error loading calendar/)).toBeInTheDocument()
    );
    expect(consoleError).toHaveBeenCalledWith(
      "Calendar initialization error:",
      expect.any(Error)
    );
    expect(screen.queryByTestId("calendar-scheduler")).not.toBeInTheDocument();
  });

  it("keeps going when the list contains a blank entry", async () => {
    // The enrichment step spreads every entry into a fresh object, so even a
    // null arrives at the card builder as {} -- it survives, but with no date
    // it never becomes a calendar instance.
    api.GetAllAppointments.mockResolvedValue(listPayload([null, rawAppt]));
    await renderCalendar();
    filterBy({ clientIds: ["c1"] });

    expect(scheduler.props.appointments).toHaveLength(1);
  });
});

describe("appointment cards", () => {
  const load = async (appts, sessionTypes = []) => {
    api.GetSessionTypeActiveByTenantId.mockResolvedValue(
      listPayload(sessionTypes)
    );
    api.GetAllAppointments.mockResolvedValue(listPayload(appts));
    await renderCalendar();
    filterBy({ clientIds: ["c1"] });
  };

  it("normalises a fully populated appointment", async () => {
    await load([rawAppt], [{ id: "st1", name: "Direct Therapy" }]);

    expect(firstCard()).toMatchObject({
      id: "a1",
      clientName: "Ada Lovelace",
      clinicians: [{ id: 7, fullName: "Grace Hopper" }],
      clinicianNames: ["Grace Hopper"],
      clinicianIds: ["7"],
      service: [
        { serviceCodeId: "sc1", serviceType: "97153", modifierType: "HN" },
      ],
      sessionType: "st1",
      sessionName: "Direct Therapy",
      date: today,
      // A one-digit hour and a trailing seconds field both normalise to HH:MM.
      startTime: "09:00",
      endTime: "10:00",
      colorCode: "#123456",
      serviceLocation: "Home",
      billable: false,
      requiresTravel: true,
      isCanceled: true,
      rescheduled: true,
      rescheduleAccepted: true,
    });
  });

  it("fills in every default for an appointment that carries nothing", async () => {
    await load([{ id: "a2", clientId: "c1", date: today }]);

    expect(firstCard()).toMatchObject({
      clientName: "Unknown Client",
      clinicians: [],
      clinicianIds: [],
      service: [{ serviceType: "Not specified", modifierType: "" }],
      sessionType: "",
      sessionName: "Unknown Session",
      colorCode: "#FF5733",
      serviceLocation: "",
      billable: true,
      requiresTravel: false,
      isCanceled: false,
      parentId: null,
      isRecurringInstance: false,
    });
  });

  it("names a clinician and a service the record leaves blank", async () => {
    await load([
      {
        ...rawAppt,
        clinicians: [{ id: 7 }],
        appointmentServices: [{}],
      },
    ]);

    expect(firstCard().clinicianNames).toEqual(["Unknown Clinician"]);
    expect(firstCard().service).toEqual([
      { serviceCodeId: "", serviceType: "Not specified", modifierType: "" },
    ]);
  });

  it("calls a client with no name parts unknown", async () => {
    await load([{ ...rawAppt, client: {} }]);
    expect(firstCard().clientName).toBe("Unknown Client");
  });

  it("takes the session id off the enriched session when there is one", async () => {
    await load(
      [{ ...rawAppt, sessionId: "st1" }],
      [{ id: "st1", name: "Direct Therapy" }]
    );
    expect(firstCard().sessionType).toBe("st1");
    expect(firstCard().sessionName).toBe("Direct Therapy");
  });

  it("drops a clinician whose id cannot be stringified", async () => {
    await load([{ ...rawAppt, clinicians: [{ fullName: "Nameless Id" }] }]);
    expect(firstCard().clinicianIds).toEqual([]);
  });

  it("blanks a time that is not a clock time", async () => {
    await load([{ ...rawAppt, startTime: "half nine", endTime: null }]);
    expect(firstCard().startTime).toBe("");
    expect(firstCard().endTime).toBe("");
  });

  it("keeps an appointment with no date off the calendar", async () => {
    // An empty date makes expand refuse the card, so it never becomes an
    // instance even though it passed the filter.
    await load([{ ...rawAppt, date: undefined }]);
    expect(scheduler.props.appointments).toHaveLength(0);
  });
});

describe("recurrence normalisation", () => {
  // A one-off appointment loses its recurrence fields on the way through
  // expand, so a rule can only be read back off a series instance.
  const seriesFor = async (recurrence) => {
    api.GetAllAppointments.mockResolvedValue(
      listPayload([{ ...rawAppt, isRecurring: true, recurrence }])
    );
    await renderCalendar();
    filterBy({ clientIds: ["c1"] });
    return scheduler.props.appointments;
  };

  it("keeps a well formed weekly rule as it stands", async () => {
    const series = await seriesFor({
      type: "week",
      interval: 2,
      unit: "week",
      days: ["monday"],
      day: [1],
      position: "second",
      weekday: "tuesday",
      endType: "after",
      endOn: "2030-01-01",
      occurrences: 4,
    });

    expect(series[0].recurrence).toEqual({
      type: "week",
      interval: 2,
      unit: "week",
      days: ["monday"],
      day: [1],
      position: "second",
      weekday: "tuesday",
      endType: "after",
      endOn: "2030-01-01",
      occurrences: 4,
    });
    expect(series).toHaveLength(4);
  });

  it("replaces every unrecognised field with its default", async () => {
    const series = await seriesFor({
      type: "fortnightly",
      interval: 0,
      unit: "year",
      days: "monday",
      day: 1,
      position: "middle",
      weekday: "mon",
      endType: "whenever",
      occurrences: -1,
    });

    expect(series[0].recurrence).toEqual({
      type: "day",
      interval: 1,
      unit: "day",
      days: [],
      day: [],
      position: "on",
      weekday: "",
      endType: "never",
      endOn: "",
      occurrences: 1,
    });
  });

  it("treats an empty rule as no recurrence at all", async () => {
    const series = await seriesFor({});
    expect(series).toHaveLength(1);
    expect(series[0].recurrence).toBeUndefined();
  });

  it("takes the rule from the master when the record is an instance", async () => {
    api.GetAllAppointments.mockResolvedValue(
      listPayload([
        {
          ...rawAppt,
          id: "master",
          isRecurring: true,
          recurrence: {
            type: "week",
            days: ["monday"],
            endType: "after",
            occurrences: 2,
          },
        },
        // Carries no rule of its own -- it has to inherit the master's.
        {
          ...rawAppt,
          id: "child",
          isRecurringInstance: true,
          parentId: "master",
        },
      ])
    );
    await renderCalendar();
    filterBy({ clientIds: ["c1"] });

    const inherited = scheduler.props.appointments.filter(
      (a) => a.parentId === "child"
    );
    expect(inherited).toHaveLength(2);
    expect(inherited[0].recurrence).toMatchObject({
      type: "week",
      days: ["monday"],
    });
  });

  it("falls back to its own rule when the master has gone", async () => {
    api.GetAllAppointments.mockResolvedValue(
      listPayload([
        {
          ...rawAppt,
          id: "orphan",
          isRecurringInstance: true,
          parentId: "gone",
          isRecurring: true,
          recurrence: {
            type: "week",
            days: ["monday"],
            endType: "after",
            occurrences: 2,
          },
        },
      ])
    );
    await renderCalendar();
    filterBy({ clientIds: ["c1"] });

    expect(scheduler.props.appointments).toHaveLength(2);
    expect(scheduler.props.appointments[0].parentId).toBe("orphan");
  });
});

describe("appointment counts", () => {
  it("counts every expanded instance against its client and clinicians", async () => {
    api.GetClientByTenantId.mockResolvedValue(
      listPayload([
        { clientId: "c1", firstName: "Ada", lastName: "Lovelace" },
        { clientId: "c2" },
      ])
    );
    api.GetTenantStaffByTenantId.mockResolvedValue(
      listPayload([{ id: 7, fullName: "Grace Hopper" }, { fullName: "" }])
    );
    api.GetAllAppointments.mockResolvedValue(listPayload([rawAppt]));
    await renderCalendar();

    expect(scheduler.props.clients[0].appointmentCount).toBe(1);
    // No appointments at all for the second client, and no name either.
    expect(scheduler.props.clients[1]).toMatchObject({
      appointmentCount: 0,
      fullName: "Unknown Client",
    });
    expect(scheduler.props.staff[0].appointmentCount).toBe(1);
    expect(scheduler.props.staff[1]).toMatchObject({
      appointmentCount: 0,
      fullName: "Unknown Staff",
    });
  });

  it("counts nothing for an appointment with no client and no clinicians", async () => {
    api.GetClientByTenantId.mockResolvedValue(
      listPayload([{ clientId: "c1", firstName: "Ada" }])
    );
    api.GetAllAppointments.mockResolvedValue(
      listPayload([{ id: "a2", date: today }])
    );
    await renderCalendar();

    expect(scheduler.props.clients[0].appointmentCount).toBe(0);
  });
});

describe("filtering", () => {
  const twoAppointments = [
    rawAppt,
    {
      ...rawAppt,
      id: "a2",
      clientId: "c2",
      clinicians: [{ id: 9, fullName: "Alan Turing" }],
    },
  ];

  const load = async (user) => {
    api.GetAllAppointments.mockResolvedValue(listPayload(twoAppointments));
    await renderCalendar({ user });
  };

  it("shows nothing until a filter is chosen", async () => {
    await load();
    expect(scheduler.props.appointments).toEqual([]);
  });

  it("clears the calendar when both filters are emptied", async () => {
    await load();
    filterBy({ clientIds: ["c1"] });
    expect(scheduler.props.appointments).toHaveLength(1);

    filterBy({ clientIds: [], staffIds: [] });
    expect(scheduler.props.appointments).toEqual([]);
  });

  it("treats a call with no criteria at all as an empty filter", async () => {
    await load();
    filterBy({});
    expect(scheduler.props.appointments).toEqual([]);
  });

  it("filters by client", async () => {
    await load();
    filterBy({ clientIds: ["c2"] });
    expect(scheduler.props.appointments.map((a) => a.id)).toEqual(["a2"]);
  });

  it("filters by clinician", async () => {
    await load();
    filterBy({ staffIds: ["7"] });
    expect(scheduler.props.appointments.map((a) => a.id)).toEqual(["a1"]);
  });

  it("requires both to match when both are given", async () => {
    await load();
    filterBy({ clientIds: ["c1"], staffIds: ["9"] });
    expect(scheduler.props.appointments).toEqual([]);
  });

  it("re-applies the live filter after a refetch", async () => {
    await load();
    filterBy({ clientIds: ["c1"] });
    act(() => scheduler.props.setSelectedClients(["c1"]));

    api.GetAllAppointments.mockResolvedValue(
      listPayload([
        ...twoAppointments,
        { ...rawAppt, id: "a3", clientId: "c1" },
      ])
    );
    await act(async () => {
      await scheduler.props.refetchAppointments();
    });

    await waitFor(() =>
      expect(scheduler.props.appointments.map((a) => a.id)).toEqual([
        "a1",
        "a3",
      ])
    );
  });

  it("locks a user without filter permissions to their own appointments", async () => {
    api.GetAllAppointments.mockResolvedValue(
      listPayload([
        { ...rawAppt, clinicians: [{ id: "user-1", fullName: "Me" }] },
        { ...rawAppt, id: "a2", clinicians: [{ id: 9, fullName: "Someone" }] },
      ])
    );
    await renderCalendar({ user: roleWith("view_scheduler") });

    await waitFor(() =>
      expect(scheduler.props.selectedStaff).toEqual(["user-1"])
    );
    expect(scheduler.props.appointments.map((a) => a.id)).toEqual(["a1"]);
  });

  it("leaves the filter alone for a user who may view the staff list", async () => {
    await load(roleWith("view_staff_list"));
    expect(scheduler.props.selectedStaff).toEqual([]);
    expect(scheduler.props.appointments).toEqual([]);
  });

  it("leaves the filter alone for a user who may view the client list", async () => {
    await load(roleWith("view_client_list"));
    expect(scheduler.props.selectedStaff).toEqual([]);
  });

  it("has nothing to lock a restricted user to when there are no appointments", async () => {
    api.GetAllAppointments.mockResolvedValue(listPayload([]));
    await renderCalendar({ user: roleWith("view_scheduler") });
    expect(scheduler.props.selectedStaff).toEqual([]);
  });
});
