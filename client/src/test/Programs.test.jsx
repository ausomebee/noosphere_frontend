import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

const getPrograms = vi.fn();
const getPerformance = vi.fn();
vi.mock("../api/programsApis", () => ({
  default: {
    GetClientProgramsAndTargets: (...a) => getPrograms(...a),
    GetClientTargetPerformance: (...a) => getPerformance(...a),
  },
}));

// The layout pulls in the whole nav shell; the page under test is what matters.
vi.mock("../layouts/ClientLayout", () => ({
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

// ApexCharts needs a real layout engine, so it is stood in -- but the page's
// axis and tooltip formatters only ever run because Apex calls them, so the
// stand-in calls them too and exposes what they produced.
const { chart } = vi.hoisted(() => ({ chart: {} }));
vi.mock("react-apexcharts", () => ({
  default: ({ options, series }) => {
    chart.options = options;
    chart.series = series;
    const points = series?.[0]?.data ?? [];
    chart.axisLabels = points.map((v) => options?.yaxis?.labels?.formatter?.(v));
    chart.tooltips = points.map((v, i) =>
      options?.tooltip?.y?.formatter?.(v, { dataPointIndex: i })
    );
    chart.customTooltips = points.map((_v, i) =>
      options?.tooltip?.custom?.({ dataPointIndex: i })
    );
    return <div data-testid="chart" />;
  },
}));

import Programs from "../Pages/Programs/Programs";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The client's programs page.
 *
 * It flattens a nested programs-and-targets response into rows, filters them on
 * a free-text search, and opens a per-target performance chart that fetches
 * separately. The performance response arrives either as a bare array or
 * wrapped in `data`, and both shapes have to render.
 */

const program = (over = {}) => ({
  program: {
    id: "p1",
    name: "Early Intervention",
    description: "Daily living skills",
    domainId: "d1",
    target: [
      { id: "t1", name: "Handwashing", description: "Steps", dataCollectionType: "percentage" },
    ],
    ...over,
  },
});

const makeStore = () =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        isAuthenticated: true,
        loading: false,
        error: null,
        accessToken: "at",
        refreshToken: "rt",
        user: { id: "u1", tenantLinks: [{ id: "tc1", clientId: "cl1", tenantId: "t1" }] },
      },
    },
  });

const renderPage = async () => {
  const view = render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <Programs />
      </MemoryRouter>
    </Provider>
  );
  await waitFor(() => expect(getPrograms).toHaveBeenCalled());
  return view;
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  document.body.innerHTML = "";
  getPrograms.mockResolvedValue({ data: { data: [program()] } });
  Object.keys(chart).forEach((k) => delete chart[k]);
  getPerformance.mockResolvedValue({
    data: { data: [{ monthName: "Jan", average: 80 }, { monthName: "Feb", average: null }] },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading programs", () => {
  it("fetches with the signed-in client's ids", async () => {
    await renderPage();
    expect(getPrograms).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: "cl1", accessToken: "at", refreshToken: "rt" })
    );
  });

  it("renders a program row", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText("Early Intervention")).toBeInTheDocument());
  });

  it("names a program the API left blank", async () => {
    getPrograms.mockResolvedValue({ data: { data: [program({ name: undefined })] } });
    await renderPage();
    await waitFor(() => expect(screen.getByText("Unnamed Program")).toBeInTheDocument());
  });

  it("names a target the API left blank", async () => {
    getPrograms.mockResolvedValue({
      data: { data: [program({ target: [{ id: "t1", name: undefined }] })] },
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText("Early Intervention")).toBeInTheDocument());
  });

  it("copes with a program carrying no targets", async () => {
    getPrograms.mockResolvedValue({ data: { data: [program({ target: undefined })] } });
    await renderPage();
    await waitFor(() => expect(screen.getByText("Early Intervention")).toBeInTheDocument());
  });

  it("copes with an empty response", async () => {
    getPrograms.mockResolvedValue({ data: { data: [] } });
    await renderPage();
    expect(screen.queryByText("Early Intervention")).not.toBeInTheDocument();
  });

  it("copes with a response carrying no data at all", async () => {
    getPrograms.mockResolvedValue({ data: {} });
    await renderPage();
    expect(screen.queryByText("Early Intervention")).not.toBeInTheDocument();
  });

  it("shows the failure message when the fetch fails", async () => {
    getPrograms.mockRejectedValue(new Error("offline"));
    await renderPage();
    await waitFor(() => expect(screen.getByText("offline")).toBeInTheDocument());
  });

  it("falls back to a generic message when the error carries none", async () => {
    getPrograms.mockRejectedValue({});
    await renderPage();
    await waitFor(() =>
      expect(screen.getByText("Failed to load programs")).toBeInTheDocument()
    );
  });
});

