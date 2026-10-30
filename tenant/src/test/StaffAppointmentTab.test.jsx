import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../ReduxStore/features/authentication";

/**
 * The Appointment tab of a single staff member: a calendar over three fetches
 * (the staff member's appointments, their upcoming list and their weekly
 * availability), a second tab for the upcoming list, and the availability
 * editor that either creates or patches the stored week.
 *
 * The three calendar views, the date picker and the availability modal are all
 * probes, so the tests reach the click handlers by calling the props the tab
 * hands down rather than by rendering a month grid. The pop-over that shows one
 * appointment's details is defined inside this module and has no export, so it
 * is only reachable through a view probe's `onAppointmentClick` -- which is
 * also what makes its position maths testable, since the position is whatever
 * the caller passes.
 *
 * Date is faked to a fixed day so "June 2026" in the header and the day/week
 * step arithmetic are stable; only Date is faked, leaving real timers for
 * waitFor. The active tab is remembered in sessionStorage, cleared between
 * tests so one test's tab cannot leak into the next.
 */

const api = vi.hoisted(() => ({
  GetStaffAppointments: vi.fn(),
  GetStaffUpcomingAppointments: vi.fn(),
  GetStaffAvailability: vi.fn(),
  CreateStaffAvailability: vi.fn(),
  UpdateStaffAvailability: vi.fn(),
}));
vi.mock("../api/organisationStaffApis", () => ({ default: api }));

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

const probes = vi.hoisted(() => {
  const props = {};
  const view = (name) => (received) => {
    props[name] = received;
    return (
      <div data-testid={`${name}-view`}>
        {(received.appointments || []).map((a, i) => (
          <span key={a.id ?? i} data-testid={`${name}-appt`}>
            {a.client}
          </span>
        ))}
      </div>
    );
  };
  const modal = (name) => (received) => {
    props[name] = received;
    return received.isOpen ? <div data-testid={`${name}-modal`} /> : null;
  };
  return { props, view, modal };
});

vi.mock("../Components/CalendarScheduler/DayView", () => ({ default: probes.view("day") }));
vi.mock("../Components/CalendarScheduler/WeekView", () => ({ default: probes.view("week") }));
vi.mock("../Components/CalendarScheduler/MonthView", () => ({ default: probes.view("month") }));
vi.mock("../Components/ReusableModal/SchedulerModal/AvailabilityModal", () => ({
  default: probes.modal("availability"),
}));
vi.mock("../Components/ReusableModal/SchedulerModal/DatePickerModal", () => ({
  default: probes.modal("datePicker"),
}));
vi.mock("../Pages/Organisation/StaffAndTeams/StaffSingleTabs/UpcomingAppointments", () => ({
  default: (received) => {
    probes.props.upcoming = received;
    return <div data-testid="upcoming-list">{received.appointments.length} upcoming</div>;
  },
}));

import Appointment from "../Pages/Organisation/StaffAndTeams/StaffSingleTabs/Appointment";

const store = (permissions) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user: {
          id: "u-1",
          tenantId: "tenant-1",
          accessToken: "at",
          refreshToken: "rt",
          // An empty accesses array is the org-owner case: every permission.
          role: permissions
            ? { roleModuleAccesses: [{ module: "MY_ORGANIZATION", permissions }] }
            : { roleModuleAccesses: [] },
        },
      },
    },
  });

const renderTab = ({ permissions, ...props } = {}) =>
  render(
    <Provider store={store(permissions)}>
      <Appointment staffId="s-1" accessToken="at" refreshToken="rt" {...props} />
    </Provider>
  );

const settled = () => waitFor(() => expect(probes.props.month).toBeTruthy());

const shown = () => probes.props.month.appointments;

// The pop-over is fixed-position; its offsets are the only readable output of
// the placement maths.
const detailsPanel = () => document.body.querySelector(".appointment-modal-container");

const openDetails = async (appointment, position = { x: 20, y: 20 }) => {
  if (!probes.props.month) {
    renderTab();
    await settled();
  }
  await act(async () => {
    probes.props.month.onAppointmentClick(appointment, position);
  });
};

