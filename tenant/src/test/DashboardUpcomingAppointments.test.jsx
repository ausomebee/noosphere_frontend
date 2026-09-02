import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The Upcoming Appointments dashboard card (not the scheduler tab of the same
 * name). It fetches the tenant's appointment masters, expands each one into its
 * future instances through the shared recurrence expander, sorts them, keeps
 * the first five and hands them to the shared table.
 *
 * The expander is deliberately left real: it is what turns a master into the
 * instances the card counts and renders, and stubbing it would take the sort,
 * the count callback and the empty state with it. That makes the fixtures
 * clock-relative -- an appointment must fall inside the expander's six-month
 * future window to survive -- so dates here are always offsets from today.
 *
 * The table is a probe so each row can be read back exactly as the card built
 * it, which is where all the `||` fallbacks live.
 */

const api = vi.hoisted(() => ({ GetUpcomingAppointmentByTenantId: vi.fn() }));
vi.mock("../api/AppointmentApi", () => ({ default: api }));

const table = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/Table/CustomTable", () => ({
  default: (received) => {
    table.props = received;
    return <div data-testid="table" />;
  },
}));

import UpcomingAppointments from "../Pages/Dashboard/DashboardCards/UpcomingAppointments";

const makeStore = (user) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: { isAuthenticated: true, loading: false, error: null, token: "at", user },
    },
  });

const owner = {
  id: "u1",
  tenantId: "tenant-1",
  accessToken: "at",
  refreshToken: "rt",
  // An empty accesses array is the org-owner case: every permission granted.
  role: { roleModuleAccesses: [] },
};

const restricted = {
  ...owner,
  role: { roleModuleAccesses: [{ module: "SCHEDULER", permissions: ["view_appointment"] }] },
};

const setCount = vi.fn();

const renderCard = ({ hasData = true, user = owner, count = setCount } = {}) =>
  render(
    <Provider store={makeStore(user)}>
      <UpcomingAppointments hasData={hasData} setCount={count} />
    </Provider>
  );

const pad = (n) => String(n).padStart(2, "0");
// The expander only keeps instances inside a six-month future window, so every
// fixture date is expressed as an offset from today.
const inDays = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const appointment = (over = {}) => ({
  id: "ap-1",
  date: inDays(1),
  startTime: "09:00",
  endTime: "10:00",
  isRecurring: false,
  client: { firstName: "Ada", lastName: "Lovelace" },
  clinicians: [{ fullName: "Grace Hopper" }],
  appointmentServices: [{ serviceCode: { code: "97153" } }],
  session: { name: "Direct Therapy" },
  colourCode: "#ABCDEF",
  ...over,
});

const rows = () => table.props.data;

const load = async (data, opts) => {
  api.GetUpcomingAppointmentByTenantId.mockResolvedValue({ data: { data } });
  const view = renderCard(opts);
  await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
  return view;
};

beforeEach(() => {
  vi.clearAllMocks();
  table.props = null;
  api.GetUpcomingAppointmentByTenantId.mockResolvedValue({ data: { data: [] } });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the card with nothing scheduled", () => {
  it("invites an owner to schedule an appointment", () => {
    renderCard({ hasData: false });
    expect(screen.getByText("No upcoming appointments")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Schedule Appointment" })).toBeInTheDocument();
    expect(api.GetUpcomingAppointmentByTenantId).not.toHaveBeenCalled();
  });

  it("withholds the invitation from a role that cannot create appointments", () => {
    renderCard({ hasData: false, user: restricted });
    expect(screen.queryByRole("button", { name: "Schedule Appointment" })).not.toBeInTheDocument();
  });

  it("sends the browser to the scheduler when the invitation is taken up", () => {
    const original = window.location;
    Object.defineProperty(window, "location", {
      value: { ...original, href: "" },
      writable: true,
      configurable: true,
    });
    try {
      renderCard({ hasData: false });
      fireEvent.click(screen.getByRole("button", { name: "Schedule Appointment" }));
      expect(window.location.href).toBe("/schedule-appointment");
    } finally {
      Object.defineProperty(window, "location", {
        value: original,
        writable: true,
        configurable: true,
      });
    }
  });
});

describe("fetching", () => {
  it("asks for the tenant's upcoming appointments", async () => {
    await load([appointment()]);
    expect(api.GetUpcomingAppointmentByTenantId).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      accessToken: "at",
      refreshToken: "rt",
    });
  });

  it("shows a loading line until the request lands", async () => {
    let release;
    api.GetUpcomingAppointmentByTenantId.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    renderCard();
    expect(screen.getByText("Loading appointments...")).toBeInTheDocument();
    release({ data: { data: [] } });
    await waitFor(() =>
      expect(screen.getByText("No upcoming appointments scheduled")).toBeInTheDocument()
    );
  });

  it("stops loading without asking when there is no tenant", async () => {
    renderCard({ user: { ...owner, tenantId: undefined } });
    await waitFor(() =>
      expect(screen.getByText("No upcoming appointments scheduled")).toBeInTheDocument()
    );
    expect(api.GetUpcomingAppointmentByTenantId).not.toHaveBeenCalled();
  });

  it("treats a response with no data envelope as nothing scheduled", async () => {
    api.GetUpcomingAppointmentByTenantId.mockResolvedValue({});
    renderCard();
    await waitFor(() =>
      expect(screen.getByText("No upcoming appointments scheduled")).toBeInTheDocument()
    );
    expect(setCount).toHaveBeenCalledWith(0);
  });

  it("says nothing is scheduled when every master falls outside the future window", async () => {
    api.GetUpcomingAppointmentByTenantId.mockResolvedValue({
      data: { data: [appointment({ date: inDays(-30) })] },
    });
    renderCard();
    expect(
      await screen.findByText("No upcoming appointments scheduled")
    ).toBeInTheDocument();
    expect(setCount).toHaveBeenLastCalledWith(0);
  });

  it("reports the total number of expanded instances to the dashboard", async () => {
    await load([appointment(), appointment({ id: "ap-2", date: inDays(2) })]);
    expect(setCount).toHaveBeenLastCalledWith(2);
  });

  it("works just as well when the dashboard passes no count callback", async () => {
    await load([appointment()], { count: null });
    expect(rows()).toHaveLength(1);
  });
});