describe("searching", () => {
  const two = [
    program(),
    program({ id: "p2", name: "Speech Therapy", description: "Language", target: [] }),
  ];

  it("narrows on the program name", async () => {
    getPrograms.mockResolvedValue({ data: { data: two } });
    await renderPage();
    await waitFor(() => expect(screen.getByText("Speech Therapy")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "speech" } });
    await waitFor(() =>
      expect(screen.queryByText("Early Intervention")).not.toBeInTheDocument()
    );
  });

  it("narrows on the description too", async () => {
    getPrograms.mockResolvedValue({ data: { data: two } });
    await renderPage();
    await waitFor(() => expect(screen.getByText("Speech Therapy")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "language" } });
    await waitFor(() =>
      expect(screen.queryByText("Early Intervention")).not.toBeInTheDocument()
    );
  });

  it("restores everything when the search is cleared", async () => {
    getPrograms.mockResolvedValue({ data: { data: two } });
    await renderPage();
    const box = screen.getByPlaceholderText(/search/i);
    fireEvent.change(box, { target: { value: "speech" } });
    fireEvent.change(box, { target: { value: "" } });
    await waitFor(() => expect(screen.getByText("Early Intervention")).toBeInTheDocument());
  });
});

describe("the performance chart", () => {
  // The target's own button lives inside the expanded row, so the row has to
  // be opened first. The same handler backs the row-actions menu entry.
  const expandFirstRow = async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText("Early Intervention")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Expand row"));
  };

  const openChart = async () => {
    await expandFirstRow();
    fireEvent.click(screen.getByText("View Performance"));
    await waitFor(() => expect(getPerformance).toHaveBeenCalled());
  };

  it("expands a row to list its targets", async () => {
    await expandFirstRow();
    expect(screen.getByText("Handwashing")).toBeInTheDocument();
    expect(screen.getByLabelText("Collapse row")).toBeInTheDocument();
  });

  it("collapses the row again", async () => {
    await expandFirstRow();
    fireEvent.click(screen.getByLabelText("Collapse row"));
    expect(screen.queryByText("Handwashing")).not.toBeInTheDocument();
  });

  it("labels a target that has no description or collection type", async () => {
    getPrograms.mockResolvedValue({
      data: { data: [program({ target: [{ id: "t1" }] })] },
    });
    await expandFirstRow();
    expect(screen.getByText("Unnamed Target")).toBeInTheDocument();
    expect(screen.getByText("No description")).toBeInTheDocument();
    expect(screen.getByText("Not specified")).toBeInTheDocument();
  });

  it("says so when a program has no targets to expand", async () => {
    getPrograms.mockResolvedValue({ data: { data: [program({ target: [] })] } });
    await expandFirstRow();
    expect(
      screen.getByText("No targets available for this program")
    ).toBeInTheDocument();
  });

  it("fetches the target's performance when opened", async () => {
    await openChart();
    expect(getPerformance).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: "cl1", targetId: "t1", accessToken: "at" })
    );
    expect(screen.getByTestId("chart")).toBeInTheDocument();
  });

  it("reads a performance array delivered bare", async () => {
    getPerformance.mockResolvedValue({ data: [{ monthName: "Jan", average: 50 }] });
    await openChart();
    await waitFor(() => expect(screen.getByTestId("chart")).toBeInTheDocument());
  });

  it("copes with a performance response carrying nothing", async () => {
    getPerformance.mockResolvedValue({ data: {} });
    await openChart();
    await waitFor(() => expect(getPerformance).toHaveBeenCalled());
  });

  it("shows the fallback panel when the performance fetch fails", async () => {
    getPerformance.mockRejectedValue(new Error("no data yet"));
    await openChart();
    await waitFor(() =>
      expect(screen.getByText(/Something went wrong loading performance data/i))
        .toBeInTheDocument()
    );
  });

  it("still charts a target whose months are all empty", async () => {
    getPerformance.mockResolvedValue({
      data: { data: [{ monthName: "Jan", average: null }, { monthName: "Feb", average: null }] },
    });
    await openChart();
    await waitFor(() =>
      expect(screen.getByText("No sessions recorded for this target yet."))
        .toBeInTheDocument()
    );
    expect(screen.getByTestId("chart")).toBeInTheDocument();
  });

  it("still builds a chart when no months come back at all", async () => {
    getPerformance.mockResolvedValue({ data: { data: [] } });
    await openChart();
    await waitFor(() =>
      expect(screen.getByText("No sessions recorded for this target yet."))
        .toBeInTheDocument()
    );
  });

  it("changes the date range without refetching", async () => {
    await openChart();
    await waitFor(() => expect(screen.getByTestId("chart")).toBeInTheDocument());
    const range = document.body.querySelector(".modal-header-unique select")
      || document.body.querySelectorAll("select")[0];
    fireEvent.change(range, { target: { value: "30d" } });
    expect(screen.getByTestId("chart")).toBeInTheDocument();
  });

  it("closes the chart from the header", async () => {
    await openChart();
    // Both footer buttons are also labelled Close, so target the header's X.
    fireEvent.click(document.body.querySelector(".modal-close-unique"));
    await waitFor(() => expect(screen.queryByTestId("chart")).not.toBeInTheDocument());
  });

  it("closes the chart from the footer", async () => {
    await openChart();
    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() => expect(screen.queryByTestId("chart")).not.toBeInTheDocument());
  });

  // The page also passes an `actions` array to ReusableTable, but that table
  // only renders an action carrying `render` or `menu`. This one carries
  // neither, so `handleViewPerformance` is unreachable from the UI and the
  // expanded row above is the only way in.
  it("renders no row-actions menu for the programs table", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText("Early Intervention")).toBeInTheDocument());
    expect(screen.queryByLabelText("More actions")).not.toBeInTheDocument();
  });
});

