import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../ReduxStore/features/authentication";

/**
 * The Appointments & Schedules tab of the client panel. It is really four tabs
 * over three different endpoints plus a self-contained Reschedule Requests
 * child, rendered either as a table or as a month calendar, with create, edit,
 * reschedule, cancel and "start session" actions gated on permissions.
 *
 * Almost everything interesting here is a transform rather than markup: raw API
 * appointments are rewritten twice on their way to the screen (once into table
 * rows, once into calendar events), each step layering its own "or else"
 * fallback for a missing clinician, service code, session or colour. The tests
 * therefore drive the page through its tabs and read the transforms back off
 * the probes rather than off the DOM.
 *
 * Every child is a probe: the table, the month view, the three modals and the
 * Reschedule Requests tab all record the props they were handed and expose
 * buttons for the callbacks the page passes down. The router is mocked too, so
 * `clientId` can be taken away to reach the no-client guard.
 */

const api = vi.hoisted(() => ({
  GetSessionTypeActiveByTenantId: vi.fn(),
  GetTenantStaffByTenantId: vi.fn(),
  CreateAppointments: vi.fn(),
  UpdateAppointments: vi.fn(),
  RescheduleAppointments: vi.fn(),
  CancelAppointments: vi.fn(),
}));

const clientApi = vi.hoisted(() => ({
  GetSingleClientByClientId: vi.fn(),
  GetClientUpcomingAppointments: vi.fn(),
  GetClientPastAppointments: vi.fn(),
  GetClientCancelAppointments: vi.fn(),
}));

const billingApi = vi.hoisted(() => ({
  GetTenantServiceCodeByTenantId: vi.fn(),
}));

const toast = vi.hoisted(() => ({
  showToast: vi.fn(),
  showApiError: vi.fn(),
}));

const router = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: { clientId: "client-1" },
}));

vi.mock("../api/AppointmentApi", () => ({ default: api }));
vi.mock("../api/clientPanelApis", () => ({ default: clientApi }));
vi.mock("../api/billingAndPaymentsApi", () => ({ default: billingApi }));

vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: (...a) => toast.showApiError(...a),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useParams: () => router.params,
    useNavigate: () => router.navigate,
  };
});

const table = vi.hoisted(() => ({ props: null }));

// The real CustomTable is covered by its own suite; here it is a probe so the
// row actions the page builds can be invoked directly against a known row.
vi.mock("../Components/Table/CustomTable", () => ({
  default: (props) => {
    table.props = props;
    const items = props.actions?.[0]?.items || [];
    return (
      <div data-testid="custom-table">
        <span data-testid="table-name">{props.tableName}</span>
        <span data-testid="row-count">{props.data.length}</span>
        {props.loading ? <span data-testid="table-loading" /> : null}
        {props.actionText ? (
          <button
            type="button"
            onClick={() => props.onActionClick(props.data[0])}
          >
            {props.actionText}
          </button>
        ) : null}
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => item.onClick(props.data[0])}
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  },
}));

const monthView = vi.hoisted(() => ({ props: null }));

vi.mock("../Components/CalendarScheduler/MonthView", () => ({
  default: (props) => {
    monthView.props = props;
    return (
      <div data-testid="month-view">
        <span data-testid="calendar-count">{props.appointments.length}</span>
      </div>
    );
  },
}));

const apptModal = vi.hoisted(() => ({ props: null }));

vi.mock("../Components/ReusableModal/SchedulerModal/AppointmentModal", () => ({
  default: (props) => {
    apptModal.props = props;
    return props.isOpen ? <div data-testid="appointment-modal" /> : null;
  },
}));

const rescheduleModal = vi.hoisted(() => ({ props: null }));

vi.mock("../Components/ReusableModal/SchedulerModal/RescheduleModal", () => ({
  default: (props) => {
    rescheduleModal.props = props;
    return props.isOpen ? <div data-testid="reschedule-modal" /> : null;
  },
}));

const cancelModal = vi.hoisted(() => ({ props: null }));

vi.mock("../Components/ReusableModal/SchedulerModal/CancelModal", () => ({
  default: (props) => {
    cancelModal.props = props;
    return props.isOpen ? <div data-testid="cancel-modal" /> : null;
  },
}));

const rescheduleRequests = vi.hoisted(() => ({ props: null }));

vi.mock(
  "../Pages/Scheduler/SchdedulerSubs/AppointmentSubs/RescheduleRequests",
  () => ({
    default: (props) => {
      rescheduleRequests.props = props;
      return <div data-testid="reschedule-requests" />;
    },
  })
);

import AppointmentsScheduleTab from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/AppointmentsAndSchedules";

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const today = iso(new Date());
const yesterday = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return iso(d);
})();

// A fully populated appointment: every optional field present, so the "or
// else" side of each fallback is the one NOT taken.
const richAppt = {
  id: "a1",
  date: today,
  startTime: "09:00",
  endTime: "10:00",
  client: { id: "cl-1", fullName: "Ada Lovelace" },
  clinicians: [{ id: 7, fullName: "Grace Hopper" }],
  session: { id: "st1", name: "Direct Therapy" },
  appointmentServices: [
    {
      serviceCodeId: "sc1",
      serviceCode: { code: "97153" },
      modifiers: { modifier: "HN" },
    },
  ],
  colourCode: "#123456",
};

// The same appointment stripped to the bone: no clinicians, no session, no
// services, no colour. Every fallback in both transforms fires on this one.
const bareAppt = {
  id: "a2",
  date: today,
  startTime: "11:00",
  endTime: "12:00",
};

const listPayload = (rows) => ({ data: { data: rows } });

