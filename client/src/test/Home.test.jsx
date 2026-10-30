import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

const apiMock = vi.hoisted(() => ({
  GetClientSessionOverview: vi.fn(),
  GetClientSessionChart: vi.fn(),
  GetAllAuthorizationServiceCodes: vi.fn(),
  GetClientUpcomingAppointments: vi.fn(),
  GetClientAwaitingApprovals: vi.fn(),
  GetClientCompletedAppointments: vi.fn(),
  GetClientCancelAppointments: vi.fn(),
  GetClientRescheduledAppointments: vi.fn(),
  GetAppointmentById: vi.fn(),
  ApproveSession: vi.fn(),
}));
vi.mock("../api/homeApis", () => ({ default: apiMock }));

vi.mock("../layouts/ClientLayout", () => ({
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

// The four modals are covered by their own suites; here they are reduced to
// probes that report whether they are open and expose their callbacks. The
// factories are hoisted above this file's own bindings, so the shared record
// has to be hoisted with them.
const { modalProps, stubModal } = vi.hoisted(() => {
  const modalProps = {};
  const stubModal = (name) => ({
    default: (props) => {
      modalProps[name] = props;
      return props.isOpen ? <div data-testid={`${name}-open`} /> : null;
    },
  });
  return { modalProps, stubModal };
});
vi.mock("../Components/Modal/UpcomingDashboardModal/AppointmentDetailsModal", () =>
  stubModal("details")
);
vi.mock("../Components/Modal/UpcomingDashboardModal/RescheduleModal", () =>
  stubModal("reschedule")
);
vi.mock("../Components/Modal/UpcomingDashboardModal/ReviewSessionModal", () =>
  stubModal("feedback")
);
vi.mock("../Components/Modal/SuccessModal", () => stubModal("success"));

const { routerRef, navigate } = vi.hoisted(() => ({
  routerRef: { state: null },
  navigate: vi.fn(),
}));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
    useLocation: () => ({ pathname: "/", state: routerRef.state }),
  };
});

import Home from "../Pages/Home/Home";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The client dashboard.
 *
 * Five appointment tabs each hit a different endpoint and reshape a different
 * payload into the same row, so most of the branching here is in those
 * transforms -- clinician lists, service codes, and slots that may be absent.
 * Arriving from a notification is the other half: `location.state` names a tab
 * and an appointment id, and once that tab's fetch settles the matching row's
 * modal opens exactly once.
 *
 * The four modals are stubbed, so what is asserted is which one the page
 * decided to open and with what.
 */

const ok = (data) => ({ data: { data } });

const upcoming = (over = {}) => ({
  id: "a1",
  date: "2026-03-01",
  startTime: "09:00",
  endTime: "10:00",
  session: { name: "ABA Therapy" },
  clinicians: [{ fullName: "Dr Ada Bell" }],
  appointmentServices: [
    { serviceCode: { code: "97153", description: "Adaptive behaviour treatment by protocol" } },
  ],
  ...over,
});

const awaiting = (over = {}) => ({
  id: "s1",
  startTime: "2026-02-01T09:00:00.000Z",
  clientApprovalStatus: "PENDING",
  supervisorApprovalStatus: "APPROVED",
  appointment: { session: { name: "ABA Therapy" }, clinicians: [{ fullName: "Dr Ada Bell" }] },
  ...over,
});

const completed = (over = {}) => ({
  id: "c1",
  date: "2026-01-05T09:00:00.000Z",
  sessionTypeName: "ABA Therapy",
  clinician: "Dr Ada Bell",
  totalHours: 1.5,
  ...over,
});

