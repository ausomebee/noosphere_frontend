import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../ReduxStore/features/authentication";

/**
 * The scheduler's calendar shell: a day/week/month switcher, a staff-or-client
 * sidebar filter, an instant client-side search, and the create / edit /
 * reschedule / cancel flows that hang off a calendar event.
 *
 * The shell owns no appointment data of its own -- the parent hands it a list
 * and the callbacks to refetch it -- so nearly every branch here is a gate: a
 * permission that removes a button, a view that decides how far the arrows
 * step, or a save whose payload depends on whether the modal returned a series
 * scope. The three calendar views, the sidebar and all five modals are probes,
 * so those gates are read off the props each child receives.
 *
 * The initial view is chosen from window.innerWidth at mount, which is why the
 * width is set before render in the tests that care about it.
 */

const api = vi.hoisted(() => ({
  CreateAppointments: vi.fn(),
  UpdateAppointments: vi.fn(),
  RescheduleAppointments: vi.fn(),
  CancelAppointments: vi.fn(),
}));

const toast = vi.hoisted(() => ({
  showToast: vi.fn(),
  showApiError: vi.fn(),
}));

const probes = vi.hoisted(() => ({}));

vi.mock("../api/AppointmentApi", () => ({ default: api }));

vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: (...a) => toast.showApiError(...a),
}));

vi.mock("../Components/CalendarScheduler/DayView", () => ({
  default: (props) => {
    probes.day = props;
    return <div data-testid="day-view">{props.appointments.length}</div>;
  },
}));

vi.mock("../Components/CalendarScheduler/WeekView", () => ({
  default: (props) => {
    probes.week = props;
    return <div data-testid="week-view">{props.appointments.length}</div>;
  },
}));

vi.mock("../Components/CalendarScheduler/MonthView", () => ({
  default: (props) => {
    probes.month = props;
    return <div data-testid="month-view">{props.appointments.length}</div>;
  },
}));

vi.mock("../Components/CalendarScheduler/StaffClientFilter", () => ({
  default: (props) => {
    probes.sidebar = props;
    return <div data-testid="sidebar" />;
  },
}));

vi.mock("../Components/ReusableModal/SchedulerModal/AppointmentModal", () => ({
  default: (props) => {
    probes.edit = props;
    return props.isOpen ? <div data-testid="edit-modal" /> : null;
  },
}));

vi.mock("../Components/ReusableModal/SchedulerModal/DatePickerModal", () => ({
  default: (props) => {
    probes.datePicker = props;
    return props.isOpen ? <div data-testid="date-picker-modal" /> : null;
  },
}));

vi.mock(
  "../Components/ReusableModal/SchedulerModal/AppointmentDetailsModal",
  () => ({
    default: (props) => {
      probes.details = props;
      return props.isOpen ? <div data-testid="details-modal" /> : null;
    },
  })
);

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

import CalendarScheduler from "../Components/CalendarScheduler/CalendarScheduler";

const clients = [
  { clientId: "c1", client: { fullName: "Ada Lovelace" } },
  { clientId: "c2", client: { fullName: "Alan Turing" } },
];

const staff = [
  { id: "s1", fullName: "Grace Hopper" },
  { id: "s2", fullName: "Katherine Johnson" },
];

const appointments = [
  {
    id: "a1",
    clientId: "c1",
    clinicianIds: ["s1"],
    service: [{ serviceType: "97153" }],
    date: "2030-04-01",
    startTime: "09:00",
    endTime: "10:00",
  },
  {
    id: "a2_1700000000",
    clientId: "c2",
    // Not an array, so the clinician half of the search predicate short-circuits.
    clinicianIds: null,
    date: "2030-04-02",
    startTime: "11:00",
    endTime: "12:00",
  },
];

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

// A role with a non-empty module access restricts the shell; an empty one is
// the org-owner case and grants everything.
const roleWith = (...permissions) => ({
  role: { roleModuleAccesses: [{ module: "SCHEDULER", permissions }] },
});