// The client endpoint returns name parts but no flat `fullName`, which is what
// leaves `currentClient.fullName` undefined and sends every "who is this
// appointment for" fallback down to its last arm.
const clientWithoutFullName = {
  id: "client-1",
  firstName: "Ada",
  lastName: "Lovelace",
};

// Likewise the appointment's own nested client: name parts, no `fullName`.
const namelessClientAppt = {
  ...richAppt,
  client: { id: "cl-1", firstName: "Ada" },
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
        user:
          user === null
            ? null
            : {
                id: "u1",
                tenantId: "tenant-1",
                accessToken: "access-1",
                refreshToken: "refresh-1",
                ...user,
              },
      },
    },
  });

const renderTab = ({ user, fullName = "Ada Lovelace" } = {}) =>
  render(
    <Provider store={makeStore(user)}>
      <AppointmentsScheduleTab fullName={fullName} />
    </Provider>
  );

// A role with an explicit, non-empty module access restricts the UI; an empty
// one means "org owner" and grants everything.
const roleWith = (...permissions) => ({
  role: { roleModuleAccesses: [{ module: "SCHEDULER", permissions }] },
});

const openTab = (label) => fireEvent.click(screen.getByText(label));

const rows = () => table.props.data;

let consoleError;

beforeEach(() => {
  vi.clearAllMocks();
  router.params = { clientId: "client-1" };
  table.props = null;
  monthView.props = null;
  apptModal.props = null;
  rescheduleModal.props = null;
  cancelModal.props = null;
  rescheduleRequests.props = null;

  billingApi.GetTenantServiceCodeByTenantId.mockResolvedValue({ data: [] });
  api.GetSessionTypeActiveByTenantId.mockResolvedValue(listPayload([]));
  api.GetTenantStaffByTenantId.mockResolvedValue(listPayload([]));
  clientApi.GetSingleClientByClientId.mockResolvedValue(listPayload(null));
  clientApi.GetClientUpcomingAppointments.mockResolvedValue(listPayload([]));
  clientApi.GetClientPastAppointments.mockResolvedValue(listPayload([]));
  clientApi.GetClientCancelAppointments.mockResolvedValue(listPayload([]));
  api.CreateAppointments.mockResolvedValue({});
  api.UpdateAppointments.mockResolvedValue({});
  api.RescheduleAppointments.mockResolvedValue({});
  api.CancelAppointments.mockResolvedValue({});

  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe("service code loading", () => {
  it("keeps only the tenant's live codes and forwards them to the modal", async () => {
    billingApi.GetTenantServiceCodeByTenantId.mockResolvedValue({
      data: [
        { id: "sc1", code: "97153", isActive: true },
        { id: "sc2", code: "97155", isActive: false },
        { id: "sc3", code: "97156", isActive: true, isDeleted: true },
      ],
    });
    renderTab();

    await waitFor(() =>
      expect(apptModal.props.serviceCodes).toHaveLength(1)
    );
    expect(apptModal.props.serviceCodes[0].code).toBe("97153");
  });

  it("treats a response with no body as an empty code list", async () => {
    billingApi.GetTenantServiceCodeByTenantId.mockResolvedValue({});
    renderTab();

    await waitFor(() => expect(apptModal.props).not.toBeNull());
    expect(apptModal.props.serviceCodes).toEqual([]);
  });

  it("does not ask for codes when the session carries no tenant", async () => {
    renderTab({ user: { tenantId: undefined } });
    await waitFor(() => expect(apptModal.props).not.toBeNull());
    expect(billingApi.GetTenantServiceCodeByTenantId).not.toHaveBeenCalled();
  });

  it("does not ask for codes without an access token", async () => {
    renderTab({ user: { accessToken: undefined } });
    await waitFor(() => expect(apptModal.props).not.toBeNull());
    expect(billingApi.GetTenantServiceCodeByTenantId).not.toHaveBeenCalled();
  });

  it("stays on screen when the code endpoint fails", async () => {
    billingApi.GetTenantServiceCodeByTenantId.mockRejectedValue(
      new Error("codes down")
    );
    renderTab();

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to load service codes:",
        expect.any(Error)
      )
    );
    expect(screen.getByTestId("custom-table")).toBeInTheDocument();
  });
});

