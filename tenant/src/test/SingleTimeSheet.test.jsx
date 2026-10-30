import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The read-only timesheet detail page a supervisor lands on from the billing
 * list: session and travel times, the documents/program-data panel, the client
 * signature block, the billing accordion, and a history tab.
 *
 * Everything on the page hangs off one fetch, so nothing renders until
 * `GetSingleTimeSheetByTimesheetId` resolves -- until then (and forever, if the
 * fetch throws) the page shows only a section loader. The endpoint is called
 * both ways in the wild, so the page reads `response?.data ?? response`; both
 * shapes are covered here.
 *
 * The visible actions are permission-gated, and `usePermissions` treats a user
 * whose role carries an EMPTY `roleModuleAccesses` array as an org owner with
 * full access -- so the permissive fixture is an empty array and the restricted
 * ones name their keys explicitly. `generalSettings` is preloaded as `loaded`
 * so `useFormatSettings` never reaches for the settings endpoint.
 *
 * jsPDF is stubbed down to the handful of methods the exporter calls, because a
 * test must never leave a file behind; the stub records them so the export path
 * can be asserted without a real document. The two approval modals and the
 * billing AccordionTable are probes -- the accordion in particular does its own
 * auth-backed service-code fetch, and its props are the interesting part.
 */

const apiMock = vi.hoisted(() => ({
  GetSingleTimeSheetByTimesheetId: vi.fn(),
  ApproveTimeSheetBySupervisor: vi.fn(),
  RejectTimeSheetBySupervisor: vi.fn(),
  NudgeClientForApproval: vi.fn(),
}));
vi.mock("../api/billingAndPaymentsApi", () => ({ default: apiMock }));

const toastMock = vi.hoisted(() => ({ showToast: vi.fn(), showApiError: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toastMock.showToast(...a),
  showApiError: (...a) => toastMock.showApiError(...a),
}));

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
  useParams: () => ({ timesheetId: "ts-1" }),
}));

// The accordion fetches service codes off its own auth context; only the rows
// the page hands it matter here.
const accordionProps = vi.hoisted(() => ({ last: null }));
vi.mock("../Components/Table/AccordionTable", () => ({
  default: (props) => {
    accordionProps.last = props;
    return <div data-testid="billing-accordion">{props.tableName}</div>;
  },
}));

const approveProbe = vi.hoisted(() => ({ onSave: null }));
vi.mock("../Components/ReusableModal/BillingAndPaymentModal/ApproveTimeSheetModal", () => ({
  default: ({ isOpen, onSave, onClose }) => {
    approveProbe.onSave = onSave;
    return isOpen ? (
      <div data-testid="approve-modal">
        <button onClick={() => onSave()}>confirm-approve</button>
        <button onClick={onClose}>cancel-approve</button>
      </div>
    ) : null;
  },
}));

const rejectProbe = vi.hoisted(() => ({ onSave: null }));
vi.mock("../Components/ReusableModal/BillingAndPaymentModal/RejectTimesheetModal", () => ({
  default: ({ isOpen, onSave }) => {
    rejectProbe.onSave = onSave;
    return isOpen ? <div data-testid="reject-modal" /> : null;
  },
}));

// Recorded rather than asserted method-by-method: the exporter makes hundreds
// of calls, and what matters is that it reached `save` with the right filename.
const pdf = vi.hoisted(() => ({
  save: vi.fn(),
  addImage: vi.fn(),
  autoTable: vi.fn(),
  construct: vi.fn(),
  shouldThrow: false,
}));
vi.mock("jspdf", () => ({
  jsPDF: class {
    constructor(...args) {
      pdf.construct(...args);
      if (pdf.shouldThrow) throw new Error("no pdf engine");
      this.internal = {
        pageSize: { getWidth: () => 210, getHeight: () => 297 },
        getNumberOfPages: () => 2,
      };
      this.lastAutoTable = { finalY: 40 };
      this.setFont = vi.fn();
      this.setFontSize = vi.fn();
      this.setTextColor = vi.fn();
      this.text = vi.fn();
      this.addPage = vi.fn();
      this.setPage = vi.fn();
      this.addImage = pdf.addImage;
      this.save = pdf.save;
      // The exporter measures wrapped text by the length of this array.
      this.splitTextToSize = (t) => [String(t)];
    }
  },
}));
vi.mock("jspdf-autotable", () => ({ default: (...a) => pdf.autoTable(...a) }));

import SingleTimeSheet from "../Pages/BillingAndPayment/TimeSheet/SingleTimeSheet";