const defaults = () => ({
  appointments,
  staff,
  clients,
  sessionTypes: [{ id: "st1", name: "Direct Therapy" }],
  initialDate: new Date(2030, 3, 15),
  accessToken: "access-1",
  refreshToken: "refresh-1",
  tenantId: "tenant-1",
  loading: false,
  selectedClients: ["c1"],
  selectedStaff: ["s1"],
  setSelectedClients: vi.fn(),
  setSelectedStaff: vi.fn(),
  fetchAppointmentsByFilter: vi.fn(),
  refetchAppointments: vi.fn(),
});

let props;

const renderScheduler = ({ user, ...over } = {}) => {
  props = { ...defaults(), ...over };
  return render(
    <Provider store={makeStore(user)}>
      <CalendarScheduler {...props} />
    </Provider>
  );
};

const search = (term) =>
  fireEvent.change(screen.getByPlaceholderText("Search"), {
    target: { value: term },
  });

const openEvent = (appt = appointments[0]) =>
  act(() => probes.month.onAppointmentClick(appt, { top: 10, left: 20 }));

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(probes).forEach((k) => delete probes[k]);
  window.innerWidth = 1200;

  api.CreateAppointments.mockResolvedValue({});
  api.UpdateAppointments.mockResolvedValue({});
  api.RescheduleAppointments.mockResolvedValue({});
  api.CancelAppointments.mockResolvedValue({});
});

afterEach(() => {
  window.innerWidth = 1024;
});