const reschedule = (over = {}) => ({
  id: "r1",
  appointmentId: "a1",
  date: "2026-04-01",
  startTime: "11:00",
  endTime: "12:00",
  appointment: {
    id: "a1",
    date: "2026-03-01",
    startTime: "09:00",
    endTime: "10:00",
    session: { name: "ABA Therapy" },
    clinicians: [{ fullName: "Dr Ada Bell" }],
    appointmentServices: [{ serviceCode: { code: "97153", description: "Treatment" } }],
  },
  ...over,
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

const renderHome = async () => {
  const view = render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </Provider>
  );
  await waitFor(() => expect(apiMock.GetClientUpcomingAppointments).toHaveBeenCalled());
  return view;
};

// "2" also appears in the overview counts, so page links are taken from the
// pagination control rather than by text alone.
const goToPage = async (n) => {
  const link = Array.from(
    document.body.querySelectorAll(".pagination button, .pagination-btn, .table-pagination button")
  ).find((b) => b.textContent.trim() === String(n));
  expect(link).toBeTruthy();
  fireEvent.click(link);
};

// Waiting for the label that was just clicked proves nothing -- it is already
// on screen before the tab switches. Wait for the tab to actually become the
// active one and for its rows to finish loading, otherwise assertions race the
// fetch and fail only under CPU contention.
const openTab = async (label) => {
  // The tab strip itself only renders once the page has data, so the label has
  // to be waited for before it can be clicked.
  await waitFor(() => expect(screen.getByText(label)).toBeInTheDocument());
  fireEvent.click(screen.getByText(label));
  await waitFor(() => {
    expect(document.querySelector(".table-tab.active")).toHaveTextContent(label);
    expect(document.querySelector(".section-loader")).toBeNull();
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  document.body.innerHTML = "";
  Object.keys(modalProps).forEach((k) => delete modalProps[k]);
  routerRef.state = null;
  Element.prototype.scrollIntoView = vi.fn();

  apiMock.GetClientSessionOverview.mockResolvedValue(
    ok({ avgSession: 3665, completedSession: 4, awaitingApproval: 2 })
  );
  apiMock.GetClientSessionChart.mockResolvedValue(
    ok([{ period: "Jan", session_count: 3 }])
  );
  apiMock.GetAllAuthorizationServiceCodes.mockResolvedValue(
    ok([
      {
        serviceCodeId: "sc1",
        code: "97153",
        description: "Treatment",
        totalUnits: 100,
        totalUsed: 40,
        totalRemaining: 60,
      },
    ])
  );
  apiMock.GetClientUpcomingAppointments.mockResolvedValue(ok([upcoming()]));
  apiMock.GetClientAwaitingApprovals.mockResolvedValue(ok([awaiting()]));
  apiMock.GetClientCompletedAppointments.mockResolvedValue(ok([completed()]));
  apiMock.GetClientCancelAppointments.mockResolvedValue(ok([upcoming({ id: "x1" })]));
  apiMock.GetClientRescheduledAppointments.mockResolvedValue(ok([reschedule()]));
  apiMock.GetAppointmentById.mockResolvedValue(ok(upcoming({ session: { name: "Fetched" } })));
  apiMock.ApproveSession.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("the overview cards", () => {
  it("renders the session counts the API returned", async () => {
    await renderHome();
    await waitFor(() => expect(screen.getByText("4")).toBeInTheDocument());
  });

  it("renders the average session as hours and minutes", async () => {
    await renderHome();
    await waitFor(() => expect(screen.getByText("01:01hrs")).toBeInTheDocument());
  });

  it("accepts an average delivered as the older array shape", async () => {
    apiMock.GetClientSessionOverview.mockResolvedValue(
      ok({ avgSession: [{ avg_seconds: 7200 }], completedSession: 1, awaitingApproval: 0 })
    );
    await renderHome();
    await waitFor(() => expect(screen.getByText("02:00hrs")).toBeInTheDocument());
  });

  it("accepts an average delivered as a numeric string", async () => {
    apiMock.GetClientSessionOverview.mockResolvedValue(
      ok({ avgSession: "1800", completedSession: 1, awaitingApproval: 0 })
    );
    await renderHome();
    await waitFor(() => expect(screen.getByText("00:30hrs")).toBeInTheDocument());
  });

  it("shows no duration rather than NaN when the average is unusable", async () => {
    apiMock.GetClientSessionOverview.mockResolvedValue(
      ok({ avgSession: "nonsense", completedSession: 0, awaitingApproval: 0 })
    );
    await renderHome();
    await waitFor(() => expect(screen.getByText("00:00hrs")).toBeInTheDocument());
  });

  it("changes the chart period and refetches", async () => {
    await renderHome();
    await waitFor(() => expect(apiMock.GetClientSessionChart).toHaveBeenCalled());
    const period = document.body.querySelector("select");
    fireEvent.change(period, { target: { value: "week" } });
    await waitFor(() =>
      expect(apiMock.GetClientSessionChart).toHaveBeenCalledWith(
        expect.objectContaining({ groupBy: "week" })
      )
    );
  });

  it("shows the dashboard error panel when the overview fetch fails", async () => {
    apiMock.GetClientSessionOverview.mockRejectedValue(new Error("offline"));
    await renderHome();
    await waitFor(() =>
      expect(screen.getByText(/Something went wrong loading your dashboard/i))
        .toBeInTheDocument()
    );
  });

  it("shows the error panel when the chart fetch fails", async () => {
    apiMock.GetClientSessionChart.mockRejectedValue(new Error("offline"));
    await renderHome();
    await waitFor(() =>
      expect(screen.getByText(/Something went wrong loading your dashboard/i))
        .toBeInTheDocument()
    );
  });

  it("shows the error panel when the authorization fetch fails", async () => {
    apiMock.GetAllAuthorizationServiceCodes.mockRejectedValue(new Error("offline"));
    await renderHome();
    await waitFor(() =>
      expect(screen.getByText(/Something went wrong loading your dashboard/i))
        .toBeInTheDocument()
    );
  });

  it("fetches nothing at all without a signed-in client", async () => {
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: { auth: { isAuthenticated: false, accessToken: null, user: null } },
    });
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </Provider>
    );
    expect(apiMock.GetClientUpcomingAppointments).not.toHaveBeenCalled();
    expect(apiMock.GetAllAuthorizationServiceCodes).not.toHaveBeenCalled();
  });
});

describe("the upcoming tab", () => {
  it("renders a row built from the appointment", async () => {
    await renderHome();
    await waitFor(() => expect(screen.getByText("ABA Therapy")).toBeInTheDocument());
    expect(screen.getByText("Dr Ada Bell")).toBeInTheDocument();
  });

  it("truncates a long service description into the row", async () => {
    await renderHome();
    await waitFor(() =>
      expect(screen.getByText(/97153 - Adaptive behaviour t/)).toBeInTheDocument()
    );
  });

  it("labels an appointment with no services or clinicians", async () => {
    apiMock.GetClientUpcomingAppointments.mockResolvedValue(
      ok([upcoming({ appointmentServices: undefined, clinicians: undefined, session: undefined })])
    );
    await renderHome();
    await waitFor(() => expect(screen.getByText("Not assigned")).toBeInTheDocument());
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
  });

  it("renders a service code with no description at all", async () => {
    apiMock.GetClientUpcomingAppointments.mockResolvedValue(
      ok([upcoming({ appointmentServices: [{ serviceCode: {} }] })])
    );
    await renderHome();
    await waitFor(() => expect(screen.getByText("ABA Therapy")).toBeInTheDocument());
  });

  it("leaves the time blank when the appointment has no start", async () => {
    apiMock.GetClientUpcomingAppointments.mockResolvedValue(
      ok([upcoming({ startTime: null })])
    );
    await renderHome();
    await waitFor(() => expect(screen.getByText("ABA Therapy")).toBeInTheDocument());
  });

  it("shows the empty state when there is nothing upcoming", async () => {
    apiMock.GetClientUpcomingAppointments.mockResolvedValue(ok([]));
    await renderHome();
    await waitFor(() => expect(screen.getByText("No appointments")).toBeInTheDocument());
  });

  it("empties the tab rather than erroring when its fetch fails", async () => {
    apiMock.GetClientUpcomingAppointments.mockRejectedValue(new Error("offline"));
    await renderHome();
    await waitFor(() => expect(screen.getByText("No appointments")).toBeInTheDocument());
    // A failed tab fetch must not take out the whole dashboard.
    expect(screen.queryByText(/Something went wrong loading your dashboard/i)).toBeNull();
  });
});

describe("the other tabs", () => {
  it("loads awaiting feedback and offers a review link", async () => {
    await renderHome();
    await openTab("Awaiting feedback");
    await waitFor(() => expect(apiMock.GetClientAwaitingApprovals).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("Review Session")).toBeInTheDocument());
    expect(screen.getByText("Pending Review")).toBeInTheDocument();
  });

  it("labels an awaiting row whose appointment is missing", async () => {
    apiMock.GetClientAwaitingApprovals.mockResolvedValue(
      ok([awaiting({ appointment: undefined, startTime: null })])
    );
    await renderHome();
    await openTab("Awaiting feedback");
    await waitFor(() => expect(screen.getByText("Not assigned")).toBeInTheDocument());
  });

  it("renders a completed session's duration in hours and minutes", async () => {
    await renderHome();
    await openTab("Completed");
    await waitFor(() => expect(apiMock.GetClientCompletedAppointments).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText(/1h 30m/)).toBeInTheDocument());
  });

  it("renders a whole number of hours without minutes", async () => {
    apiMock.GetClientCompletedAppointments.mockResolvedValue(ok([completed({ totalHours: 2 })]));
    await renderHome();
    await openTab("Completed");
    await waitFor(() => expect(screen.getByText(/2h/)).toBeInTheDocument());
  });

  it("renders a part-hour session as minutes alone", async () => {
    apiMock.GetClientCompletedAppointments.mockResolvedValue(ok([completed({ totalHours: 0.5 })]));
    await renderHome();
    await openTab("Completed");
    await waitFor(() => expect(screen.getByText(/30m/)).toBeInTheDocument());
  });

  it("renders a completed session with no recorded hours or date", async () => {
    apiMock.GetClientCompletedAppointments.mockResolvedValue(
      ok([completed({ totalHours: null, date: null, sessionTypeName: null, clinician: null })])
    );
    await renderHome();
    await openTab("Completed");
    await waitFor(() => expect(screen.getByText("Not assigned")).toBeInTheDocument());
  });

  it("loads cancelled appointments", async () => {
    await renderHome();
    await openTab("Cancelled");
    await waitFor(() => expect(apiMock.GetClientCancelAppointments).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("ABA Therapy")).toBeInTheDocument());
  });

  it("adds a previous-slot column on the reschedule tab", async () => {
    await renderHome();
    await openTab("Reschedule Requests");
    await waitFor(() => expect(apiMock.GetClientRescheduledAppointments).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("Previous Date & Time")).toBeInTheDocument());
    expect(screen.getByText("New Date & Time")).toBeInTheDocument();
  });

  it("reads a reschedule request delivered flat, with no wrapped appointment", async () => {
    apiMock.GetClientRescheduledAppointments.mockResolvedValue(
      ok([reschedule({ appointment: undefined })])
    );
    await renderHome();
    await openTab("Reschedule Requests");
    // With nothing wrapped, the request itself is the appointment -- and it
    // carries no session or clinicians, so both fall back.
    await waitFor(() => expect(screen.getByText("Not assigned")).toBeInTheDocument());
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
  });

  it("dashes the previous slot when the request records none", async () => {
    apiMock.GetClientRescheduledAppointments.mockResolvedValue(
      ok([
        reschedule({
          appointment: { session: { name: "ABA Therapy" }, clinicians: [] },
        }),
      ])
    );
    await renderHome();
    await openTab("Reschedule Requests");
    await waitFor(() => expect(screen.getByText("—")).toBeInTheDocument());
  });

  it.each([
    ["rescheduleAccepted", "Accepted"],
    ["rescheduleRejected", "Rejected"],
  ])("badges a request marked %s", async (flag, label) => {
    apiMock.GetClientRescheduledAppointments.mockResolvedValue(
      ok([reschedule({ appointment: { ...reschedule().appointment, [flag]: true } })])
    );
    await renderHome();
    await openTab("Reschedule Requests");
    await waitFor(() => expect(screen.getByText(label)).toBeInTheDocument());
  });

  it("badges an undecided request as pending", async () => {
    await renderHome();
    await openTab("Reschedule Requests");
    await waitFor(() => expect(screen.getByText("Pending")).toBeInTheDocument());
  });
});