// Local-time strings on purpose: a trailing Z would make the rendered date
// depend on the machine's timezone.
const baseTimesheet = (over = {}) => ({
  id: "ts-1",
  startTime: "2026-03-10T09:00:00",
  endTime: "2026-03-10T11:30:00",
  note: "Client engaged well throughout.",
  clientApprovalStatus: "PENDING",
  supervisorApprovalStatus: "PENDING",
  appointment: {
    clientId: "client-9f8e7d6c",
    client: { firstName: "Ada", lastName: "Lovelace" },
    clinicians: [{ id: "cl-1", fullName: "Grace Hopper", npi: "1234567890" }],
    session: { name: "Direct Therapy", category: "ABA" },
    serviceLocation: "Home",
  },
  sessionApprovals: [],
  sessionDatas: [],
  authorizationsUsed: [],
  timesheetHistories: [],
  ...over,
});

const makeStore = (permissions) =>
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
          tenantId: "tenant-1",
          accessToken: "at",
          refreshToken: "rt",
          fullName: "Supervisor Sam",
          email: "sam@example.com",
          // An empty accesses array is the org-owner case: full access.
          role: permissions
            ? { roleModuleAccesses: [{ module: "BILLING_AND_PAYMENT", permissions }] }
            : { roleModuleAccesses: [] },
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

const renderPage = ({ data, permissions, wrapped = true } = {}) => {
  if (data !== undefined) {
    apiMock.GetSingleTimeSheetByTimesheetId.mockResolvedValue(
      wrapped ? { data } : data
    );
  }
  return render(
    <Provider store={makeStore(permissions)}>
      <SingleTimeSheet />
    </Provider>
  );
};

const loaded = () => screen.findByText("Session Information");

// Label and value sit in sibling spans, so read the value off the sibling.
const fieldValue = (label) =>
  screen.getByText(label).nextElementSibling?.textContent?.trim() ?? "";

const openActions = () => fireEvent.click(screen.getByRole("button", { name: /Actions/ }));

beforeEach(() => {
  vi.clearAllMocks();
  pdf.shouldThrow = false;
  accordionProps.last = null;
  apiMock.GetSingleTimeSheetByTimesheetId.mockResolvedValue({ data: baseTimesheet() });
  apiMock.ApproveTimeSheetBySupervisor.mockResolvedValue({});
  apiMock.RejectTimeSheetBySupervisor.mockResolvedValue({});
  apiMock.NudgeClientForApproval.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading and fetching", () => {
  it("shows only a loader until the timesheet arrives", async () => {
    renderPage();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    await loaded();
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });

  it("passes the route id and the caller's tokens to the endpoint", async () => {
    renderPage();
    await loaded();
    expect(apiMock.GetSingleTimeSheetByTimesheetId).toHaveBeenCalledWith({
      timeSheetId: "ts-1",
      accessToken: "at",
      refreshToken: "rt",
    });
  });

  it("accepts a bare timesheet as well as one wrapped in a data envelope", async () => {
    renderPage({ data: baseTimesheet({ note: "unwrapped" }), wrapped: false });
    await loaded();
    expect(fieldValue("Location")).toBe("Home");
  });

  it("keeps showing the loader when the fetch fails", async () => {
    apiMock.GetSingleTimeSheetByTimesheetId.mockRejectedValue(new Error("boom"));
    renderPage();
    await waitFor(() =>
      expect(apiMock.GetSingleTimeSheetByTimesheetId).toHaveBeenCalled()
    );
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("Session Information")).not.toBeInTheDocument();
  });

  it("sends the user back when Back is pressed", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getAllByRole("button", { name: /Back/ })[0]);
    expect(navigate).toHaveBeenCalledWith(-1);
  });
});