describe("choosing a view", () => {
  it("opens on the month on a wide screen", () => {
    renderScheduler();
    expect(screen.getByTestId("month-view")).toBeInTheDocument();
  });

  it("opens on the week on a medium screen", () => {
    window.innerWidth = 900;
    renderScheduler();
    expect(screen.getByTestId("week-view")).toBeInTheDocument();
  });

  it("opens on the day on a narrow screen", () => {
    window.innerWidth = 500;
    renderScheduler();
    expect(screen.getByTestId("day-view")).toBeInTheDocument();
  });

  it("switches between the three views", () => {
    renderScheduler();
    fireEvent.click(screen.getByText("Day"));
    expect(screen.getByTestId("day-view")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Week"));
    expect(screen.getByTestId("week-view")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Month"));
    expect(screen.getByTestId("month-view")).toBeInTheDocument();
  });

  it("shows a spinner instead of any view while loading", () => {
    renderScheduler({ loading: true });
    expect(screen.queryByTestId("month-view")).not.toBeInTheDocument();
    expect(document.querySelector("svg circle")).toBeInTheDocument();
  });
});

describe("moving through the calendar", () => {
  // Each view probe keeps the props from its own last render, so read the
  // date off whichever view is actually on screen.
  const shownDate = (view = "month") => probes[view].date;
  const back = () =>
    fireEvent.click(document.querySelectorAll(".cal-sched-nav-button")[0]);
  const forward = () =>
    fireEvent.click(document.querySelectorAll(".cal-sched-nav-button")[1]);

  it("steps a month at a time in the month view", () => {
    renderScheduler();
    forward();
    expect(shownDate()).toEqual(new Date(2030, 4, 15));
  });

  it("steps a week at a time in the week view", () => {
    renderScheduler();
    fireEvent.click(screen.getByText("Week"));
    back();
    expect(shownDate("week")).toEqual(new Date(2030, 3, 8));
  });

  it("steps a day at a time in the day view", () => {
    renderScheduler();
    fireEvent.click(screen.getByText("Day"));
    forward();
    expect(shownDate("day")).toEqual(new Date(2030, 3, 16));
  });

  it("jumps back to today", () => {
    renderScheduler();
    fireEvent.click(screen.getByText("Today"));
    expect(Math.abs(shownDate().getTime() - Date.now())).toBeLessThan(60000);
  });

  it("jumps to a date chosen from the picker", () => {
    renderScheduler();
    fireEvent.click(screen.getByText("April 2030"));
    expect(screen.getByTestId("date-picker-modal")).toBeInTheDocument();

    act(() => probes.datePicker.onDateSelect(new Date(2031, 0, 5)));
    expect(shownDate()).toEqual(new Date(2031, 0, 5));

    act(() => probes.datePicker.onClose());
    expect(screen.queryByTestId("date-picker-modal")).not.toBeInTheDocument();
  });
});

describe("searching", () => {
  it("shows everything when the box is empty", () => {
    renderScheduler();
    expect(probes.month.appointments).toHaveLength(2);
  });

  it("matches on the client's name", () => {
    renderScheduler();
    search("ada");
    expect(probes.month.appointments.map((a) => a.id)).toEqual(["a1"]);
  });

  it("matches on a clinician's name", () => {
    renderScheduler();
    search("hopper");
    expect(probes.month.appointments.map((a) => a.id)).toEqual(["a1"]);
  });

  it("matches on the service type", () => {
    renderScheduler();
    search("97153");
    expect(probes.month.appointments.map((a) => a.id)).toEqual(["a1"]);
  });

  it("shows nothing when nothing matches", () => {
    renderScheduler();
    search("zzzz");
    expect(probes.month.appointments).toEqual([]);
  });

  it("copes with rows whose client, clinician and service are all strangers", () => {
    renderScheduler({
      appointments: [
        { id: "a9", clientId: "unknown", clinicianIds: ["ghost"] },
      ],
    });
    search("ada");
    expect(probes.month.appointments).toEqual([]);
  });
});

describe("the filter sidebar", () => {
  it("opens itself for a user who may see the filter", () => {
    renderScheduler();
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(document.querySelector(".with-sidebar")).toBeInTheDocument();
  });

  it("stays shut for a user who may not", () => {
    renderScheduler({ user: roleWith("view_scheduler") });
    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
    expect(document.querySelector(".full")).toBeInTheDocument();
  });

  it("can be hidden and brought back by a tab", () => {
    renderScheduler();
    act(() => probes.sidebar.onHideSidebar());
    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Staff"));
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(probes.sidebar.activeTab).toBe("staff");
  });

  it("offers both tabs only to a user who may see both lists", () => {
    renderScheduler();
    expect(screen.getByText("Staff")).toBeInTheDocument();
    expect(screen.getByText("Client")).toBeInTheDocument();
  });

  it("hides the tabs and pins the staff list for a staff-only role", () => {
    renderScheduler({
      user: roleWith("view_calendar_filter", "view_staff_list"),
    });
    expect(screen.queryByText("Staff")).not.toBeInTheDocument();
    expect(probes.sidebar.activeTab).toBe("staff");
  });

  it("hides the tabs and keeps the client list for a client-only role", () => {
    renderScheduler({
      user: roleWith("view_calendar_filter", "view_client_list"),
    });
    expect(screen.queryByText("Client")).not.toBeInTheDocument();
    expect(probes.sidebar.activeTab).toBe("client");
  });

  it("adds and removes a clinician from the selection", () => {
    renderScheduler();
    act(() => probes.sidebar.onStaffChange("s2"));
    expect(props.setSelectedStaff.mock.calls[0][0](["s1"])).toEqual([
      "s1",
      "s2",
    ]);

    act(() => probes.sidebar.onStaffChange("s1"));
    expect(props.setSelectedStaff.mock.calls[1][0](["s1", "s2"])).toEqual([
      "s2",
    ]);
  });

  it("adds and removes a client from the selection", () => {
    renderScheduler();
    act(() => probes.sidebar.onClientChange("c2"));
    expect(props.setSelectedClients.mock.calls[0][0](["c1"])).toEqual([
      "c1",
      "c2",
    ]);

    act(() => probes.sidebar.onClientChange("c1"));
    expect(props.setSelectedClients.mock.calls[1][0](["c1"])).toEqual([]);
  });
});

describe("opening an event", () => {
  it("opens the details popover at the click position", () => {
    renderScheduler();
    openEvent();

    expect(screen.getByTestId("details-modal")).toBeInTheDocument();
    expect(probes.details.appointment.id).toBe("a1");
    expect(probes.details.position).toEqual({ top: 10, left: 20 });
  });

  it("refuses to open the popover without the calendar-details permission", () => {
    renderScheduler({ user: roleWith("view_calendar_filter") });
    openEvent();
    expect(screen.queryByTestId("details-modal")).not.toBeInTheDocument();
  });

  it("offers no actions on the popover to a role that grants none", () => {
    renderScheduler({
      user: roleWith("view_appointment_details_on_calendar"),
    });
    openEvent();

    expect(probes.details.onEdit).toBeUndefined();
    expect(probes.details.onReschedule).toBeUndefined();
    expect(probes.details.onCancel).toBeUndefined();
    expect(probes.details.canStart).toBe(false);
  });

  it("closes the popover again", () => {
    renderScheduler();
    openEvent();
    act(() => probes.details.onClose());
    expect(screen.queryByTestId("details-modal")).not.toBeInTheDocument();
  });
});

describe("creating from an empty slot", () => {
  it("pre-fills the date a slot was clicked on", () => {
    renderScheduler();
    act(() => probes.month.onSlotClick(new Date(2030, 2, 4)));

    expect(screen.getByTestId("edit-modal")).toBeInTheDocument();
    expect(probes.edit.presetSlot).toEqual({ date: "2030-03-04" });
    expect(probes.edit.isEditMode).toBe(false);
  });

  it("accepts a slot handed over as a string", () => {
    renderScheduler();
    act(() => probes.month.onSlotClick("2030-03-04T00:00:00"));
    expect(probes.edit.presetSlot).toEqual({ date: "2030-03-04" });
  });

  it("ignores a slot that will not parse", () => {
    renderScheduler();
    act(() => probes.month.onSlotClick("not a day"));
    expect(screen.queryByTestId("edit-modal")).not.toBeInTheDocument();
  });

  it("ignores a slot click from a role that cannot create appointments", () => {
    renderScheduler({ user: roleWith("view_scheduler") });
    act(() => probes.month.onSlotClick(new Date(2030, 2, 4)));
    expect(screen.queryByTestId("edit-modal")).not.toBeInTheDocument();
  });

  it("hides the New Appointment button from that role too", () => {
    renderScheduler({ user: roleWith("view_scheduler") });
    expect(screen.queryByText("New Appointment")).not.toBeInTheDocument();
  });

  it("opens a blank modal from the New Appointment button", () => {
    renderScheduler();
    fireEvent.click(screen.getByText("New Appointment"));

    expect(probes.edit.presetSlot).toBeNull();
    expect(probes.edit.initialData).toBeNull();
  });
});

describe("saving an appointment", () => {
  const payload = {
    client: "c1",
    sessionType: "st1",
    clinicians: ["s1"],
    service: [{ serviceCodeId: "sc1" }],
    date: "2030-04-01",
    startTime: "09:00",
    endTime: "10:00",
    billable: true,
    colorCode: "#123456",
  };

  const save = async (data) => {
    await act(async () => {
      await probes.edit.onSave(data);
    });
  };

  it("creates when the modal returns no series scope", async () => {
    renderScheduler();
    fireEvent.click(screen.getByText("New Appointment"));
    await save(payload);

    expect(api.CreateAppointments).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        clientId: "c1",
        sessionId: "st1",
        clinicians: [{ id: "s1" }],
        recurrence: {},
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith("Appointment saved", "success");
    expect(props.refetchAppointments).toHaveBeenCalled();
    expect(screen.queryByTestId("edit-modal")).not.toBeInTheDocument();
  });

  it("updates the whole series when the scope says so", async () => {
    renderScheduler();
    openEvent();
    act(() => probes.details.onEdit(appointments[0]));
    await save({ ...payload, scope: "all" });

    expect(api.UpdateAppointments).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a1", forAll: true })
    );
  });

  it("strips the occurrence stamp off the id before updating", async () => {
    renderScheduler();
    openEvent(appointments[1]);
    act(() => probes.details.onEdit(appointments[1]));
    await save({ ...payload, scope: "this" });

    expect(api.UpdateAppointments).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a2", forAll: false })
    );
  });

  it("carries an explicit recurrence rule into the payload", async () => {
    renderScheduler();
    fireEvent.click(screen.getByText("New Appointment"));
    await save({
      ...payload,
      isRecurring: true,
      recurrence: { type: "week", days: ["mon"] },
    });

    expect(api.CreateAppointments).toHaveBeenCalledWith(
      expect.objectContaining({ recurrence: { type: "week", days: ["mon"] } })
    );
  });

  it("re-throws a failed save so the modal can stay open", async () => {
    api.CreateAppointments.mockRejectedValue(new Error("server said no"));
    renderScheduler();
    fireEvent.click(screen.getByText("New Appointment"));

    let thrown = null;
    await act(async () => {
      thrown = await probes.edit.onSave(payload).catch((e) => e);
    });

    expect(thrown).toBeInstanceOf(Error);
    expect(toast.showApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "SAVE_APPOINTMENT"
    );
    expect(screen.getByTestId("edit-modal")).toBeInTheDocument();
  });

  it("re-filters the loaded list when the parent offers no refetch", async () => {
    renderScheduler({ refetchAppointments: undefined });
    fireEvent.click(screen.getByText("New Appointment"));
    await save(payload);

    expect(props.fetchAppointmentsByFilter).toHaveBeenCalledWith({
      clientIds: ["c1"],
      staffIds: [],
    });
  });

  it("re-filters by staff when the staff tab is the active one", async () => {
    renderScheduler({ refetchAppointments: undefined });
    fireEvent.click(screen.getByText("Staff"));
    fireEvent.click(screen.getByText("New Appointment"));
    await save(payload);

    expect(props.fetchAppointmentsByFilter).toHaveBeenCalledWith({
      clientIds: [],
      staffIds: ["s1"],
    });
  });

  it("closes the modal without saving", () => {
    renderScheduler();
    fireEvent.click(screen.getByText("New Appointment"));
    act(() => probes.edit.onClose());
    expect(screen.queryByTestId("edit-modal")).not.toBeInTheDocument();
  });
});

