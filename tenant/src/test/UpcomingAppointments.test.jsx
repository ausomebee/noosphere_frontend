import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../ReduxStore/features/authentication";

/**
 * The scheduler's Upcoming Appointments tab. It loads the master appointments
 * for the tenant (or just the signed-in clinician's, depending on the role),
 * expands each recurring master into its future instances, and renders them as
 * table rows with an edit / reschedule / cancel / start action menu gated on
 * permissions.
 *
 * The tab also honours a notification deep-link: arriving with a `focusId` in
 * the router state makes it fetch that one appointment by id and open a
 * read-only details modal, whose four action buttons appear only for the
 * permissions the role grants. That path is driven here by rendering inside a
 * MemoryRouter carrying the state.
 *
 * The table and all four modals are probes, so the row transform, the filter
 * predicates and every modal callback are asserted against the props the page
 * hands down rather than against markup.
 */

const api = vi.hoisted(() => ({
  GetUpcomingAppointmentByTenantId: vi.fn(),
  GetUpcomingAppointmentByStaffId: vi.fn(),
  GetSessionTypeActiveByTenantId: vi.fn(),
  GetClientByTenantId: vi.fn(),
  GetTenantStaffByTenantId: vi.fn(),
  GetAppointmentById: vi.fn(),
  CreateAppointments: vi.fn(),
  UpdateAppointments: vi.fn(),
  RescheduleAppointments: vi.fn(),
  CancelAppointments: vi.fn(),
}));

const toast = vi.hoisted(() => ({
  showToast: vi.fn(),
  showApiError: vi.fn(),
}));

const navigate = vi.hoisted(() => vi.fn());

const probes = vi.hoisted(() => ({}));

vi.mock("../api/AppointmentApi", () => ({ default: api }));

vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: (...a) => toast.showApiError(...a),
}));

vi.mock("../hooks/useFormatSettings", () => ({
  default: () => ({ dateFormat: "MM/DD/YYYY", timeFormat: "24-hour" }),
}));

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
  "../Components/ReusableModal/SchedulerModal/AppointmentViewModal",
  () => ({
    default: (props) => {
      probes.view = props;
      return props.isOpen ? <div data-testid="view-modal" /> : null;
    },
  })
);

vi.mock("../Components/ReusableModal/SchedulerModal/AppointmentModal", () => ({
  default: (props) => {
    probes.edit = props;
    return props.isOpen ? <div data-testid="edit-modal" /> : null;
  },
}));

vi.mock("../Components/ReusableModal/SchedulerModal/RescheduleModal", () => ({
  default: (props) => {
    probes.reschedule = props;
    return props.isOpen ? <div data-testid="reschedule-modal" /> : null;
  },
}));

vi.mock("../Components/ReusableModal/SchedulerModal/CancelModal", () => ({
  default: (props) => {
    probes.cancel = props;
    return props.isOpen ? <div data-testid="cancel-modal" /> : null;
  },
}));

import UpcomingAppointments from "../Pages/Scheduler/SchdedulerSubs/AppointmentSubs/UpcomingAppointments";

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const today = iso(new Date());
const tomorrow = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return iso(d);
})();

const listPayload = (rows) => ({ data: { data: rows } });

const richAppt = {
  id: "a1",
  clientId: "c1",
  client: { id: "cl-1", firstName: "Ada", lastName: "Lovelace" },
  clinicians: [{ id: 7, fullName: "Grace Hopper" }],
  appointmentServices: [
    { serviceCode: { code: "97153" }, modifiers: { modifier: "HN" } },
  ],
  session: { id: "st1", name: "Direct Therapy" },
  date: tomorrow,
  startTime: "09:00",
  endTime: "10:00",
  colourCode: "#123456",
};