describe("approval status badges", () => {
  const statusOf = (which) =>
    screen.getByText(which).parentElement.querySelector(".timesheet-status");

  it("falls back to PENDING when neither status is set", async () => {
    renderPage({ data: baseTimesheet({ clientApprovalStatus: null, supervisorApprovalStatus: null }) });
    await loaded();
    expect(statusOf("Client Approval")).toHaveTextContent("PENDING");
    expect(statusOf("Client Approval")).toHaveClass("timesheet-pending");
  });

  it("marks an approved client status as complete", async () => {
    renderPage({ data: baseTimesheet({ clientApprovalStatus: "APPROVED" }) });
    await loaded();
    expect(statusOf("Client Approval")).toHaveClass("timesheet-complete");
  });

  it("marks a rejected client status as rejected", async () => {
    renderPage({ data: baseTimesheet({ clientApprovalStatus: "REJECTED" }) });
    await loaded();
    expect(statusOf("Client Approval")).toHaveClass("timesheet-rejected");
  });

  it("gives the supervisor's UPDATE_REQUESTED status its own style", async () => {
    renderPage({ data: baseTimesheet({ supervisorApprovalStatus: "UPDATE_REQUESTED" }) });
    await loaded();
    const badge = statusOf("Supervisor Approval");
    expect(badge).toHaveTextContent("UPDATE_REQUESTED");
    expect(badge).toHaveClass("timesheet-update-requested");
  });

  it("marks an approved supervisor status as complete", async () => {
    renderPage({ data: baseTimesheet({ supervisorApprovalStatus: "APPROVED" }) });
    await loaded();
    expect(statusOf("Supervisor Approval")).toHaveClass("timesheet-complete");
  });

  it("marks a rejected supervisor status as rejected", async () => {
    renderPage({ data: baseTimesheet({ supervisorApprovalStatus: "REJECTED" }) });
    await loaded();
    expect(statusOf("Supervisor Approval")).toHaveClass("timesheet-rejected");
  });
});

describe("session information", () => {
  it("shows the client name with a truncated payer id", async () => {
    renderPage();
    await loaded();
    expect(fieldValue("Client Name")).toContain("Ada Lovelace");
    expect(fieldValue("Client Name")).toContain("client-9");
  });

  it("keeps the surname when only a first name is stored", async () => {
    renderPage({
      data: baseTimesheet({
        appointment: { ...baseTimesheet().appointment, client: { firstName: "Ada" } },
      }),
    });
    await loaded();
    expect(fieldValue("Client Name")).toContain("Ada");
  });

  it("lists each clinician with their NPI", async () => {
    renderPage({
      data: baseTimesheet({
        appointment: {
          ...baseTimesheet().appointment,
          clinicians: [
            { id: "cl-1", fullName: "Grace Hopper", npi: "111" },
            { id: "cl-2" },
          ],
        },
      }),
    });
    await loaded();
    const block = screen.getByText("Clinician(s) Name").nextElementSibling;
    expect(block).toHaveTextContent("Grace Hopper");
    expect(block).toHaveTextContent("(NPI: 111)");
    // A clinician with no name at all still gets a row.
    expect(block).toHaveTextContent("Unknown");
  });

  it("shows N/A when the appointment has no clinicians", async () => {
    renderPage({
      data: baseTimesheet({
        appointment: { ...baseTimesheet().appointment, clinicians: [] },
      }),
    });
    await loaded();
    expect(screen.getByText("Clinician(s) Name").nextElementSibling).toHaveTextContent("N/A");
  });

  it("shows N/A for session type, service type and location when the appointment is missing", async () => {
    renderPage({ data: baseTimesheet({ appointment: null }) });
    await loaded();
    expect(fieldValue("Session Type")).toBe("N/A");
    expect(fieldValue("Service Type(s)")).toBe("N/A");
    expect(fieldValue("Location")).toBe("N/A");
    expect(fieldValue("Client Name")).toBe("Client");
  });
});

describe("travel and time information", () => {
  it("adds travel hours to the session hours for the billable total", async () => {
    renderPage({
      data: baseTimesheet({
        travelStartTime: "2026-03-10T08:30:00",
        travelEndTime: "2026-03-10T09:00:00",
      }),
    });
    await loaded();
    expect(fieldValue("Travel Time Applied")).toBe("Yes");
    expect(fieldValue("Session Duration")).toBe("2.50 hours");
    expect(fieldValue("Travel Duration")).toBe("0.50 hours");
    expect(fieldValue("Total Billable Time")).toBe("3.00 hours");
  });

  it("omits the travel rows and bills session time alone when no travel was logged", async () => {
    renderPage();
    await loaded();
    expect(fieldValue("Travel Time Applied")).toBe("No");
    expect(screen.queryByText("Travel Start Time")).not.toBeInTheDocument();
    expect(screen.queryByText("Travel Duration")).not.toBeInTheDocument();
    expect(fieldValue("Total Billable Time")).toBe("2.50 hours");
  });

  it("shows N/A for missing start and end timestamps", async () => {
    renderPage({ data: baseTimesheet({ startTime: null, endTime: null }) });
    await loaded();
    expect(fieldValue("Session Start Time")).toBe("N/A");
    expect(fieldValue("Session End Time")).toBe("N/A");
    expect(fieldValue("Session Duration")).toBe("0.00 hours");
  });
});

