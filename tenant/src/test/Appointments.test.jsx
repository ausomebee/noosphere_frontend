import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../ReduxStore/features/authentication";

/**
 * The Appointments page: a permission-filtered tab bar over the four
 * appointment sub-tabs, plus a one-shot count fetch that fills the badges.
 *
 * The page owns no appointment data itself, so its branches are all gates. Each
 * tab appears only for the permission that names it; the active tab is
 * remembered in sessionStorage and can be overridden by a notification's
 * router state; and the three count endpoints are each chosen from the role
 * name, settled together, and defaulted to zero one by one when a call fails.
 * The upcoming badge counts expanded occurrences rather than master records, so
 * its fixture is a real recurring master.
 *
 * All four sub-tabs are probes -- they each run their own fetches, which have
 * nothing to do with what is being tested here.
 */

const api = vi.hoisted(() => ({
  GetUpcomingAppointmentByTenantId: vi.fn(),
  GetUpcomingAppointmentByStaffId: vi.fn(),
  GetRescheduleAppointmentReqByTenantId: vi.fn(),
  GetRescheduleAppointmentReqByStaffId: vi.fn(),
  GetCancelledAppointmentByTenantId: vi.fn(),
  GetCancelledAppointmentByStaffId: vi.fn(),
}));

vi.mock("../api/AppointmentApi", () => ({ default: api }));

vi.mock(
  "../Pages/Scheduler/SchdedulerSubs/AppointmentSubs/UpcomingAppointments",
  () => ({ default: () => <div data-testid="tab-upcoming" /> })
);
vi.mock(
  "../Pages/Scheduler/SchdedulerSubs/AppointmentSubs/RescheduleRequests",
  () => ({ default: () => <div data-testid="tab-reschedule" /> })
);
vi.mock(
  "../Pages/Scheduler/SchdedulerSubs/AppointmentSubs/PastAppointments",
  () => ({ default: () => <div data-testid="tab-past" /> })
);
vi.mock(
  "../Pages/Scheduler/SchdedulerSubs/AppointmentSubs/CancelledAppointments",
  () => ({ default: () => <div data-testid="tab-cancelled" /> })
);

import Appointments from "../Pages/Scheduler/SchdedulerSubs/Appointments";

const listPayload = (rows) => ({ data: { data: rows } });

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const today = iso(new Date());

// A daily series of three: the upcoming badge counts occurrences, not masters,
// so this must expand before it is worth anything.
const recurringMaster = {
  id: "m1",
  date: today,
  startTime: "09:00",
  endTime: "10:00",
  isRecurring: true,
  recurrence: { type: "day", endType: "after", occurrences: 3 },
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

// A non-empty module access restricts the page; an empty one is the org-owner
// case and grants every tab.
const roleWith = (...permissions) => ({
  role: { name: "Admin", roleModuleAccesses: [{ module: "SCHEDULER", permissions }] },
});

const renderPage = ({ user, state = null } = {}) =>
  render(
    <Provider store={makeStore(user)}>
      <MemoryRouter initialEntries={[{ pathname: "/scheduler", state }]}>
        <Appointments />
      </MemoryRouter>
    </Provider>
  );

const tabButton = (label) => screen.getByText(label).closest("button");

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  api.GetUpcomingAppointmentByTenantId.mockResolvedValue(listPayload([]));
  api.GetUpcomingAppointmentByStaffId.mockResolvedValue(listPayload([]));
  api.GetRescheduleAppointmentReqByTenantId.mockResolvedValue(listPayload([]));
  api.GetRescheduleAppointmentReqByStaffId.mockResolvedValue(listPayload([]));
  api.GetCancelledAppointmentByTenantId.mockResolvedValue(listPayload([]));
  api.GetCancelledAppointmentByStaffId.mockResolvedValue(listPayload([]));
});