describe("supporting data", () => {
  it("hands the session types and staff to the modal", async () => {
    api.GetSessionTypeActiveByTenantId.mockResolvedValue(
      listPayload([{ id: "st1", name: "Direct Therapy" }])
    );
    api.GetTenantStaffByTenantId.mockResolvedValue(
      listPayload([{ id: "s1", fullName: "Grace Hopper" }])
    );
    renderTab();

    await waitFor(() => expect(apptModal.props.sessionTypes).toHaveLength(1));
    expect(apptModal.props.staff).toHaveLength(1);
  });

  it("falls back to empty lists when the payloads carry no data", async () => {
    api.GetSessionTypeActiveByTenantId.mockResolvedValue({ data: {} });
    api.GetTenantStaffByTenantId.mockResolvedValue({ data: {} });
    renderTab();

    await waitFor(() => expect(apptModal.props).not.toBeNull());
    expect(apptModal.props.sessionTypes).toEqual([]);
    expect(apptModal.props.staff).toEqual([]);
  });

  it("logs when the supporting fetch rejects", async () => {
    api.GetTenantStaffByTenantId.mockRejectedValue(new Error("staff down"));
    renderTab();

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to load support data:",
        expect.any(Error)
      )
    );
  });

  it("builds the locked client from the client endpoint's own name parts", async () => {
    clientApi.GetSingleClientByClientId.mockResolvedValue(
      listPayload({ id: "client-1", firstName: "Ada", lastName: "Lovelace" })
    );
    renderTab();

    await waitFor(() => expect(apptModal.props.clients).toHaveLength(1));
    expect(apptModal.props.clients[0].client).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
    });
  });

  it("splits a client record that only carries a full name", async () => {
    clientApi.GetSingleClientByClientId.mockResolvedValue(
      listPayload({ clientId: "client-1", fullName: "Grace Brewster Hopper" })
    );
    renderTab();

    await waitFor(() => expect(apptModal.props.clients).toHaveLength(1));
    expect(apptModal.props.clients[0].client).toEqual({
      firstName: "Grace",
      lastName: "Brewster Hopper",
    });
  });

  it("falls back to Client when the record has no name at all", async () => {
    clientApi.GetSingleClientByClientId.mockResolvedValue(
      listPayload({ id: "client-1" })
    );
    renderTab();

    await waitFor(() => expect(apptModal.props.clients).toHaveLength(1));
    expect(apptModal.props.clients[0].client).toEqual({
      firstName: "Client",
      lastName: "",
    });
  });

  it("ignores a fetched client whose id is not the one on the route", async () => {
    clientApi.GetSingleClientByClientId.mockResolvedValue(
      listPayload({ id: "someone-else", firstName: "Bob", lastName: "Ross" })
    );
    renderTab({ fullName: "Ada Lovelace" });

    await waitFor(() => expect(apptModal.props.clients).toHaveLength(1));
    expect(apptModal.props.clients[0].clientId).toBe("client-1");
    expect(apptModal.props.clients[0].client.firstName).toBe("Ada");
  });

  it("logs and keeps the prop-derived client when the client fetch rejects", async () => {
    clientApi.GetSingleClientByClientId.mockRejectedValue(new Error("nope"));
    renderTab({ fullName: "Alan Mathison Turing" });

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to fetch client:",
        expect.any(Error)
      )
    );
    expect(apptModal.props.clients[0].client).toEqual({
      firstName: "Alan",
      lastName: "Mathison Turing",
    });
  });

  it("names the client Current Client when the panel was given no name", async () => {
    renderTab({ fullName: "" });
    await waitFor(() => expect(apptModal.props).not.toBeNull());
    expect(apptModal.props.clients[0].fullName).toBe("Current Client");
  });

  it("leaves the last name blank when the panel's name is a single word", async () => {
    renderTab({ fullName: "Ada" });
    await waitFor(() => expect(apptModal.props.clients).toHaveLength(1));
    expect(apptModal.props.clients[0].client).toEqual({
      firstName: "Ada",
      lastName: "",
    });
    expect(apptModal.props.clients[0].lastName).toBe("");
  });

  it("calls the client Client when the panel's name starts with a space", async () => {
    // A leading space makes the first split part empty, which is the only way
    // the "Client" placeholder is reached on this path.
    renderTab({ fullName: " Ada Lovelace" });
    await waitFor(() => expect(apptModal.props.clients).toHaveLength(1));
    expect(apptModal.props.clients[0].client).toEqual({
      firstName: "Client",
      lastName: "Ada Lovelace",
    });
    expect(apptModal.props.clients[0].firstName).toBe("Client");
  });

  it("has no client to lock to, and says so, when the route has no id", async () => {
    router.params = {};
    renderTab();

    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith(
        "Client ID not found",
        "error"
      )
    );
    expect(apptModal.props.clients).toEqual([]);
    expect(clientApi.GetSingleClientByClientId).not.toHaveBeenCalled();
  });
});

describe("tabs", () => {
  it("opens on the upcoming appointments endpoint", async () => {
    renderTab();
    await waitFor(() =>
      expect(clientApi.GetClientUpcomingAppointments).toHaveBeenCalledWith({
        id: "client-1",
        accessToken: "access-1",
        refreshToken: "refresh-1",
      })
    );
    expect(screen.getByTestId("table-name")).toHaveTextContent(
      "Upcoming Appointments"
    );
  });

  it("swaps the edit actions for a timesheet link on past appointments", async () => {
    clientApi.GetClientPastAppointments.mockResolvedValue(
      listPayload([{ ...richAppt, date: yesterday }])
    );
    renderTab();
    openTab("Past Appointments");

    await waitFor(() =>
      expect(clientApi.GetClientPastAppointments).toHaveBeenCalled()
    );
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(table.props.actions).toBeUndefined();

    fireEvent.click(screen.getByText("Go to Timesheets"));
    expect(router.navigate).toHaveBeenCalledWith("/billing/timesheets");
  });

  it("offers cancellation details on the cancelled tab", async () => {
    clientApi.GetClientCancelAppointments.mockResolvedValue(
      listPayload([richAppt])
    );
    renderTab();
    openTab("Cancelled Appointments");

    await waitFor(() =>
      expect(clientApi.GetClientCancelAppointments).toHaveBeenCalled()
    );
    await waitFor(() => expect(table.props.actionText).toBe("See more"));
  });

  it("hands the reschedule requests tab over to its own component", async () => {
    renderTab();
    // The service-code fetch resolves into state and re-runs the appointment
    // fetch, so wait for that second pass before counting.
    await waitFor(() =>
      expect(
        clientApi.GetClientUpcomingAppointments.mock.calls.length
      ).toBeGreaterThan(1)
    );
    const before = clientApi.GetClientUpcomingAppointments.mock.calls.length;
    openTab("Reschedule Requests");
    await act(async () => {});

    expect(screen.getByTestId("reschedule-requests")).toBeInTheDocument();
    expect(rescheduleRequests.props.clientId).toBe("client-1");
    expect(screen.queryByTestId("custom-table")).not.toBeInTheDocument();
    // The child fetches for itself, so the parent must not fetch again.
    expect(clientApi.GetClientUpcomingAppointments).toHaveBeenCalledTimes(
      before
    );
  });

  it("hides the table/calendar switch on the reschedule requests tab", async () => {
    renderTab();
    await waitFor(() => expect(screen.getByText("Table View")).toBeTruthy());
    openTab("Reschedule Requests");
    expect(screen.queryByText("Table View")).not.toBeInTheDocument();
  });

  it("accepts an appointment list that is not wrapped in a data envelope", async () => {
    clientApi.GetClientUpcomingAppointments.mockResolvedValue({
      data: [richAppt],
    });
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(1));
  });

  it("treats a bodyless response as no appointments", async () => {
    clientApi.GetClientUpcomingAppointments.mockResolvedValue({});
    renderTab();
    await waitFor(() => expect(table.props).not.toBeNull());
    expect(rows()).toEqual([]);
  });

  it("logs when the appointment fetch rejects", async () => {
    clientApi.GetClientUpcomingAppointments.mockRejectedValue(
      new Error("list down")
    );
    renderTab();

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to fetch appointments:",
        expect.any(Error)
      )
    );
    expect(table.props.loading).toBe(false);
  });
});