describe("the actions menu", () => {
  it("stays closed until Actions is pressed, and closes again on a second press", async () => {
    renderPage();
    await loaded();
    expect(screen.queryByText("Export as PDF")).not.toBeInTheDocument();
    openActions();
    expect(screen.getByText("Export as PDF")).toBeInTheDocument();
    openActions();
    expect(screen.queryByText("Export as PDF")).not.toBeInTheDocument();
  });

  it("offers only the entries the role grants", async () => {
    renderPage({ permissions: ["export_timesheet_as_pdf"] });
    await loaded();
    openActions();
    expect(screen.getByText("Export as PDF")).toBeInTheDocument();
    expect(screen.queryByText("Approve and Convert to Claim")).not.toBeInTheDocument();
    expect(screen.queryByText("Nudge client for approval")).not.toBeInTheDocument();
  });

  it("hides the nudge entry once the client has already approved", async () => {
    renderPage({ data: baseTimesheet({ clientApprovalStatus: "APPROVED" }) });
    await loaded();
    openActions();
    expect(screen.queryByText("Nudge client for approval")).not.toBeInTheDocument();
  });

  it("renders an empty menu for a role with none of the action permissions", async () => {
    renderPage({ permissions: ["view_timesheet_history_approvals"] });
    await loaded();
    openActions();
    expect(screen.queryByText("Export as PDF")).not.toBeInTheDocument();
    expect(screen.queryByText("Approve and Convert to Claim")).not.toBeInTheDocument();
  });
});