describe("the appointment details modal", () => {
  const openMenu = async () => {
    await waitFor(() => expect(screen.getByText("ABA Therapy")).toBeInTheDocument());
    fireEvent.click(screen.getAllByLabelText("More actions")[0]);
  };

  it("fetches the full appointment before opening", async () => {
    await renderHome();
    await openMenu();
    fireEvent.click(screen.getByText("View appointment details"));
    await waitFor(() =>
      expect(apiMock.GetAppointmentById).toHaveBeenCalledWith(
        expect.objectContaining({ id: "a1" })
      )
    );
    await waitFor(() => expect(screen.getByTestId("details-open")).toBeInTheDocument());
    expect(modalProps.details.appointment.originalData.session.name).toBe("Fetched");
  });

  it("falls back to the row when the fetch fails", async () => {
    apiMock.GetAppointmentById.mockRejectedValue(new Error("offline"));
    await renderHome();
    await openMenu();
    fireEvent.click(screen.getByText("View appointment details"));
    await waitFor(() => expect(screen.getByTestId("details-open")).toBeInTheDocument());
    expect(modalProps.details.appointment.id).toBe("a1");
  });

  it("falls back to the row when the fetch returns nothing", async () => {
    apiMock.GetAppointmentById.mockResolvedValue({});
    await renderHome();
    await openMenu();
    fireEvent.click(screen.getByText("View appointment details"));
    await waitFor(() => expect(screen.getByTestId("details-open")).toBeInTheDocument());
  });

  it("closes and forgets the selection", async () => {
    await renderHome();
    await openMenu();
    fireEvent.click(screen.getByText("View appointment details"));
    await waitFor(() => expect(screen.getByTestId("details-open")).toBeInTheDocument());
    act(() => modalProps.details.onClose());
    await waitFor(() => expect(screen.queryByTestId("details-open")).toBeNull());
  });

  it("hands off from details to the reschedule modal", async () => {
    await renderHome();
    await openMenu();
    fireEvent.click(screen.getByText("View appointment details"));
    await waitFor(() => expect(screen.getByTestId("details-open")).toBeInTheDocument());
    act(() => modalProps.details.onReschedule({ id: "a1" }));
    await waitFor(() => expect(screen.getByTestId("reschedule-open")).toBeInTheDocument());
    expect(screen.queryByTestId("details-open")).toBeNull();
  });
});

