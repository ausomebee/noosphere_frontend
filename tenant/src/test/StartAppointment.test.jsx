import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../ReduxStore/features/authentication";

/**
 * The live session screen a clinician runs an appointment from. It loads the
 * appointment and the client's programs together, normalises every target into
 * a shape the seven data-collection modals understand, then records whatever
 * those modals hand back and posts it all as one session on "Finish".
 *
 * Two things dominate the tests. The target normaliser is where most of the
 * branching lives: prompting strategies arrive as JSON strings that may not
 * parse, and task steps arrive in four different shapes (objects, strings, a
 * JSON array of either, or nothing), each with its own fallback. Those are
 * asserted through the modal probes, because the normalised target is only ever
 * visible as the props handed to a modal.
 *
 * The other is the timer. The elapsed clock is driven by requestAnimationFrame,
 * which would spin forever under jsdom, so rAF is stubbed into a queue the
 * tests tick by hand -- that also makes it possible to move Date.now forward
 * and check the hours branch of the total-time formatter.
 */

const api = vi.hoisted(() => ({
  GetAppointmentById: vi.fn(),
  GetClientProgramAndTargetsDetails: vi.fn(),
  SubmitStartAppointment: vi.fn(),
}));

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));

const router = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: { clientId: "client-1", appointmentId: "appt-1" },
}));

const probes = vi.hoisted(() => ({}));

vi.mock("../api/AppointmentApi", () => ({ default: api }));

vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

vi.mock("../hooks/useFormatSettings", () => ({
  default: () => ({
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12-hour",
    currency: "USD",
  }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useParams: () => router.params,
    useNavigate: () => router.navigate,
  };
});

vi.mock("../Components/ReusableModal/DataCollectionModal/FrequencyModal", () => ({
  default: (props) => {
    probes.frequency = props;
    return props.isOpen ? <div data-testid="frequency-modal" /> : null;
  },
}));

vi.mock("../Components/ReusableModal/DataCollectionModal/DurationModal", () => ({
  default: (props) => {
    probes.duration = props;
    return props.isOpen ? <div data-testid="duration-modal" /> : null;
  },
}));

vi.mock("../Components/ReusableModal/DataCollectionModal/RateModal", () => ({
  default: (props) => {
    probes.rate = props;
    return props.isOpen ? <div data-testid="rate-modal" /> : null;
  },
}));

vi.mock(
  "../Components/ReusableModal/DataCollectionModal/PercentageCorrectModal",
  () => ({
    default: (props) => {
      probes.percentage = props;
      return props.isOpen ? <div data-testid="percentage-modal" /> : null;
    },
  })
);

vi.mock(
  "../Components/ReusableModal/DataCollectionModal/TrialsOpportunitiesModal",
  () => ({
    default: (props) => {
      probes.trials = props;
      return props.isOpen ? <div data-testid="trials-modal" /> : null;
    },
  })
);

vi.mock(
  "../Components/ReusableModal/DataCollectionModal/TaskAnalysisModal",
  () => ({
    default: (props) => {
      probes.task = props;
      return props.isOpen ? <div data-testid="task-modal" /> : null;
    },
  })
);

vi.mock("../Components/ReusableModal/DataCollectionModal/LatencyModal", () => ({
  default: (props) => {
    probes.latency = props;
    return props.isOpen ? <div data-testid="latency-modal" /> : null;
  },
}));

vi.mock(
  "../Components/ReusableModal/StartAppointmentModal/TravelTimeModal",
  () => ({
    default: (props) => {
      probes.travel = props;
      return props.isOpen ? <div data-testid="travel-modal" /> : null;
    },
  })
);

vi.mock(
  "../Components/ReusableModal/StartAppointmentModal/ConfirmCancelModal",
  () => ({
    default: (props) => {
      probes.confirmCancel = props;
      return props.isOpen ? <div data-testid="confirm-cancel-modal" /> : null;
    },
  })
);

vi.mock(
  "../Components/ReusableModal/StartAppointmentModal/ConfirmLeaveModal",
  () => ({
    default: (props) => {
      probes.confirmLeave = props;
      return props.isOpen ? <div data-testid="confirm-leave-modal" /> : null;
    },
  })
);

import StartAppointment from "../Pages/Scheduler/StartAppointment/StartAppointment";

const appointment = {
  id: "appt-1",
  client: {
    firstName: "Ada",
    lastName: "Lovelace",
    preferredName: "Addie",
    gender: "Female",
    DOB: "2015-04-01T00:00:00.000Z",
    payer: { payerName: "BlueCross" },
  },
  startTime: "09:00",
  endTime: "10:30",
  requiresTravel: false,
  serviceLocation: "Home",
  session: { name: "Direct Therapy" },
  clinicians: [{ id: "s1", fullName: "Grace Hopper" }],
  appointmentServices: [
    {
      serviceCode: {
        code: "97153",
        description: "Direct treatment",
        modifiers: { modifier1: "HN" },
      },
    },
  ],
};

// Everything optional stripped out, so each "or else" in the header renders.
const bareAppointment = {
  id: "appt-1",
  client: {},
  clinicians: [],
  appointmentServices: [{}],
};

const makeTarget = (over = {}) => ({
  id: "t1",
  name: "Point to picture",
  domain: "Communication",
  sd: "Show me",
  expectedResponse: "Points",
  teachingProcedure: "DTT",
  promptingStrategy: ['{"label":"Full Physical"}'],
  dataCollectionType: "Frequency",
  numberOfTrials: 5,
  initialStatus: "In Progress",
  ...over,
});

const programsPayload = (targets) => ({
  data: {
    data: [
      { program: { id: "p1", name: "Manding", target: targets } },
    ],
  },
});

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

// rAF is stubbed into a queue rather than left to jsdom's real timer, so the
// elapsed-time loop only advances when a test says so.
const frames = [];

const tick = () => {
  const cb = frames[frames.length - 1];
  act(() => cb(performance.now()));
};

const renderPage = async ({
  appt = appointment,
  targets = [makeTarget()],
  user,
} = {}) => {
  api.GetAppointmentById.mockResolvedValue({ data: { data: appt } });
  api.GetClientProgramAndTargetsDetails.mockResolvedValue(
    programsPayload(targets)
  );
  const view = render(
    <Provider store={makeStore(user)}>
      <StartAppointment />
    </Provider>
  );
  await waitFor(() =>
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
  );
  return view;
};

const selectTarget = (programName = "Manding", targetName = "Point to picture") => {
  fireEvent.click(screen.getByText(programName));
  fireEvent.click(screen.getByText(targetName));
};

const collect = () => fireEvent.click(screen.getByText("Collect Data"));

let consoleError;
let consoleWarn;

beforeEach(() => {
  vi.clearAllMocks();
  frames.length = 0;
  router.params = { clientId: "client-1", appointmentId: "appt-1" };
  sessionStorage.clear();
  Object.keys(probes).forEach((k) => delete probes[k]);

  vi.stubGlobal("requestAnimationFrame", (cb) => frames.push(cb));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());

  api.SubmitStartAppointment.mockResolvedValue({});
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  consoleError.mockRestore();
  consoleWarn.mockRestore();
});