describe("supervisor approval", () => {
  it("opens the approve modal from the menu and closes the menu behind it", async () => {
    renderPage();
    await loaded();
    openActions();
    fireEvent.click(screen.getByText("Approve and Convert to Claim"));
    expect(screen.getByTestId("approve-modal")).toBeInTheDocument();
    expect(screen.queryByText("Approve and Convert to Claim")).not.toBeInTheDocument();
  });

  it("approves against the signed-in supervisor and refetches", async () => {
    renderPage();
    await loaded();
    openActions();
    fireEvent.click(screen.getByText("Approve and Convert to Claim"));
    fireEvent.click(screen.getByText("confirm-approve"));
    await waitFor(() =>
      expect(apiMock.ApproveTimeSheetBySupervisor).toHaveBeenCalledWith({
        timeSheetId: "ts-1",
        supervisorId: "user-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    await waitFor(() =>
      expect(apiMock.GetSingleTimeSheetByTimesheetId).toHaveBeenCalledTimes(2)
    );
    expect(toastMock.showToast).toHaveBeenCalledWith(
      "Timesheet approved successfully!",
      "success"
    );
    await waitFor(() => expect(screen.queryByTestId("approve-modal")).not.toBeInTheDocument());
  });

  it("leaves the modal open and warns when approval fails", async () => {
    apiMock.ApproveTimeSheetBySupervisor.mockRejectedValue(new Error("nope"));
    renderPage();
    await loaded();
    openActions();
    fireEvent.click(screen.getByText("Approve and Convert to Claim"));
    fireEvent.click(screen.getByText("confirm-approve"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Failed to approve timesheet.", "error")
    );
    expect(screen.getByTestId("approve-modal")).toBeInTheDocument();
  });

  it("rejects with the reason the modal supplies", async () => {
    renderPage();
    await loaded();
    await rejectProbe.onSave("Times do not add up");
    expect(apiMock.RejectTimeSheetBySupervisor).toHaveBeenCalledWith({
      timeSheetId: "ts-1",
      supervisorId: "user-1",
      reason: "Times do not add up",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toastMock.showToast).toHaveBeenCalledWith(
      "Timesheet rejected successfully!",
      "success"
    );
  });

  it("warns when the rejection call fails", async () => {
    apiMock.RejectTimeSheetBySupervisor.mockRejectedValue(new Error("nope"));
    renderPage();
    await loaded();
    await rejectProbe.onSave("whatever");
    expect(toastMock.showToast).toHaveBeenCalledWith("Failed to reject timesheet.", "error");
  });
});

describe("nudging the client", () => {
  it("sends the nudge for the appointment's client from the menu", async () => {
    renderPage();
    await loaded();
    openActions();
    fireEvent.click(screen.getByText("Nudge client for approval"));
    await waitFor(() =>
      expect(apiMock.NudgeClientForApproval).toHaveBeenCalledWith({
        clientId: "client-9f8e7d6c",
        staffId: "user-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toastMock.showToast).toHaveBeenCalledWith("Nudge sent successfully!", "success");
  });

  it("refuses to nudge when the timesheet has no client attached", async () => {
    renderPage({
      data: baseTimesheet({
        appointment: { ...baseTimesheet().appointment, clientId: null },
      }),
    });
    await loaded();
    openActions();
    fireEvent.click(screen.getByText("Nudge client for approval"));
    expect(apiMock.NudgeClientForApproval).not.toHaveBeenCalled();
    expect(toastMock.showToast).toHaveBeenCalledWith(
      "Client information not available.",
      "error"
    );
  });

  it("routes a failed nudge through the shared api error reporter", async () => {
    const failure = new Error("gateway");
    apiMock.NudgeClientForApproval.mockRejectedValue(failure);
    renderPage();
    await loaded();
    openActions();
    fireEvent.click(screen.getByText("Nudge client for approval"));
    await waitFor(() =>
      expect(toastMock.showApiError).toHaveBeenCalledWith(failure, "SEND_NUDGE")
    );
  });

  it("also nudges from the Send Reminder button in the pending panel", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Send Reminder" }));
    await waitFor(() => expect(apiMock.NudgeClientForApproval).toHaveBeenCalled());
  });
});

describe("the client authorization panel", () => {
  const approved = (approval) =>
    baseTimesheet({
      clientApprovalStatus: "APPROVED",
      sessionApprovals: [{ createdAt: "2026-03-11T10:00:00", ...approval }],
    });

  it("shows the pending panel while the client has not signed", async () => {
    renderPage();
    await loaded();
    expect(screen.getByText("Pending Client Approval")).toBeInTheDocument();
    expect(screen.queryByText("Client Signature")).not.toBeInTheDocument();
  });

  it("still shows the pending panel when the status is approved but no approval record exists", async () => {
    renderPage({ data: baseTimesheet({ clientApprovalStatus: "APPROVED" }) });
    await loaded();
    expect(screen.getByText("Pending Client Approval")).toBeInTheDocument();
    // Nothing left to remind about once the client's status says approved.
    expect(screen.queryByRole("button", { name: "Send Reminder" })).not.toBeInTheDocument();
  });

  it("hides Send Reminder from a role without the nudge permission", async () => {
    renderPage({ permissions: ["export_timesheet_as_pdf"] });
    await loaded();
    expect(screen.queryByRole("button", { name: "Send Reminder" })).not.toBeInTheDocument();
  });

  it("renders a stored signature that already carries a data URI unchanged", async () => {
    renderPage({ data: approved({ signature: "data:image/png;base64,AAAA" }) });
    await loaded();
    expect(screen.getByAltText("Client Signature")).toHaveAttribute(
      "src",
      "data:image/png;base64,AAAA"
    );
  });

  it("wraps a raw base64 signature in a png data URI", async () => {
    renderPage({ data: approved({ signature: "BBBB" }) });
    await loaded();
    expect(screen.getByAltText("Client Signature")).toHaveAttribute(
      "src",
      "data:image/png;base64,BBBB"
    );
  });

  it("falls back to the client's typed name when no signature was captured", async () => {
    renderPage({ data: approved({}) });
    await loaded();
    expect(screen.getByText("Digital Signature")).toBeInTheDocument();
    expect(screen.queryByAltText("Client Signature")).not.toBeInTheDocument();
    expect(screen.getByText("Signed on 03/11/2026")).toBeInTheDocument();
  });

  it("fills the star rows from the ratings and omits an absent feedback note", async () => {
    renderPage({ data: approved({ rateService: 3, rateTherapist: 5 }) });
    await loaded();
    const filled = Array.from(document.body.querySelectorAll("span")).filter(
      (s) => s.textContent === "★" && s.style.color === "rgb(251, 191, 36)"
    );
    // Three of five plus five of five.
    expect(filled).toHaveLength(8);
    expect(screen.queryByText("Feedback:")).not.toBeInTheDocument();
  });

  it("shows the client's feedback when one was left", async () => {
    renderPage({ data: approved({ feedback: "Very patient with him." }) });
    await loaded();
    expect(screen.getByText("Very patient with him.")).toBeInTheDocument();
  });
});

describe("documents and program data", () => {
  it("opens the session notes in a modal", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: /View$/ }));
    expect(screen.getByText("Session Notes - Documentation")).toBeInTheDocument();
    expect(screen.getByText("Client engaged well throughout.")).toBeInTheDocument();
  });

  it("says so when the timesheet carries no notes", async () => {
    renderPage({ data: baseTimesheet({ note: "" }) });
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: /View$/ }));
    expect(screen.getByText("No notes available")).toBeInTheDocument();
  });

  it("hides the program data row when the session collected none", async () => {
    renderPage();
    await loaded();
    expect(screen.queryByRole("button", { name: /View All/ })).not.toBeInTheDocument();
  });

  it("counts the collected targets on the program data row", async () => {
    renderPage({
      data: baseTimesheet({
        sessionDatas: [
          { id: "s1", data: { numberOfOccurrence: 4 } },
          { id: "s2", data: { numberOfOccurrence: 7 } },
        ],
      }),
    });
    await loaded();
    expect(screen.getByText("Programs Data (2 targets)")).toBeInTheDocument();
  });
});