describe("table rows", () => {
  it("reads the clinician, service, session and colour off a complete record", async () => {
    clientApi.GetClientUpcomingAppointments.mockResolvedValue(
      listPayload([richAppt])
    );
    renderTab();

    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0]).toMatchObject({
      therapistName: "Grace Hopper",
      serviceType: "97153 (HN)",
      sessionType: "Direct Therapy",
      date: today,
      time: "09:00 - 10:00",
      colorCode: "#123456",
      hasActions: true,
    });
  });

  it("fills in every gap on a record that carries nothing", async () => {
    clientApi.GetClientUpcomingAppointments.mockResolvedValue(
      listPayload([bareAppt])
    );
    renderTab();

    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0]).toMatchObject({
      therapistName: "Unassigned",
      serviceType: "N/A",
      sessionType: "Unknown Session",
      colorCode: "#3B82F6",
    });
  });

  it("falls back to the fetched code map when the appointment carries no code", async () => {
    billingApi.GetTenantServiceCodeByTenantId.mockResolvedValue({
      data: [{ id: "sc9", code: "97158", isActive: true }],
    });
    clientApi.GetClientUpcomingAppointments.mockResolvedValue(
      listPayload([
        {
          ...richAppt,
          appointmentServices: [{ serviceCodeId: "sc9", modifiers: {} }],
        },
      ])
    );
    renderTab();

    await waitFor(() => expect(rows()[0]?.serviceType).toBe("97158"));
  });

  it("says N/A for a service the code map has never heard of", async () => {
    clientApi.GetClientUpcomingAppointments.mockResolvedValue(
      listPayload([
        { ...richAppt, appointmentServices: [{ serviceCodeId: "ghost" }] },
      ])
    );
    renderTab();

    await waitFor(() => expect(rows()[0]?.serviceType).toBe("N/A"));
  });

  it("says N/A when the appointment's session carries no name", async () => {
    // An empty session object survives the row transform's own fallback, so
    // the name is only missing by the time the row is formatted.
    clientApi.GetClientUpcomingAppointments.mockResolvedValue(
      listPayload([{ ...richAppt, session: {} }])
    );
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0].sessionType).toBe("N/A");
  });

  it("falls back to Current Client when the fetched record has no full name", async () => {
    clientApi.GetSingleClientByClientId.mockResolvedValue(
      listPayload(clientWithoutFullName)
    );
    clientApi.GetClientUpcomingAppointments.mockResolvedValue(
      listPayload([richAppt])
    );
    renderTab();

    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0].clientName).toBe("Current Client");
  });

  it("names the client from the panel rather than from the appointment", async () => {
    clientApi.GetClientUpcomingAppointments.mockResolvedValue(
      listPayload([richAppt])
    );
    renderTab({ fullName: "Ada Lovelace" });

    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0].clientName).toBe("Ada Lovelace");
  });
});

describe("cancelled rows", () => {
  const cancelled = {
    ...richAppt,
    cancelTime: "2030-04-05T14:30:00.000Z",
    canceledBy: "Front Desk",
    reasonForCancel: "Client unwell",
  };

  const openCancelled = async () => {
    renderTab();
    openTab("Cancelled Appointments");
    await waitFor(() => expect(rows()).toHaveLength(1));
  };

  it("splits the cancellation stamp into a date and a time", async () => {
    clientApi.GetClientCancelAppointments.mockResolvedValue(
      listPayload([cancelled])
    );
    await openCancelled();

    expect(rows()[0].cancellation).toMatchObject({
      cancelledBy: "Front Desk",
      reason: "Client unwell",
    });
    expect(rows()[0].cancellation.dateOfCancellation).toMatch(/2030/);
    expect(rows()[0].cancellation.timeOfCancellation).toMatch(/\d{2}:\d{2}/);
  });

  it("says N/A when the cancellation stamp will not parse", async () => {
    clientApi.GetClientCancelAppointments.mockResolvedValue(
      listPayload([{ ...cancelled, cancelTime: "not a date" }])
    );
    await openCancelled();

    expect(rows()[0].cancellation.dateOfCancellation).toBe("N/A");
    expect(rows()[0].cancellation.timeOfCancellation).toBe("N/A");
  });

  it("says N/A when there is no cancellation stamp, author or reason", async () => {
    clientApi.GetClientCancelAppointments.mockResolvedValue(
      listPayload([richAppt])
    );
    await openCancelled();

    expect(rows()[0].cancellation).toEqual({
      cancelledBy: "N/A",
      dateOfCancellation: "N/A",
      timeOfCancellation: "N/A",
      reason: "No reason provided",
    });
  });

  it("falls back to Current Client when the fetched record has no full name", async () => {
    clientApi.GetSingleClientByClientId.mockResolvedValue(
      listPayload(clientWithoutFullName)
    );
    clientApi.GetClientCancelAppointments.mockResolvedValue(
      listPayload([cancelled])
    );
    await openCancelled();
    expect(rows()[0].clientName).toBe("Current Client");
  });

  it("says N/A when a cancelled appointment's session carries no name", async () => {
    clientApi.GetClientCancelAppointments.mockResolvedValue(
      listPayload([{ ...cancelled, session: {} }])
    );
    await openCancelled();
    expect(rows()[0].sessionType).toBe("N/A");
  });

  it("stamps a cancelled appointment that has a date but no start time", async () => {
    clientApi.GetClientCancelAppointments.mockResolvedValue(
      listPayload([{ ...cancelled, startTime: undefined }])
    );
    await openCancelled();
    expect(rows()[0].dateTime).toMatch(/• $/);
    expect(rows()[0].time).toBe("No Time");
  });

  it("marks an undated, untimed cancellation as unknown", async () => {
    clientApi.GetClientCancelAppointments.mockResolvedValue(
      listPayload([{ id: "a3" }])
    );
    await openCancelled();

    expect(rows()[0]).toMatchObject({
      date: "Unknown Date",
      time: "No Time",
      dateTime: "Unknown Date",
      therapistName: "Unassigned",
      sessionType: "Unknown Session",
    });
  });
});

