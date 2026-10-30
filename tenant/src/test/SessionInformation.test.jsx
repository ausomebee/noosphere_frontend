import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The Session Information dashboard card: an area chart of session counts for
 * one status over one period, plus a headline total.
 *
 * The interesting work is `generateFullPeriods`, which builds the full set of
 * expected buckets for the chosen period -- the last twelve months, every day
 * of the current month, or the last thirty days -- and zero-fills whatever the
 * endpoint did not return. Because those buckets are derived from "now", the
 * tests build the same period keys from the same clock rather than hard-coding
 * dates, and assert on bucket counts and totals instead of on label text.
 *
 * react-apexcharts is stubbed (it needs a real layout engine) but records the
 * options it was given, which is how the tooltip formatters get exercised.
 */

const api = vi.hoisted(() => ({ GetTenantSessionMetrics: vi.fn() }));
vi.mock("../api/DashboardApis", () => ({ default: api }));

const chart = vi.hoisted(() => ({ props: null }));
vi.mock("react-apexcharts", () => ({
  default: (received) => {
    chart.props = received;
    return <div data-testid="area-chart" />;
  },
}));

vi.mock("../api/generalSettingsApi", () => ({
  default: { GetGeneralSettingsByTenantId: vi.fn().mockResolvedValue({ data: null }) },
}));

import SessionInformation from "../Pages/Dashboard/DashboardCards/SessionInformation";