describe("shaping the chart", () => {
  // A month the backend considers to have data: `rawData` non-empty is what
  // decides which of the four data types the whole chart is drawn for.
  const month = (over = {}) => ({
    monthName: "Jan",
    average: 80,
    min: 60,
    max: 95,
    sessionCount: 3,
    dataType: "percentage",
    rawData: [{ trials: 10, correct: 8, incorrect: 2, steps: 5, completed: 4 }],
    ...over,
  });

  const chartFor = async (months) => {
    getPerformance.mockResolvedValue({ data: { data: months } });
    await renderPage();
    await waitFor(() => expect(screen.getByText("Early Intervention")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Expand row"));
    fireEvent.click(screen.getByText("View Performance"));
    await waitFor(() => expect(screen.getByTestId("chart")).toBeInTheDocument());
  };

  it.each([
    ["percentage", "Percentage", "Percentage (%)"],
    ["task_analysis", "Completion Rate", "Completion Rate (%)"],
    ["trials_opportunities", "Correct Trials", "Correct Trials"],
    ["duration", "Average Performance", "Performance Score"],
  ])("names the series and axis for a %s target", async (dataType, seriesName, axisTitle) => {
    await chartFor([month({ dataType })]);
    expect(chart.series[0].name).toBe(seriesName);
    expect(chart.options.yaxis.title.text).toBe(axisTitle);
  });

  it.each([
    ["percentage", 100],
    ["task_analysis", 100],
  ])("caps a %s axis at a hundred", async (dataType, max) => {
    await chartFor([month({ dataType })]);
    expect(chart.options.yaxis.max).toBe(max);
    expect(chart.options.yaxis.min).toBe(0);
  });

  it("sizes a trials axis to the highest value seen", async () => {
    await chartFor([
      month({ dataType: "trials_opportunities", average: 7 }),
      month({ monthName: "Feb", dataType: "trials_opportunities", average: 12 }),
    ]);
    expect(chart.options.yaxis.max).toBe(14);
  });

  it("gives an unrecognised type a floor of a hundred", async () => {
    await chartFor([month({ dataType: "duration", average: 5 })]);
    expect(chart.options.yaxis.max).toBe(110);
  });

  it.each([
    ["percentage", "80%"],
    ["task_analysis", "80%"],
  ])("suffixes the axis labels for a %s target", async (dataType, label) => {
    await chartFor([month({ dataType })]);
    expect(chart.axisLabels[0]).toBe(label);
  });

  it.each(["trials_opportunities", "duration"])(
    "leaves the axis labels of a %s target as plain numbers",
    async (dataType) => {
      await chartFor([month({ dataType, average: 80.4 })]);
      expect(chart.axisLabels[0]).toBe(80);
    }
  );

  it.each([
    ["percentage", "80.0% (3 sessions)"],
    ["task_analysis", "80.0% completion (3 sessions)"],
    ["trials_opportunities", "80.0 correct (3 sessions)"],
    ["duration", "80.0 (3 sessions)"],
  ])("writes the %s tooltip", async (dataType, text) => {
    await chartFor([month({ dataType })]);
    expect(chart.tooltips[0]).toBe(text);
  });

  it("says session in the singular for a single session", async () => {
    await chartFor([month({ sessionCount: 1 })]);
    expect(chart.tooltips[0]).toBe("80.0% (1 session)");
  });

  it("says there is no data for a month with no sessions", async () => {
    await chartFor([month(), month({ monthName: "Feb", sessionCount: 0, rawData: [] })]);
    expect(chart.tooltips[1]).toBe("No data");
    expect(chart.customTooltips[1]).toContain("No sessions this month");
  });

  it.each([
    ["percentage", ["Average: 80.0%", "Min: 60%", "Max: 95%", "Trials: 10"]],
    ["task_analysis", ["Completion: 80.0%", "Steps: 5", "Completed: 4"]],
    ["trials_opportunities", ["Correct: 80.0", "Total Trials: 10", "Incorrect: 2"]],
    ["duration", ["Average: 80.0", "Min: 60", "Max: 95"]],
  ])("details a %s month in the rich tooltip", async (dataType, fragments) => {
    await chartFor([month({ dataType })]);
    fragments.forEach((f) => expect(chart.customTooltips[0]).toContain(f));
  });

  it("omits the trial counts a percentage month does not carry", async () => {
    await chartFor([month({ rawData: [{}] })]);
    expect(chart.customTooltips[0]).not.toContain("Trials:");
  });

  it("omits every optional line a trials month does not carry", async () => {
    await chartFor([month({ dataType: "trials_opportunities", rawData: [{}] })]);
    expect(chart.customTooltips[0]).not.toContain("Total Trials:");
    expect(chart.customTooltips[0]).not.toContain("Incorrect:");
  });

  it("says N/A for a task-analysis month with no step counts", async () => {
    await chartFor([month({ dataType: "task_analysis", rawData: [{}] })]);
    expect(chart.customTooltips[0]).toContain("Steps: N/A");
    expect(chart.customTooltips[0]).toContain("Completed: N/A");
  });

  it("copes with a month carrying no raw data at all", async () => {
    await chartFor([month({ rawData: undefined, sessionCount: 2 })]);
    expect(chart.customTooltips[0]).toContain("Sessions: 2");
  });

  it("assumes a percentage chart when no month has any data", async () => {
    await chartFor([month({ rawData: [], sessionCount: 0 })]);
    expect(chart.series[0].name).toBe("Percentage");
  });

  it("treats a null average as a zero data point", async () => {
    await chartFor([month({ average: null })]);
    expect(chart.series[0].data).toEqual([0]);
  });
});

describe("the modal's own headings", () => {
  it("names the target, its program and its collection type", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText("Early Intervention")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Expand row"));
    fireEvent.click(screen.getByText("View Performance"));
    await waitFor(() => expect(screen.getByTestId("chart")).toBeInTheDocument());
    expect(
      screen.getByText("Program: Early Intervention • percentage")
    ).toBeInTheDocument();
    // The header names the target itself, alongside the expanded row's copy.
    expect(screen.getAllByText("Handwashing").length).toBeGreaterThan(1);
  });

  it("falls back for a target with no name or collection type", async () => {
    getPrograms.mockResolvedValue({
      data: { data: [program({ name: "", target: [{ id: "t1" }] })] },
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText("Unnamed Program")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Expand row"));
    fireEvent.click(screen.getByText("View Performance"));
    await waitFor(() =>
      expect(screen.getByText("Program: Unnamed Program • Data Collection")).toBeInTheDocument()
    );
  });
});

describe("payloads with pieces missing", () => {
  it("fetches nothing when the client is signed in but has no token", async () => {
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: {
        auth: {
          isAuthenticated: true,
          accessToken: null,
          refreshToken: null,
          user: { id: "u1", tenantLinks: [{ id: "tc1", clientId: "cl1", tenantId: "t1" }] },
        },
      },
    });
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Programs />
        </MemoryRouter>
      </Provider>
    );
    expect(getPrograms).not.toHaveBeenCalled();
  });

  it("renders a program the API described with nothing but a name", async () => {
    getPrograms.mockResolvedValue({
      data: { data: [{ program: { name: "Bare Program", target: [{}] } }] },
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText("Bare Program")).toBeInTheDocument());
    expect(screen.getByText("No description")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Expand row"));
    expect(screen.getByText("Unnamed Target")).toBeInTheDocument();
  });

  it("searches across a program that has no description", async () => {
    getPrograms.mockResolvedValue({
      data: {
        data: [
          program({ description: "" }),
          program({ id: "p2", name: "Speech Therapy", description: "" }),
        ],
      },
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText("Speech Therapy")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "speech" } });
    await waitFor(() =>
      expect(screen.queryByText("Early Intervention")).not.toBeInTheDocument()
    );
  });

  it("falls back when the performance fetch throws nothing useful", async () => {
    getPerformance.mockRejectedValue({});
    await renderPage();
    await waitFor(() => expect(screen.getByText("Early Intervention")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Expand row"));
    fireEvent.click(screen.getByText("View Performance"));
    await waitFor(() =>
      expect(screen.getByText(/Something went wrong loading performance data/i))
        .toBeInTheDocument()
    );
  });

  it.each([
    ["task_analysis", "80.0% completion (1 session)"],
    ["trials_opportunities", "80.0 correct (1 session)"],
    ["duration", "80.0 (1 session)"],
  ])("writes a singular %s tooltip", async (dataType, text) => {
    getPerformance.mockResolvedValue({
      data: {
        data: [
          {
            monthName: "Jan",
            average: 80,
            min: 60,
            max: 95,
            sessionCount: 1,
            dataType,
            rawData: [{}],
          },
        ],
      },
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText("Early Intervention")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Expand row"));
    fireEvent.click(screen.getByText("View Performance"));
    await waitFor(() => expect(screen.getByTestId("chart")).toBeInTheDocument());
    expect(chart.tooltips[0]).toBe(text);
  });
});
