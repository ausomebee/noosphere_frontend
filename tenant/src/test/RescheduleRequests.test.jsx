import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../ReduxStore/features/authentication";

/**
 * The Reschedule Requests tab. Clients ask to move an appointment; this tab
 * lists those requests with the old and the new slot side by side and lets a
 * clinician approve, reject or counter-propose, one row at a time from the row
 * menu or in bulk from the checkbox selection.
 *
 * The request payload nests the appointment inside the request, so the client,
 * clinicians and services come from one object while the proposed slot comes
 * from the other; the same row builder also has to cope with a bare
 * appointment, which is what the notification deep-link fetches. Both shapes
 * are exercised here.
 *
 * The table and the three modals are probes. Approve, reject and modify all
 * take a "clear the selection" callback from whichever caller invoked them, so
 * the tests drive them through the row menu and the bulk buttons separately.
 */

const api = vi.hoisted(() => ({
  GetRescheduleAppointmentReqByTenantId: vi.fn(),
  GetRescheduleAppointmentReqByStaffId: vi.fn(),
  GetRescheduleAppointmentReqByClientId: vi.fn(),
  GetAppointmentById: vi.fn(),
  ApproveRescheduledReq: vi.fn(),
  RejectRescheduledReq: vi.fn(),
  RescheduleAppointments: vi.fn(),
}));

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
const navigate = vi.hoisted(() => vi.fn());
const probes = vi.hoisted(() => ({}));

vi.mock("../api/AppointmentApi", () => ({ default: api }));

vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
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
  "../Components/ReusableModal/SchedulerModal/RescheduleRequestActionModal",
  () => ({
    default: (props) => {
      probes.action = props;
      return props.isOpen ? <div data-testid="action-modal" /> : null;
    },
  })
);

vi.mock("../Components/ReusableModal/SchedulerModal/RescheduleModal", () => ({
  default: (props) => {
    probes.reschedule = props;
    return props.isOpen ? <div data-testid="reschedule-modal" /> : null;
  },
}));

vi.mock(
  "../Components/ReusableModal/SchedulerModal/RejectConfirmationModal",
  () => ({
    default: (props) => {
      probes.reject = props;
      return props.isOpen ? <div data-testid="reject-modal" /> : null;
    },
  })
);

import RescheduleRequests from "../Pages/Scheduler/SchdedulerSubs/AppointmentSubs/RescheduleRequests";

const listPayload = (rows) => ({ data: { data: rows } });

// The API nests the appointment inside the request: the client, clinicians,
// session and services live on the appointment, the proposed slot on the
// request itself.
const wrappedRequest = {
  id: "req-1",
  appointmentId: "a1",
  clientId: "c1",
  date: "2030-04-05",
  startTime: "13:00",
  endTime: "14:00",
  reasonForReschedule: "Traffic",
  status: "Pending",
  appointment: {
    id: "a1",
    clientId: "c1",
    client: { firstName: "Ada", lastName: "Lovelace" },
    clinicians: [{ id: 7, fullName: "Grace Hopper" }],
    session: { name: "Direct Therapy" },
    appointmentServices: [
      { serviceCode: { code: "97153" }, modifiers: { modifier: "HN" } },
    ],
    date: "2030-04-01",
    startTime: "09:00",
    endTime: "10:00",
  },
};

// A request whose nested appointment tells us nothing at all.
const emptyRequest = { id: "req-2", appointment: {} };

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

const roleWith = (...permissions) => ({
  role: {
    name: "Admin",
    roleModuleAccesses: [{ module: "SCHEDULER", permissions }],
  },
});

const renderTab = async ({ user, state = null, ...props } = {}) => {
  const view = render(
    <Provider store={makeStore(user)}>
      <MemoryRouter initialEntries={[{ pathname: "/scheduler", state }]}>
        <RescheduleRequests {...props} />
      </MemoryRouter>
    </Provider>
  );
  await waitFor(() => expect(probes.table.loading).toBe(false));
  return view;
};

const rows = () => probes.table.data;

const rowAction = (label) =>
  probes.table.actions[0].items.find((i) => i.label === label);

// The table reports a selection as (indexes, items); the page only reads the
// second argument.
const select = (items) =>
  act(() => probes.table.onSelectionChange([], items));