const makeStore = (user) =>
  configureStore({
    reducer: { authentication: authReducer, generalSettings: generalSettingsReducer },
    preloadedState: {
      authentication: { isAuthenticated: true, loading: false, error: null, token: "at", user },
      generalSettings: {
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12-hour",
        currency: "USD",
        loaded: true,
      },
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

const renderCard = (props = {}, user = owner) =>
  render(
    <Provider store={makeStore(user)}>
      <SessionInformation hasData {...props} />
    </Provider>
  );

// The card derives its buckets from the current clock, so the fixtures do too.
const pad = (n) => String(n).padStart(2, "0");
const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const daysInThisMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
};

const series = () => chart.props.series[0].data;

const settle = async (props, user) => {
  const view = renderCard(props, user);
  await waitFor(() => expect(screen.getByTestId("area-chart")).toBeInTheDocument());
  return view;
};

beforeEach(() => {
  vi.clearAllMocks();
  chart.props = null;
  api.GetTenantSessionMetrics.mockResolvedValue({ data: { data: [] } });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the empty card", () => {
  it("invites an owner to schedule a session", () => {
    renderCard({ hasData: false });
    expect(screen.getByText("No data to show")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Schedule a session" })).toBeInTheDocument();
    expect(api.GetTenantSessionMetrics).not.toHaveBeenCalled();
  });

  it("withholds the invitation from a role that cannot create appointments", () => {
    renderCard({ hasData: false }, restricted);
    expect(screen.getByText("No data to show")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Schedule a session" })).not.toBeInTheDocument();
  });
});

describe("the request", () => {
  it("maps the card's own vocabulary onto the endpoint's", async () => {
    await settle({ sessionType: "canceledSessions", sessionPeriod: "year" });
    expect(api.GetTenantSessionMetrics).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      status: "canceled",
      period: "year",
      accessToken: "at",
      refreshToken: "rt",
    });
  });

  it("asks for rescheduled sessions when that is the chosen type", async () => {
    await settle({ sessionType: "rescheduledSessions", sessionPeriod: "day" });
    expect(api.GetTenantSessionMetrics.mock.calls[0][0]).toMatchObject({
      status: "rescheduled",
      period: "day",
    });
  });

  it("falls back to completed sessions this month for values it does not know", async () => {
    await settle({ sessionType: "somethingElse", sessionPeriod: "fortnight" });
    expect(api.GetTenantSessionMetrics.mock.calls[0][0]).toMatchObject({
      status: "completed",
      period: "month",
    });
  });

  it("shows a loader until the request lands", async () => {
    let release;
    api.GetTenantSessionMetrics.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    renderCard();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    release({ data: { data: [] } });
    await waitFor(() => expect(screen.getByTestId("area-chart")).toBeInTheDocument());
  });

  it("renders an empty chart without asking when there is no tenant", async () => {
    await settle({}, { ...owner, tenantId: undefined });
    expect(api.GetTenantSessionMetrics).not.toHaveBeenCalled();
    expect(screen.getByText("0 Sessions this month")).toBeInTheDocument();
  });
});

describe("zero-filling the periods", () => {
  it("builds one bucket per day of the current month", async () => {
    api.GetTenantSessionMetrics.mockResolvedValue({
      data: { data: [{ period: dayKey(), count: 4 }] },
    });
    await settle({ sessionPeriod: "month" });
    expect(series()).toHaveLength(daysInThisMonth());
    expect(series().filter((v) => v !== 0)).toEqual([4]);
    expect(screen.getByText("4 Sessions this month")).toBeInTheDocument();
  });

  it("builds twelve monthly buckets for the year view", async () => {
    api.GetTenantSessionMetrics.mockResolvedValue({
      data: { data: [{ period: monthKey(), count: 7 }] },
    });
    await settle({ sessionPeriod: "year" });
    expect(series()).toHaveLength(12);
    expect(chart.props.options.xaxis.categories).toHaveLength(12);
    expect(screen.getByText("7 Sessions this year")).toBeInTheDocument();
  });

  it("builds thirty daily buckets for the day view", async () => {
    api.GetTenantSessionMetrics.mockResolvedValue({
      data: { data: [{ period: dayKey(), count: 2 }] },
    });
    await settle({ sessionPeriod: "day" });
    expect(series()).toHaveLength(30);
    expect(screen.getByText("2 Sessions last 30 days")).toBeInTheDocument();
  });

  it("zeroes a bucket whose count the endpoint sent as unparseable", async () => {
    api.GetTenantSessionMetrics.mockResolvedValue({
      data: { data: [{ period: dayKey(), count: "lots" }] },
    });
    await settle({ sessionPeriod: "month" });
    expect(series().every((v) => v === 0)).toBe(true);
    expect(screen.getByText("0 Sessions this month")).toBeInTheDocument();
  });

  it("ignores a bucket for a period outside the window", async () => {
    api.GetTenantSessionMetrics.mockResolvedValue({
      data: { data: [{ period: "1999-01-01", count: 9 }] },
    });
    await settle({ sessionPeriod: "month" });
    expect(series().every((v) => v === 0)).toBe(true);
  });

  it("treats a response with no data list as all zeroes", async () => {
    api.GetTenantSessionMetrics.mockResolvedValue({ data: {} });
    await settle({ sessionPeriod: "month" });
    expect(series()).toHaveLength(daysInThisMonth());
    expect(screen.getByText("0 Sessions this month")).toBeInTheDocument();
  });

  it("sums every bucket into the headline", async () => {
    const now = new Date();
    const second = new Date(now.getFullYear(), now.getMonth(), now.getDate() === 1 ? 2 : 1);
    api.GetTenantSessionMetrics.mockResolvedValue({
      data: {
        data: [
          { period: dayKey(now), count: 3 },
          { period: dayKey(second), count: 5 },
        ],
      },
    });
    await settle({ sessionPeriod: "month" });
    expect(screen.getByText("8 Sessions this month")).toBeInTheDocument();
  });

  it("uses the singular for a single session", async () => {
    api.GetTenantSessionMetrics.mockResolvedValue({
      data: { data: [{ period: dayKey(), count: 1 }] },
    });
    await settle({ sessionPeriod: "month" });
    expect(screen.getByText("1 Session this month")).toBeInTheDocument();
  });
});

describe("the chart options", () => {
  it("formats the tooltip's value in the singular for one session", async () => {
    await settle({ sessionPeriod: "month" });
    expect(chart.props.options.tooltip.y.formatter(1)).toBe("1 session");
  });

  it("formats the tooltip's value in the plural for anything else", async () => {
    await settle({ sessionPeriod: "month" });
    expect(chart.props.options.tooltip.y.formatter(0)).toBe("0 sessions");
    expect(chart.props.options.tooltip.y.formatter(3)).toBe("3 sessions");
  });

  it("dates the tooltip by day for the thirty-day view and by month otherwise", async () => {
    await settle({ sessionPeriod: "day" });
    expect(chart.props.options.tooltip.x.format).toBe("dd MMM");
    chart.props = null;
    await settle({ sessionPeriod: "year" });
    expect(chart.props.options.tooltip.x.format).toBe("MMM yyyy");
  });

  it("labels the empty chart as having found nothing", async () => {
    await settle({ sessionPeriod: "month" });
    expect(chart.props.options.noData.text).toBe("No sessions found");
  });
});

describe("a failed request", () => {
  // window.location.reload is not writable in jsdom, so the whole location is
  // swapped for a stand-in and restored afterwards.
  let original;
  const reload = vi.fn();

  beforeEach(() => {
    original = window.location;
    Object.defineProperty(window, "location", {
      value: { ...original, reload },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: original,
      writable: true,
      configurable: true,
    });
  });

  it("replaces the chart with an error state", async () => {
    api.GetTenantSessionMetrics.mockRejectedValue(new Error("503"));
    renderCard();
    expect(
      await screen.findByText("We couldn't load your session information. Please try again.")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("area-chart")).not.toBeInTheDocument();
  });

  it("still shows the error state for a rejection carrying no message", async () => {
    api.GetTenantSessionMetrics.mockRejectedValue({});
    renderCard();
    expect(
      await screen.findByText("We couldn't load your session information. Please try again.")
    ).toBeInTheDocument();
  });

  it("reloads the page from the retry button", async () => {
    api.GetTenantSessionMetrics.mockRejectedValue(new Error("503"));
    renderCard();
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(reload).toHaveBeenCalled();
  });
});