describe("search and filters", () => {
  // The search box only exists in the calendar toolbar, but it narrows the
  // table's data too -- so type into it there and read the result back in the
  // table view.
  const searchFrom = async (term) => {
    fireEvent.click(screen.getByText("Calendar View"));
    fireEvent.change(screen.getByPlaceholderText("Search appointments..."), {
      target: { value: term },
    });
    fireEvent.click(screen.getByText("Table View"));
    await waitFor(() => expect(table.props).not.toBeNull());
  };

  beforeEach(() => {
    clientApi.GetClientUpcomingAppointments.mockResolvedValue(
      listPayload([richAppt, bareAppt])
    );
  });

  it("narrows the rows by clinician name", async () => {
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(2));
    await searchFrom("grace");
    expect(rows()).toHaveLength(1);
  });

  it("matches on the session name as well", async () => {
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(2));
    await searchFrom("unknown session");
    expect(rows()).toHaveLength(1);
  });

  it("matches on the service code as well", async () => {
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(2));
    await searchFrom("97153");
    expect(rows()).toHaveLength(1);
  });

  it("matches on the date as well", async () => {
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(2));
    await searchFrom(today);
    expect(rows()).toHaveLength(2);
  });

  it("matches on the time as well", async () => {
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(2));
    await searchFrom("11:00");
    expect(rows()).toHaveLength(1);
  });

  it("shows nothing when nothing matches", async () => {
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(2));
    await searchFrom("zzzz");
    expect(rows()).toHaveLength(0);
  });

  it("restores every row once the search is cleared", async () => {
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(2));
    await searchFrom("grace");
    await searchFrom("");
    expect(rows()).toHaveLength(2);
  });

  it("offers the distinct clinicians, services and sessions as filters", async () => {
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(2));

    const [clinician, service, session] = table.props.filters;
    expect(clinician.filterValues.map((v) => v.value)).toEqual([
      "Grace Hopper",
      "Unassigned",
    ]);
    expect(service.filterValues).toHaveLength(2);
    expect(session.filterValues).toHaveLength(2);
  });

  it("keeps every row when a filter is left unset and matches on it when set", async () => {
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(2));

    const [clinician, service, session] = table.props.filters;
    const row = rows()[0];
    expect(clinician.filterFunction(row, "")).toBe(true);
    expect(clinician.filterFunction(row, "Grace")).toBe(true);
    expect(service.filterFunction(row, "97153")).toBe(true);
    expect(session.filterFunction(row, "Direct Therapy")).toBe(true);
    expect(session.filterFunction(row, "Assessment")).toBe(false);
  });
});

describe("row actions and permissions", () => {
  beforeEach(() => {
    clientApi.GetClientUpcomingAppointments.mockResolvedValue(
      listPayload([richAppt])
    );
  });

  it("offers every action to a user with unrestricted access", async () => {
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(1));

    expect(table.props.actions[0].items.map((i) => i.label)).toEqual([
      "Edit Appointment",
      "Reschedule",
      "Cancel",
      "Start Appointment",
    ]);
  });

  it("offers only the actions the role grants", async () => {
    renderTab({ user: roleWith("cancel_appointments") });
    await waitFor(() => expect(rows()).toHaveLength(1));

    expect(table.props.actions[0].items.map((i) => i.label)).toEqual(["Cancel"]);
  });

  it("drops the action column entirely when the role grants none of them", async () => {
    renderTab({ user: roleWith("view_appointments") });
    await waitFor(() => expect(rows()).toHaveLength(1));

    expect(table.props.actions).toEqual([]);
  });

  it("hides the New Appointment button without the create permission", async () => {
    renderTab({ user: roleWith("view_appointments") });
    await waitFor(() => expect(table.props).not.toBeNull());
    expect(screen.queryByText("New Appointment")).not.toBeInTheDocument();
  });
});