describe("reschedule and feedback", () => {
  it("opens the reschedule modal from the row menu", async () => {
    await renderHome();
    await waitFor(() => expect(screen.getByText("ABA Therapy")).toBeInTheDocument());
    fireEvent.click(screen.getAllByLabelText("More actions")[0]);
    fireEvent.click(screen.getByText("Request Reschedule"));
    await waitFor(() => expect(screen.getByTestId("reschedule-open")).toBeInTheDocument());
  });

  it("confirms a successful reschedule and reloads the tab", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await renderHome();
    await waitFor(() => expect(screen.getByText("ABA Therapy")).toBeInTheDocument());
    fireEvent.click(screen.getAllByLabelText("More actions")[0]);
    fireEvent.click(screen.getByText("Request Reschedule"));
    await waitFor(() => expect(screen.getByTestId("reschedule-open")).toBeInTheDocument());

    const before = apiMock.GetClientUpcomingAppointments.mock.calls.length;
    await act(async () => { modalProps.reschedule.onSuccess(); });
    expect(modalProps.success.message).toBe("Your reschedule request has been sent!");
    await waitFor(() =>
      expect(apiMock.GetClientUpcomingAppointments.mock.calls.length).toBeGreaterThan(before)
    );

    // The confirmation dismisses itself rather than waiting for a click.
    await act(async () => { vi.advanceTimersByTime(3600); });
    await waitFor(() => expect(screen.queryByTestId("success-open")).toBeNull());
  });

  it("submits session approval and thanks the client", async () => {
    await renderHome();
    await openTab("Awaiting feedback");
    await waitFor(() => expect(screen.getByText("Review Session")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Review Session"));
    await waitFor(() => expect(screen.getByTestId("feedback-open")).toBeInTheDocument());

    await act(async () => {
      await modalProps.feedback.onSave({
        sessionId: "s1",
        confirmDelivery: true,
        rateService: 5,
        rateTherapist: 5,
        feedback: "Great",
        signature: "data:image/png;base64,x",
      });
    });
    expect(apiMock.ApproveSession).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "s1", confirmDelivery: true })
    );
    expect(modalProps.success.message).toBe("Your session feedback has been submitted!");
  });

  it("lets a failed approval reach the modal", async () => {
    apiMock.ApproveSession.mockRejectedValue(new Error("server said no"));
    await renderHome();
    await openTab("Awaiting feedback");
    await waitFor(() => expect(screen.getByText("Review Session")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Review Session"));
    await waitFor(() => expect(screen.getByTestId("feedback-open")).toBeInTheDocument());

    await expect(
      modalProps.feedback.onSave({ sessionId: "s1" })
    ).rejects.toThrow("server said no");
  });

  it("closes the confirmation by hand", async () => {
    await renderHome();
    await waitFor(() => expect(screen.getByText("ABA Therapy")).toBeInTheDocument());
    fireEvent.click(screen.getAllByLabelText("More actions")[0]);
    fireEvent.click(screen.getByText("Request Reschedule"));
    await act(async () => { modalProps.reschedule.onSuccess(); });
    await waitFor(() => expect(screen.getByTestId("success-open")).toBeInTheDocument());
    act(() => modalProps.success.onClose());
    await waitFor(() => expect(screen.queryByTestId("success-open")).toBeNull());
  });
});

