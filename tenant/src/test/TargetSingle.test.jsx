import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The single-target page in the program library: target information, an
 * optional baseline table, a performance graph and the list of sessions the
 * target was worked in.
 *
 * The page runs in two modes decided by the query string. With only a
 * `targetId` it is the library view -- one target definition, a baseline table
 * built from every stored session, and no performance or session sections.
 * With a `clientId` as well it is the client view: the target arrives wrapped
 * in a client-target record, the baseline shows the latest entry with a summary
 * line, and the performance and session fetches both run. Route params and the
 * query string are therefore the main dial these tests turn.
 *
 * The seven data-collection modals are probes -- which one opens, and with what
 * trial count or step list, is the page's decision and the only part worth
 * asserting here. ApexCharts is a probe too, so the chart options the page
 * computes (axis bounds, series name, the label and tooltip formatters) can be
 * called directly instead of being rendered into a canvas jsdom cannot draw.
 */

const apiMock = vi.hoisted(() => ({
  GetProgramsTargetById: vi.fn(),
  GetTargetInfoByTargetIdAndClientId: vi.fn(),
  GetTargetBaselineData: vi.fn(),
  GetSessionsByTarget: vi.fn(),
  GetClientTargetPerformance: vi.fn(),
  CreateClientDataCollectionData: vi.fn(),
}));
vi.mock("../api/ProgramLibraryApis", () => ({ default: apiMock }));

const toastMock = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toastMock.showToast(...a),
  showApiError: vi.fn(),
}));

// Route params and query string are swapped per test rather than per render,
// because the page reads them once through hooks.
const route = vi.hoisted(() => ({
  params: {},
  search: "",
  navigate: vi.fn(),
}));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => route.navigate,
  useParams: () => route.params,
  useSearchParams: () => [new URLSearchParams(route.search), vi.fn()],
}));

const chart = vi.hoisted(() => ({ last: null }));
vi.mock("react-apexcharts", () => ({
  default: (props) => {
    chart.last = props;
    return <div data-testid="performance-chart" />;
  },
}));

const modals = vi.hoisted(() => {
  const props = {};
  const make = (name) => (received) => {
    props[name] = received;
    return received.isOpen ? <div data-testid={`${name}-modal`} /> : null;
  };
  return { props, make };
});
vi.mock("../Components/ReusableModal/DataCollectionModal/FrequencyModal", () => ({
  default: modals.make("frequency"),
}));
vi.mock("../Components/ReusableModal/DataCollectionModal/DurationModal", () => ({
  default: modals.make("duration"),
}));
vi.mock("../Components/ReusableModal/DataCollectionModal/RateModal", () => ({
  default: modals.make("rate"),
}));
vi.mock("../Components/ReusableModal/DataCollectionModal/PercentageCorrectModal", () => ({
  default: modals.make("percentage"),
}));
vi.mock("../Components/ReusableModal/DataCollectionModal/TrialsOpportunitiesModal", () => ({
  default: modals.make("trials"),
}));
vi.mock("../Components/ReusableModal/DataCollectionModal/TaskAnalysisModal", () => ({
  default: modals.make("task"),
}));
vi.mock("../Components/ReusableModal/DataCollectionModal/LatencyModal", () => ({
  default: modals.make("latency"),
}));

import TargetSingle from "../Pages/ProgramLibrary/TargetSingle";

const target = (over = {}) => ({
  name: "Requests a break",
  initialStatus: "In Progress",
  sd: "Say 'break'",
  expectedResponse: "Signs break",
  teachingProcedure: "DTT",
  dataCollectionType: "Frequency",
  numberOfTrials: 5,
  baselineDataRequired: false,
  program: { name: "Communication", domain: { name: "Language" } },
  ...over,
});

const store = ({ tenantId = "tenant-1" } = {}) =>
  configureStore({
    reducer: { authentication: authReducer, generalSettings: generalSettingsReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user: {
          id: "user-1",
          tenantId,
          accessToken: "at",
          refreshToken: "rt",
          role: { roleModuleAccesses: [] },
        },
      },
      generalSettings: {
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12-hour",
        currency: "USD",
        loaded: true,
      },
    },
  });

/** Library mode: a target id and nothing else. */
const inLibrary = (t) => {
  route.search = "targetId=t-1";
  apiMock.GetProgramsTargetById.mockResolvedValue({ data: { data: t } });
};

/** Client mode: the target comes wrapped in a client-target record. */
const forClient = (t, clientTargetId = "ct-1") => {
  route.search = "targetId=t-1&clientId=c-1";
  apiMock.GetTargetInfoByTargetIdAndClientId.mockResolvedValue({
    data: { data: [{ id: clientTargetId, target: t }] },
  });
};

/**
 * Client mode with a required-but-unfilled baseline. In the client view the
 * session section always renders a table, so the baseline empty state's
 * "Collect Baseline Data" is the page's only route into the collection modals.
 */
const forClientCollecting = (t, clientTargetId = "ct-1") => {
  forClient(t, clientTargetId);
  apiMock.GetTargetBaselineData.mockResolvedValue({
    data: { data: { baselineDataRequired: true, sessionDatas: [] } },
  });
};