// The spinner is the only 50px-square svg on the page; the search box and the
// toolbar icons draw svgs of their own.
const spinner = () => document.body.querySelector('svg[width="50"]');

const day = (over = {}) => ({
  available: false,
  startTime: "09:00",
  endTime: "17:00",
  ...over,
});

const week = (over = {}) => ({
  monday: day(over.monday),
  tuesday: day(over.tuesday),
  wednesday: day(over.wednesday),
  thursday: day(over.thursday),
  friday: day(over.friday),
  saturday: day(over.saturday),
  sunday: day(over.sunday),
});

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  // Only Date is faked: waitFor needs real timers to poll.
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-06-15T09:00:00") });
  // The probe record is module-level, so wipe it or a previous test's props
  // stand in for a render that never happened.
  Object.keys(probes.props).forEach((k) => delete probes.props[k]);
  api.GetStaffAppointments.mockResolvedValue({ data: { past: [], upcoming: [] } });
  api.GetStaffUpcomingAppointments.mockResolvedValue({ data: [] });
  api.GetStaffAvailability.mockResolvedValue({ data: { data: [] } });
  api.CreateStaffAvailability.mockResolvedValue({ data: { id: "av-new" } });
  api.UpdateStaffAvailability.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the calendar fetch", () => {
  it("asks for the staff member's appointments with their tokens", async () => {
    renderTab();
    await waitFor(() =>
      expect(api.GetStaffAppointments).toHaveBeenCalledWith({
        staffId: "s-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
  });

  it("puts past and upcoming appointments on the same calendar", async () => {
    api.GetStaffAppointments.mockResolvedValue({
      data: {
        past: [{ id: "a-1", clientName: "Ada Lovelace" }],
        upcoming: [{ id: "a-2", clientName: "Grace Hopper" }],
      },
    });
    renderTab();
    await waitFor(() => expect(shown()).toHaveLength(2));
    expect(shown().map((a) => a.client)).toEqual(["Ada Lovelace", "Grace Hopper"]);
  });

  it("reads a response that is not wrapped in a data envelope", async () => {
    api.GetStaffAppointments.mockResolvedValue({
      past: [{ id: "a-1", clientName: "Ada Lovelace" }],
      upcoming: [],
    });
    renderTab();
    await waitFor(() => expect(shown()).toHaveLength(1));
  });

  it("treats a response with neither list as an empty calendar", async () => {
    api.GetStaffAppointments.mockResolvedValue({ data: {} });
    renderTab();
    await settled();
    expect(shown()).toEqual([]);
  });

  it("leaves the calendar empty when the fetch fails", async () => {
    api.GetStaffAppointments.mockRejectedValue(new Error("500"));
    renderTab();
    await settled();
    expect(shown()).toEqual([]);
  });

  it("skips every fetch when there is no staff member to fetch for", async () => {
    renderTab({ staffId: undefined });
    await waitFor(() => expect(screen.getByTestId("month-view")).toBeInTheDocument());
    expect(api.GetStaffAppointments).not.toHaveBeenCalled();
    expect(api.GetStaffUpcomingAppointments).not.toHaveBeenCalled();
    expect(api.GetStaffAvailability).not.toHaveBeenCalled();
  });

  it("skips every fetch when there is no access token", async () => {
    renderTab({ accessToken: undefined });
    await waitFor(() => expect(screen.getByTestId("month-view")).toBeInTheDocument());
    expect(api.GetStaffAppointments).not.toHaveBeenCalled();
  });

  it("shows a spinner instead of the grid while the fetch is in flight", () => {
    api.GetStaffAppointments.mockReturnValue(new Promise(() => {}));
    renderTab();
    expect(spinner()).toBeInTheDocument();
    expect(screen.queryByTestId("month-view")).not.toBeInTheDocument();
  });
});

describe("turning an appointment record into a calendar entry", () => {
  const transformed = async (appt) => {
    api.GetStaffAppointments.mockResolvedValue({ data: { past: [appt], upcoming: [] } });
    renderTab();
    await waitFor(() => expect(shown()).toHaveLength(1));
    return shown()[0];
  };

  it("builds the span from a date plus start and end times", async () => {
    const entry = await transformed({
      id: "a-1",
      date: "2026-06-20",
      startTime: "09:30:00",
      endTime: "10:30:00",
    });
    expect(entry.start).toEqual(new Date("2026-06-20T09:30:00"));
    expect(entry.end).toEqual(new Date("2026-06-20T10:30:00"));
    expect(entry.time).toBe("9:30am");
  });

  it("falls back to explicit start and end timestamps", async () => {
    const entry = await transformed({
      id: "a-1",
      start: "2026-06-20T14:00:00",
      end: "2026-06-20T15:00:00",
    });
    expect(entry.start).toEqual(new Date("2026-06-20T14:00:00"));
    expect(entry.end).toEqual(new Date("2026-06-20T15:00:00"));
  });

  it("falls back to now when a record carries no times at all", async () => {
    const entry = await transformed({ id: "a-1" });
    expect(entry.start).toEqual(new Date("2026-06-15T09:00:00"));
    expect(entry.end).toEqual(new Date("2026-06-15T09:00:00"));
  });

  it("assembles a client name from a client object", async () => {
    const entry = await transformed({
      id: "a-1",
      client: { id: "c-1", firstName: "Ada", lastName: "Lovelace", preferredName: "Addy" },
    });
    expect(entry.client).toBe("Ada Lovelace (Addy)");
    expect(entry.clientId).toBe("c-1");
  });

  it("omits the bracketed preferred name when there is none", async () => {
    const entry = await transformed({
      id: "a-1",
      client: { firstName: "Ada", lastName: "Lovelace" },
    });
    expect(entry.client).toBe("Ada Lovelace");
  });

  it("reads an empty client object as an unknown client", async () => {
    const entry = await transformed({ id: "a-1", client: {} });
    expect(entry.client).toBe("Unknown Client");
  });

  it("accepts a client held as a plain string", async () => {
    const entry = await transformed({ id: "a-1", client: "Ada Lovelace" });
    expect(entry.client).toBe("Ada Lovelace");
  });

  it("reads a record with no client at all as an unknown client", async () => {
    const entry = await transformed({ id: "a-1" });
    expect(entry.client).toBe("Unknown Client");
    expect(entry.clientId).toBeUndefined();
  });

  it("prefers an explicit client id over the one on the client object", async () => {
    const entry = await transformed({ id: "a-1", clientId: "c-9", client: { id: "c-1" } });
    expect(entry.clientId).toBe("c-9");
  });

  it("lists the service codes the appointment booked", async () => {
    const entry = await transformed({
      id: "a-1",
      appointmentServices: [{ serviceCode: { code: "97153" } }, { serviceCode: {} }, {}],
    });
    expect(entry.serviceType).toBe("97153, Not specified, Not specified");
  });

  it("falls back to an already-transformed service array", async () => {
    const entry = await transformed({
      id: "a-1",
      service: [{ serviceType: "Assessment" }, { code: "97151" }, {}],
    });
    expect(entry.serviceType).toBe("Assessment, 97151, Not specified");
  });

  it("accepts a service type given as plain text", async () => {
    const entry = await transformed({ id: "a-1", serviceType: "Direct therapy" });
    expect(entry.serviceType).toBe("Direct therapy");
  });

  it("reads a record with no service as not applicable", async () => {
    const entry = await transformed({ id: "a-1", appointmentServices: [], service: [] });
    expect(entry.serviceType).toBe("N/A");
  });

  it("prefers the session object's name", async () => {
    const entry = await transformed({
      id: "a-1",
      session: { name: "Initial" },
      sessionName: "Ignored",
    });
    expect(entry.sessionType).toBe("Initial");
  });

  it("falls back to a session name and then a session type", async () => {
    expect((await transformed({ id: "a-1", sessionName: "Follow-up" })).sessionType).toBe(
      "Follow-up"
    );
    expect((await transformed({ id: "a-2", sessionType: "Review" })).sessionName).toBe("Review");
    expect((await transformed({ id: "a-3" })).sessionType).toBe("N/A");
  });

  it("lists the clinicians on the appointment", async () => {
    const entry = await transformed({
      id: "a-1",
      clinicians: [{ fullName: "Ada" }, {}],
    });
    expect(entry.therapist).toBe("Ada, Unknown");
    expect(entry.clinicianNames).toEqual(["Ada", undefined]);
  });

  it("falls back to a plain list of clinician names", async () => {
    const entry = await transformed({ id: "a-1", clinicianNames: ["Ada", "Grace"] });
    expect(entry.therapist).toBe("Ada, Grace");
  });

  it("falls back to a single therapist name and then to not applicable", async () => {
    expect((await transformed({ id: "a-1", therapist: "Ada" })).therapist).toBe("Ada");
    expect((await transformed({ id: "a-2" })).therapist).toBe("N/A");
  });

  it("prefers the booked colour, then a plain colour, then the house green", async () => {
    expect((await transformed({ id: "a-1", colourCode: "#111", color: "#222" })).color).toBe(
      "#111"
    );
    expect((await transformed({ id: "a-2", color: "#222" })).color).toBe("#222");
    expect((await transformed({ id: "a-3" })).color).toBe("#48f794");
  });
});

describe("the upcoming appointments tab", () => {
  it("counts the upcoming appointments on the tab itself", async () => {
    api.GetStaffUpcomingAppointments.mockResolvedValue({
      data: [{ id: "a-1", clientName: "Ada" }, { id: "a-2", clientName: "Grace" }],
    });
    renderTab();
    expect(await screen.findByText("2")).toBeInTheDocument();
  });

  it("leaves the count off when there is nothing coming up", async () => {
    renderTab();
    await settled();
    expect(document.body.querySelector(".candidate-count")).toBeNull();
  });

  it("swaps the calendar for the upcoming list", async () => {
    api.GetStaffUpcomingAppointments.mockResolvedValue({
      data: [{ id: "a-1", clientName: "Ada" }],
    });
    renderTab();
    await settled();
    fireEvent.click(screen.getByRole("button", { name: /Upcoming Appointments/ }));
    expect(screen.getByTestId("upcoming-list")).toHaveTextContent("1 upcoming");
    expect(screen.queryByTestId("month-view")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    expect(screen.getByTestId("month-view")).toBeInTheDocument();
  });

  it("remembers the chosen tab across a remount", async () => {
    const first = renderTab();
    await settled();
    fireEvent.click(screen.getByRole("button", { name: /Upcoming Appointments/ }));
    first.unmount();
    renderTab();
    expect(screen.getByTestId("upcoming-list")).toBeInTheDocument();
  });

  it("treats a response that is not a list as no upcoming appointments", async () => {
    api.GetStaffUpcomingAppointments.mockResolvedValue({ data: { nope: true } });
    renderTab();
    await settled();
    expect(probes.props.upcoming).toBeUndefined();
    fireEvent.click(screen.getByRole("button", { name: /Upcoming Appointments/ }));
    expect(probes.props.upcoming.appointments).toEqual([]);
  });

  it("reads an upcoming list that is not wrapped in a data envelope", async () => {
    api.GetStaffUpcomingAppointments.mockResolvedValue([{ id: "a-1", clientName: "Ada" }]);
    renderTab();
    expect(await screen.findByText("1")).toBeInTheDocument();
  });

  it("leaves the list empty when the upcoming fetch fails", async () => {
    api.GetStaffUpcomingAppointments.mockRejectedValue(new Error("500"));
    renderTab();
    await settled();
    fireEvent.click(screen.getByRole("button", { name: /Upcoming Appointments/ }));
    expect(probes.props.upcoming.appointments).toEqual([]);
    expect(probes.props.upcoming.loading).toBe(false);
  });
});

describe("moving around the calendar", () => {
  const header = () => document.body.querySelector(".cal-sched-date-text");
  const switchTo = (name) => fireEvent.click(screen.getByRole("button", { name }));

  it("opens on the current month", async () => {
    renderTab();
    await settled();
    expect(header()).toHaveTextContent("June 2026");
  });

  it("steps a month at a time in the month view", async () => {
    renderTab();
    await settled();
    fireEvent.click(document.body.querySelectorAll(".cal-sched-nav-button")[0]);
    expect(header()).toHaveTextContent("May 2026");
    fireEvent.click(document.body.querySelectorAll(".cal-sched-nav-button")[1]);
    expect(header()).toHaveTextContent("June 2026");
  });

  it("steps a single day in the day view", async () => {
    renderTab();
    await settled();
    switchTo("Day");
    fireEvent.click(document.body.querySelectorAll(".cal-sched-nav-button")[0]);
    expect(probes.props.day.date).toEqual(new Date("2026-06-14T09:00:00"));
    fireEvent.click(document.body.querySelectorAll(".cal-sched-nav-button")[1]);
    expect(probes.props.day.date).toEqual(new Date("2026-06-15T09:00:00"));
  });

  it("steps a whole week in the week view", async () => {
    renderTab();
    await settled();
    switchTo("Week");
    fireEvent.click(document.body.querySelectorAll(".cal-sched-nav-button")[0]);
    expect(probes.props.week.date).toEqual(new Date("2026-06-08T09:00:00"));
  });

  it("jumps back to today", async () => {
    renderTab();
    await settled();
    fireEvent.click(document.body.querySelectorAll(".cal-sched-nav-button")[0]);
    expect(header()).toHaveTextContent("May 2026");
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(header()).toHaveTextContent("June 2026");
  });

  it("marks the chosen view as active and renders only that one", async () => {
    renderTab();
    await settled();
    switchTo("Day");
    expect(screen.getByRole("button", { name: "Day" })).toHaveClass(
      "cal-sched-view-button-active"
    );
    expect(screen.getByRole("button", { name: "Month" })).toHaveClass(
      "cal-sched-view-button-inactive"
    );
    expect(screen.queryByTestId("month-view")).not.toBeInTheDocument();
    switchTo("Week");
    expect(screen.getByTestId("week-view")).toBeInTheDocument();
    expect(screen.queryByTestId("day-view")).not.toBeInTheDocument();
  });

  it("opens the date picker and takes the date it returns", async () => {
    renderTab();
    await settled();
    expect(screen.queryByTestId("datePicker-modal")).not.toBeInTheDocument();
    fireEvent.click(document.body.querySelector(".cal-sched-date-text"));
    expect(screen.getByTestId("datePicker-modal")).toBeInTheDocument();
    act(() => probes.props.datePicker.onDateSelect(new Date("2026-09-02T09:00:00")));
    expect(header()).toHaveTextContent("September 2026");
    act(() => probes.props.datePicker.onClose());
    expect(screen.queryByTestId("datePicker-modal")).not.toBeInTheDocument();
  });
});

describe("searching the calendar", () => {
  const search = (value) =>
    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value } });

  beforeEach(() => {
    api.GetStaffAppointments.mockResolvedValue({
      data: {
        past: [
          { id: "a-1", clientName: "Ada Lovelace", therapist: "Grace", serviceType: "Assessment" },
          { id: "a-2", clientName: "Bob Ross", therapist: "Hopper", serviceType: "Direct" },
        ],
        upcoming: [],
      },
    });
  });

  it("shows everything while the box is empty", async () => {
    renderTab();
    await waitFor(() => expect(shown()).toHaveLength(2));
  });

  it("matches on the client name", async () => {
    renderTab();
    await waitFor(() => expect(shown()).toHaveLength(2));
    search("lovelace");
    expect(shown().map((a) => a.id)).toEqual(["a-1"]);
  });

  it("matches on the therapist", async () => {
    renderTab();
    await waitFor(() => expect(shown()).toHaveLength(2));
    search("hopper");
    expect(shown().map((a) => a.id)).toEqual(["a-2"]);
  });

  it("matches on the service type", async () => {
    renderTab();
    await waitFor(() => expect(shown()).toHaveLength(2));
    search("assess");
    expect(shown().map((a) => a.id)).toEqual(["a-1"]);
  });

  it("shows nothing when nothing matches", async () => {
    renderTab();
    await waitFor(() => expect(shown()).toHaveLength(2));
    search("zzz");
    expect(shown()).toEqual([]);
  });
});