describe("arriving from a notification", () => {
  it("switches to the named tab and opens that appointment's details", async () => {
    routerRef.state = { focusTab: "upcoming", focusId: "a1" };
    await renderHome();
    await waitFor(() => expect(screen.getByTestId("details-open")).toBeInTheDocument());
    // The state is consumed so a re-render cannot re-open the modal.
    expect(navigate).toHaveBeenCalledWith("/", { replace: true, state: null });
  });

  it("opens the feedback modal instead when the tab is awaiting", async () => {
    routerRef.state = { focusTab: "awaiting", focusId: "s1" };
    await renderHome();
    await waitFor(() => expect(screen.getByTestId("feedback-open")).toBeInTheDocument());
  });

  it("matches a reschedule request by the appointment it refers to", async () => {
    routerRef.state = { focusTab: "reschedule", focusId: "a1" };
    await renderHome();
    await waitFor(() => expect(screen.getByTestId("details-open")).toBeInTheDocument());
  });

  it("stays on the current tab when the named one is not recognised", async () => {
    routerRef.state = { focusTab: "nonsense", focusId: "a1" };
    await renderHome();
    // The tab is ignored, but the appointment id still is not: if the row
    // happens to be on the tab already showing, its modal opens there.
    await waitFor(() => expect(screen.getByTestId("details-open")).toBeInTheDocument());
    expect(apiMock.GetClientCompletedAppointments).not.toHaveBeenCalled();
  });

  it("opens nothing when the state names neither a tab nor an appointment", async () => {
    routerRef.state = {};
    await renderHome();
    await waitFor(() => expect(screen.getByText("ABA Therapy")).toBeInTheDocument());
    expect(screen.queryByTestId("details-open")).toBeNull();
  });

  it("opens nothing when the named appointment is not in the tab", async () => {
    routerRef.state = { focusTab: "upcoming", focusId: "does-not-exist" };
    await renderHome();
    await waitFor(() => expect(screen.getByText("ABA Therapy")).toBeInTheDocument());
    expect(screen.queryByTestId("details-open")).toBeNull();
  });

  it("opens nothing when arriving with no appointment named", async () => {
    routerRef.state = { focusTab: "completed" };
    await renderHome();
    await waitFor(() => expect(apiMock.GetClientCompletedAppointments).toHaveBeenCalled());
    expect(screen.queryByTestId("details-open")).toBeNull();
  });
});

