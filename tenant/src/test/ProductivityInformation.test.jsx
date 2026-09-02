import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The dashboard's Productivity card: three independent metric fetches run
 * through `Promise.allSettled`, so a single failure has to leave the other two
 * cells rendered while a total failure swaps the card for an error state.
 *
 * Each cell has its own placeholder rule and they are deliberately different --
 * availability checks `totalStaff !== null`, caseload uses `??` and
 * satisfaction checks `!== null` -- so the partial-failure tests below assert
 * one metric at a time rather than the whole card at once.
 *
 * react-apexcharts is replaced by a probe: it needs a real layout engine, and
 * the probe is also how the radial bar's label formatters get exercised.
 */

const api = vi.hoisted(() => ({
  GetTenantSessionOverviewMetrics: vi.fn(),
  GetTenantAvailabilityCount: vi.fn(),
  GetTenantCaseloadCount: vi.fn(),
}));
vi.mock("../api/DashboardApis", () => ({ default: api }));

const chart = vi.hoisted(() => ({ props: null }));
vi.mock("react-apexcharts", () => ({
  default: (received) => {
    chart.props = received;
    return <div data-testid="chart">{String(received.series[0])}</div>;
  },
}));

import ProductivityInformation from "../Pages/Dashboard/DashboardCards/ProductivityInformation";

const makeStore = (user) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: { isAuthenticated: true, loading: false, error: null, token: "at", user },
    },
  });

const signedIn = {
  id: "user-1",
  tenantId: "tenant-1",
  accessToken: "at",
  refreshToken: "rt",
  role: { roleModuleAccesses: [] },
};

const renderCard = ({ user = signedIn, hasData = true } = {}) =>
  render(
    <Provider store={makeStore(user)}>
      <ProductivityInformation hasData={hasData} />
    </Provider>
  );

// The card reads every metric out of `res.data.data`, so fixtures nest twice.
const body = (data) => ({ data: { data } });

// Each metric sits in its own card; read the big blue number out of the card
// whose caption is given rather than by position.
const metric = (caption) =>
  screen.getByText(caption).closest(".dashboard-card").querySelector(".text-4xl").textContent;

const settled = () => waitFor(() => expect(screen.getByTestId("chart")).toBeInTheDocument());