describe("creating and editing", () => {
  beforeEach(() => {
    clientApi.GetClientUpcomingAppointments.mockResolvedValue(
      listPayload([richAppt])
    );
  });

  const save = async (data) => {
    await act(async () => {
      await apptModal.props.onSave(data);
    });
  };

  it("opens a blank modal from the New Appointment button", async () => {
    renderTab();
    await waitFor(() => expect(table.props).not.toBeNull());
    fireEvent.click(screen.getByText("New Appointment"));

    expect(screen.getByTestId("appointment-modal")).toBeInTheDocument();
    expect(apptModal.props.isEditMode).toBe(false);
    expect(apptModal.props.initialData).toBeNull();
    expect(apptModal.props.presetSlot).toBeNull();
  });

  it("prepares the appointment for edit, keeping the modal's own field names", async () => {
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(1));
    fireEvent.click(screen.getByText("Edit Appointment"));

    expect(apptModal.props.isEditMode).toBe(true);
    expect(apptModal.props.initialData).toMatchObject({
      sessionType: "st1",
      clinicians: ["7"],
      service: [{ serviceCodeId: "sc1", modifier: "HN" }],
      colorCode: "#123456",
    });
  });

  it("gives an appointment with no services one blank service row", async () => {
    clientApi.GetClientUpcomingAppointments.mockResolvedValue(
      listPayload([bareAppt])
    );
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(1));
    fireEvent.click(screen.getByText("Edit Appointment"));

    expect(apptModal.props.initialData).toMatchObject({
      sessionType: "",
      clinicians: [],
      service: [{ serviceCodeId: "", modifier: "" }],
      colorCode: "#3B82F6",
    });
  });

  it("blanks the modifier on a service row that carries none", async () => {
    clientApi.GetClientUpcomingAppointments.mockResolvedValue(
      listPayload([
        { ...richAppt, appointmentServices: [{ serviceCodeId: "sc1" }] },
      ])
    );
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(1));
    fireEvent.click(screen.getByText("Edit Appointment"));

    expect(apptModal.props.initialData.service).toEqual([
      { serviceCodeId: "sc1", modifier: "" },
    ]);
  });

  it("keeps an id that is nothing but an occurrence stamp", async () => {
    // Splitting on "_" leaves an empty first part, so the whole id has to be
    // sent instead of the empty string.
    clientApi.GetClientUpcomingAppointments.mockResolvedValue(
      listPayload([{ ...richAppt, id: "_1700000000" }])
    );
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(1));
    fireEvent.click(screen.getByText("Edit Appointment"));

    await save({ client: "client-1", scope: "this" });
    expect(api.UpdateAppointments).toHaveBeenCalledWith(
      expect.objectContaining({ id: "_1700000000" })
    );
  });

  it("creates an appointment through the create endpoint", async () => {
    renderTab();
    await waitFor(() => expect(table.props).not.toBeNull());
    fireEvent.click(screen.getByText("New Appointment"));

    await save({
      client: "client-1",
      sessionType: "st1",
      clinicians: ["7"],
      service: [{ serviceCodeId: "sc1" }],
      date: today,
      startTime: "09:00",
      endTime: "10:00",
      billable: true,
      colorCode: "#123456",
    });

    expect(api.CreateAppointments).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        clientId: "client-1",
        sessionId: "st1",
        clinicians: [{ id: "7" }],
        isBillable: true,
        colourCode: "#123456",
        recurrence: {},
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith(
      "Appointment created!",
      "success"
    );
    expect(screen.queryByTestId("appointment-modal")).not.toBeInTheDocument();
  });

  it("falls back to the panel's client and an empty clinician list", async () => {
    renderTab();
    await waitFor(() => expect(table.props).not.toBeNull());
    fireEvent.click(screen.getByText("New Appointment"));

    await save({ sessionType: "st1", date: today });

    expect(api.CreateAppointments).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: "client-1", clinicians: [] })
    );
  });

  it("updates an existing appointment and passes the series scope through", async () => {
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(1));
    fireEvent.click(screen.getByText("Edit Appointment"));

    await save({ client: "client-1", sessionType: "st1", scope: "all" });

    expect(api.UpdateAppointments).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a1", forAll: true })
    );
    expect(toast.showToast).toHaveBeenCalledWith(
      "Appointment updated!",
      "success"
    );
  });

  it("updates only this occurrence when the scope is not the series", async () => {
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(1));
    fireEvent.click(screen.getByText("Edit Appointment"));

    await save({ client: "client-1", scope: "this" });

    expect(api.UpdateAppointments).toHaveBeenCalledWith(
      expect.objectContaining({ forAll: false })
    );
  });

  it("re-throws a failed save so the modal can stay open", async () => {
    api.CreateAppointments.mockRejectedValue(new Error("server said no"));
    renderTab();
    await waitFor(() => expect(table.props).not.toBeNull());
    fireEvent.click(screen.getByText("New Appointment"));

    let thrown = null;
    await act(async () => {
      thrown = await apptModal.props.onSave({ date: today }).catch((e) => e);
    });

    expect(thrown).toBeInstanceOf(Error);
    expect(toast.showApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "SAVE_APPOINTMENT"
    );
    expect(screen.getByTestId("appointment-modal")).toBeInTheDocument();
  });

  it("closes the modal without saving", async () => {
    renderTab();
    await waitFor(() => expect(table.props).not.toBeNull());
    fireEvent.click(screen.getByText("New Appointment"));

    act(() => apptModal.props.onClose());
    expect(screen.queryByTestId("appointment-modal")).not.toBeInTheDocument();
  });
});