const renderPage = (storeOptions) =>
  render(
    <Provider store={store(storeOptions)}>
      <TargetSingle />
    </Provider>
  );

const loaded = () => screen.findByText("Basic Details");

// Label and value are separate <p> siblings inside one row.
const detail = (label) =>
  screen.getByText(label).nextElementSibling?.textContent?.trim() ?? "";

const exportToggle = (section) =>
  screen.getByText(section).nextElementSibling.querySelector("button");

beforeEach(() => {
  vi.clearAllMocks();
  route.params = {
    domainName: "Language%20Skills",
    programName: "Communication",
    targetName: "Requests%20a%20break",
  };
  route.search = "targetId=t-1";
  apiMock.GetProgramsTargetById.mockResolvedValue({ data: { data: target() } });
  apiMock.GetTargetInfoByTargetIdAndClientId.mockResolvedValue({
    data: { data: [{ id: "ct-1", target: target() }] },
  });
  apiMock.GetTargetBaselineData.mockResolvedValue({ data: { data: { baselineDataRequired: false } } });
  apiMock.GetSessionsByTarget.mockResolvedValue({ data: { data: [] } });
  apiMock.GetClientTargetPerformance.mockResolvedValue({ data: { data: [] } });
  apiMock.CreateClientDataCollectionData.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("route context", () => {
  it("decodes the breadcrumb segments from the url", async () => {
    renderPage();
    await loaded();
    const trail = document.body.querySelector(".breadcrumb-trail");
    expect(trail).toHaveTextContent("Language Skills");
    expect(trail).toHaveTextContent("Communication");
    expect(trail).toHaveTextContent("Requests a break");
  });

  it("goes back a page from the Back button", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(route.navigate).toHaveBeenCalledWith(-1);
  });

  it("reads the library endpoint when the url carries no client", async () => {
    renderPage();
    await loaded();
    expect(apiMock.GetProgramsTargetById).toHaveBeenCalledWith({
      Id: "t-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(apiMock.GetTargetInfoByTargetIdAndClientId).not.toHaveBeenCalled();
  });

  it("reads the client endpoint when the url carries a client", async () => {
    forClient(target());
    renderPage();
    await loaded();
    expect(apiMock.GetTargetInfoByTargetIdAndClientId).toHaveBeenCalledWith({
      clientId: "c-1",
      targetId: "t-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(apiMock.GetProgramsTargetById).not.toHaveBeenCalled();
  });

  it("shows the error fallback when the url names no target at all", async () => {
    route.search = "";
    renderPage();
    expect(await screen.findByText("Oops!")).toBeInTheDocument();
    expect(
      screen.getByText("Something went wrong loading the target. Please try again.")
    ).toBeInTheDocument();
  });

  it("shows the error fallback when the endpoint returns no target", async () => {
    // The "No target information available" panel below is unreachable: the
    // fetch reads `target.baselineDataRequired` straight after deciding the
    // target is missing, and the resulting TypeError lands in the error branch.
    inLibrary(null);
    renderPage();
    expect(await screen.findByText("Oops!")).toBeInTheDocument();
    expect(screen.queryByText("No target information available")).not.toBeInTheDocument();
  });

  it("shows the error fallback for a rejection that carries no message", async () => {
    // Some interceptors reject with a bare object rather than an Error.
    apiMock.GetProgramsTargetById.mockRejectedValue({});
    renderPage();
    expect(await screen.findByText("Oops!")).toBeInTheDocument();
  });

  it("retries the fetch from the error fallback", async () => {
    apiMock.GetProgramsTargetById.mockRejectedValueOnce(new Error("offline"));
    renderPage();
    await screen.findByText("Oops!");
    fireEvent.click(screen.getByRole("button", { name: /Try Again/ }));
    await loaded();
    expect(apiMock.GetProgramsTargetById).toHaveBeenCalledTimes(2);
  });
});

describe("target information", () => {
  it("lays out the stored details across the three panels", async () => {
    renderPage();
    await loaded();
    expect(detail("Program")).toBe("Communication");
    expect(detail("Domain")).toBe("Language");
    expect(detail("Status")).toBe("In Progress");
    expect(detail("SD")).toBe("Say 'break'");
    expect(detail("Expected Response")).toBe("Signs break");
    expect(detail("Teaching Procedure")).toBe("DTT");
    expect(detail("Type")).toBe("Frequency");
    expect(detail("No of Trials")).toBe("5");
  });

  it("falls back to N/A for every field the target leaves blank", async () => {
    inLibrary({});
    renderPage();
    await loaded();
    expect(detail("Program")).toBe("N/A");
    expect(detail("Domain")).toBe("N/A");
    expect(detail("Target")).toBe("N/A");
    expect(detail("SD")).toBe("N/A");
    expect(detail("Prompting Strategy")).toBe("N/A");
    expect(detail("Type")).toBe("N/A");
    // A target with no saved status is one that has not been introduced yet.
    expect(detail("Status")).toBe("Not Introduced");
  });

  it("reads the label out of each json-encoded prompting strategy", async () => {
    inLibrary(
      target({
        promptingStrategy: ['{"label":"Full physical"}', '{"label":"Gestural"}'],
      })
    );
    renderPage();
    await loaded();
    expect(detail("Prompting Strategy")).toBe("Full physical, Gestural");
  });

  it("keeps a prompting strategy entry that is not json as it stands", async () => {
    inLibrary(target({ promptingStrategy: ["Least-to-most", '{"label":"Echoic"}'] }));
    renderPage();
    await loaded();
    expect(detail("Prompting Strategy")).toBe("Least-to-most, Echoic");
  });

  it("shows a single stored prompting strategy string unchanged", async () => {
    inLibrary(target({ promptingStrategy: "Most-to-least" }));
    renderPage();
    await loaded();
    expect(detail("Prompting Strategy")).toBe("Most-to-least");
  });
});

describe("task step parsing", () => {
  const openTaskModal = async () => {
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Collect Baseline Data" }));
    await screen.findByTestId("task-modal");
  };

  it("numbers a plain array of step strings", async () => {
    forClientCollecting(
      target({ dataCollectionType: "Task Analysis", taskSteps: ["Pick up cup", "Drink"] })
    );
    renderPage();
    await openTaskModal();
    expect(modals.props.task.steps).toEqual([
      { id: 1, description: "Pick up cup" },
      { id: 2, description: "Drink" },
    ]);
  });

  it("reads the description off step objects", async () => {
    forClientCollecting(
      target({
        dataCollectionType: "Task Analysis",
        taskSteps: [{ description: "Turn tap" }, { note: "no description" }],
      })
    );
    renderPage();
    await openTaskModal();
    expect(modals.props.task.steps).toEqual([
      { id: 1, description: "Turn tap" },
      { id: 2, description: "" },
    ]);
  });

  it("parses steps that arrive as a json string", async () => {
    forClientCollecting(
      target({ dataCollectionType: "Task Analysis", taskSteps: '["Rinse","Dry"]' })
    );
    renderPage();
    await openTaskModal();
    expect(modals.props.task.steps).toEqual([
      { id: 1, description: "Rinse" },
      { id: 2, description: "Dry" },
    ]);
  });

  it("falls back to no steps when the stored json is broken", async () => {
    forClientCollecting(target({ dataCollectionType: "Task Analysis", taskSteps: "{not json" }));
    renderPage();
    await openTaskModal();
    expect(modals.props.task.steps).toEqual([]);
  });

  it("reads descriptions out of a json string of step objects", async () => {
    forClientCollecting(
      target({
        dataCollectionType: "Task Analysis",
        taskSteps: '[{"description":"Rinse"},{"note":"unlabelled"}]',
      })
    );
    renderPage();
    await openTaskModal();
    expect(modals.props.task.steps).toEqual([
      { id: 1, description: "Rinse" },
      { id: 2, description: "" },
    ]);
  });

  it("ignores steps stored as neither an array nor a string", async () => {
    forClientCollecting(target({ dataCollectionType: "Task Analysis", taskSteps: 42 }));
    renderPage();
    await openTaskModal();
    expect(modals.props.task.steps).toEqual([]);
  });
});

describe("the baseline section", () => {
  const withBaseline = (dataCollectionType, sessionDatas) => {
    apiMock.GetTargetBaselineData.mockResolvedValue({
      data: { data: { baselineDataRequired: true, sessionDatas } },
    });
    return target({ dataCollectionType, baselineDataRequired: true });
  };

  const cells = () =>
    Array.from(document.body.querySelectorAll(".baseline-table-container tbody td")).map(
      (td) => td.textContent
    );

  it("is left out entirely when the target does not require a baseline", async () => {
    renderPage();
    await loaded();
    expect(screen.queryByText("Baseline Data")).not.toBeInTheDocument();
  });

  it("offers to collect one when a baseline is required but none is stored", async () => {
    inLibrary(withBaseline("Frequency", []));
    renderPage();
    await loaded();
    expect(screen.getByText("No baseline data to show")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collect Baseline Data" })).toBeInTheDocument();
  });

  it("drops the baseline section when the baseline endpoint fails", async () => {
    inLibrary(target({ baselineDataRequired: true }));
    apiMock.GetTargetBaselineData.mockRejectedValue(new Error("gone"));
    renderPage();
    await loaded();
    expect(screen.queryByText("Baseline Data")).not.toBeInTheDocument();
  });

  it("flattens every stored session into the library baseline table", async () => {
    inLibrary(
      withBaseline("Frequency", [
        { data: { numberOfOccurrence: 3, notes: "morning" } },
        { data: { numberOfOccurrence: 5 } },
      ])
    );
    renderPage();
    await loaded();
    expect(screen.getByText("Count")).toBeInTheDocument();
    expect(cells()).toEqual(["3", "morning", "5", "N/A"]);
  });

  it("shows only the latest session, with a summary, in the client view", async () => {
    forClient(
      withBaseline("Percentage Correct", [
        {
          data: {
            percentageCorrect: 50,
            trials: [
              { performance: "correct", promptLevel: "independent" },
              { performance: "incorrect", promptLevel: "gestural", notes: "distracted" },
            ],
          },
        },
        { data: { percentageCorrect: 90, trials: [] } },
      ])
    );
    renderPage();
    await loaded();
    expect(cells()).toEqual([
      "1",
      "independent",
      "correct",
      "N/A",
      "2",
      "gestural",
      "incorrect",
      "distracted",
    ]);
    expect(screen.getByText("Total Correct: 1/2 | Accuracy: 50%")).toBeInTheDocument();
  });

  it("counts correct, incorrect and prompted trials for trials/opportunities", async () => {
    forClient(
      withBaseline("Trials/Opportunities", [
        {
          data: {
            trials: [
              { performance: "correct", promptLevel: "independent" },
              { performance: "incorrect", promptLevel: "full" },
              { performance: "correct", promptLevel: "partial" },
            ],
          },
        },
      ])
    );
    renderPage();
    await loaded();
    expect(
      screen.getByText("Trials: 3 | Correct: 2 | Incorrect: 1 | Prompted: 2")
    ).toBeInTheDocument();
  });

  it("renders a duration baseline as HH:MM:SS", async () => {
    inLibrary(withBaseline("Duration", [{ data: { duration: 3725, notes: "long" } }]));
    renderPage();
    await loaded();
    expect(cells()).toEqual(["01:02:05", "long"]);
  });

  it("derives a per-minute rate, and says N/A when the duration is zero", async () => {
    inLibrary(
      withBaseline("Rate", [
        { data: { numberOfOccurrence: 6, duration: 120 } },
        { data: { numberOfOccurrence: 6, duration: 0 } },
      ])
    );
    renderPage();
    await loaded();
    expect(cells()).toEqual(["6", "120", "3.00/min", "N/A", "6", "0", "N/A", "N/A"]);
  });

  it("lists task analysis steps with their response and prompt", async () => {
    inLibrary(
      withBaseline("Task Analysis", [
        {
          data: {
            steps: [{ id: 1, description: "Open tap", performance: "correct", promptLevel: "none" }],
          },
        },
      ])
    );
    renderPage();
    await loaded();
    expect(cells()).toEqual(["1", "Open tap", "correct", "none", "N/A"]);
  });

  it("signs latency values and shows NR for a trial with no response", async () => {
    inLibrary(
      withBaseline("Latency", [
        {
          data: {
            notes: "steady",
            trials: [
              { trial: 1, stimulusPresented: "09:30:00", latency: 4 },
              { trial: 2, stimulusPresented: "09:35:00", latency: null },
            ],
          },
        },
      ])
    );
    renderPage();
    await loaded();
    expect(cells()).toEqual([
      "1",
      "09:30 AM",
      "+4 secs",
      "steady",
      "2",
      "09:35 AM",
      "NR",
      "steady",
    ]);
  });

  it("renders no headers or rows for a collection type it has no baseline layout for", async () => {
    inLibrary(withBaseline("Interval Recording", [{ data: {} }]));
    renderPage();
    await loaded();
    expect(document.body.querySelectorAll(".baseline-table-container th")).toHaveLength(0);
    expect(cells()).toEqual([]);
  });
});

describe("the export and print controls", () => {
  it("opens every section's export menu at once, because they share one flag", async () => {
    renderPage();
    await loaded();
    expect(screen.queryByText("Export as CSV")).not.toBeInTheDocument();
    fireEvent.click(exportToggle("Performance Graph"));
    // Two menus without a baseline section: performance and session data.
    expect(screen.getAllByText("Export as CSV")).toHaveLength(2);
  });

  it("closes the menu again when an entry is chosen", async () => {
    renderPage();
    await loaded();
    fireEvent.click(exportToggle("Session Data"));
    fireEvent.click(screen.getAllByText("Export as PDF")[0]);
    expect(screen.queryByText("Export as PDF")).not.toBeInTheDocument();
  });

  it("closes the menu again on a second press of the same button", async () => {
    renderPage();
    await loaded();
    fireEvent.click(exportToggle("Session Data"));
    fireEvent.click(exportToggle("Session Data"));
    expect(screen.queryByText("Export as CSV")).not.toBeInTheDocument();
  });
});

describe("the performance graph", () => {
  const withPerformance = (monthly) => {
    forClient(target());
    apiMock.GetClientTargetPerformance.mockResolvedValue({ data: { data: monthly } });
  };

  it("is replaced by an empty state in the library view", async () => {
    renderPage();
    await loaded();
    expect(screen.getByText("No performance data to show")).toBeInTheDocument();
    expect(apiMock.GetClientTargetPerformance).not.toHaveBeenCalled();
  });

  it("says there is nothing to plot when every month averages zero", async () => {
    withPerformance([{ monthName: "Jan", average: 0, sessionCount: 0 }]);
    renderPage();
    await loaded();
    expect(
      await screen.findByText("No session data available for this target")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("performance-chart")).not.toBeInTheDocument();
  });

  it("surfaces the failure message when the performance fetch throws", async () => {
    forClient(target());
    apiMock.GetClientTargetPerformance.mockRejectedValue(new Error("upstream down"));
    renderPage();
    await loaded();
    expect(await screen.findByText("upstream down")).toBeInTheDocument();
  });

  it("plots monthly averages, treating a null average as zero", async () => {
    withPerformance([
      { monthName: "Jan", average: null, sessionCount: 0, rawData: [] },
      { monthName: "Feb", average: 82.5, sessionCount: 3, rawData: [{}] },
    ]);
    renderPage();
    expect(await screen.findByTestId("performance-chart")).toBeInTheDocument();
    expect(chart.last.series[0].data).toEqual([0, 82.5]);
    expect(chart.last.options.xaxis.categories).toEqual(["Jan", "Feb"]);
  });

  it("labels a percentage target with a capped percentage axis", async () => {
    withPerformance([
      { monthName: "Jan", average: 80, sessionCount: 2, rawData: [{}], dataType: "percentage" },
    ]);
    renderPage();
    await screen.findByTestId("performance-chart");
    const { options, series } = chart.last;
    expect(series[0].name).toBe("Percentage");
    expect(options.yaxis.max).toBe(100);
    expect(options.yaxis.labels.formatter(79.6)).toBe("80%");
    expect(options.tooltip.y.formatter(80, { dataPointIndex: 0 })).toBe("80.0% (2 sessions)");
  });

  it("labels a task analysis target as a completion rate", async () => {
    withPerformance([
      { monthName: "Jan", average: 60, sessionCount: 1, rawData: [{}], dataType: "task_analysis" },
    ]);
    renderPage();
    await screen.findByTestId("performance-chart");
    const { options, series } = chart.last;
    expect(series[0].name).toBe("Completion Rate");
    expect(options.yaxis.title.text).toBe("Completion Rate (%)");
    // One session, so the tooltip must not pluralise.
    expect(options.tooltip.y.formatter(60, { dataPointIndex: 0 })).toBe("60.0% (1 session)");
  });

  it("scales the axis to the data for a trials target and counts correct trials", async () => {
    withPerformance([
      {
        monthName: "Jan",
        average: 7,
        sessionCount: 2,
        rawData: [{}],
        dataType: "trials_opportunities",
      },
    ]);
    renderPage();
    await screen.findByTestId("performance-chart");
    const { options, series } = chart.last;
    expect(series[0].name).toBe("Correct Trials");
    expect(options.yaxis.max).toBe(9);
    expect(options.yaxis.labels.formatter(7.4)).toBe(7);
    expect(options.tooltip.y.formatter(7, { dataPointIndex: 0 })).toBe("7.0 correct (2 sessions)");
  });

  it("falls back to a generic performance axis for any other data type", async () => {
    withPerformance([
      { monthName: "Jan", average: 140, sessionCount: 4, rawData: [{}], dataType: "duration" },
    ]);
    renderPage();
    await screen.findByTestId("performance-chart");
    const { options, series } = chart.last;
    expect(series[0].name).toBe("Average Performance");
    expect(options.yaxis.max).toBe(150);
    expect(options.tooltip.y.formatter(140, { dataPointIndex: 0 })).toBe("140.0 (4 sessions)");
  });

  it("reports a month with no sessions as having no data", async () => {
    withPerformance([
      { monthName: "Jan", average: 80, sessionCount: 2, rawData: [{}], dataType: "percentage" },
      { monthName: "Feb", average: 0, sessionCount: 0 },
    ]);
    renderPage();
    await screen.findByTestId("performance-chart");
    expect(chart.last.options.tooltip.y.formatter(0, { dataPointIndex: 1 })).toBe("No data");
  });

  it("keeps the month filter's selection", async () => {
    withPerformance([
      { monthName: "Jan", average: 80, sessionCount: 2, rawData: [{}], dataType: "percentage" },
    ]);
    renderPage();
    await screen.findByTestId("performance-chart");
    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("All time");
    fireEvent.change(select, { target: { value: "Mar" } });
    expect(select).toHaveValue("Mar");
  });
});

describe("the session data table", () => {
  it("offers to collect data instead of a table in the library view", async () => {
    renderPage();
    await loaded();
    expect(screen.getByText("No session data to show")).toBeInTheDocument();
    expect(apiMock.GetSessionsByTarget).not.toHaveBeenCalled();
  });

  it("numbers the sessions and formats hours, date and payer", async () => {
    forClient(target());
    apiMock.GetSessionsByTarget.mockResolvedValue({
      data: {
        data: [
          {
            id: "s-1",
            clientName: "Ada Lovelace",
            sessionTypeName: "Direct Therapy",
            clinician: "Grace Hopper",
            clientApprovalStatus: "APPROVED",
            totalHours: 1.5,
            date: "2026-03-10T09:00:00",
            authorizationsUsed: [{ payerDetails: { payerName: "Blue Shield" } }],
          },
        ],
      },
    });
    renderPage();
    await loaded();
    expect(await screen.findByText("Session 1")).toBeInTheDocument();
    expect(screen.getByText("1.50 hrs")).toBeInTheDocument();
    expect(screen.getByText("Blue Shield")).toBeInTheDocument();
    expect(screen.getByText("03/10/2026")).toBeInTheDocument();
    expect(apiMock.GetSessionsByTarget).toHaveBeenCalledWith(
      expect.objectContaining({ targetId: "t-1", clientId: "c-1", tenantId: "tenant-1" })
    );
  });

  it("fills in placeholders for a session missing its optional fields", async () => {
    forClient(target());
    apiMock.GetSessionsByTarget.mockResolvedValue({
      data: { data: [{ id: "s-1" }] },
    });
    renderPage();
    await loaded();
    expect(await screen.findByText("Session 1")).toBeInTheDocument();
    expect(screen.getByText("0 hrs")).toBeInTheDocument();
    // No approval recorded yet reads as pending, not blank.
    expect(screen.getByText("PENDING")).toBeInTheDocument();
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
  });

  it("shows an empty table rather than an error when the session fetch fails", async () => {
    forClient(target());
    apiMock.GetSessionsByTarget.mockRejectedValue(new Error("timeout"));
    renderPage();
    await loaded();
    await waitFor(() => expect(apiMock.GetSessionsByTarget).toHaveBeenCalled());
    expect(screen.queryByText("Session 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Oops!")).not.toBeInTheDocument();
  });
});

describe("collecting data", () => {
  // In the library view the session empty state carries the button; in the
  // client view only the baseline empty state does.
  const collect = async (label = "Collect Baseline Data") => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: label }));
  };

  it("refuses without a client in the url", async () => {
    await collect("Collect Data");
    expect(toastMock.showToast).toHaveBeenCalledWith(
      "No client selected. Please select a client to collect data.",
      "error"
    );
    expect(screen.queryByTestId("frequency-modal")).not.toBeInTheDocument();
  });

  it("refuses when the target records no collection type", async () => {
    forClientCollecting(target({ dataCollectionType: null }));
    await collect();
    expect(toastMock.showToast).toHaveBeenCalledWith(
      "No valid data collection type found.",
      "error"
    );
  });

  it("refuses a collection type it has no modal for", async () => {
    forClientCollecting(target({ dataCollectionType: "Interval Recording" }));
    await collect();
    expect(toastMock.showToast).toHaveBeenCalledWith(
      "Unknown data collection type: Interval Recording",
      "error"
    );
  });

  it.each([
    ["Frequency", "frequency"],
    ["Duration", "duration"],
    ["Rate", "rate"],
    ["Percentage Correct", "percentage"],
    ["Trials/Opportunities", "trials"],
    ["Task Analysis", "task"],
    ["Latency", "latency"],
  ])("opens the %s modal", async (type, probe) => {
    forClientCollecting(target({ dataCollectionType: type }));
    await collect();
    expect(await screen.findByTestId(`${probe}-modal`)).toBeInTheDocument();
  });

  it("passes the target's trial count to the trial-based modals", async () => {
    forClientCollecting(target({ dataCollectionType: "Latency", numberOfTrials: 8 }));
    await collect();
    await screen.findByTestId("latency-modal");
    expect(modals.props.latency.trialCount).toBe(8);
  });

  it("falls back to the modal's own default when no trial count is stored", async () => {
    forClientCollecting(
      target({ dataCollectionType: "Percentage Correct", numberOfTrials: null })
    );
    await collect();
    await screen.findByTestId("percentage-modal");
    // numberOfTrials became "N/A", so the page sends 0 and the modal defaults.
    expect(modals.props.percentage.trialCount).toBe(3);
  });

  it("closes the modal without saving", async () => {
    forClientCollecting(target({ dataCollectionType: "Frequency" }));
    await collect();
    await screen.findByTestId("frequency-modal");
    modals.props.frequency.onClose();
    await waitFor(() =>
      expect(screen.queryByTestId("frequency-modal")).not.toBeInTheDocument()
    );
    expect(apiMock.CreateClientDataCollectionData).not.toHaveBeenCalled();
  });

  it("saves against the client-target record and reloads the page data", async () => {
    forClientCollecting(target({ dataCollectionType: "Frequency" }), "ct-77");
    await collect();
    await screen.findByTestId("frequency-modal");
    await modals.props.frequency.onSave({ numberOfOccurrence: 4 });
    expect(apiMock.CreateClientDataCollectionData).toHaveBeenCalledWith({
      clientTargetId: "ct-77",
      data: { numberOfOccurrence: 4 },
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toastMock.showToast).toHaveBeenCalledWith("Data saved successfully", "success");
    await waitFor(() =>
      expect(apiMock.GetTargetInfoByTargetIdAndClientId).toHaveBeenCalledTimes(2)
    );
  });

  it("warns when the save is rejected", async () => {
    forClientCollecting(target({ dataCollectionType: "Frequency" }));
    apiMock.CreateClientDataCollectionData.mockRejectedValue(new Error("409"));
    await collect();
    await screen.findByTestId("frequency-modal");
    await modals.props.frequency.onSave({});
    expect(toastMock.showToast).toHaveBeenCalledWith("Failed to save data", "error");
  });

  it("refuses to save when the client-target record has no id", async () => {
    forClientCollecting(target({ dataCollectionType: "Frequency" }), null);
    await collect();
    await screen.findByTestId("frequency-modal");
    await modals.props.frequency.onSave({});
    expect(apiMock.CreateClientDataCollectionData).not.toHaveBeenCalled();
    expect(toastMock.showToast).toHaveBeenCalledWith(
      "Error: No client target ID available",
      "error"
    );
  });
});

describe("baseline payloads with fields left out", () => {
  const cells = () =>
    Array.from(document.body.querySelectorAll(".baseline-table-container tbody td")).map(
      (td) => td.textContent
    );

  /** Library view: every stored session is flattened, and no summary is built. */
  const libraryBaseline = (dataCollectionType, sessionDatas) => {
    inLibrary(target({ dataCollectionType, baselineDataRequired: true }));
    apiMock.GetTargetBaselineData.mockResolvedValue({
      data: { data: { baselineDataRequired: true, sessionDatas } },
    });
  };

  /** Client view: only the latest session is shown, under a summary line. */
  const clientBaseline = (dataCollectionType, sessionDatas) => {
    forClient(target({ dataCollectionType, baselineDataRequired: true }));
    apiMock.GetTargetBaselineData.mockResolvedValue({
      data: { data: { baselineDataRequired: true, sessionDatas } },
    });
  };

  it("zeroes a frequency count and dashes its notes when neither was recorded", async () => {
    libraryBaseline("Frequency", [{ data: {} }]);
    renderPage();
    await loaded();
    expect(cells()).toEqual(["0", "N/A"]);
  });

  it("shows an unrecorded duration as zero", async () => {
    libraryBaseline("Duration", [{ data: {} }]);
    renderPage();
    await loaded();
    expect(cells()).toEqual(["00:00:00", "N/A"]);
  });

  it("zeroes both halves of a rate that recorded neither", async () => {
    libraryBaseline("Rate", [{ data: {} }]);
    renderPage();
    await loaded();
    expect(cells()).toEqual(["0", "0", "N/A", "N/A"]);
  });

  it("renders an empty trial table for a percentage session with no trials", async () => {
    libraryBaseline("Percentage Correct", [{ data: {} }]);
    renderPage();
    await loaded();
    expect(screen.getByText("Trial Count")).toBeInTheDocument();
    expect(cells()).toEqual([]);
  });

  it("blanks the prompt and response of a trial that recorded neither", async () => {
    libraryBaseline("Trials/Opportunities", [{ data: { trials: [{}] } }]);
    renderPage();
    await loaded();
    expect(cells()).toEqual(["1", "", "", "N/A"]);
  });

  it("renders an empty step table for a task analysis with no steps", async () => {
    libraryBaseline("Task Analysis", [{ data: {} }]);
    renderPage();
    await loaded();
    expect(cells()).toEqual([]);
  });

  it("blanks every unrecorded field of a task analysis step", async () => {
    libraryBaseline("Task Analysis", [{ data: { steps: [{ id: 2 }] } }]);
    renderPage();
    await loaded();
    expect(cells()).toEqual(["2", "", "", "", "N/A"]);
  });

  it("renders an empty latency table when no trials were run", async () => {
    libraryBaseline("Latency", [{ data: {} }]);
    renderPage();
    await loaded();
    expect(cells()).toEqual([]);
  });

  it("leaves a negative latency unsigned and dashes the shared note", async () => {
    libraryBaseline("Latency", [
      { data: { trials: [{ trial: 1, stimulusPresented: "09:30:00", latency: -2 }] } },
    ]);
    renderPage();
    await loaded();
    expect(cells()).toEqual(["1", "09:30 AM", "-2 secs", "N/A"]);
  });

  it("summarises a percentage session that recorded nothing as zero of zero", async () => {
    clientBaseline("Percentage Correct", [{ data: {} }]);
    renderPage();
    await loaded();
    expect(screen.getByText("Total Correct: 0/0 | Accuracy: 0%")).toBeInTheDocument();
  });

  it("summarises a trials session that recorded nothing as all zeroes", async () => {
    clientBaseline("Trials/Opportunities", [{ data: {} }]);
    renderPage();
    await loaded();
    expect(
      screen.getByText("Trials: 0 | Correct: 0 | Incorrect: 0 | Prompted: 0")
    ).toBeInTheDocument();
  });

  it("writes no summary line for a collection type that has none", async () => {
    clientBaseline("Frequency", [{ data: { numberOfOccurrence: 3 } }]);
    renderPage();
    await loaded();
    expect(cells()).toEqual(["3", "N/A"]);
    expect(document.body.querySelector(".summary-container")).not.toBeInTheDocument();
  });

  it("treats a required baseline with no sessions key as empty in the client view", async () => {
    forClient(target({ dataCollectionType: "Frequency" }));
    apiMock.GetTargetBaselineData.mockResolvedValue({
      data: { data: { baselineDataRequired: true } },
    });
    renderPage();
    await loaded();
    expect(screen.getByText("No baseline data to show")).toBeInTheDocument();
  });

  it("treats a required baseline with no sessions key as empty in the library view", async () => {
    inLibrary(target({ dataCollectionType: "Frequency" }));
    apiMock.GetTargetBaselineData.mockResolvedValue({
      data: { data: { baselineDataRequired: true } },
    });
    renderPage();
    await loaded();
    expect(screen.getByText("No baseline data to show")).toBeInTheDocument();
  });

  it("opens the baseline section's own export menu", async () => {
    libraryBaseline("Frequency", [{ data: { numberOfOccurrence: 3 } }]);
    renderPage();
    await loaded();
    fireEvent.click(exportToggle("Baseline Data"));
    // All three section menus share one flag, so the baseline one makes three.
    expect(screen.getAllByText("Export as CSV")).toHaveLength(3);
  });

  it("replaces the baseline panel with a loader while the page reloads", async () => {
    forClient(target({ dataCollectionType: "Frequency" }));
    apiMock.GetTargetBaselineData.mockResolvedValue({
      data: { data: { baselineDataRequired: true, sessionDatas: [] } },
    });
    let release;
    apiMock.GetTargetInfoByTargetIdAndClientId
      .mockResolvedValueOnce({
        data: { data: [{ id: "ct-1", target: target({ dataCollectionType: "Frequency" }) }] },
      })
      .mockReturnValue(
        new Promise((resolve) => {
          release = resolve;
        })
      );
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Collect Baseline Data" }));
    await screen.findByTestId("frequency-modal");

    // Saving refetches everything; the baseline slot has to show progress
    // rather than claiming there is still nothing collected.
    const saving = modals.props.frequency.onSave({ numberOfOccurrence: 1 });
    await waitFor(() =>
      expect(document.body.querySelector(".section-loader")).toBeInTheDocument()
    );
    expect(screen.getByText("Baseline Data")).toBeInTheDocument();
    expect(screen.queryByText("No baseline data to show")).not.toBeInTheDocument();

    release({
      data: { data: [{ id: "ct-1", target: target({ dataCollectionType: "Frequency" }) }] },
    });
    await saving;
    expect(await screen.findByText("No baseline data to show")).toBeInTheDocument();
  });
});

describe("responses that arrive without their data envelope", () => {
  it("skips the session fetch entirely when the user has no tenant", async () => {
    forClient(target());
    renderPage({ tenantId: null });
    await loaded();
    expect(apiMock.GetSessionsByTarget).not.toHaveBeenCalled();
  });

  it("shows an empty session table when the response carries no rows", async () => {
    forClient(target());
    apiMock.GetSessionsByTarget.mockResolvedValue({});
    renderPage();
    await loaded();
    await waitFor(() => expect(apiMock.GetSessionsByTarget).toHaveBeenCalled());
    expect(screen.queryByText("Session 1")).not.toBeInTheDocument();
  });

  it("reports no plottable data when the performance response is empty", async () => {
    forClient(target());
    apiMock.GetClientTargetPerformance.mockResolvedValue({});
    renderPage();
    expect(
      await screen.findByText("No session data available for this target")
    ).toBeInTheDocument();
  });

  it("falls back to generic wording when the performance failure has no message", async () => {
    forClient(target());
    apiMock.GetClientTargetPerformance.mockRejectedValue({});
    renderPage();
    expect(await screen.findByText("Failed to load performance data")).toBeInTheDocument();
  });

  it("shows a loader in the graph panel while the performance data is in flight", async () => {
    forClient(target());
    let release;
    apiMock.GetClientTargetPerformance.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    renderPage();
    await loaded();
    // The panel's own loader is the only one on screen while the performance
    // request is held open. Waited for rather than asserted outright, because
    // the surrounding fetches settle on their own schedule under a full run.
    await waitFor(() =>
      expect(document.body.querySelectorAll(".section-loader")).toHaveLength(1)
    );
    expect(screen.queryByTestId("performance-chart")).not.toBeInTheDocument();

    release({
      data: {
        data: [
          { monthName: "Jan", average: 80, sessionCount: 2, rawData: [{}], dataType: "percentage" },
        ],
      },
    });
    expect(await screen.findByTestId("performance-chart")).toBeInTheDocument();
  });

  it("counts a month with no session count at all as zero sessions", async () => {
    forClient(target());
    apiMock.GetClientTargetPerformance.mockResolvedValue({
      data: {
        data: [
          { monthName: "Jan", average: 80, sessionCount: 2, rawData: [{}], dataType: "percentage" },
          { monthName: "Feb", average: 5 },
        ],
      },
    });
    renderPage();
    await screen.findByTestId("performance-chart");
    expect(chart.last.options.tooltip.y.formatter(5, { dataPointIndex: 1 })).toBe(
      "5.0% (0 sessions)"
    );
  });
});