describe("which tabs appear", () => {
  it("offers all four to a user with unrestricted access", () => {
    renderPage();
    expect(screen.getByText("Upcoming Appointments")).toBeInTheDocument();
    expect(screen.getByText("Reschedule Requests")).toBeInTheDocument();
    expect(screen.getByText("Past Appointments")).toBeInTheDocument();
    expect(screen.getByText("Cancelled Appointments")).toBeInTheDocument();
    expect(screen.getByTestId("tab-upcoming")).toBeInTheDocument();
  });

  it("offers only the tabs the role names", () => {
    renderPage({
      user: roleWith("view_past_appointments", "view_canceled_appointments"),
    });
    expect(screen.queryByText("Upcoming Appointments")).not.toBeInTheDocument();
    expect(screen.getByText("Past Appointments")).toBeInTheDocument();
    // The first visible tab is the one that opens.
    expect(screen.getByTestId("tab-past")).toBeInTheDocument();
  });

  it("renders nothing at all for a role that names none of them", () => {
    const { container } = renderPage({ user: roleWith() });
    expect(container).toBeEmptyDOMElement();
  });
});

describe("switching tabs", () => {
  it("swaps the panel for each tab in turn", () => {
    renderPage();
    fireEvent.click(tabButton("Reschedule Requests"));
    expect(screen.getByTestId("tab-reschedule")).toBeInTheDocument();

    fireEvent.click(tabButton("Past Appointments"));
    expect(screen.getByTestId("tab-past")).toBeInTheDocument();

    fireEvent.click(tabButton("Cancelled Appointments"));
    expect(screen.getByTestId("tab-cancelled")).toBeInTheDocument();

    fireEvent.click(tabButton("Upcoming Appointments"));
    expect(screen.getByTestId("tab-upcoming")).toBeInTheDocument();
  });

  it("marks the open tab and leaves the rest inactive", () => {
    renderPage();
    expect(tabButton("Upcoming Appointments").className).toContain(
      "appointment-sched-view-button-active"
    );
    expect(tabButton("Past Appointments").className).toContain(
      "appointment-sched-view-button-inactive"
    );
  });

  it("remembers the open tab across a remount", () => {
    const first = renderPage();
    fireEvent.click(tabButton("Past Appointments"));
    first.unmount();

    renderPage();
    expect(screen.getByTestId("tab-past")).toBeInTheDocument();
  });

  it("falls back to the first tab when the remembered one is not permitted", () => {
    sessionStorage.setItem("tab:tenant:appointments", "cancelledAppointments");
    renderPage({ user: roleWith("view_past_appointments") });
    expect(screen.getByTestId("tab-past")).toBeInTheDocument();
  });
});

describe("arriving from a notification", () => {
  it("opens the sub-tab the notification named", () => {
    renderPage({ state: { focusTab: "cancelledAppointments" } });
    expect(screen.getByTestId("tab-cancelled")).toBeInTheDocument();
  });

  it("ignores a sub-tab the user is not allowed to see", () => {
    renderPage({
      user: roleWith("view_upcoming_appointments"),
      state: { focusTab: "cancelledAppointments" },
    });
    expect(screen.getByTestId("tab-upcoming")).toBeInTheDocument();
  });

  it("ignores a navigation that names no sub-tab", () => {
    renderPage({ state: { somethingElse: true } });
    expect(screen.getByTestId("tab-upcoming")).toBeInTheDocument();
  });
});