describe("reschedule and cancel", () => {
  beforeEach(() => {
    clientApi.GetClientUpcomingAppointments.mockResolvedValue(
      listPayload([richAppt])
    );
  });

  it("reschedules the underlying appointment", async () => {
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(1));
    fireEvent.click(screen.getByText("Reschedule"));

    expect(screen.getByTestId("reschedule-modal")).toBeInTheDocument();
    expect(rescheduleModal.props.appointment.id).toBe("a1");

    await act(async () => {
      await rescheduleModal.props.onSave({
        date: today,
        startTime: "13:00",
        endTime: "14:00",
        scope: "all",
      });
    });

    expect(api.RescheduleAppointments).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a1", forAll: true })
    );
    expect(toast.showToast).toHaveBeenCalledWith("Rescheduled!", "success");
    expect(screen.queryByTestId("reschedule-modal")).not.toBeInTheDocument();
  });

  it("reports a failed reschedule and leaves the modal up", async () => {
    api.RescheduleAppointments.mockRejectedValue(new Error("busy"));
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(1));
    fireEvent.click(screen.getByText("Reschedule"));

    await act(async () => {
      await rescheduleModal.props.onSave({ scope: "this" });
    });

    expect(toast.showApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "RESCHEDULE_APPOINTMENT"
    );
    expect(screen.getByTestId("reschedule-modal")).toBeInTheDocument();
  });

  it("dismisses the reschedule modal", async () => {
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(1));
    fireEvent.click(screen.getByText("Reschedule"));

    act(() => rescheduleModal.props.onClose());
    expect(screen.queryByTestId("reschedule-modal")).not.toBeInTheDocument();
  });

  it("cancels the whole series", async () => {
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(1));
    fireEvent.click(screen.getByText("Cancel"));

    expect(cancelModal.props.appointments).toHaveLength(1);

    await act(async () => {
      await cancelModal.props.onSave({ reason: "Client unwell" });
    });

    expect(api.CancelAppointments).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "a1",
        reason: "Client unwell",
        forAll: true,
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith("Cancelled!", "success");
  });

  it("reports a failed cancellation", async () => {
    api.CancelAppointments.mockRejectedValue(new Error("too late"));
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(1));
    fireEvent.click(screen.getByText("Cancel"));

    await act(async () => {
      await cancelModal.props.onSave({ reason: "x" });
    });

    expect(toast.showApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "CANCEL_APPOINTMENT"
    );
    expect(screen.getByTestId("cancel-modal")).toBeInTheDocument();
  });

  it("dismisses the cancel modal", async () => {
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(1));
    fireEvent.click(screen.getByText("Cancel"));

    act(() => cancelModal.props.onClose());
    expect(screen.queryByTestId("cancel-modal")).not.toBeInTheDocument();
  });
});

describe("starting a session", () => {
  it("routes to the session runner for the appointment's own client", async () => {
    clientApi.GetClientUpcomingAppointments.mockResolvedValue(
      listPayload([richAppt])
    );
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(1));
    fireEvent.click(screen.getByText("Start Appointment"));

    expect(router.navigate).toHaveBeenCalledWith(
      "/appointments/start/a1/cl-1"
    );
  });

  it("falls back to the panel's client when the appointment names none", async () => {
    clientApi.GetClientUpcomingAppointments.mockResolvedValue(
      listPayload([bareAppt])
    );
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(1));
    fireEvent.click(screen.getByText("Start Appointment"));

    expect(router.navigate).toHaveBeenCalledWith(
      "/appointments/start/a2/client-1"
    );
  });

  it("refuses to start when neither an appointment nor a client id survives", async () => {
    router.params = {};
    clientApi.GetClientUpcomingAppointments.mockResolvedValue(
      listPayload([{ ...bareAppt, id: "" }])
    );
    renderTab();
    await waitFor(() => expect(table.props).not.toBeNull());

    // No clientId means the fetch never runs, so drive the action directly
    // against a row shaped the way the table would have produced it.
    act(() =>
      table.props.actions[0].items
        .find((i) => i.label === "Start Appointment")
        .onClick({ id: "", rawData: { id: "" } })
    );

    expect(toast.showToast).toHaveBeenCalledWith(
      "Cannot start: missing appointment or client ID",
      "error"
    );
    expect(router.navigate).not.toHaveBeenCalled();
  });
});