// No client, clinicians, services, session name or colour: every fallback in
// the row transform fires on this one.
const bareAppt = {
  id: "a2",
  date: today,
  startTime: "11:00",
  endTime: "12:00",
  session: {},
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

// A role with a non-empty module access restricts the page; an empty one is
// the org-owner case and grants everything.
const roleWith = (...permissions) => ({
  role: {
    name: "Admin",
    roleModuleAccesses: [{ module: "SCHEDULER", permissions }],
  },
});

const setCounts = vi.fn();

const renderTab = async ({ user, state = null } = {}) => {
  const view = render(
    <Provider store={makeStore(user)}>
      <MemoryRouter initialEntries={[{ pathname: "/scheduler", state }]}>
        <UpcomingAppointments setCounts={setCounts} />
      </MemoryRouter>
    </Provider>
  );
  await waitFor(() => expect(probes.table.loading).toBe(false));
  return view;
};

const rows = () => probes.table.data;

const rowAction = (label) =>
  probes.table.actions[0].items.find((i) => i.label === label);

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(probes).forEach((k) => delete probes[k]);

  api.GetUpcomingAppointmentByTenantId.mockResolvedValue(listPayload([]));
  api.GetUpcomingAppointmentByStaffId.mockResolvedValue(listPayload([]));
  api.GetSessionTypeActiveByTenantId.mockResolvedValue(listPayload([]));
  api.GetClientByTenantId.mockResolvedValue(listPayload([]));
  api.GetTenantStaffByTenantId.mockResolvedValue(listPayload([]));
  api.GetAppointmentById.mockResolvedValue({});
  api.CreateAppointments.mockResolvedValue({});
  api.UpdateAppointments.mockResolvedValue({});
  api.RescheduleAppointments.mockResolvedValue({});
  api.CancelAppointments.mockResolvedValue({});
});