describe("loading and failure states", () => {
  it("shows a loader until both fetches land", async () => {
    api.GetAppointmentById.mockReturnValue(new Promise(() => {}));
    api.GetClientProgramAndTargetsDetails.mockReturnValue(new Promise(() => {}));
    render(
      <Provider store={makeStore()}>
        <StartAppointment />
      </Provider>
    );
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("refuses to load at all without an access token", async () => {
    render(
      <Provider store={makeStore({ accessToken: undefined })}>
        <StartAppointment />
      </Provider>
    );
    await waitFor(() => expect(screen.getByText("Oops!")).toBeInTheDocument());
    expect(api.GetAppointmentById).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when the failure carries none", async () => {
    api.GetAppointmentById.mockRejectedValue({});
    api.GetClientProgramAndTargetsDetails.mockResolvedValue(programsPayload([]));
    render(
      <Provider store={makeStore()}>
        <StartAppointment />
      </Provider>
    );
    await waitFor(() => expect(screen.getByText("Oops!")).toBeInTheDocument());
    expect(consoleError).toHaveBeenCalledWith("Fetch error:", {});
  });

  it("says so when the appointment simply is not there", async () => {
    await renderPage({ appt: null });
    expect(screen.getByText("No appointment found")).toBeInTheDocument();
  });

  it("records the session start against the appointment in session storage", async () => {
    await renderPage();
    expect(sessionStorage.getItem("sessionStartTime_appt-1")).toMatch(/^\d+$/);
  });
});

describe("appointment header", () => {
  it("shows the client, clinicians, service and session details", async () => {
    await renderPage();

    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
    expect(screen.getByText(/\(Addie\)/)).toBeInTheDocument();
    expect(screen.getByText("Female")).toBeInTheDocument();
    expect(screen.getByText("BlueCross")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(
      screen.getByText("97153 - Direct treatment + HN")
    ).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Direct Therapy")).toBeInTheDocument();
    expect(screen.getByText("09:00 AM - 10:30 AM")).toBeInTheDocument();
  });

  it("dashes out every detail the appointment does not carry", async () => {
    await renderPage({ appt: bareAppointment, targets: [] });

    expect(screen.getByText("Not specified")).toBeInTheDocument();
    // Gender, service location and session type all collapse to the same dash.
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("N/A - N/A")).toBeInTheDocument();
  });

  it("omits the description and the modifier when the code has neither", async () => {
    await renderPage({
      appt: {
        ...appointment,
        appointmentServices: [{ serviceCode: { code: "97155" } }],
      },
    });
    expect(screen.getByText("97155")).toBeInTheDocument();
  });

  it("survives an appointment with no service list at all", async () => {
    const { appointmentServices: _unused, ...noServices } = appointment;
    await renderPage({ appt: noServices });
    expect(screen.getByText("Start Appointment")).toBeInTheDocument();
  });

  it("hides the travel row unless the appointment requires travel", async () => {
    await renderPage();
    expect(screen.queryByText("+ Log travel time")).not.toBeInTheDocument();
  });
});

describe("travel time", () => {
  const travelAppt = { ...appointment, requiresTravel: true };

  it("logs, displays and clears a travel window", async () => {
    await renderPage({ appt: travelAppt });

    fireEvent.click(screen.getByText("+ Log travel time"));
    expect(screen.getByTestId("travel-modal")).toBeInTheDocument();

    act(() => probes.travel.onSave({ start: "08:00", end: "08:30" }));
    expect(screen.getByText(/08:00 AM/)).toBeInTheDocument();
    expect(screen.queryByTestId("travel-modal")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Clear travel time"));
    expect(screen.getByText("+ Log travel time")).toBeInTheDocument();
  });

  it("keeps the button when only half a travel window is recorded", async () => {
    await renderPage({ appt: travelAppt });
    fireEvent.click(screen.getByText("+ Log travel time"));
    act(() => probes.travel.onSave({ start: "08:00", end: null }));
    expect(screen.getByText("+ Log travel time")).toBeInTheDocument();
  });

  it("dismisses the travel modal without recording anything", async () => {
    await renderPage({ appt: travelAppt });
    fireEvent.click(screen.getByText("+ Log travel time"));
    act(() => probes.travel.onClose());
    expect(screen.queryByTestId("travel-modal")).not.toBeInTheDocument();
  });
});

describe("target normalisation", () => {
  const openTaskModal = async (taskSteps) => {
    await renderPage({
      targets: [
        makeTarget({ dataCollectionType: "Task Analysis", taskSteps }),
      ],
    });
    selectTarget();
    collect();
  };

  it("drops deleted targets from the sidebar", async () => {
    await renderPage({
      targets: [
        makeTarget(),
        makeTarget({ id: "t2", name: "Gone", isDeleted: true }),
      ],
    });
    fireEvent.click(screen.getByText("Manding"));
    expect(screen.queryByText("Gone")).not.toBeInTheDocument();
  });

  it("dashes out the teaching details a target does not carry", async () => {
    await renderPage({
      targets: [
        {
          id: "t1",
          name: "Bare target",
          promptingStrategy: "not an array",
        },
      ],
    });
    selectTarget("Manding", "Bare target");

    // Domain, SD, expected response, teaching procedure and prompting
    // strategy all fall back to the same dash.
    expect(screen.getAllByText("—")).toHaveLength(5);
    expect(screen.getByText("Not Introduced")).toBeInTheDocument();
    expect(screen.getByText("Frequency")).toBeInTheDocument();
    expect(screen.getByText("Flexible")).toBeInTheDocument();
  });

  it("uses domainName when there is no domain", async () => {
    await renderPage({
      targets: [makeTarget({ domain: undefined, domainName: "Play" })],
    });
    selectTarget();
    expect(screen.getByText("Play")).toBeInTheDocument();
  });

  it("reads the label out of each JSON prompting strategy", async () => {
    await renderPage({
      targets: [
        makeTarget({
          promptingStrategy: [
            '{"label":"Full Physical"}',
            '{"level":"partial"}',
            "Gestural",
          ],
        }),
      ],
    });
    selectTarget();

    // Second entry parses but has no label, third does not parse at all --
    // both fall back to the raw string.
    expect(
      screen.getByText('Full Physical, {"level":"partial"}, Gestural')
    ).toBeInTheDocument();
  });

  it("keeps task steps that already arrive as described objects", async () => {
    await openTaskModal([
      { id: "s1", description: "Open the box" },
      { description: "" },
    ]);
    expect(probes.task.steps).toEqual([
      { id: "s1", description: "Open the box" },
      { id: 2, description: "" },
    ]);
  });

  it("wraps task steps that arrive as bare strings", async () => {
    await openTaskModal([" Open the box ", "Take the toy"]);
    expect(probes.task.steps).toEqual([
      { id: 1, description: "Open the box" },
      { id: 2, description: "Take the toy" },
    ]);
  });

  it("parses task steps that arrive as a JSON array of strings", async () => {
    await openTaskModal('[" Open the box ", "Take the toy"]');
    expect(probes.task.steps).toEqual([
      { id: 1, description: "Open the box" },
      { id: 2, description: "Take the toy" },
    ]);
  });

  it("parses task steps that arrive as a JSON array of objects", async () => {
    await openTaskModal('[{"id":"s9","description":"Open"},{"other":1}]');
    expect(probes.task.steps).toEqual([
      { id: "s9", description: "Open" },
      { id: 2, description: "" },
    ]);
  });

  it("warns and gives up on task steps that will not parse", async () => {
    await openTaskModal("{not json");
    expect(probes.task.steps).toEqual([]);
    expect(consoleWarn).toHaveBeenCalledWith(
      "Failed to parse taskSteps:",
      "{not json",
      expect.any(Error)
    );
  });

  it("stays quiet about unparseable task steps in production", async () => {
    vi.stubEnv("DEV", false);
    await openTaskModal("{not json");
    expect(probes.task.steps).toEqual([]);
    expect(consoleWarn).not.toHaveBeenCalled();
  });

  it("gives up on a JSON payload that is not an array", async () => {
    await openTaskModal('{"step":1}');
    expect(probes.task.steps).toEqual([]);
  });

  it("gives up on an empty or unrecognised task step list", async () => {
    await openTaskModal([]);
    expect(probes.task.steps).toEqual([]);
  });

  it("gives up on task step objects that describe nothing", async () => {
    await openTaskModal([{ other: 1 }]);
    expect(probes.task.steps).toEqual([]);
  });

  it("has no steps at all when the target defines none", async () => {
    await openTaskModal(undefined);
    expect(probes.task.steps).toEqual([]);
  });
});

describe("choosing a program and a target", () => {
  it("asks for a target before showing the data card", async () => {
    await renderPage();
    expect(
      screen.getByText("Select a target to begin data collection")
    ).toBeInTheDocument();
  });

  it("reveals a program's targets and then the target's details", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("Manding"));
    fireEvent.click(screen.getByText("Point to picture"));

    expect(screen.getByText("Basic Details")).toBeInTheDocument();
    expect(screen.getByText("Communication")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("forgets the chosen target when its program is opened again", async () => {
    await renderPage();

    selectTarget();
    expect(screen.getByText("Basic Details")).toBeInTheDocument();
    // The program name is also echoed in the target details, so go for the
    // sidebar button rather than the text.
    fireEvent.click(document.querySelector(".program-btn"));
    // Re-selecting the same program clears the target, so the prompt is back.
    expect(
      screen.getByText("Select a target to begin data collection")
    ).toBeInTheDocument();
  });

  it("shows no target list for a program that has none", async () => {
    await renderPage({ targets: [] });
    fireEvent.click(screen.getByText("Manding"));
    expect(
      screen.getByText("Select a target to begin data collection")
    ).toBeInTheDocument();
  });
});

describe("opening the right collection modal", () => {
  const openFor = async (over) => {
    await renderPage({ targets: [makeTarget(over)] });
    selectTarget();
    collect();
  };

  it("opens the frequency modal", async () => {
    await openFor({ dataCollectionType: "Frequency" });
    expect(screen.getByTestId("frequency-modal")).toBeInTheDocument();
  });

  it("opens the duration modal", async () => {
    await openFor({ dataCollectionType: "Duration" });
    expect(screen.getByTestId("duration-modal")).toBeInTheDocument();
  });

  it("opens the rate modal", async () => {
    await openFor({ dataCollectionType: "Rate" });
    expect(screen.getByTestId("rate-modal")).toBeInTheDocument();
  });

  it("opens the percentage modal with the target's trial count", async () => {
    await openFor({ dataCollectionType: "Percentage Correct" });
    expect(screen.getByTestId("percentage-modal")).toBeInTheDocument();
    expect(probes.percentage.trialCount).toBe(5);
  });

  it("falls back to ten trials when the target sets no count", async () => {
    await openFor({
      dataCollectionType: "Trials/Opportunities",
      numberOfTrials: null,
    });
    expect(probes.trials.trialCount).toBe(10);
  });

  it("opens the latency modal", async () => {
    await openFor({ dataCollectionType: "Latency" });
    expect(screen.getByTestId("latency-modal")).toBeInTheDocument();
    expect(probes.latency.trialCount).toBe(5);
  });

  it("refuses a target whose collection type is N/A", async () => {
    await openFor({ dataCollectionType: "N/A" });
    expect(toast.showToast).toHaveBeenCalledWith(
      "No valid data collection type found.",
      "error"
    );
    expect(screen.queryByTestId("frequency-modal")).not.toBeInTheDocument();
  });

  it("refuses a collection type it does not implement", async () => {
    await openFor({ dataCollectionType: "Interval Recording" });
    expect(toast.showToast).toHaveBeenCalledWith(
      "Unsupported data collection type: Interval Recording",
      "error"
    );
  });

  it("asks before abandoning a modal, and closes it once confirmed", async () => {
    await openFor({ dataCollectionType: "Frequency" });
    act(() => probes.frequency.onClose());

    expect(screen.getByTestId("confirm-cancel-modal")).toBeInTheDocument();
    expect(screen.getByTestId("frequency-modal")).toBeInTheDocument();

    act(() => probes.confirmCancel.onConfirm());
    expect(screen.queryByTestId("frequency-modal")).not.toBeInTheDocument();
    expect(screen.queryByTestId("confirm-cancel-modal")).not.toBeInTheDocument();
  });

  it("keeps the modal open when the abandon prompt is dismissed", async () => {
    await openFor({ dataCollectionType: "Frequency" });
    act(() => probes.frequency.onClose());
    act(() => probes.confirmCancel.onClose());

    expect(screen.queryByTestId("confirm-cancel-modal")).not.toBeInTheDocument();
    expect(screen.getByTestId("frequency-modal")).toBeInTheDocument();
  });
});

describe("recorded data tables", () => {
  const record = async (type, data, over = {}) => {
    await renderPage({
      targets: [makeTarget({ dataCollectionType: type, ...over })],
    });
    selectTarget();
    collect();
    const probe = {
      Frequency: "frequency",
      Duration: "duration",
      Rate: "rate",
      "Percentage Correct": "percentage",
      "Trials/Opportunities": "trials",
      "Task Analysis": "task",
      Latency: "latency",
    }[type];
    act(() => probes[probe].onSave(data));
  };

  const cells = () =>
    Array.from(document.querySelectorAll(".sa-trials-table td")).map(
      (td) => td.textContent
    );

  it("swaps the collect button for a success chip once data is recorded", async () => {
    await record("Frequency", { numberOfOccurrence: 3, notes: "Steady" });
    expect(screen.getByText("Data recorded successfully")).toBeInTheDocument();
    expect(screen.queryByText("Collect Data")).not.toBeInTheDocument();
  });

  it("tabulates a frequency count", async () => {
    await record("Frequency", { numberOfOccurrence: 3, notes: "Steady" });
    expect(cells()).toEqual(["3", "Steady"]);
  });

  it("shows a zero count rather than a dash", async () => {
    await record("Frequency", { numberOfOccurrence: 0 });
    expect(cells()).toEqual(["0", "N/A"]);
  });

  it("tabulates a duration as hours, minutes and seconds", async () => {
    await record("Duration", { duration: 3661, notes: "Long" });
    expect(cells()).toEqual(["01:01:01", "Long"]);
  });

  it("tabulates a duration of nothing", async () => {
    await record("Duration", {});
    expect(cells()).toEqual(["00:00:00", "N/A"]);
  });

  it("works a rate out per minute", async () => {
    await record("Rate", { numberOfOccurrence: 6, duration: 120 });
    expect(cells()).toEqual(["6", "120", "3.00/min", "N/A"]);
  });

  it("cannot work a rate out without a duration", async () => {
    await record("Rate", { numberOfOccurrence: 6, duration: 0 });
    expect(cells()).toEqual(["6", "0", "N/A", "N/A"]);
  });

  it("tabulates percentage-correct trials and totals the accuracy", async () => {
    await record("Percentage Correct", {
      trials: [
        { performance: "correct", promptLevel: "I", notes: "Good" },
        { performance: "incorrect", promptLevel: "" },
      ],
    });
    expect(cells()).toEqual([
      "1",
      "I",
      "correct",
      "Good",
      "2",
      "—",
      "incorrect",
      "N/A",
    ]);
    expect(
      screen.getByText("Total Correct: 1/2 | Accuracy: 50%")
    ).toBeInTheDocument();
  });

  it("reports zero accuracy when every trial was cleared", async () => {
    await record("Percentage Correct", { trials: [] });
    expect(
      screen.getByText("Total Correct: 0/0 | Accuracy: 0%")
    ).toBeInTheDocument();
    expect(screen.getByText("No data collected yet")).toBeInTheDocument();
  });

  it("counts prompted trials separately from independent ones", async () => {
    await record("Trials/Opportunities", {
      trials: [
        { performance: "correct", promptLevel: "I" },
        { performance: "correct", promptLevel: "independent" },
        { performance: "incorrect", promptLevel: "FP" },
        { performance: "correct" },
      ],
    });
    expect(
      screen.getByText(
        "Trials: 4 | Correct: 3 | Incorrect: 1 | Prompted: 1"
      )
    ).toBeInTheDocument();
  });

  it("tabulates task analysis steps", async () => {
    await record(
      "Task Analysis",
      {
        steps: [
          {
            id: 1,
            description: "Open",
            performance: "correct",
            promptLevel: "I",
            notes: "ok",
          },
          { id: 2 },
        ],
      },
      { taskSteps: [{ id: 1, description: "Open" }] }
    );
    expect(cells()).toEqual([
      "1",
      "Open",
      "correct",
      "I",
      "ok",
      "2",
      "—",
      "—",
      "—",
      "N/A",
    ]);
  });

  it("tabulates latency trials, signing the delay", async () => {
    await record("Latency", {
      notes: "Session note",
      trials: [
        { trial: 1, stimulusPresented: "09:15", latency: 4 },
        { trial: 2, stimulusPresented: "09:20", latency: -2 },
        { trial: 3, stimulusPresented: "09:25", latency: null },
      ],
    });
    expect(cells()).toEqual([
      "1",
      "09:15 AM",
      "+4 secs",
      "Session note",
      "2",
      "09:20 AM",
      "-2 secs",
      "Session note",
      "3",
      "09:25 AM",
      "NR",
      "Session note",
    ]);
  });

  it("shows no summary bar for a type that has no totals", async () => {
    await record("Frequency", { numberOfOccurrence: 1 });
    expect(document.querySelector(".sa-summary-bar")).toBeNull();
  });

  it("clears a recording after confirming, and leaves it alone otherwise", async () => {
    await record("Frequency", { numberOfOccurrence: 3 });

    fireEvent.click(screen.getByText("Clear Data"));
    expect(screen.getByText("Clear this recording?")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.getByText("Data recorded successfully")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Clear Data"));
    fireEvent.click(screen.getByText("Clear data"));
    expect(screen.getByText("Collect Data")).toBeInTheDocument();
    expect(document.querySelector(".sa-trials-table")).toBeNull();
  });
});

describe("the elapsed clock", () => {
  it("starts at nothing and counts up in minutes and seconds", async () => {
    await renderPage();
    expect(screen.getByText("0m 0s")).toBeInTheDocument();

    const started = Number(sessionStorage.getItem("sessionStartTime_appt-1"));
    vi.spyOn(Date, "now").mockReturnValue(started + 65_000);
    tick();
    expect(screen.getByText("1m 5s")).toBeInTheDocument();
  });

  it("adds an hours part once the session runs past sixty minutes", async () => {
    await renderPage();
    const started = Number(sessionStorage.getItem("sessionStartTime_appt-1"));
    vi.spyOn(Date, "now").mockReturnValue(started + 3_661_000);
    tick();
    expect(screen.getByText("1hrs 1m 1s")).toBeInTheDocument();
  });

  it("re-syncs the clock when the tab comes back to the foreground", async () => {
    await renderPage();
    const started = Number(sessionStorage.getItem("sessionStartTime_appt-1"));
    vi.spyOn(Date, "now").mockReturnValue(started + 12_000);

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(screen.getByText("0m 12s")).toBeInTheDocument();
  });

  it("stops counting while the tab is hidden", async () => {
    await renderPage();
    const started = Number(sessionStorage.getItem("sessionStartTime_appt-1"));
    const hidden = vi
      .spyOn(document, "hidden", "get")
      .mockReturnValue(true);
    vi.spyOn(Date, "now").mockReturnValue(started + 12_000);

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(screen.getByText("0m 0s")).toBeInTheDocument();
    hidden.mockRestore();
  });
});

describe("finishing the session", () => {
  const finish = async () => {
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Finish Appointment"));
    });
  };

  it("posts the notes, the timings and every recorded target", async () => {
    await renderPage();
    selectTarget();
    collect();
    act(() => probes.frequency.onSave({ numberOfOccurrence: 2 }));

    fireEvent.change(screen.getByPlaceholderText("Write Something"), {
      target: { value: "  Went well  " },
    });
    await finish();

    expect(api.SubmitStartAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: "appt-1",
        note: "Went well",
        createdBy: "user-1",
        sessionDatas: [{ targetId: "t1", data: { numberOfOccurrence: 2 } }],
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith(
      "Appointment finished and session saved successfully!",
      "success"
    );
    expect(sessionStorage.getItem("sessionStartTime_appt-1")).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith("/billing/timesheets");
  });

  it("sends no note when the box was left blank", async () => {
    await renderPage();
    await finish();
    expect(api.SubmitStartAppointment).toHaveBeenCalledWith(
      expect.objectContaining({ note: null, sessionDatas: [] })
    );
  });

  it("attaches the travel window when the appointment required travel", async () => {
    await renderPage({ appt: { ...appointment, requiresTravel: true } });
    fireEvent.click(screen.getByText("+ Log travel time"));
    act(() => probes.travel.onSave({ start: "08:00", end: "08:30" }));
    await finish();

    const payload = api.SubmitStartAppointment.mock.calls[0][0];
    expect(payload.travelStartTime).toMatch(/T08:00:00\.000Z$/);
    expect(payload.travelEndTime).toMatch(/T08:30:00\.000Z$/);
  });

  it("leaves the travel window off when no travel was logged", async () => {
    await renderPage({ appt: { ...appointment, requiresTravel: true } });
    await finish();
    const payload = api.SubmitStartAppointment.mock.calls[0][0];
    expect(payload.travelStartTime).toBeUndefined();
  });

  it("reports a failed submission and stays on the page", async () => {
    api.SubmitStartAppointment.mockRejectedValue(new Error("server down"));
    await renderPage();
    await finish();

    expect(toast.showToast).toHaveBeenCalledWith(
      "Error: server down",
      "error"
    );
    expect(router.navigate).not.toHaveBeenCalled();
    expect(screen.getByText("Start Appointment")).toBeInTheDocument();
  });

  it("reports a failure that carries no message", async () => {
    api.SubmitStartAppointment.mockRejectedValue({});
    await renderPage();
    await finish();
    expect(toast.showToast).toHaveBeenCalledWith(
      "Error: Failed to submit session.",
      "error"
    );
  });

  it("disables the finish button while the submission is in flight", async () => {
    let release;
    api.SubmitStartAppointment.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    await renderPage();

    fireEvent.click(screen.getByLabelText("Finish Appointment"));
    await waitFor(() =>
      expect(screen.getByLabelText("Loading")).toBeDisabled()
    );

    await act(async () => {
      release({});
    });
    expect(api.SubmitStartAppointment).toHaveBeenCalledTimes(1);
  });
});

describe("leaving the session", () => {
  it("asks before going back and then navigates away", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("Back"));

    expect(screen.getByTestId("confirm-leave-modal")).toBeInTheDocument();
    act(() => probes.confirmLeave.onConfirm());
    expect(router.navigate).toHaveBeenCalledWith(-1);
  });

  it("stays put when the leave prompt is dismissed", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("Back"));
    act(() => probes.confirmLeave.onClose());

    expect(screen.queryByTestId("confirm-leave-modal")).not.toBeInTheDocument();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});

describe("recovering from a failed load", () => {
  it("reloads the page when the failure screen's retry is taken", async () => {
    const reload = vi.fn();
    // jsdom's own `location.reload` throws "not implemented", so the whole
    // object is swapped for one that records the call.
    vi.stubGlobal("location", { ...window.location, reload });
    api.GetAppointmentById.mockRejectedValue(new Error("appointment down"));
    api.GetClientProgramAndTargetsDetails.mockResolvedValue(programsPayload([]));
    render(
      <Provider store={makeStore()}>
        <StartAppointment />
      </Provider>
    );
    await waitFor(() => expect(screen.getByText("Oops!")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe("dismissing the clear-recording prompt with the keyboard", () => {
  it("keeps the recording", async () => {
    await renderPage();
    selectTarget();
    collect();
    act(() => probes.frequency.onSave({ numberOfOccurrence: 3 }));

    fireEvent.click(screen.getByText("Clear Data"));
    // The prompt renders no close button, so Escape is the only route to its
    // onClose.
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByText("Clear this recording?")).not.toBeInTheDocument();
    expect(screen.getByText("Data recorded successfully")).toBeInTheDocument();
  });
});

describe("a program the API sent without a target list", () => {
  it("lists the program with nothing under it", async () => {
    // `target: null` rather than an empty array: the normaliser has to supply
    // the list before it can filter deleted targets out of it.
    await renderPage({ targets: null });
    expect(screen.getByText("Manding")).toBeInTheDocument();
    expect(screen.queryByText("Point to picture")).not.toBeInTheDocument();
  });
});

describe("targets that never named a trial count", () => {
  const openFor = async (over) => {
    await renderPage({ targets: [makeTarget(over)] });
    selectTarget();
    collect();
  };

  it("offers ten trials to a percentage-correct target", async () => {
    await openFor({
      dataCollectionType: "Percentage Correct",
      numberOfTrials: null,
    });
    expect(probes.percentage.trialCount).toBe(10);
  });

  it("offers ten trials to a latency target", async () => {
    await openFor({ dataCollectionType: "Latency", numberOfTrials: null });
    expect(probes.latency.trialCount).toBe(10);
  });
});

describe("recorded data the modals handed back half-filled", () => {
  const record = async (type, data) => {
    await renderPage({ targets: [makeTarget({ dataCollectionType: type })] });
    selectTarget();
    collect();
    const probe = {
      Rate: "rate",
      "Percentage Correct": "percentage",
      "Trials/Opportunities": "trials",
      "Task Analysis": "task",
      Latency: "latency",
    }[type];
    act(() => probes[probe].onSave(data));
  };

  const cells = () =>
    Array.from(document.querySelectorAll(".sa-trials-table td")).map(
      (td) => td.textContent
    );

  it("counts a rate with no occurrences as zero", async () => {
    await record("Rate", { duration: 120 });
    expect(cells()).toEqual(["0", "120", "NaN/min", "N/A"]);
  });

  it("shows a dash for a percentage trial with no response", async () => {
    await record("Percentage Correct", { trials: [{ promptLevel: "I" }] });
    expect(cells()).toEqual(["1", "I", "—", "N/A"]);
  });

  it("tabulates nothing for a percentage record with no trials at all", async () => {
    await record("Percentage Correct", {});
    expect(screen.getByText("No data collected yet")).toBeInTheDocument();
    expect(
      screen.getByText("Total Correct: 0/0 | Accuracy: 0%")
    ).toBeInTheDocument();
  });

  it("tabulates nothing for a trials record with no trials at all", async () => {
    await record("Trials/Opportunities", {});
    expect(screen.getByText("No data collected yet")).toBeInTheDocument();
    expect(
      screen.getByText("Trials: 0 | Correct: 0 | Incorrect: 0 | Prompted: 0")
    ).toBeInTheDocument();
  });

  it("tabulates nothing for a task analysis record with no steps", async () => {
    await record("Task Analysis", {});
    expect(screen.getByText("No data collected yet")).toBeInTheDocument();
  });

  it("tabulates nothing for a latency record with no trials", async () => {
    await record("Latency", {});
    expect(screen.getByText("No data collected yet")).toBeInTheDocument();
  });

  it("says N/A against a latency trial when the session carries no note", async () => {
    await record("Latency", {
      trials: [{ trial: 1, stimulusPresented: "09:15", latency: 4 }],
    });
    expect(cells()).toEqual(["1", "09:15 AM", "+4 secs", "N/A"]);
  });
});