describe("the appointment details pop-over", () => {
  it("stays shut until an appointment is clicked", async () => {
    renderTab();
    await settled();
    expect(detailsPanel()).toBeNull();
  });

  it("shows the client, times and service of the clicked appointment", async () => {
    await openDetails({
      id: "a-1",
      clientName: "Ada Lovelace",
      start: new Date("2026-06-20T09:30:00"),
      end: new Date("2026-06-20T10:30:00"),
      therapist: "Grace Hopper",
      serviceType: "Assessment",
      sessionType: "Initial",
      serviceLocation: "Clinic A",
    });
    expect(screen.getByText("Appointment Details")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("9:30 AM - 10:30 AM")).toBeInTheDocument();
    expect(screen.getByText("06/20/2026")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("Assessment")).toBeInTheDocument();
    expect(screen.getByText("Initial")).toBeInTheDocument();
    expect(screen.getByText("Clinic A")).toBeInTheDocument();
  });

  it("hides the location row when the appointment has no location", async () => {
    await openDetails({ id: "a-1", clientName: "Ada" });
    expect(screen.queryByText("Location")).not.toBeInTheDocument();
  });

  it("falls back through the client, therapist, service and session fields", async () => {
    await openDetails({
      id: "a-1",
      client: "Walk-in",
      clinicianNames: ["Ada", "Grace"],
      service: [{ serviceType: "Direct" }, { serviceType: "Indirect" }],
      sessionName: "Follow-up",
    });
    expect(screen.getByText("Walk-in")).toBeInTheDocument();
    expect(screen.getByText("Ada, Grace")).toBeInTheDocument();
    expect(screen.getByText("Direct, Indirect")).toBeInTheDocument();
    expect(screen.getByText("Follow-up")).toBeInTheDocument();
  });

  it("reads an appointment with nothing filled in as not applicable", async () => {
    await openDetails({ id: "a-1" });
    expect(screen.getByText("Unknown Client")).toBeInTheDocument();
    expect(screen.getAllByText("N/A").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("N/A - N/A")).toBeInTheDocument();
  });

  it("places the pop-over just past the click", async () => {
    await openDetails({ id: "a-1", clientName: "Ada" }, { x: 100, y: 100 });
    const panel = detailsPanel();
    // 110px of a 1024px-wide jsdom window, 110px of a 768px-tall one.
    expect(panel.style.left).toBe(`${(110 / window.innerWidth) * 100}vw`);
    expect(panel.style.top).toBe(`${(110 / window.innerHeight) * 100}vh`);
  });

  it("flips the pop-over back over the click when it would overflow", async () => {
    await openDetails(
      { id: "a-1", clientName: "Ada" },
      { x: window.innerWidth - 20, y: window.innerHeight - 20 }
    );
    const panel = detailsPanel();
    const flippedX = window.innerWidth - 20 - 400 - 10;
    const flippedY = window.innerHeight - 20 - 300 - 10;
    expect(panel.style.left).toBe(`${(flippedX / window.innerWidth) * 100}vw`);
    expect(panel.style.top).toBe(`${(flippedY / window.innerHeight) * 100}vh`);
  });

  it("parks the pop-over in the corner when the click carried no coordinates", async () => {
    await openDetails({ id: "a-1", clientName: "Ada" }, null);
    expect(detailsPanel().style.left).toBe("50vw");
    expect(detailsPanel().style.top).toBe("50vh");
  });

  it("treats a click at the origin as having no coordinates", async () => {
    await openDetails({ id: "a-1", clientName: "Ada" }, { x: 0, y: 0 });
    expect(detailsPanel().style.left).toBe("50vw");
  });

  it("closes from the cross and from the footer button", async () => {
    await openDetails({ id: "a-1", clientName: "Ada" });
    fireEvent.click(document.body.querySelector(".close-button"));
    expect(detailsPanel()).toBeNull();

    await openDetails({ id: "a-2", clientName: "Grace" });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(detailsPanel()).toBeNull();
  });
});