describe("a failed fetch", () => {
  it("replaces the card with an error state and zeroes the badge", async () => {
    api.GetUpcomingAppointmentByTenantId.mockRejectedValue(new Error("500"));
    renderCard();
    expect(
      await screen.findByText("We couldn't load your upcoming appointments. Please try again.")
    ).toBeInTheDocument();
    expect(setCount).toHaveBeenCalledWith(0);
  });

  it("leaves the badge alone when the dashboard passes no count callback", async () => {
    api.GetUpcomingAppointmentByTenantId.mockRejectedValue(new Error("500"));
    renderCard({ count: null });
    expect(
      await screen.findByText("We couldn't load your upcoming appointments. Please try again.")
    ).toBeInTheDocument();
    expect(setCount).not.toHaveBeenCalled();
  });

  it("recovers when the retry succeeds", async () => {
    api.GetUpcomingAppointmentByTenantId.mockRejectedValueOnce(new Error("500"));
    api.GetUpcomingAppointmentByTenantId.mockResolvedValue({ data: { data: [appointment()] } });
    renderCard();
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
    expect(rows()).toHaveLength(1);
  });
});

describe("the table rows", () => {
  it("flattens a fully populated appointment", async () => {
    await load([appointment()]);
    expect(rows()[0]).toEqual({
      clientName: "Ada Lovelace",
      therapistName: "Grace Hopper",
      serviceType: "97153",
      sessionType: "Direct Therapy",
      date: inDays(1),
      time: "09:00 - 10:00",
    });
  });

  it("joins several clinicians and services", async () => {
    await load([
      appointment({
        clinicians: [{ fullName: "Grace Hopper" }, { fullName: "Alan Turing" }],
        appointmentServices: [
          { serviceCode: { code: "97153" }, modifiers: { modifier: "HN" } },
          { serviceCode: { code: "97155" } },
        ],
      }),
    ]);
    expect(rows()[0].therapistName).toBe("Grace Hopper, Alan Turing");
    expect(rows()[0].serviceType).toBe("97153 (HN), 97155");
  });

  it("fills in a placeholder for everything the appointment omits", async () => {
    await load([
      appointment({
        client: null,
        clinicians: null,
        appointmentServices: null,
        session: null,
        colourCode: null,
        startTime: null,
        endTime: null,
      }),
    ]);
    expect(rows()[0]).toMatchObject({
      clientName: "Unknown",
      therapistName: "Unassigned",
      serviceType: "N/A",
      // The row transform substitutes a session named "Unknown" before the
      // table's own "N/A" fallback can apply.
      sessionType: "Unknown",
      time: "—",
    });
  });

  it("dashes the time when only one half of the slot is known", async () => {
    await load([appointment({ endTime: null })]);
    expect(rows()[0].time).toBe("—");
  });

  it("falls back to N/A for a session whose name is blank", async () => {
    await load([appointment({ session: { name: "" } })]);
    expect(rows()[0].sessionType).toBe("N/A");
  });

  it("names a client from whichever half exists", async () => {
    await load([
      appointment({ id: "a", client: { firstName: "Ada" } }),
      appointment({ id: "b", date: inDays(2), client: { lastName: "Lovelace" } }),
      appointment({ id: "c", date: inDays(3), client: {} }),
    ]);
    expect(rows().map((r) => r.clientName)).toEqual(["Ada", "Lovelace", "Unknown"]);
  });

  it("sorts the expanded instances by when they start", async () => {
    await load([
      appointment({ id: "late", date: inDays(3), startTime: "08:00" }),
      appointment({ id: "early", date: inDays(1), startTime: "14:00" }),
      appointment({ id: "middle", date: inDays(1), startTime: "09:00" }),
    ]);
    expect(rows().map((r) => `${r.date} ${r.time}`)).toEqual([
      `${inDays(1)} 09:00 - 10:00`,
      `${inDays(1)} 14:00 - 10:00`,
      `${inDays(3)} 08:00 - 10:00`,
    ]);
  });

  it("shows only the first five instances", async () => {
    await load(
      Array.from({ length: 8 }, (_, i) =>
        appointment({ id: `ap-${i}`, date: inDays(i + 1) })
      )
    );
    expect(rows()).toHaveLength(5);
    // The badge still counts every instance, not just the visible page.
    expect(setCount).toHaveBeenLastCalledWith(8);
  });

  it("gives the table its six columns and hides its chrome", async () => {
    await load([appointment()]);
    expect(table.props.columns.map((c) => c.key)).toEqual([
      "clientName",
      "therapistName",
      "serviceType",
      "sessionType",
      "date",
      "time",
    ]);
    expect(table.props.showActions).toBe(false);
    expect(table.props.showCheckbox).toBe(false);
    expect(table.props.hideSearch).toBe(true);
  });
});