describe("the badge counts", () => {
  it("counts expanded occurrences, requests and cancellations", async () => {
    api.GetUpcomingAppointmentByTenantId.mockResolvedValue(
      listPayload([recurringMaster])
    );
    api.GetRescheduleAppointmentReqByTenantId.mockResolvedValue(
      listPayload([{ id: "r1" }, { id: "r2" }])
    );
    api.GetCancelledAppointmentByTenantId.mockResolvedValue(
      listPayload([{ id: "c1" }])
    );
    renderPage();

    await waitFor(() =>
      expect(tabButton("Upcoming Appointments").textContent).toContain("3")
    );
    expect(tabButton("Reschedule Requests").textContent).toContain("2");
    expect(tabButton("Cancelled Appointments").textContent).toContain("1");
    // Nothing ever counts the past tab, so it never grows a badge.
    expect(
      tabButton("Past Appointments").querySelector("span.ml-2")
    ).toBeNull();
  });

  it("shows no badge on a tab with nothing in it", async () => {
    renderPage();
    await waitFor(() =>
      expect(api.GetUpcomingAppointmentByTenantId).toHaveBeenCalled()
    );
    expect(
      tabButton("Upcoming Appointments").querySelector("span.ml-2")
    ).toBeNull();
  });

  it("counts zero for each fetch that fails", async () => {
    api.GetUpcomingAppointmentByTenantId.mockRejectedValue(new Error("down"));
    api.GetRescheduleAppointmentReqByTenantId.mockRejectedValue(
      new Error("down")
    );
    api.GetCancelledAppointmentByTenantId.mockRejectedValue(new Error("down"));
    renderPage();

    await waitFor(() =>
      expect(api.GetCancelledAppointmentByTenantId).toHaveBeenCalled()
    );
    expect(
      document.querySelectorAll("span.ml-2")
    ).toHaveLength(0);
  });

  it("counts zero when the payloads carry no rows at all", async () => {
    api.GetUpcomingAppointmentByTenantId.mockResolvedValue({});
    api.GetRescheduleAppointmentReqByTenantId.mockResolvedValue({});
    api.GetCancelledAppointmentByTenantId.mockResolvedValue({});
    renderPage();

    await waitFor(() =>
      expect(api.GetCancelledAppointmentByTenantId).toHaveBeenCalled()
    );
    expect(document.querySelectorAll("span.ml-2")).toHaveLength(0);
  });

  it("asks for the signed-in clinician's own lists when they are not an admin", async () => {
    renderPage({ user: { role: { name: "Therapist" } } });

    await waitFor(() =>
      expect(api.GetUpcomingAppointmentByStaffId).toHaveBeenCalledWith({
        staffId: "user-1",
        accessToken: "access-1",
        refreshToken: "refresh-1",
      })
    );
    expect(api.GetCancelledAppointmentByStaffId).toHaveBeenCalled();
    // Only a "Staff" role gets the per-staff reschedule list.
    expect(api.GetRescheduleAppointmentReqByTenantId).toHaveBeenCalled();
  });

  it("asks for a Staff member's own reschedule requests", async () => {
    renderPage({ user: { role: { name: "Staff" } } });
    await waitFor(() =>
      expect(api.GetRescheduleAppointmentReqByStaffId).toHaveBeenCalledWith({
        staffId: "user-1",
        accessToken: "access-1",
        refreshToken: "refresh-1",
      })
    );
    // Staff is neither an owner nor a clinician, so there is no cancelled list
    // to ask for at all.
    expect(api.GetCancelledAppointmentByTenantId).not.toHaveBeenCalled();
    expect(api.GetCancelledAppointmentByStaffId).not.toHaveBeenCalled();
  });

  it("asks the tenant for the cancellations of an owner", async () => {
    renderPage({ user: { role: { name: "Owner" } } });
    await waitFor(() =>
      expect(api.GetCancelledAppointmentByTenantId).toHaveBeenCalled()
    );
  });

  it("asks a clinician only for their own cancellations", async () => {
    renderPage({ user: { role: { name: "Clinician" } } });
    await waitFor(() =>
      expect(api.GetCancelledAppointmentByStaffId).toHaveBeenCalled()
    );
  });

  it("treats a session with no role at all as a client", async () => {
    renderPage({ user: { role: undefined } });
    await waitFor(() =>
      expect(api.GetUpcomingAppointmentByStaffId).toHaveBeenCalled()
    );
    expect(api.GetCancelledAppointmentByStaffId).not.toHaveBeenCalled();
  });

  it("fetches no counts at all without a tenant or a user", () => {
    renderPage({ user: { id: undefined, tenantId: undefined } });
    expect(api.GetUpcomingAppointmentByTenantId).not.toHaveBeenCalled();
    expect(api.GetRescheduleAppointmentReqByTenantId).not.toHaveBeenCalled();
  });

  it("drops the counts on the floor when the page goes away first", async () => {
    let release;
    api.GetUpcomingAppointmentByTenantId.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve(listPayload([recurringMaster]));
      })
    );
    const view = renderPage();
    view.unmount();
    release();

    await waitFor(() =>
      expect(api.GetUpcomingAppointmentByTenantId).toHaveBeenCalled()
    );
    expect(document.querySelectorAll("span.ml-2")).toHaveLength(0);
  });
});