describe("loading the stored availability", () => {
  it("fills the modal from a stored week", async () => {
    api.GetStaffAvailability.mockResolvedValue({
      data: {
        data: [
          {
            id: "av-1",
            availabilityDays: [
              { id: "d-1", dayOfWeek: "MONDAY", available: true, from: "08:00", to: "16:00" },
            ],
          },
        ],
      },
    });
    renderTab();
    await waitFor(() =>
      expect(probes.props.availability.initialValues.monday).toEqual({
        id: "d-1",
        available: true,
        startTime: "08:00",
        endTime: "16:00",
      })
    );
    // The other six days keep the all-off defaults so the modal always has a
    // full week to draw.
    expect(probes.props.availability.initialValues.sunday).toEqual(day());
  });

  it("takes a stored week that already arrives as an object", async () => {
    api.GetStaffAvailability.mockResolvedValue({
      data: { data: [{ id: "av-1", availabilityDays: { monday: day({ available: true }) } }] },
    });
    renderTab();
    await waitFor(() =>
      expect(probes.props.availability.initialValues).toEqual({
        monday: day({ available: true }),
      })
    );
  });

  it("reads a record list that is not wrapped in a data envelope", async () => {
    api.GetStaffAvailability.mockResolvedValue([
      { id: "av-1", availabilityDays: [{ id: "d-1", dayOfWeek: "FRIDAY", available: true, from: "10:00", to: "12:00" }] },
    ]);
    renderTab();
    await waitFor(() =>
      expect(probes.props.availability.initialValues.friday.available).toBe(true)
    );
  });

  it("keeps the defaults when the record holds no days", async () => {
    api.GetStaffAvailability.mockResolvedValue({ data: { data: [{ id: "av-1" }] } });
    renderTab();
    await settled();
    expect(probes.props.availability.initialValues).toEqual(week());
  });

  it("keeps the defaults when there is no stored record", async () => {
    api.GetStaffAvailability.mockResolvedValue({ data: { data: [] } });
    renderTab();
    await settled();
    expect(probes.props.availability.initialValues).toEqual(week());
  });

  it("keeps the defaults when the response is not a list", async () => {
    api.GetStaffAvailability.mockResolvedValue({ data: { data: { nope: true } } });
    renderTab();
    await settled();
    expect(probes.props.availability.initialValues).toEqual(week());
  });

  it("keeps the defaults when the availability fetch fails", async () => {
    api.GetStaffAvailability.mockRejectedValue(new Error("500"));
    renderTab();
    await settled();
    expect(probes.props.availability.initialValues).toEqual(week());
  });
});