describe("loading the list", () => {
  it("asks for the whole tenant's appointments for an admin", async () => {
    await renderTab();
    expect(api.GetUpcomingAppointmentByTenantId).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
    expect(api.GetUpcomingAppointmentByStaffId).not.toHaveBeenCalled();
  });

  it("asks only for their own appointments for anyone else", async () => {
    await renderTab({ user: { role: { name: "Therapist" } } });
    expect(api.GetUpcomingAppointmentByStaffId).toHaveBeenCalledWith({
      staffId: "user-1",
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
  });

  it("treats a session with no role at all as a client", async () => {
    await renderTab({ user: { role: undefined } });
    expect(api.GetUpcomingAppointmentByStaffId).toHaveBeenCalled();
  });

  it("keeps an empty table when the payload has no data", async () => {
    api.GetUpcomingAppointmentByTenantId.mockResolvedValue({ data: {} });
    await renderTab();
    expect(rows()).toEqual([]);
  });

  it("swallows a failing list fetch without a toast", async () => {
    api.GetUpcomingAppointmentByTenantId.mockRejectedValue(new Error("down"));
    await renderTab();
    expect(rows()).toEqual([]);
    expect(toast.showToast).not.toHaveBeenCalled();
  });

  it("hands the supporting lists to the edit modal", async () => {
    api.GetSessionTypeActiveByTenantId.mockResolvedValue(
      listPayload([{ id: "st1" }])
    );
    api.GetClientByTenantId.mockResolvedValue(listPayload([{ id: "c1" }]));
    api.GetTenantStaffByTenantId.mockResolvedValue(listPayload([{ id: "s1" }]));
    await renderTab();

    await waitFor(() => expect(probes.edit.sessionTypes).toHaveLength(1));
    expect(probes.edit.clients).toHaveLength(1);
    expect(probes.edit.staff).toHaveLength(1);
  });

  it("falls back to empty supporting lists when the payloads are bare", async () => {
    api.GetSessionTypeActiveByTenantId.mockResolvedValue({ data: {} });
    api.GetClientByTenantId.mockResolvedValue({ data: {} });
    api.GetTenantStaffByTenantId.mockResolvedValue({ data: {} });
    await renderTab();

    expect(probes.edit.sessionTypes).toEqual([]);
    expect(probes.edit.clients).toEqual([]);
    expect(probes.edit.staff).toEqual([]);
  });

  it("swallows a failing supporting fetch", async () => {
    api.GetClientByTenantId.mockRejectedValue(new Error("down"));
    await renderTab();
    expect(probes.edit.clients).toEqual([]);
  });
});

describe("table rows", () => {
  it("reads the client, clinician, service and session off a full record", async () => {
    api.GetUpcomingAppointmentByTenantId.mockResolvedValue(
      listPayload([richAppt])
    );
    await renderTab();

    expect(rows()[0]).toMatchObject({
      id: "a1",
      clientName: "Ada Lovelace",
      therapistName: "Grace Hopper",
      serviceType: "97153 (HN)",
      sessionType: "Direct Therapy",
      date: tomorrow,
      time: "09:00 - 10:00",
      therapistNames: ["Grace Hopper"],
      serviceTypes: ["97153 (HN)"],
      hasActions: true,
    });
  });

  it("fills in every gap on a record that carries nothing", async () => {
    api.GetUpcomingAppointmentByTenantId.mockResolvedValue(
      listPayload([bareAppt])
    );
    await renderTab();

    expect(rows()[0]).toMatchObject({
      clientName: "Unknown Client",
      therapistName: "Unassigned",
      serviceType: "N/A",
      sessionType: "N/A",
      serviceTypes: [],
    });
  });

  it("says a service code is unknown when the record has no code", async () => {
    api.GetUpcomingAppointmentByTenantId.mockResolvedValue(
      listPayload([{ ...richAppt, appointmentServices: [{}] }])
    );
    await renderTab();
    expect(rows()[0].serviceType).toBe("N/A");
  });

  it("marks a row with no times as having none", async () => {
    api.GetUpcomingAppointmentByTenantId.mockResolvedValue(
      listPayload([{ id: "a3", date: today }])
    );
    await renderTab();
    expect(rows()[0].time).toBe("No Time");
  });

  it("sorts the expanded instances into date order", async () => {
    api.GetUpcomingAppointmentByTenantId.mockResolvedValue(
      listPayload([richAppt, bareAppt])
    );
    await renderTab();
    expect(rows().map((r) => r.id)).toEqual(["a2", "a1"]);
  });

  it("expands a recurring master into one row per occurrence", async () => {
    api.GetUpcomingAppointmentByTenantId.mockResolvedValue(
      listPayload([
        {
          ...richAppt,
          date: today,
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
    api.GetUpcomingAppointmentByTenantId.mockResolvedValue(
      listPayload([richAppt, bareAppt])
    );
  });

  it("offers the distinct clinicians, sessions, services and dates", async () => {
    await renderTab();
    const [clinician, session, service, date] = probes.table.filters;

    expect(clinician.filterValues).toEqual([
      { value: "Grace Hopper", label: "Grace Hopper" },
    ]);
    expect(session.filterValues.map((v) => v.value)).toEqual([
      "N/A",
      "Direct Therapy",
    ]);
    expect(service.filterValues).toEqual([
      { value: "97153 (HN)", label: "97153 (HN)" },
    ]);
    expect(date.filterValues).toHaveLength(2);
    expect(date.filterValues[0].label).toMatch(/\w{3} \d{2}, \d{4}/);
  });

  it("keeps every row when a filter is left unset", async () => {
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
    expect(clinician.filterFunction(row, "Alan Turing")).toBe(false);
    expect(session.filterFunction(row, "Direct Therapy")).toBe(true);
    expect(session.filterFunction(row, "Assessment")).toBe(false);
    expect(service.filterFunction(row, "97153 (HN)")).toBe(true);
    expect(service.filterFunction(row, "97155")).toBe(false);
    expect(date.filterFunction(row, tomorrow)).toBe(true);
    expect(date.filterFunction(row, today)).toBe(false);
  });
});

describe("row actions", () => {
  beforeEach(() => {
    api.GetUpcomingAppointmentByTenantId.mockResolvedValue(
      listPayload([richAppt])
    );
  });

  it("offers every action to a user with unrestricted access", async () => {
    await renderTab();
    expect(probes.table.actions[0].items.map((i) => i.label)).toEqual([
      "Edit",
      "Reschedule",
      "Cancel",
      "Start Appointment",
    ]);
  });

  it("offers only the actions the role grants", async () => {
    await renderTab({ user: roleWith("reschedule_appointments") });
    expect(probes.table.actions[0].items.map((i) => i.label)).toEqual([
      "Reschedule",
    ]);
  });

  it("shapes the row into the modal's own field names for editing", async () => {
    await renderTab();
    act(() => rowAction("Edit").onClick(rows()[0]));

    expect(screen.getByTestId("edit-modal")).toBeInTheDocument();
    expect(probes.edit.initialData).toMatchObject({
      client: "cl-1",
      clinicians: [{ id: "7", fullName: "Grace Hopper" }],
      sessionType: "st1",
      colorCode: "#123456",
    });
    expect(probes.edit.isEditMode).toBe(true);
  });

  it("falls back to the flat ids when the record has no nested objects", async () => {
    api.GetUpcomingAppointmentByTenantId.mockResolvedValue(
      listPayload([
        {
          id: "a4",
          clientId: "c9",
          sessionId: "st9",
          date: today,
          startTime: "09:00",
          endTime: "10:00",
          clinicians: [{ fullName: "No Id" }],
        },
      ])
    );
    await renderTab();
    act(() => rowAction("Edit").onClick(rows()[0]));

    expect(probes.edit.initialData).toMatchObject({
      client: "c9",
      sessionType: "st9",
      // The row transform has already defaulted the colour, so the modal's
      // own empty-string fallback never fires.
      colorCode: "#3B82F6",
      clinicians: [{ id: undefined, fullName: "No Id" }],
    });
  });

  it("opens the reschedule modal on the same record", async () => {
    await renderTab();
    act(() => rowAction("Reschedule").onClick(rows()[0]));
    expect(screen.getByTestId("reschedule-modal")).toBeInTheDocument();
    expect(probes.reschedule.appointment.id).toBe("a1");
  });

  it("opens the cancel modal on the same record", async () => {
    await renderTab();
    act(() => rowAction("Cancel").onClick(rows()[0]));
    expect(screen.getByTestId("cancel-modal")).toBeInTheDocument();
    expect(probes.cancel.appointments).toHaveLength(1);
  });

  it("routes to the session runner", async () => {
    await renderTab();
    act(() => rowAction("Start Appointment").onClick(rows()[0]));
    expect(navigate).toHaveBeenCalledWith("/appointments/start/a1/cl-1");
  });

  it("strips the occurrence stamp off a recurring row's id before starting", async () => {
    api.GetUpcomingAppointmentByTenantId.mockResolvedValue(
      listPayload([
        {
          ...richAppt,
          date: today,
          isRecurring: true,
          recurrence: { type: "day", endType: "after", occurrences: 2 },
        },
      ])
    );
    await renderTab();
    const recurring = rows().find((r) => r.id.includes("_"));
    act(() => rowAction("Start Appointment").onClick(recurring));

    expect(navigate).toHaveBeenCalledWith("/appointments/start/a1/cl-1");
  });

  it("refuses to start a row with no appointment or client id", async () => {
    await renderTab();
    act(() =>
      rowAction("Start Appointment").onClick({ id: null, rawData: {} })
    );
    expect(toast.showToast).toHaveBeenCalledWith(
      "Cannot start: missing appointment or client ID",
      "error"
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it("falls back to the flat client id when starting", async () => {
    await renderTab();
    act(() =>
      rowAction("Start Appointment").onClick({
        id: "a7",
        rawData: { clientId: "c7" },
      })
    );
    expect(navigate).toHaveBeenCalledWith("/appointments/start/a7/c7");
  });
});

describe("saving from the modals", () => {
  const payload = {
    client: "cl-1",
    sessionType: "st1",
    clinicians: ["7"],
    service: [{ serviceCodeId: "sc1" }],
    date: tomorrow,
    startTime: "09:00",
    endTime: "10:00",
    billable: true,
    colorCode: "#123456",
  };

  beforeEach(() => {
    api.GetUpcomingAppointmentByTenantId.mockResolvedValue(
      listPayload([richAppt])
    );
  });

  const openEdit = async () => {
    await renderTab();
    act(() => rowAction("Edit").onClick(rows()[0]));
  };

  it("creates an appointment when no series scope was chosen", async () => {
    await openEdit();
    await act(async () => {
      await probes.edit.onSave(payload);
    });

    expect(api.CreateAppointments).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: "cl-1",
        sessionId: "st1",
        clinicians: [{ id: "7" }],
        recurrence: {},
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith(
      "Appointment updated!",
      "success"
    );
    expect(screen.queryByTestId("edit-modal")).not.toBeInTheDocument();
  });

  it("updates the whole series when the scope says so", async () => {
    await openEdit();
    await act(async () => {
      await probes.edit.onSave({ ...payload, scope: "all" });
    });

    expect(api.UpdateAppointments).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a1", forAll: true })
    );
  });

  it("updates only this occurrence, using the id without its stamp", async () => {
    api.GetUpcomingAppointmentByTenantId.mockResolvedValue(
      listPayload([
        {
          ...richAppt,
          date: today,
          isRecurring: true,
          recurrence: { type: "day", endType: "after", occurrences: 2 },
        },
      ])
    );
    await renderTab();
    const recurring = rows().find((r) => r.id.includes("_"));
    act(() => rowAction("Edit").onClick(recurring));

    await act(async () => {
      await probes.edit.onSave({ ...payload, scope: "this" });
    });
    expect(api.UpdateAppointments).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a1", forAll: false })
    );
  });

  it("carries an explicit recurrence rule into the payload", async () => {
    await openEdit();
    await act(async () => {
      await probes.edit.onSave({
        ...payload,
        isRecurring: true,
        recurrence: { type: "week", days: ["mon"] },
      });
    });
    expect(api.CreateAppointments).toHaveBeenCalledWith(
      expect.objectContaining({
        recurrence: { type: "week", days: ["mon"] },
      })
    );
  });

  it("reports a failed save and leaves the modal open", async () => {
    api.CreateAppointments.mockRejectedValue(new Error("nope"));
    await openEdit();
    await act(async () => {
      await probes.edit.onSave(payload);
    });

    expect(toast.showApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "UPDATE_APPOINTMENT"
    );
    expect(screen.getByTestId("edit-modal")).toBeInTheDocument();
  });

  it("closes the edit modal without saving", async () => {
    await openEdit();
    act(() => probes.edit.onClose());
    expect(screen.queryByTestId("edit-modal")).not.toBeInTheDocument();
  });

  it("reschedules and closes", async () => {
    await renderTab();
    act(() => rowAction("Reschedule").onClick(rows()[0]));
    await act(async () => {
      await probes.reschedule.onSave({
        date: tomorrow,
        startTime: "13:00",
        endTime: "14:00",
        scope: "all",
      });
    });

    expect(api.RescheduleAppointments).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a1", forAll: true })
    );
    expect(screen.queryByTestId("reschedule-modal")).not.toBeInTheDocument();
  });

  it("reports a failed reschedule", async () => {
    api.RescheduleAppointments.mockRejectedValue(new Error("busy"));
    await renderTab();
    act(() => rowAction("Reschedule").onClick(rows()[0]));
    await act(async () => {
      await probes.reschedule.onSave({ scope: "this" });
    });

    expect(toast.showApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "RESCHEDULE_APPOINTMENT"
    );
    expect(screen.getByTestId("reschedule-modal")).toBeInTheDocument();
  });

  it("closes the reschedule modal without saving", async () => {
    await renderTab();
    act(() => rowAction("Reschedule").onClick(rows()[0]));
    act(() => probes.reschedule.onClose());
    expect(screen.queryByTestId("reschedule-modal")).not.toBeInTheDocument();
  });

  it("cancels, and moves the appointment between the tab counts", async () => {
    await renderTab();
    act(() => rowAction("Cancel").onClick(rows()[0]));
    await act(async () => {
      await probes.cancel.onSave({ reason: "Client unwell" });
    });

    expect(api.CancelAppointments).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "Client unwell", forAll: true })
    );
    expect(
      setCounts.mock.calls[0][0]({
        upcomingAppointments: 4,
        cancelledAppointments: 1,
      })
    ).toEqual({ upcomingAppointments: 3, cancelledAppointments: 2 });
    expect(screen.queryByTestId("cancel-modal")).not.toBeInTheDocument();
  });

  it("reports a failed cancellation and leaves the counts alone", async () => {
    api.CancelAppointments.mockRejectedValue(new Error("too late"));
    await renderTab();
    act(() => rowAction("Cancel").onClick(rows()[0]));
    await act(async () => {
      await probes.cancel.onSave({ reason: "x" });
    });

    expect(toast.showApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "CANCEL_APPOINTMENT"
    );
    expect(setCounts).not.toHaveBeenCalled();
  });

  it("closes the cancel modal without saving", async () => {
    await renderTab();
    act(() => rowAction("Cancel").onClick(rows()[0]));
    act(() => probes.cancel.onClose());
    expect(screen.queryByTestId("cancel-modal")).not.toBeInTheDocument();
  });
});

describe("arriving from a notification", () => {
  const focus = { focusId: "a1" };

  it("does nothing without a focus id in the router state", async () => {
    await renderTab();
    expect(api.GetAppointmentById).not.toHaveBeenCalled();
    expect(screen.queryByTestId("view-modal")).not.toBeInTheDocument();
  });

  it("fetches the appointment by id and opens read-only details", async () => {
    api.GetAppointmentById.mockResolvedValue(listPayload(richAppt));
    await renderTab({ state: focus });

    await waitFor(() =>
      expect(screen.getByTestId("view-modal")).toBeInTheDocument()
    );
    expect(probes.view.appointment).toMatchObject({
      clientName: "Ada Lovelace",
      therapistName: "Grace Hopper",
      serviceType: "97153 (HN)",
      sessionType: "Direct Therapy",
      time: "09:00 - 10:00",
    });
  });

  it("accepts an appointment returned without a data envelope", async () => {
    api.GetAppointmentById.mockResolvedValue({ data: richAppt });
    await renderTab({ state: focus });
    await waitFor(() =>
      expect(screen.getByTestId("view-modal")).toBeInTheDocument()
    );
  });

  it("fills in the fallbacks for a thin appointment", async () => {
    api.GetAppointmentById.mockResolvedValue(
      listPayload({ id: "a2", session: {} })
    );
    await renderTab({ state: focus });

    await waitFor(() =>
      expect(screen.getByTestId("view-modal")).toBeInTheDocument()
    );
    expect(probes.view.appointment).toMatchObject({
      clientName: "Unknown Client",
      therapistName: "Unassigned",
      serviceType: "N/A",
      sessionType: "N/A",
      time: "",
    });
  });

  it("opens nothing when the appointment cannot be found", async () => {
    api.GetAppointmentById.mockResolvedValue({});
    await renderTab({ state: focus });
    await waitFor(() => expect(api.GetAppointmentById).toHaveBeenCalled());
    expect(screen.queryByTestId("view-modal")).not.toBeInTheDocument();
  });

  it("opens nothing when the lookup fails", async () => {
    api.GetAppointmentById.mockRejectedValue(new Error("gone"));
    await renderTab({ state: focus });
    await waitFor(() => expect(api.GetAppointmentById).toHaveBeenCalled());
    expect(screen.queryByTestId("view-modal")).not.toBeInTheDocument();
  });

  it("looks the master up when the notification names an occurrence", async () => {
    api.GetAppointmentById.mockResolvedValue(listPayload(richAppt));
    await renderTab({ state: { focusId: "a1_1700000000" } });

    await waitFor(() =>
      expect(api.GetAppointmentById).toHaveBeenCalledWith(
        expect.objectContaining({ Id: "a1" })
      )
    );
  });
});

describe("the read-only details modal", () => {
  const openView = async (user) => {
    api.GetAppointmentById.mockResolvedValue(listPayload(richAppt));
    await renderTab({ user, state: { focusId: "a1" } });
    await waitFor(() =>
      expect(screen.getByTestId("view-modal")).toBeInTheDocument()
    );
  };

  it("hands the details straight to the session runner", async () => {
    await openView();
    act(() => probes.view.onStart());
    expect(navigate).toHaveBeenCalledWith("/appointments/start/a1/cl-1");
    expect(screen.queryByTestId("view-modal")).not.toBeInTheDocument();
  });

  it("hands the details to the edit form", async () => {
    await openView();
    act(() => probes.view.onEdit());
    expect(screen.getByTestId("edit-modal")).toBeInTheDocument();
  });

  it("hands the details to the reschedule form", async () => {
    await openView();
    act(() => probes.view.onReschedule());
    expect(screen.getByTestId("reschedule-modal")).toBeInTheDocument();
  });

  it("hands the details to the cancel form", async () => {
    await openView();
    act(() => probes.view.onCancel());
    expect(screen.getByTestId("cancel-modal")).toBeInTheDocument();
  });

  it("closes without doing anything", async () => {
    await openView();
    act(() => probes.view.onClose());
    expect(screen.queryByTestId("view-modal")).not.toBeInTheDocument();
  });

  it("does nothing at all once the details have already been dismissed", async () => {
    await openView();
    act(() => probes.view.onClose());
    act(() => probes.view.onEdit());
    expect(screen.queryByTestId("edit-modal")).not.toBeInTheDocument();
  });

  it("offers no actions to a role that grants none of them", async () => {
    await openView(roleWith("view_appointments"));
    expect(probes.view.onStart).toBeUndefined();
    expect(probes.view.onEdit).toBeUndefined();
    expect(probes.view.onReschedule).toBeUndefined();
    expect(probes.view.onCancel).toBeUndefined();
  });
});