describe("rescheduling and cancelling", () => {
  const openDetails = () => {
    renderScheduler();
    openEvent();
  };

  it("reschedules the appointment behind the popover", async () => {
    openDetails();
    act(() => probes.details.onReschedule(appointments[0]));
    expect(screen.getByTestId("reschedule-modal")).toBeInTheDocument();

    await act(async () => {
      await probes.reschedule.onSave({
        date: "2030-04-09",
        startTime: "15:00",
        endTime: "16:00",
        scope: "all",
      });
    });

    expect(api.RescheduleAppointments).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a1", forAll: true, rescheduled: true })
    );
    expect(toast.showToast).toHaveBeenCalledWith("Rescheduled", "success");
    expect(screen.queryByTestId("reschedule-modal")).not.toBeInTheDocument();
  });

  it("reports a failed reschedule and leaves the modal open", async () => {
    api.RescheduleAppointments.mockRejectedValue(new Error("slot taken"));
    openDetails();
    act(() => probes.details.onReschedule(appointments[0]));
    await act(async () => {
      await probes.reschedule.onSave({ scope: "this" });
    });

    expect(toast.showApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "RESCHEDULE_APPOINTMENT"
    );
    expect(screen.getByTestId("reschedule-modal")).toBeInTheDocument();
  });

  it("closes the reschedule modal without saving", () => {
    openDetails();
    act(() => probes.details.onReschedule(appointments[0]));
    act(() => probes.reschedule.onClose());
    expect(screen.queryByTestId("reschedule-modal")).not.toBeInTheDocument();
  });

  it("cancels the appointment behind the popover", async () => {
    openDetails();
    act(() => probes.details.onCancel(appointments[1]));
    expect(probes.cancel.appointments).toHaveLength(1);

    await act(async () => {
      await probes.cancel.onSave({ reason: "Client unwell" });
    });

    expect(api.CancelAppointments).toHaveBeenCalledWith(
      expect.objectContaining({
        // The occurrence stamp is stripped here too.
        id: "a2",
        reason: "Client unwell",
        forAll: true,
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith("Cancelled", "success");
  });

  it("reports a failed cancellation", async () => {
    api.CancelAppointments.mockRejectedValue(new Error("too late"));
    openDetails();
    act(() => probes.details.onCancel(appointments[0]));
    await act(async () => {
      await probes.cancel.onSave({ reason: "x" });
    });

    expect(toast.showApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "CANCEL_APPOINTMENT"
    );
    expect(screen.getByTestId("cancel-modal")).toBeInTheDocument();
  });

  it("closes the cancel modal without saving", () => {
    openDetails();
    act(() => probes.details.onCancel(appointments[0]));
    act(() => probes.cancel.onClose());
    expect(screen.queryByTestId("cancel-modal")).not.toBeInTheDocument();
  });
});