describe("saving availability", () => {
  const openEditor = async () => {
    renderTab();
    await settled();
    fireEvent.click(screen.getByRole("button", { name: "Set availability" }));
    await screen.findByTestId("availability-modal");
  };

  const save = (value) =>
    act(async () => {
      await probes.props.availability.onSave(value);
    });

  it("is offered only to a role granted the permission", async () => {
    renderTab({ permissions: ["view_staff_profile"] });
    await settled();
    expect(screen.queryByRole("button", { name: "Set availability" })).not.toBeInTheDocument();
  });

  it("creates a full week when the staff member has no stored record", async () => {
    await openEditor();
    await save(week({ monday: { available: true } }));
    expect(api.CreateStaffAvailability).toHaveBeenCalledTimes(1);
    const payload = api.CreateStaffAvailability.mock.calls[0][0];
    expect(payload).toMatchObject({ staffId: "s-1", accessToken: "at", refreshToken: "rt" });
    expect(payload.availabilityDays).toHaveLength(7);
    expect(payload.availabilityDays[0]).toEqual({
      dayOfWeek: "MONDAY",
      available: true,
      from: "09:00",
      to: "17:00",
    });
    expect(toast.showToast).toHaveBeenCalledWith("Availability saved successfully", "success");
    expect(screen.queryByTestId("availability-modal")).not.toBeInTheDocument();
    // The week is re-read so the newly assigned day ids are picked up.
    await waitFor(() => expect(api.GetStaffAvailability).toHaveBeenCalledTimes(2));
  });

  it("remembers the id a create came back with, so the next save patches", async () => {
    await openEditor();
    await save(week());
    fireEvent.click(screen.getByRole("button", { name: "Set availability" }));
    await save(week({ monday: { id: "d-1" } }));
    expect(api.CreateStaffAvailability).toHaveBeenCalledTimes(1);
    expect(api.UpdateStaffAvailability).toHaveBeenCalledTimes(1);
  });

  it("takes a create response that is not wrapped in a data envelope", async () => {
    api.CreateStaffAvailability.mockResolvedValue({ id: "av-flat" });
    await openEditor();
    await save(week());
    fireEvent.click(screen.getByRole("button", { name: "Set availability" }));
    await save(week({ monday: { id: "d-1" } }));
    expect(api.UpdateStaffAvailability.mock.calls[0][0].id).toBe("av-flat");
  });

  it("keeps creating when the create response carries no id", async () => {
    api.CreateStaffAvailability.mockResolvedValue({});
    await openEditor();
    await save(week());
    fireEvent.click(screen.getByRole("button", { name: "Set availability" }));
    await save(week());
    expect(api.CreateStaffAvailability).toHaveBeenCalledTimes(2);
    expect(api.UpdateStaffAvailability).not.toHaveBeenCalled();
  });

  describe("against a stored record", () => {
    beforeEach(() => {
      api.GetStaffAvailability.mockResolvedValue({
        data: { data: [{ id: "av-1", availabilityDays: [] }] },
      });
    });

    it("patches all seven days when every one is already on the backend", async () => {
      await openEditor();
      const stored = week();
      Object.keys(stored).forEach((k, i) => {
        stored[k].id = `d-${i}`;
      });
      await save(stored);
      expect(api.CreateStaffAvailability).not.toHaveBeenCalled();
      expect(api.UpdateStaffAvailability).toHaveBeenCalledWith(
        expect.objectContaining({ id: "av-1" })
      );
      expect(api.UpdateStaffAvailability.mock.calls[0][0].availabilityDays).toHaveLength(7);
    });

    it("patches only the days that already exist", async () => {
      await openEditor();
      await save(week({ monday: { id: "d-1" }, friday: { id: "d-5" } }));
      const sent = api.UpdateStaffAvailability.mock.calls[0][0].availabilityDays;
      expect(sent.map((d) => d.dayOfWeek)).toEqual(["MONDAY", "FRIDAY"]);
    });

    it("sends nothing at all when not one day exists yet", async () => {
      await openEditor();
      await save(week());
      expect(api.UpdateStaffAvailability).not.toHaveBeenCalled();
      expect(api.CreateStaffAvailability).not.toHaveBeenCalled();
      expect(toast.showToast).toHaveBeenCalledWith("Availability saved successfully", "success");
    });
  });

  it("reports a refused save and leaves the editor open", async () => {
    api.CreateStaffAvailability.mockRejectedValue(new Error("409"));
    await openEditor();
    await save(week());
    expect(toast.showToast).toHaveBeenCalledWith("Failed to save availability", "error");
    expect(screen.getByTestId("availability-modal")).toBeInTheDocument();
  });

  it("closes the editor without saving", async () => {
    await openEditor();
    act(() => probes.props.availability.onClose());
    expect(screen.queryByTestId("availability-modal")).not.toBeInTheDocument();
    expect(api.CreateStaffAvailability).not.toHaveBeenCalled();
  });
});