beforeEach(() => {
  vi.clearAllMocks();
  chart.props = null;
  api.GetTenantSessionOverviewMetrics.mockResolvedValue(
    body({ sessionSatisfactionPercentage: "72", averageSessionSatisfactionScore: "4" })
  );
  api.GetTenantAvailabilityCount.mockResolvedValue(
    body({ totalStaff: 12, availableStaff: 5 })
  );
  api.GetTenantCaseloadCount.mockResolvedValue(body({ average: 7 }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the card's own gates", () => {
  it("explains there is nothing to show before any session exists", async () => {
    renderCard({ hasData: false });
    expect(screen.getByText("No data to show")).toBeInTheDocument();
    expect(
      screen.getByText(/Data from all your sessions will be shown here/)
    ).toBeInTheDocument();
    // The gate is on render only: the metric fetches still run underneath.
    await waitFor(() => expect(api.GetTenantCaseloadCount).toHaveBeenCalled());
    expect(screen.queryByTestId("chart")).not.toBeInTheDocument();
  });

  it("shows a loader while the three metrics are in flight", () => {
    renderCard();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("stays on the loader and fetches nothing when no tenant is known", async () => {
    renderCard({ user: {} });
    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
    expect(api.GetTenantAvailabilityCount).not.toHaveBeenCalled();
  });

  it("stays on the loader when a tenant is known but the token is not", async () => {
    renderCard({ user: { ...signedIn, accessToken: undefined } });
    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
    expect(api.GetTenantAvailabilityCount).not.toHaveBeenCalled();
  });

  it("shows the error state only when every metric fails", async () => {
    api.GetTenantSessionOverviewMetrics.mockRejectedValue(new Error("a"));
    api.GetTenantAvailabilityCount.mockRejectedValue(new Error("b"));
    api.GetTenantCaseloadCount.mockRejectedValue(new Error("c"));
    renderCard();
    expect(
      await screen.findByText(
        "We couldn't load your productivity data. Please refresh to try again."
      )
    ).toBeInTheDocument();
    expect(screen.queryByTestId("chart")).not.toBeInTheDocument();
  });

  it("passes the tenant and both tokens to every metric endpoint", async () => {
    renderCard();
    await settled();
    const args = { tenantId: "tenant-1", accessToken: "at", refreshToken: "rt" };
    expect(api.GetTenantSessionOverviewMetrics).toHaveBeenCalledWith(args);
    expect(api.GetTenantAvailabilityCount).toHaveBeenCalledWith(args);
    expect(api.GetTenantCaseloadCount).toHaveBeenCalledWith(args);
  });
});

describe("the metric cells", () => {
  it("renders every metric the endpoints returned", async () => {
    renderCard();
    await settled();
    expect(metric("Therapist Availability")).toBe("5/12");
    expect(metric("Client Caseload Overview")).toBe("7");
    expect(metric("Average Session Satisfaction Scores")).toBe("4/5");
    expect(screen.getByTestId("chart")).toHaveTextContent("72");
  });

  it("reads a missing response body as zero across the board", async () => {
    api.GetTenantSessionOverviewMetrics.mockResolvedValue(undefined);
    api.GetTenantAvailabilityCount.mockResolvedValue({});
    api.GetTenantCaseloadCount.mockResolvedValue({ data: {} });
    renderCard();
    await settled();
    expect(metric("Therapist Availability")).toBe("0/0");
    expect(metric("Client Caseload Overview")).toBe("0");
    expect(metric("Average Session Satisfaction Scores")).toBe("0/5");
    expect(screen.getByTestId("chart")).toHaveTextContent("0");
  });

  it("reads unparseable numbers as zero rather than NaN", async () => {
    api.GetTenantSessionOverviewMetrics.mockResolvedValue(
      body({ sessionSatisfactionPercentage: "n/a", averageSessionSatisfactionScore: null })
    );
    api.GetTenantAvailabilityCount.mockResolvedValue(
      body({ totalStaff: "many", availableStaff: "" })
    );
    api.GetTenantCaseloadCount.mockResolvedValue(body({ average: "none" }));
    renderCard();
    await settled();
    expect(metric("Therapist Availability")).toBe("0/0");
    expect(metric("Client Caseload Overview")).toBe("0");
    expect(screen.getByTestId("chart")).toHaveTextContent("0");
  });

  it("dashes out only the availability cell when just that metric fails", async () => {
    api.GetTenantAvailabilityCount.mockRejectedValue(new Error("down"));
    renderCard();
    await settled();
    expect(metric("Therapist Availability")).toBe("--");
    expect(metric("Client Caseload Overview")).toBe("7");
    expect(metric("Average Session Satisfaction Scores")).toBe("4/5");
  });

  it("dashes out only the caseload cell when just that metric fails", async () => {
    api.GetTenantCaseloadCount.mockRejectedValue(new Error("down"));
    renderCard();
    await settled();
    expect(metric("Client Caseload Overview")).toBe("--");
    expect(metric("Therapist Availability")).toBe("5/12");
  });

  it("dashes the satisfaction cell and zeroes the chart when the overview fails", async () => {
    api.GetTenantSessionOverviewMetrics.mockRejectedValue(new Error("down"));
    renderCard();
    await settled();
    expect(metric("Average Session Satisfaction Scores")).toBe("--");
    expect(screen.getByTestId("chart")).toHaveTextContent("0");
  });
});

describe("the radial productivity chart", () => {
  it("plots the productivity percentage as its only series", async () => {
    renderCard();
    await settled();
    expect(chart.props.type).toBe("radialBar");
    expect(chart.props.series).toEqual([72]);
  });

  it("labels the ring with its caption and a percent-suffixed value", async () => {
    renderCard();
    await settled();
    const labels = chart.props.options.plotOptions.radialBar.dataLabels;
    expect(labels.name.formatter()).toBe("Therapist Productivity");
    expect(labels.value.formatter(72)).toBe("72%");
  });
});