describe("calendar view", () => {
  const showCalendar = () => fireEvent.click(screen.getByText("Calendar View"));

  it("expands the appointments into the visible month", async () => {
    clientApi.GetClientUpcomingAppointments.mockResolvedValue(
      listPayload([richAppt])
    );
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(1));
    showCalendar();

    expect(screen.getByTestId("month-view")).toBeInTheDocument();
    expect(monthView.props.appointments[0]).toMatchObject({
      clientId: "client-1",
      clientName: "Ada Lovelace",
      clinicianIds: ["7"],
      sessionId: "st1",
      title: "97153 (HN)",
      colourCode: "#123456",
    });
  });

  it("fills in the calendar fallbacks for a bare appointment", async () => {
    clientApi.GetClientUpcomingAppointments.mockResolvedValue(
      listPayload([bareAppt])
    );
    renderTab({ fullName: "" });
    await waitFor(() => expect(rows()).toHaveLength(1));
    showCalendar();

    // The row transform already substituted "Unknown Client" for the missing
    // client, so the calendar never has to reach its own name fallback.
    expect(monthView.props.appointments[0]).toMatchObject({
      clientName: "Unknown Client",
      clinicianIds: [],
      sessionId: "",
      title: "N/A",
      colourCode: "#3B82F6",
    });
  });

  it("lists cancelled appointments straight through, skipping undated ones", async () => {
    clientApi.GetClientCancelAppointments.mockResolvedValue(
      listPayload([richAppt, { id: "a9" }])
    );
    renderTab();
    openTab("Cancelled Appointments");
    await waitFor(() => expect(rows()).toHaveLength(2));
    showCalendar();

    expect(monthView.props.appointments).toHaveLength(1);
    expect(monthView.props.appointments[0].clientName).toBe("Ada Lovelace");
  });

  it("falls all the way through to Current Client on the calendar", async () => {
    // Neither the appointment's own client nor the panel's client carries a
    // flat full name, so the last arm of the chain is the one that renders.
    clientApi.GetSingleClientByClientId.mockResolvedValue(
      listPayload(clientWithoutFullName)
    );
    clientApi.GetClientUpcomingAppointments.mockResolvedValue(
      listPayload([namelessClientAppt])
    );
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(1));
    showCalendar();

    expect(monthView.props.appointments[0].clientName).toBe("Current Client");
  });

  it("falls all the way through to Current Client on the cancelled calendar", async () => {
    clientApi.GetSingleClientByClientId.mockResolvedValue(
      listPayload(clientWithoutFullName)
    );
    clientApi.GetClientCancelAppointments.mockResolvedValue(
      listPayload([{ ...namelessClientAppt, session: {} }])
    );
    renderTab();
    openTab("Cancelled Appointments");
    await waitFor(() => expect(rows()).toHaveLength(1));
    showCalendar();

    expect(monthView.props.appointments[0]).toMatchObject({
      clientName: "Current Client",
      // An empty session object has no id either.
      sessionId: "",
    });
  });

  it("shows an empty calendar when there is nothing to expand", async () => {
    renderTab();
    await waitFor(() => expect(table.props).not.toBeNull());
    showCalendar();
    expect(screen.getByTestId("calendar-count")).toHaveTextContent("0");
  });

  it("opens the master appointment behind a calendar event", async () => {
    clientApi.GetClientUpcomingAppointments.mockResolvedValue(
      listPayload([richAppt])
    );
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(1));
    showCalendar();

    act(() => monthView.props.onAppointmentClick({ id: "a1_170000000" }));
    expect(apptModal.props.isEditMode).toBe(true);
    expect(apptModal.props.initialData.id).toBe("a1");
  });

  it("ignores a calendar event with no appointment behind it", async () => {
    clientApi.GetClientUpcomingAppointments.mockResolvedValue(
      listPayload([richAppt])
    );
    renderTab();
    await waitFor(() => expect(rows()).toHaveLength(1));
    showCalendar();

    act(() => monthView.props.onAppointmentClick({ id: "ghost" }));
    expect(screen.queryByTestId("appointment-modal")).not.toBeInTheDocument();
  });

  it("pre-fills the date when an empty day is clicked", async () => {
    renderTab();
    await waitFor(() => expect(table.props).not.toBeNull());
    showCalendar();

    act(() => monthView.props.onSlotClick(new Date(2030, 2, 4)));
    expect(apptModal.props.presetSlot).toEqual({ date: "2030-03-04" });
    expect(apptModal.props.isEditMode).toBe(false);
  });

  it("accepts a day handed over as a string", async () => {
    renderTab();
    await waitFor(() => expect(table.props).not.toBeNull());
    showCalendar();

    act(() => monthView.props.onSlotClick("2030-03-04T00:00:00"));
    expect(apptModal.props.presetSlot).toEqual({ date: "2030-03-04" });
  });

  it("ignores a day that will not parse", async () => {
    renderTab();
    await waitFor(() => expect(table.props).not.toBeNull());
    showCalendar();

    act(() => monthView.props.onSlotClick("not a day"));
    expect(screen.queryByTestId("appointment-modal")).not.toBeInTheDocument();
  });

  it("ignores a day click from a user who cannot create appointments", async () => {
    renderTab({ user: roleWith("view_appointments") });
    await waitFor(() => expect(table.props).not.toBeNull());
    showCalendar();

    act(() => monthView.props.onSlotClick(new Date(2030, 2, 4)));
    expect(screen.queryByTestId("appointment-modal")).not.toBeInTheDocument();
  });

  it("steps a month back, forward and home again", async () => {
    renderTab();
    await waitFor(() => expect(table.props).not.toBeNull());
    showCalendar();

    const start = monthView.props.date;
    fireEvent.click(screen.getByText("<"));
    expect(monthView.props.date.getTime()).toBeLessThan(start.getTime());

    fireEvent.click(screen.getByText(">"));
    fireEvent.click(screen.getByText(">"));
    expect(monthView.props.date.getTime()).toBeGreaterThan(start.getTime());

    fireEvent.click(screen.getByText("Today"));
    expect(
      Math.abs(monthView.props.date.getTime() - Date.now())
    ).toBeLessThan(60000);
  });

  it("goes back to the table view", async () => {
    renderTab();
    await waitFor(() => expect(table.props).not.toBeNull());
    showCalendar();
    fireEvent.click(screen.getByText("Table View"));
    expect(screen.getByTestId("custom-table")).toBeInTheDocument();
  });
});

describe("cancellation details", () => {
  it("opens the details panel from the See more link and closes it again", async () => {
    clientApi.GetClientCancelAppointments.mockResolvedValue(
      listPayload([
        {
          ...richAppt,
          cancelTime: "2030-04-05T14:30:00.000Z",
          canceledBy: "Front Desk",
          reasonForCancel: "Client unwell",
        },
      ])
    );
    renderTab();
    openTab("Cancelled Appointments");
    await waitFor(() => expect(rows()).toHaveLength(1));

    fireEvent.click(screen.getByText("See more"));
    expect(screen.getByText("Cancellation details")).toBeInTheDocument();
    expect(screen.getByText("Front Desk")).toBeInTheDocument();
    expect(screen.getByText("Client unwell")).toBeInTheDocument();

    fireEvent.click(screen.getByText("×"));
    expect(screen.queryByText("Cancellation details")).not.toBeInTheDocument();
  });

  it("falls back to N/A when the row carries no cancellation block", async () => {
    clientApi.GetClientCancelAppointments.mockResolvedValue(
      listPayload([richAppt])
    );
    renderTab();
    openTab("Cancelled Appointments");
    await waitFor(() => expect(rows()).toHaveLength(1));

    // Hand the details panel a row without the block the transform normally
    // attaches, which is the only way to reach its own fallbacks.
    act(() => table.props.onActionClick({ id: "a1" }));

    expect(screen.getAllByText("N/A")).toHaveLength(3);
    expect(screen.getByText("No reason provided")).toBeInTheDocument();
  });
});