describe("the table's own controls", () => {
  const many = Array.from({ length: 14 }, (_, i) =>
    upcoming({ id: `a${i}`, session: { name: `Session ${i}` } })
  );

  it("pages through a long list", async () => {
    apiMock.GetClientUpcomingAppointments.mockResolvedValue(ok(many));
    await renderHome();
    await waitFor(() => expect(screen.getByText("Session 0")).toBeInTheDocument());
    expect(screen.queryByText("Session 12")).toBeNull();

    await goToPage(2);
    await waitFor(() => expect(screen.getByText("Session 12")).toBeInTheDocument());
  });

  it("fits more per page in the card view", async () => {
    apiMock.GetClientUpcomingAppointments.mockResolvedValue(ok(many));
    await renderHome();
    await waitFor(() => expect(screen.getByText("Session 0")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Grid view"));
    await waitFor(() => expect(screen.getByText("Session 11")).toBeInTheDocument());
  });

  it("returns to the first page when the tab changes", async () => {
    apiMock.GetClientUpcomingAppointments.mockResolvedValue(ok(many));
    await renderHome();
    await waitFor(() => expect(screen.getByText("Session 0")).toBeInTheDocument());
    await goToPage(2);
    await waitFor(() => expect(screen.getByText("Session 12")).toBeInTheDocument());

    await openTab("Completed");
    await waitFor(() => expect(apiMock.GetClientCompletedAppointments).toHaveBeenCalled());
    await openTab("Upcoming");
    await waitFor(() => expect(screen.getByText("Session 0")).toBeInTheDocument());
  });

  it("counts the awaiting tab in its own label", async () => {
    await renderHome();
    await openTab("Awaiting feedback");
    await waitFor(() => expect(apiMock.GetClientAwaitingApprovals).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument());
  });
});

describe("the authorization card", () => {
  it("shows the selected service code's remaining units", async () => {
    await renderHome();
    await waitFor(() => expect(apiMock.GetAllAuthorizationServiceCodes).toHaveBeenCalled());
    // The service-code picker is react-select, so take the only option by
    // keyboard rather than firing a change on a native <select>.
    const input = await waitFor(() => {
      const found = document.body.querySelector(".service-type-selector input");
      expect(found).toBeTruthy();
      return found;
    });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(screen.getAllByText("60").length).toBeGreaterThan(0));
  });
});

describe("edges of the appointment transforms", () => {
  it("treats an unparseable average in the old array shape as zero", async () => {
    apiMock.GetClientSessionOverview.mockResolvedValue(
      ok({ avgSession: [{ avg_seconds: "nonsense" }], completedSession: 1, awaitingApproval: 0 })
    );
    await renderHome();
    await waitFor(() => expect(screen.getByText("00:00hrs")).toBeInTheDocument());
  });

  it.each([
    ["upcoming", "GetClientUpcomingAppointments", "Upcoming"],
    ["cancelled", "GetClientCancelAppointments", "Cancelled"],
  ])("labels a %s appointment with empty service and clinician lists", async (_tab, endpoint, label) => {
    apiMock[endpoint].mockResolvedValue(
      ok([upcoming({ appointmentServices: [], clinicians: [] })])
    );
    await renderHome();
    if (label !== "Upcoming") await openTab(label);
    await waitFor(() => expect(screen.getByText("Not assigned")).toBeInTheDocument());
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
  });

  it("renders a cancelled appointment with no services, session or slot", async () => {
    apiMock.GetClientCancelAppointments.mockResolvedValue(
      ok([
        upcoming({
          appointmentServices: [{ serviceCode: {} }],
          clinicians: undefined,
          session: undefined,
          startTime: null,
        }),
      ])
    );
    await renderHome();
    await openTab("Cancelled");
    await waitFor(() => expect(screen.getByText("Not assigned")).toBeInTheDocument());
  });

  it("renders a reschedule request with no services, clinicians or slot", async () => {
    apiMock.GetClientRescheduledAppointments.mockResolvedValue(
      ok([
        reschedule({
          startTime: null,
          appointmentId: undefined,
          appointment: {
            id: "a1",
            appointmentServices: [{ serviceCode: {} }],
            clinicians: [],
            previousDate: "2026-02-01",
          },
        }),
      ])
    );
    await renderHome();
    await openTab("Reschedule Requests");
    await waitFor(() => expect(screen.getByText("Not assigned")).toBeInTheDocument());
  });

  it("badges an appointment the API flagged as new", async () => {
    // `isNew` is hard-coded false in the transform today, so the badge cannot
    // appear from a live payload -- this pins that the row still renders.
    apiMock.GetClientUpcomingAppointments.mockResolvedValue(ok([upcoming({ isNew: true })]));
    await renderHome();
    await waitFor(() => expect(screen.getByText("ABA Therapy")).toBeInTheDocument());
    expect(document.body.querySelector(".status-badge.new")).toBeNull();
  });

  it("shows nothing for a stored tab it does not recognise", async () => {
    // usePersistedTab restores whatever is in sessionStorage, so a stale key
    // can put the page on a tab the fetch switch has no case for.
    sessionStorage.setItem("tab:client:home", "invented");
    render(
      <Provider store={makeStore()}>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </Provider>
    );
    await waitFor(() => expect(screen.getByText("No appointments")).toBeInTheDocument());
    expect(apiMock.GetClientUpcomingAppointments).not.toHaveBeenCalled();
    expect(apiMock.GetClientAwaitingApprovals).not.toHaveBeenCalled();
  });

  it("zeroes an authorization whose totals are missing", async () => {
    apiMock.GetAllAuthorizationServiceCodes.mockResolvedValue(
      ok([{ serviceCodeId: "sc1", code: "97153", description: "Treatment" }])
    );
    await renderHome();
    await waitFor(() => expect(apiMock.GetAllAuthorizationServiceCodes).toHaveBeenCalled());
    const input = await waitFor(() => {
      const found = document.body.querySelector(".service-type-selector input");
      expect(found).toBeTruthy();
      return found;
    });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(screen.getAllByText("0").length).toBeGreaterThan(0));
  });

  it("offers no menu at all for an appointment with no id", async () => {
    apiMock.GetClientUpcomingAppointments.mockResolvedValue(
      ok([upcoming({ id: undefined })])
    );
    await renderHome();
    await waitFor(() => expect(screen.getByText("ABA Therapy")).toBeInTheDocument());
    fireEvent.click(screen.getAllByLabelText("More actions")[0]);
    // The table keys its open menu on the row id, so an id-less row can never
    // open one -- which is also why `openDetails`' own no-id branch is
    // unreachable from the UI.
    expect(screen.queryByText("View appointment details")).toBeNull();
    expect(apiMock.GetAppointmentById).not.toHaveBeenCalled();
  });

  it("leaves the route alone when there was no state to consume", async () => {
    // usePersistedTab restores the awaiting tab, and the focus id is planted
    // without any location state to clear afterwards.
    routerRef.state = { focusTab: "awaiting", focusId: "s1" };
    const { unmount } = await renderHome();
    await waitFor(() => expect(screen.getByTestId("feedback-open")).toBeInTheDocument());
    unmount();

    navigate.mockClear();
    routerRef.state = null;
    sessionStorage.setItem("tab:client:home", "awaiting");
    await renderHome();
    await waitFor(() => expect(apiMock.GetClientAwaitingApprovals).toHaveBeenCalled());
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("opening details for a row with no appointment id", () => {
  it("shows the row itself rather than fetching an appointment it cannot name", async () => {
    // A reschedule request carries three candidate ids and this payload has
    // only the request's own `appointmentId`: the wrapped appointment has no
    // id, and neither does the request, so both halves of the id read come
    // back empty and the fetch is skipped.
    apiMock.GetClientRescheduledAppointments.mockResolvedValue(
      ok([
        {
          appointmentId: "x1",
          date: "2026-04-01",
          startTime: "11:00",
          endTime: "12:00",
          appointment: {
            session: { name: "ABA Therapy" },
            clinicians: [{ fullName: "Dr Ada Bell" }],
          },
        },
      ])
    );
    routerRef.state = { focusTab: "reschedule", focusId: "x1" };
    await renderHome();

    await waitFor(() => expect(screen.getByTestId("details-open")).toBeInTheDocument());
    expect(apiMock.GetAppointmentById).not.toHaveBeenCalled();
    expect(modalProps.details.appointment.sessionType).toBe("ABA Therapy");
  });
});