let consoleError;

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(probes).forEach((k) => delete probes[k]);

  api.GetRescheduleAppointmentReqByTenantId.mockResolvedValue(listPayload([]));
  api.GetRescheduleAppointmentReqByStaffId.mockResolvedValue(listPayload([]));
  api.GetRescheduleAppointmentReqByClientId.mockResolvedValue(listPayload([]));
  api.GetAppointmentById.mockResolvedValue({});
  api.ApproveRescheduledReq.mockResolvedValue({});
  api.RejectRescheduledReq.mockResolvedValue({});
  api.RescheduleAppointments.mockResolvedValue({});

  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("choosing an endpoint", () => {
  it("asks for the whole tenant's requests by default", async () => {
    await renderTab();
    expect(api.GetRescheduleAppointmentReqByTenantId).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
  });

  it("asks only for a clinician's own requests when they are staff", async () => {
    await renderTab({ user: { role: { name: "Staff" } } });
    expect(api.GetRescheduleAppointmentReqByStaffId).toHaveBeenCalledWith({
      staffId: "user-1",
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
  });

  it("treats a session with no role as a client and still asks by tenant", async () => {
    await renderTab({ user: { role: undefined } });
    expect(api.GetRescheduleAppointmentReqByTenantId).toHaveBeenCalled();
  });

  it("scopes to one client when the panel supplies a client id", async () => {
    await renderTab({ clientId: "client-9" });
    expect(api.GetRescheduleAppointmentReqByClientId).toHaveBeenCalledWith({
      clientId: "client-9",
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
    expect(api.GetRescheduleAppointmentReqByTenantId).not.toHaveBeenCalled();
  });

  it("reports the request count back to the parent tab", async () => {
    const setCounts = vi.fn();
    api.GetRescheduleAppointmentReqByTenantId.mockResolvedValue(
      listPayload([wrappedRequest])
    );
    await renderTab({ setCounts });

    expect(setCounts.mock.calls[0][0]({ rescheduleRequests: 0 })).toEqual({
      rescheduleRequests: 1,
    });
  });

  it("treats a bodyless response as no requests", async () => {
    api.GetRescheduleAppointmentReqByTenantId.mockResolvedValue({});
    await renderTab();
    expect(rows()).toEqual([]);
  });

  it("shows an error panel when the fetch fails", async () => {
    api.GetRescheduleAppointmentReqByTenantId.mockRejectedValue(
      new Error("down")
    );
    await renderTab();

    expect(screen.getByText("Oops!")).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith(
      "Fetch error:",
      expect.any(Error)
    );
  });

  it("shows an error panel for a failure that carries no message", async () => {
    api.GetRescheduleAppointmentReqByTenantId.mockRejectedValue({});
    await renderTab();
    expect(screen.getByText("Oops!")).toBeInTheDocument();
  });
});

describe("request rows", () => {
  it("splits the old and the new slot across the two columns", async () => {
    api.GetRescheduleAppointmentReqByTenantId.mockResolvedValue(
      listPayload([wrappedRequest])
    );
    await renderTab();

    expect(rows()[0]).toMatchObject({
      id: "req-1",
      appointmentId: "a1",
      clientId: "c1",
      clientName: "Ada Lovelace",
      therapistName: "Grace Hopper",
      serviceType: "97153 (HN)",
      sessionType: "Direct Therapy",
      prevDateTime: { date: "2030-04-01", time: "09:00 - 10:00" },
      newDateTime: { date: "2030-04-05", time: "13:00 - 14:00" },
      date: "2030-04-05",
      reason: "Traffic",
      hasActions: true,
      hasCheckbox: true,
    });
  });

  it("prefers an explicit previous slot over the appointment's own", async () => {
    api.GetRescheduleAppointmentReqByTenantId.mockResolvedValue(
      listPayload([
        {
          ...wrappedRequest,
          appointment: {
            ...wrappedRequest.appointment,
            previousDate: "2030-03-25",
            previousStartTime: "08:00",
            previousEndTime: "08:45",
          },
        },
      ])
    );
    await renderTab();

    expect(rows()[0].prevDateTime).toEqual({
      date: "2030-03-25",
      time: "08:00 - 08:45",
    });
  });

  it("fills in every gap for a request that carries nothing", async () => {
    api.GetRescheduleAppointmentReqByTenantId.mockResolvedValue(
      listPayload([emptyRequest])
    );
    await renderTab();

    expect(rows()[0]).toMatchObject({
      id: "req-2",
      clientName: "Unknown Client",
      therapistName: "Unassigned",
      serviceType: "N/A",
      sessionType: "N/A",
      prevDateTime: { date: "N/A", time: "N/A" },
      newDateTime: { date: "N/A", time: "N/A" },
      reason: "",
      therapistNames: [],
      serviceTypes: [],
    });
  });

  it("says N/A for a slot that has only half its times", async () => {
    api.GetRescheduleAppointmentReqByTenantId.mockResolvedValue(
      listPayload([{ ...wrappedRequest, startTime: "13:00", endTime: null }])
    );
    await renderTab();
    expect(rows()[0].newDateTime.time).toBe("N/A");
  });

  it("names a clinician with no name and a service with no code", async () => {
    api.GetRescheduleAppointmentReqByTenantId.mockResolvedValue(
      listPayload([
        {
          ...wrappedRequest,
          appointment: {
            ...wrappedRequest.appointment,
            clinicians: [{ id: 7 }],
            appointmentServices: [{}],
          },
        },
      ])
    );
    await renderTab();

    expect(rows()[0].therapistName).toBe("Unassigned");
    expect(rows()[0].serviceType).toBe("N/A");
  });
});

describe("filters", () => {
  beforeEach(() => {
    api.GetRescheduleAppointmentReqByTenantId.mockResolvedValue(
      listPayload([wrappedRequest, emptyRequest])
    );
  });

  it("offers the distinct clinicians, sessions, services and dates", async () => {
    await renderTab();
    const [clinician, session, service, date] = probes.table.filters;

    expect(clinician.filterValues).toEqual([
      { value: "Grace Hopper", label: "Grace Hopper" },
    ]);
    expect(session.filterValues.map((v) => v.value)).toEqual([
      "Direct Therapy",
      "N/A",
    ]);
    expect(service.filterValues).toEqual([
      { value: "97153 (HN)", label: "97153 (HN)" },
    ]);
    expect(date.filterValues).toEqual([
      { value: "2030-04-05", label: "2030-04-05" },
    ]);
  });

  it("keeps every row when a filter is left unset", async () => {
    await renderTab();
    probes.table.filters.forEach((f) => {
      expect(f.filterFunction(rows()[0], "")).toBe(true);
    });
  });

  it("matches a row on each of the four filters", async () => {
    await renderTab();
    const [clinician, session, service, date] = probes.table.filters;
    const row = rows()[0];

    expect(clinician.filterFunction(row, "Grace Hopper")).toBe(true);
    expect(clinician.filterFunction(row, "Alan Turing")).toBe(false);
    expect(session.filterFunction(row, "Direct Therapy")).toBe(true);
    expect(session.filterFunction(row, "Assessment")).toBe(false);
    expect(service.filterFunction(row, "97153 (HN)")).toBe(true);
    expect(service.filterFunction(row, "97155")).toBe(false);
    expect(date.filterFunction(row, "2030-04-05")).toBe(true);
    expect(date.filterFunction(row, "2030-04-06")).toBe(false);
  });
});

describe("approving", () => {
  beforeEach(() => {
    api.GetRescheduleAppointmentReqByTenantId.mockResolvedValue(
      listPayload([wrappedRequest, emptyRequest])
    );
  });

  it("approves a single request from the row menu and drops the row", async () => {
    const setCounts = vi.fn();
    await renderTab({ setCounts });
    setCounts.mockClear();

    await act(async () => {
      await rowAction("Approve").onClick(rows()[0]);
    });

    expect(api.ApproveRescheduledReq).toHaveBeenCalledWith({
      appointments: [{ id: "req-1" }],
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
    expect(rows().map((r) => r.id)).toEqual(["req-2"]);
    expect(
      setCounts.mock.calls[0][0]({
        rescheduleRequests: 2,
        upcomingAppointments: 5,
      })
    ).toEqual({ rescheduleRequests: 1, upcomingAppointments: 6 });
    expect(toast.showToast).toHaveBeenCalledWith(
      "Reschedule request approved",
      "success"
    );
  });

  it("approves everything that is ticked from the bulk button", async () => {
    await renderTab();
    select(rows());

    await act(async () => {
      fireEvent.click(screen.getByText("Approve"));
    });

    expect(api.ApproveRescheduledReq).toHaveBeenCalledWith(
      expect.objectContaining({
        appointments: [{ id: "req-1" }, { id: "req-2" }],
      })
    );
    expect(rows()).toEqual([]);
  });

  it("refuses an approval for a row that is not there", async () => {
    await renderTab();
    await act(async () => {
      await rowAction("Approve").onClick(undefined);
    });

    // Nothing reaches the endpoint: reading the id off the missing row throws
    // before the "no appointments selected" guard is ever consulted.
    expect(api.ApproveRescheduledReq).not.toHaveBeenCalled();
    expect(screen.getByText("Oops!")).toBeInTheDocument();
  });

  it("reports a failed approval", async () => {
    api.ApproveRescheduledReq.mockRejectedValue(new Error("server said no"));
    await renderTab();
    await act(async () => {
      await rowAction("Approve").onClick(rows()[0]);
    });

    expect(toast.showToast).toHaveBeenCalledWith("server said no", "error");
    expect(rows()).toHaveLength(2);
  });

  it("reports a failed approval that carries no message", async () => {
    api.ApproveRescheduledReq.mockRejectedValue({});
    await renderTab();
    await act(async () => {
      await rowAction("Approve").onClick(rows()[0]);
    });

    expect(toast.showToast).toHaveBeenCalledWith(
      "Failed to approve reschedule request",
      "error"
    );
  });
});

describe("rejecting", () => {
  beforeEach(() => {
    api.GetRescheduleAppointmentReqByTenantId.mockResolvedValue(
      listPayload([wrappedRequest, emptyRequest])
    );
  });

  it("opens the confirmation on the chosen row", async () => {
    await renderTab();
    act(() => rowAction("Reject").onClick(rows()[0]));

    expect(screen.getByTestId("reject-modal")).toBeInTheDocument();
    expect(probes.reject.appointments).toHaveLength(1);
  });

  it("rejects a list of requests and moves the counts", async () => {
    const setCounts = vi.fn();
    await renderTab({ setCounts });
    setCounts.mockClear();

    select(rows());
    fireEvent.click(screen.getByText("Reject"));
    await act(async () => {
      await probes.reject.onConfirm({ appointments: rows() });
    });

    expect(api.RejectRescheduledReq).toHaveBeenCalledWith(
      expect.objectContaining({
        appointments: [{ id: "req-1" }, { id: "req-2" }],
      })
    );
    expect(rows()).toEqual([]);
    expect(
      setCounts.mock.calls[0][0]({
        rescheduleRequests: 2,
        cancelledAppointments: 3,
      })
    ).toEqual({ rescheduleRequests: 0, cancelledAppointments: 5 });
    expect(screen.queryByTestId("reject-modal")).not.toBeInTheDocument();
  });

  it("rejects a single request handed over on its own", async () => {
    await renderTab();
    act(() => rowAction("Reject").onClick(rows()[0]));
    await act(async () => {
      await probes.reject.onConfirm({ appointments: { id: "req-1" } });
    });

    expect(api.RejectRescheduledReq).toHaveBeenCalledWith(
      expect.objectContaining({ appointments: [{ id: "req-1" }] })
    );
  });

  it("reports a failed rejection and keeps the modal open", async () => {
    api.RejectRescheduledReq.mockRejectedValue(new Error("too late"));
    await renderTab();
    act(() => rowAction("Reject").onClick(rows()[0]));
    await act(async () => {
      await probes.reject.onConfirm({ appointments: [{ id: "req-1" }] });
    });

    expect(toast.showToast).toHaveBeenCalledWith("too late", "error");
    expect(screen.getByTestId("reject-modal")).toBeInTheDocument();
  });

  it("reports a failed rejection that carries no message", async () => {
    api.RejectRescheduledReq.mockRejectedValue({});
    await renderTab();
    act(() => rowAction("Reject").onClick(rows()[0]));
    await act(async () => {
      await probes.reject.onConfirm({ appointments: [{ id: "req-1" }] });
    });

    expect(toast.showToast).toHaveBeenCalledWith(
      "Failed to reject reschedule request",
      "error"
    );
  });

  it("closes the confirmation without rejecting", async () => {
    await renderTab();
    act(() => rowAction("Reject").onClick(rows()[0]));
    act(() => probes.reject.onClose());

    expect(screen.queryByTestId("reject-modal")).not.toBeInTheDocument();
    expect(api.RejectRescheduledReq).not.toHaveBeenCalled();
  });
});

describe("countering with a different slot", () => {
  beforeEach(() => {
    api.GetRescheduleAppointmentReqByTenantId.mockResolvedValue(
      listPayload([wrappedRequest, emptyRequest])
    );
  });

  it("opens the reschedule form on a single request", async () => {
    await renderTab();
    act(() => rowAction("Modify").onClick(rows()[0]));

    expect(screen.getByTestId("reschedule-modal")).toBeInTheDocument();
    expect(probes.reschedule.appointment.id).toBe("req-1");
  });

  it("modifies only the row its menu was opened from, even with several ticked", async () => {
    // There is no bulk Modify: the row menu always hands over exactly one
    // request, whatever the checkbox selection happens to be.
    await renderTab();
    select(rows());
    act(() => rowAction("Modify").onClick(rows()[1]));

    expect(probes.reschedule.appointment).toMatchObject({ id: "req-2" });
  });

  it("sends the new slot for the selected request", async () => {
    await renderTab();
    act(() => rowAction("Modify").onClick(rows()[0]));
    await act(async () => {
      await probes.reschedule.onSave({
        date: "2030-04-09",
        startTime: "15:00",
        endTime: "16:00",
        scope: "all",
      });
    });

    expect(api.RescheduleAppointments).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "req-1",
        date: "2030-04-09",
        forAll: true,
        rescheduled: true,
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith(
      "Appointment rescheduled",
      "success"
    );
    expect(screen.queryByTestId("reschedule-modal")).not.toBeInTheDocument();
  });

  it("sends one call per slot when the modal returns several", async () => {
    await renderTab();
    act(() => rowAction("Modify").onClick(rows()[0]));
    await act(async () => {
      await probes.reschedule.onSave([
        { date: "2030-04-09", startTime: "15:00", endTime: "16:00" },
        { date: "2030-04-10", startTime: "15:00", endTime: "16:00" },
      ]);
    });

    expect(api.RescheduleAppointments).toHaveBeenCalledTimes(2);
    // Neither slot carried an id of its own: the first lines up with the
    // selected request by position, and the second, having no counterpart,
    // falls back to that same request.
    expect(api.RescheduleAppointments.mock.calls[0][0].id).toBe("req-1");
    expect(api.RescheduleAppointments.mock.calls[1][0].id).toBe("req-1");
    expect(api.RescheduleAppointments.mock.calls[0][0].forAll).toBe(false);
  });

  it("reports a failed counter-proposal", async () => {
    api.RescheduleAppointments.mockRejectedValue(new Error("slot taken"));
    await renderTab();
    act(() => rowAction("Modify").onClick(rows()[0]));
    await act(async () => {
      await probes.reschedule.onSave({ date: "2030-04-09" });
    });

    expect(toast.showToast).toHaveBeenCalledWith("slot taken", "error");
    expect(screen.getByTestId("reschedule-modal")).toBeInTheDocument();
  });

  it("reports a failure that carries no message", async () => {
    api.RescheduleAppointments.mockRejectedValue({});
    await renderTab();
    act(() => rowAction("Modify").onClick(rows()[0]));
    await act(async () => {
      await probes.reschedule.onSave({ date: "2030-04-09" });
    });

    expect(toast.showToast).toHaveBeenCalledWith(
      "Failed to reschedule appointment",
      "error"
    );
  });

  it("closes the reschedule form without saving", async () => {
    await renderTab();
    act(() => rowAction("Modify").onClick(rows()[0]));
    act(() => probes.reschedule.onClose());

    expect(screen.queryByTestId("reschedule-modal")).not.toBeInTheDocument();
    expect(api.RescheduleAppointments).not.toHaveBeenCalled();
  });
});

describe("selection and permissions", () => {
  beforeEach(() => {
    api.GetRescheduleAppointmentReqByTenantId.mockResolvedValue(
      listPayload([wrappedRequest])
    );
  });

  it("hides the bulk buttons until something is ticked", async () => {
    await renderTab();
    expect(screen.queryByText("Approve")).not.toBeInTheDocument();

    select(rows());
    expect(screen.getByText("Approve")).toBeInTheDocument();
    expect(screen.getByText("Reject")).toBeInTheDocument();
  });

  it("hides the bulk buttons from a role that cannot reschedule", async () => {
    await renderTab({ user: roleWith("view_appointments") });
    select(rows());
    expect(screen.queryByText("Approve")).not.toBeInTheDocument();
  });

  it("offers no row actions to a role that cannot reschedule", async () => {
    await renderTab({ user: roleWith("view_appointments") });
    expect(probes.table.actions[0].items).toEqual([]);
  });

  it("clears the selection when the table resets it", async () => {
    await renderTab();
    select(rows());
    expect(screen.getByText("Approve")).toBeInTheDocument();

    act(() => probes.table.onSelectionChange([], [], true));
    expect(screen.queryByText("Approve")).not.toBeInTheDocument();
  });
});

describe("arriving from a notification", () => {
  it("does nothing without a focus id", async () => {
    await renderTab();
    expect(api.GetAppointmentById).not.toHaveBeenCalled();
    expect(screen.queryByTestId("action-modal")).not.toBeInTheDocument();
  });

  it("fetches the appointment and pairs it with the proposed slot", async () => {
    api.GetAppointmentById.mockResolvedValue(
      listPayload(wrappedRequest.appointment)
    );
    await renderTab({
      state: {
        focusId: "a1",
        proposedSlot: {
          date: "2030-04-05",
          startTime: "13:00",
          endTime: "14:00",
        },
      },
    });

    await waitFor(() =>
      expect(screen.getByTestId("action-modal")).toBeInTheDocument()
    );
    expect(probes.action.request).toMatchObject({
      // A bare appointment has no request id, so the row falls back to the
      // appointment's own id.
      id: "a1",
      clientName: "Ada Lovelace",
      newDateTime: { date: "2030-04-05", time: "13:00 - 14:00" },
      prevDateTime: { date: "2030-04-01", time: "09:00 - 10:00" },
    });
  });

  it("shows no proposed slot when the notification carried none", async () => {
    api.GetAppointmentById.mockResolvedValue(
      listPayload(wrappedRequest.appointment)
    );
    await renderTab({ state: { focusId: "a1" } });

    await waitFor(() =>
      expect(screen.getByTestId("action-modal")).toBeInTheDocument()
    );
    expect(probes.action.request.newDateTime).toEqual({
      date: "N/A",
      time: "N/A",
    });
  });

  it("opens nothing when the lookup fails, list or no list", async () => {
    // The deep-link fires once, on mount, before the request list has landed,
    // so its "fall back to the loaded row" path never has a list to search --
    // a failed lookup leaves the modal shut even for a request that is on
    // screen a moment later.
    api.GetRescheduleAppointmentReqByTenantId.mockResolvedValue(
      listPayload([wrappedRequest])
    );
    api.GetAppointmentById.mockRejectedValue(new Error("gone"));
    await renderTab({ state: { focusId: "a1" } });

    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(screen.queryByTestId("action-modal")).not.toBeInTheDocument();
  });

  it("opens nothing when neither the lookup nor the list has it", async () => {
    api.GetAppointmentById.mockRejectedValue(new Error("gone"));
    await renderTab({ state: { focusId: "missing" } });

    await waitFor(() => expect(api.GetAppointmentById).toHaveBeenCalled());
    expect(screen.queryByTestId("action-modal")).not.toBeInTheDocument();
  });

  it("opens nothing when the lookup returns no appointment", async () => {
    api.GetAppointmentById.mockResolvedValue({});
    await renderTab({ state: { focusId: "missing" } });

    await waitFor(() => expect(api.GetAppointmentById).toHaveBeenCalled());
    expect(screen.queryByTestId("action-modal")).not.toBeInTheDocument();
  });
});

describe("the notification action modal", () => {
  const openAction = async () => {
    api.GetAppointmentById.mockResolvedValue(
      listPayload(wrappedRequest.appointment)
    );
    await renderTab({ state: { focusId: "a1" } });
    await waitFor(() =>
      expect(screen.getByTestId("action-modal")).toBeInTheDocument()
    );
  };

  it("approves straight from the modal", async () => {
    await openAction();
    await act(async () => {
      await probes.action.onApprove();
    });

    expect(api.ApproveRescheduledReq).toHaveBeenCalledWith(
      expect.objectContaining({ appointments: [{ id: "a1" }] })
    );
    expect(screen.queryByTestId("action-modal")).not.toBeInTheDocument();
  });

  it("hands the request over to the reschedule form", async () => {
    await openAction();
    act(() => probes.action.onModify());
    expect(screen.getByTestId("reschedule-modal")).toBeInTheDocument();
  });

  it("hands the request over to the reject confirmation", async () => {
    await openAction();
    act(() => probes.action.onReject());
    expect(screen.getByTestId("reject-modal")).toBeInTheDocument();
  });

  it("closes without acting", async () => {
    await openAction();
    act(() => probes.action.onClose());
    expect(screen.queryByTestId("action-modal")).not.toBeInTheDocument();
  });

  it("does nothing once the modal has already been dismissed", async () => {
    await openAction();
    act(() => probes.action.onClose());
    act(() => probes.action.onModify());
    expect(screen.queryByTestId("reschedule-modal")).not.toBeInTheDocument();
  });
});