describe("the program data modal", () => {
  const openWith = async (sessionDatas) => {
    renderPage({ data: baseTimesheet({ sessionDatas }) });
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: /View All/ }));
  };

  it("renders a task analysis as a step table", async () => {
    await openWith([
      {
        id: "s1",
        data: {
          steps: [{ id: 1, description: "Wash hands", performance: "independent", promptLevel: "none" }],
        },
      },
    ]);
    expect(screen.getByText("Type: Task Analysis")).toBeInTheDocument();
    expect(screen.getByText("Wash hands")).toBeInTheDocument();
    expect(screen.getByText("independent")).toBeInTheDocument();
  });

  it("renders latency trials and shows NR for a trial that never started", async () => {
    await openWith([
      {
        id: "s1",
        data: {
          trials: [
            { trial: 1, latency: 4, stimulusPresented: "Bell", behaviourStart: "09:01" },
            { trial: 2, latency: null },
          ],
        },
      },
    ]);
    expect(screen.getByText("Type: Latency")).toBeInTheDocument();
    expect(screen.getByText("4s")).toBeInTheDocument();
    expect(screen.getByText("NR")).toBeInTheDocument();
  });

  it("renders a frequency count", async () => {
    await openWith([{ id: "s1", data: { numberOfOccurrence: 6, notes: "spiked after lunch" } }]);
    expect(screen.getByText("Type: Frequency")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    // The note is echoed by the general-notes block above the table too.
    expect(screen.getAllByText("spiked after lunch").length).toBeGreaterThan(0);
  });

  it("renders a duration as HH:MM:SS", async () => {
    await openWith([{ id: "s1", data: { duration: 3725 } }]);
    expect(screen.getByText("Type: Duration")).toBeInTheDocument();
    expect(screen.getByText("01:02:05")).toBeInTheDocument();
  });

  it("derives a per-minute rate when both a count and a duration are recorded", async () => {
    await openWith([{ id: "s1", data: { numberOfOccurrence: 6, duration: 120 } }]);
    expect(screen.getByText("Type: Rate")).toBeInTheDocument();
    expect(screen.getByText("3.00/min")).toBeInTheDocument();
  });

  it("cannot compute a rate over a zero duration", async () => {
    await openWith([{ id: "s1", data: { numberOfOccurrence: 6, duration: 0 } }]);
    expect(screen.getByText("Type: Rate")).toBeInTheDocument();
    expect(screen.getByText("00:00:00")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("renders percentage-correct trials with the overall score", async () => {
    await openWith([
      {
        id: "s1",
        data: {
          percentageCorrect: 75,
          trials: [
            { id: 1, performance: "correct" },
            { id: 2, performance: "incorrect", promptLevel: "gestural" },
          ],
        },
      },
    ]);
    expect(screen.getByText("Type: Percentage Correct")).toBeInTheDocument();
    expect(screen.getByText("Overall: 75% Correct")).toBeInTheDocument();
    expect(screen.getByText("gestural")).toBeInTheDocument();
  });

  it("renders trials/opportunities when a trial carries a performance but no score", async () => {
    await openWith([
      { id: "s1", data: { trials: [{ trial: 1, performance: "prompted", promptLevel: "full" }] } },
    ]);
    expect(screen.getByText("Type: Trials/Opportunities")).toBeInTheDocument();
    expect(screen.getByText("prompted")).toBeInTheDocument();
  });

  it("dumps the raw payload for a shape it does not recognise", async () => {
    await openWith([{ id: "s1", data: { somethingElse: true } }]);
    expect(screen.getByText("Type: Unknown")).toBeInTheDocument();
    expect(screen.getByText("Data type: Unknown")).toBeInTheDocument();
  });

  it("treats a target with no data block at all as unknown", async () => {
    await openWith([{ id: "s1" }]);
    expect(screen.getByText("Type: Unknown")).toBeInTheDocument();
  });

  it("numbers each target and closes on the footer button", async () => {
    await openWith([
      { id: "s1", data: { numberOfOccurrence: 1 } },
      { id: "s2", data: { duration: 60 } },
    ]);
    expect(screen.getByText("Target 1")).toBeInTheDocument();
    expect(screen.getByText("Target 2")).toBeInTheDocument();
    const modal = screen.getByText("All Program Data").closest(".modal-content");
    fireEvent.click(within(modal).getByRole("button", { name: "Close" }));
    expect(screen.queryByText("Target 1")).not.toBeInTheDocument();
  });
});

describe("the billing accordion", () => {
  const withAuthorizations = () =>
    baseTimesheet({
      authorizationsUsed: [
        {
          id: "auth-1",
          title: "ABA Authorization",
          authorizationNumber: "A-100",
          startDate: "2026-01-05T00:00:00",
          clientAuthorizationServices: [
            { id: "svc-1", serviceCode: { code: "97153" }, units: 800, usedUnit: 2, per: "15min" },
            { id: "svc-2", units: 200, usedUnit: 0 },
          ],
        },
        {
          id: "auth-2",
          authorizationNumber: "A-200",
          clientAuthorizationServices: [],
        },
      ],
    });

  it("is left out entirely when no authorization was used", async () => {
    renderPage();
    await loaded();
    expect(screen.queryByTestId("billing-accordion")).not.toBeInTheDocument();
  });

  it("summarises used and authorized units and the unrounded utilization", async () => {
    renderPage({ data: withAuthorizations() });
    await loaded();
    expect(screen.getByTestId("billing-accordion")).toBeInTheDocument();
    const [first] = accordionProps.last.data;
    expect(first).toMatchObject({
      id: "auth-1",
      authorization: "ABA Authorization",
      authorizationNumber: "A-100",
      unitsSummary: "2 / 1000",
      dateCreated: "01/05/2026",
    });
    // 2 of 1000 rounds to 0% in the table, so the raw fraction is what is passed.
    expect(first.utilization).toBeCloseTo(0.2);
  });

  it("falls back to the authorization number as a title and reports zero utilization with no units", async () => {
    renderPage({ data: withAuthorizations() });
    await loaded();
    const second = accordionProps.last.data[1];
    expect(second.authorization).toBe("A-200");
    expect(second.unitsSummary).toBe("0 / 0");
    expect(second.utilization).toBe(0);
  });

  it("keys the service rows by authorization row so a second authorization is not blank", async () => {
    renderPage({ data: withAuthorizations() });
    await loaded();
    const services = accordionProps.last.initialServiceData;
    expect(Object.keys(services)).toEqual(["0", "1"]);
    expect(services[0]).toHaveLength(2);
    expect(services[0][0]).toMatchObject({ serviceCode: "97153", units: 800, usedUnit: 2 });
    // A service with no code or modifiers still renders placeholders.
    expect(services[0][1]).toMatchObject({ serviceCode: "N/A", modifiers: "N/A", per: "N/A" });
    expect(services[1]).toEqual([]);
  });

  it("stays read-only", async () => {
    renderPage({ data: withAuthorizations() });
    await loaded();
    expect(accordionProps.last.isEditMode).toBe(false);
  });
});

describe("the history and approvals tab", () => {
  const history = (entries) => baseTimesheet({ timesheetHistories: entries });
  const openHistory = () => fireEvent.click(screen.getByText("History & Approvals"));

  it("is hidden from a role without the history permission", async () => {
    renderPage({ permissions: ["export_timesheet_as_pdf"] });
    await loaded();
    expect(screen.queryByText("History & Approvals")).not.toBeInTheDocument();
  });

  it("badges the tab with the number of entries", async () => {
    renderPage({ data: history([{ id: "h1", action: "CREATED" }, { id: "h2", action: "APPROVED" }]) });
    await loaded();
    expect(screen.getByText("History & Approvals").parentElement).toHaveTextContent("2");
  });

  it("says there is nothing to show for an empty history", async () => {
    renderPage();
    await loaded();
    openHistory();
    expect(
      screen.getByText("No history data available for this timesheet.")
    ).toBeInTheDocument();
  });

  it("phrases a creation entry around the client and the author", async () => {
    renderPage({
      data: history([
        { id: "h1", action: "CREATED", createdAt: "2026-03-10T12:00:00", staff: { fullName: "Grace Hopper" } },
      ]),
    });
    await loaded();
    openHistory();
    const line = document.body.querySelector(".approval-entry");
    expect(line).toHaveTextContent("Timesheet for Ada Lovelace created on");
    expect(line).toHaveTextContent("Grace Hopper");
  });

  it("phrases a client approval differently from a supervisor approval", async () => {
    renderPage({
      data: history([
        { id: "h1", action: "CLIENT APPROVED", createdAt: "2026-03-10T12:00:00" },
        { id: "h2", action: "APPROVED", createdAt: "2026-03-10T13:00:00", by: "Sam" },
      ]),
    });
    await loaded();
    openHistory();
    expect(screen.getByText("Client approved")).toBeInTheDocument();
    expect(screen.getByText("approved")).toHaveClass("is-approved");
  });

  it("marks a rejection", async () => {
    renderPage({
      data: history([{ id: "h1", action: "REJECTED", createdAt: "2026-03-10T12:00:00", by: "Sam" }]),
    });
    await loaded();
    openHistory();
    expect(screen.getByText("rejected")).toHaveClass("is-rejected");
  });

  it("falls back to a generic sentence for an action it has no wording for", async () => {
    renderPage({
      data: history([{ id: "h1", action: "UNLOCKED", createdAt: "2026-03-10T12:00:00" }]),
    });
    await loaded();
    openHistory();
    const line = document.body.querySelector(".approval-entry");
    expect(line).toHaveTextContent("Timesheet unlocked by Unknown on");
  });

  it("treats an entry with no action as an update by an unknown author", async () => {
    renderPage({ data: history([{ id: "h1", createdAt: "2026-03-10T12:00:00" }]) });
    await loaded();
    openHistory();
    expect(document.body.querySelector(".approval-entry")).toHaveTextContent(
      "Timesheet updated by Unknown on"
    );
  });

  it("pages a history longer than one screen", async () => {
    renderPage({
      data: history(
        Array.from({ length: 7 }, (_, i) => ({
          id: `h${i}`,
          action: "APPROVED",
          createdAt: "2026-03-10T12:00:00",
          by: `Approver ${i}`,
        }))
      ),
    });
    await loaded();
    openHistory();
    expect(document.body.querySelectorAll(".approval-line")).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(document.body.querySelectorAll(".approval-line")).toHaveLength(2);
  });
});

describe("exporting the timesheet as a PDF", () => {
  const exportIt = async (data) => {
    renderPage(data ? { data } : {});
    await loaded();
    openActions();
    fireEvent.click(screen.getByText("Export as PDF"));
  };

  it("builds an A4 portrait document and saves it under the timesheet id", async () => {
    await exportIt();
    await waitFor(() => expect(pdf.save).toHaveBeenCalled());
    expect(pdf.construct).toHaveBeenCalledWith("p", "mm", "a4");
    expect(pdf.save).toHaveBeenCalledWith("Timesheet_ts-1_03-10-2026_Complete.pdf");
    expect(toastMock.showToast).toHaveBeenCalledWith(
      "Complete PDF exported successfully!",
      "success"
    );
  });

  it("draws the signature into the document when the client signed", async () => {
    await exportIt(
      baseTimesheet({
        clientApprovalStatus: "APPROVED",
        sessionApprovals: [{ createdAt: "2026-03-11T10:00:00", signature: "CCCC" }],
      })
    );
    await waitFor(() => expect(pdf.save).toHaveBeenCalled());
    expect(pdf.addImage).toHaveBeenCalledWith(
      "data:image/png;base64,CCCC",
      "PNG",
      expect.any(Number),
      expect.any(Number),
      60,
      25
    );
  });

  it("lays out a table for every program target and for the authorizations", async () => {
    await exportIt(
      baseTimesheet({
        sessionDatas: [
          { id: "s1", data: { steps: [{ id: 1, description: "Step" }] } },
          { id: "s2", data: { trials: [{ trial: 1, latency: 3 }] } },
          { id: "s3", data: { trials: [{ trial: 1, performance: "correct" }] } },
          { id: "s4", data: { numberOfOccurrence: 2 } },
        ],
        authorizationsUsed: [
          {
            id: "auth-1",
            authorizationNumber: "A-100",
            clientAuthorizationServices: [{ id: "svc-1", units: 10, usedUnit: 1 }],
          },
        ],
      })
    );
    await waitFor(() => expect(pdf.save).toHaveBeenCalled());
    // Three program tables (frequency renders as text) plus the services table.
    expect(pdf.autoTable.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it("warns instead of throwing when the document cannot be built", async () => {
    pdf.shouldThrow = true;
    await exportIt();
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        "Failed to export PDF. Please try again.",
        "error"
      )
    );
    expect(pdf.save).not.toHaveBeenCalled();
  });

  it("re-enables the Actions button once the export settles", async () => {
    await exportIt();
    await waitFor(() => expect(pdf.save).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Actions/ })).not.toBeDisabled()
    );
  });
});
