import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * Edge arms of the timesheet detail page that `SingleTimeSheet.test.jsx` leaves
 * alone — chiefly the PDF exporter, which is by far the largest thing on the
 * page and the part with the most conditionals per line of output.
 *
 * The exporter walks the record top to bottom writing text at a running `yPos`
 * and calls `checkPageBreak` before each block, so the only way to reach the
 * add-a-page arm is to make the document genuinely overflow: the jsPDF stub
 * here lets a test dial up how many lines `splitTextToSize` returns, which
 * pushes `yPos` past the page height and forces a break (and a second
 * watermark). The stub also lets `addImage` throw on demand, which is the only
 * route to the "signature could not be rendered" fallback.
 *
 * Everything is asserted through what the exporter wrote — the recorded `text`
 * and `autoTable` calls — because the document itself is never produced.
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

const accordion = vi.hoisted(() => ({ last: null }));
vi.mock("../Components/Table/AccordionTable", () => ({
  default: (props) => {
    accordion.last = props;
    return <div data-testid="billing-accordion">{props.tableName}</div>;
  },
}));

vi.mock("../Components/ReusableModal/BillingAndPaymentModal/ApproveTimeSheetModal", () => ({
  default: ({ isOpen, onSave, onClose }) =>
    isOpen ? (
      <div data-testid="approve-modal">
        <button onClick={() => onSave()}>confirm-approve</button>
        <button onClick={onClose}>cancel-approve</button>
      </div>
    ) : null,
}));

vi.mock("../Components/ReusableModal/BillingAndPaymentModal/RejectTimesheetModal", () => ({
  default: ({ isOpen }) => (isOpen ? <div data-testid="reject-modal" /> : null),
}));

const pdf = vi.hoisted(() => ({
  save: vi.fn(),
  addImage: vi.fn(),
  autoTable: vi.fn(),
  addPage: vi.fn(),
  text: vi.fn(),
  // `lines` decides how many lines splitTextToSize hands back, which is what
  // drives the running yPos past the page height.
  lines: 1,
  signatureThrows: false,
}));
vi.mock("jspdf", () => ({
  jsPDF: class {
    constructor() {
      this.internal = {
        pageSize: { getWidth: () => 210, getHeight: () => 297 },
        getNumberOfPages: () => 1,
      };
      this.lastAutoTable = { finalY: 40 };
      this.setFont = vi.fn();
      this.setFontSize = vi.fn();
      this.setTextColor = vi.fn();
      this.setPage = vi.fn();
      this.text = pdf.text;
      this.addPage = pdf.addPage;
      this.save = pdf.save;
      this.addImage = (...a) => {
        if (pdf.signatureThrows) throw new Error("bad image data");
        return pdf.addImage(...a);
      };
      this.splitTextToSize = (t) =>
        Array.from({ length: pdf.lines }, (_, i) => `${t}#${i}`);
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

const makeStore = (user) =>
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
          role: { roleModuleAccesses: [] },
          ...user,
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

const renderPage = ({ data, user } = {}) => {
  if (data !== undefined) {
    apiMock.GetSingleTimeSheetByTimesheetId.mockResolvedValue({ data });
  }
  return render(
    <Provider store={makeStore(user)}>
      <SingleTimeSheet />
    </Provider>
  );
};

const loaded = () => screen.findByText("Session Information");

const fieldValue = (label) =>
  screen.getByText(label).nextElementSibling?.textContent?.trim() ?? "";

const openActions = () =>
  fireEvent.click(screen.getByRole("button", { name: /Actions/ }));

// Every string the exporter wrote, in order.
const pdfTexts = () => pdf.text.mock.calls.map((c) => String(c[0]));

const exportIt = async (data, user) => {
  renderPage(data ? { data, user } : { user });
  await loaded();
  openActions();
  fireEvent.click(screen.getByText("Export as PDF"));
  await waitFor(() => expect(pdf.save).toHaveBeenCalled());
};

beforeEach(() => {
  vi.clearAllMocks();
  pdf.lines = 1;
  pdf.signatureThrows = false;
  accordion.last = null;
  apiMock.GetSingleTimeSheetByTimesheetId.mockResolvedValue({ data: baseTimesheet() });
  apiMock.ApproveTimeSheetBySupervisor.mockResolvedValue({});
  apiMock.NudgeClientForApproval.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("session details the base fixture never produces", () => {
  it("says N/A for a client record that carries no names", async () => {
    renderPage({
      data: baseTimesheet({
        appointment: { ...baseTimesheet().appointment, client: {} },
      }),
    });
    await loaded();
    // clientName collapses to an empty string, which the panel replaces.
    expect(fieldValue("Client Name")).toContain("N/A");
  });

  it("still lists a clinician the appointment stored without an id", async () => {
    renderPage({
      data: baseTimesheet({
        appointment: {
          ...baseTimesheet().appointment,
          clinicians: [{ fullName: "Barbara Liskov" }],
        },
      }),
    });
    await loaded();
    expect(screen.getByText("Clinician(s) Name").nextElementSibling).toHaveTextContent(
      "Barbara Liskov"
    );
  });

  it("copes with a timesheet that has no program data or authorizations fields", async () => {
    renderPage({
      data: baseTimesheet({ sessionDatas: undefined, authorizationsUsed: undefined }),
    });
    await loaded();
    expect(screen.queryByRole("button", { name: /View All/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId("billing-accordion")).not.toBeInTheDocument();
  });

  it("shows the travel rows with a blank end time when only a start was logged", async () => {
    renderPage({ data: baseTimesheet({ travelStartTime: "2026-03-10T08:30:00" }) });
    await loaded();
    expect(fieldValue("Travel Time Applied")).toBe("Yes");
    expect(fieldValue("Travel End Time")).toBe("");
    // No end time means no measurable travel, so the billable total is the
    // session on its own.
    expect(fieldValue("Travel Duration")).toBe("0.00 hours");
    expect(fieldValue("Total Billable Time")).toBe("2.50 hours");
  });
});

describe("tabs and modals", () => {
  it("returns to the details tab after visiting the history tab", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByText("History & Approvals"));
    expect(screen.queryByText("Session Information")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("TimeSheet Details"));
    expect(screen.getByText("Session Information")).toBeInTheDocument();
  });

  it("closes the approve modal on its own cancel without approving", async () => {
    renderPage();
    await loaded();
    openActions();
    fireEvent.click(screen.getByText("Approve and Convert to Claim"));
    fireEvent.click(screen.getByText("cancel-approve"));
    expect(screen.queryByTestId("approve-modal")).not.toBeInTheDocument();
    expect(apiMock.ApproveTimeSheetBySupervisor).not.toHaveBeenCalled();
  });
});

describe("billing rows assembled from a sparse authorization", () => {
  it("falls back to the row index and an empty service list", async () => {
    renderPage({
      data: baseTimesheet({
        // No id and no services at all: both optional chains short-circuit.
        authorizationsUsed: [{ authorizationNumber: "A-1" }],
      }),
    });
    await loaded();
    expect(accordion.last.data[0]).toMatchObject({
      id: 0,
      authorization: "A-1",
      unitsSummary: "0 / 0",
      utilization: 0,
    });
    expect(accordion.last.initialServiceData[0]).toEqual([]);
  });

  it("numbers a service that carries no id by its position", async () => {
    renderPage({
      data: baseTimesheet({
        authorizationsUsed: [
          {
            id: "auth-1",
            // The second service carries no units, so both totals fall back.
            clientAuthorizationServices: [{ units: 10, usedUnit: 5 }, { usedUnit: 0 }],
          },
        ],
      }),
    });
    await loaded();
    expect(accordion.last.initialServiceData[0][0]).toMatchObject({
      id: 0,
      serviceCode: "N/A",
      serviceCodeId: "",
    });
    expect(accordion.last.initialServiceData[0][1]).toMatchObject({ id: 1, units: 0 });
    expect(accordion.last.data[0].utilization).toBe(50);
  });
});

describe("history entries the list has to fill in", () => {
  it("dates an entry that carries `date` instead of `createdAt`", async () => {
    renderPage({
      data: baseTimesheet({
        timesheetHistories: [{ action: "APPROVED", date: "2026-03-12T14:00:00", by: "Sam" }],
      }),
    });
    await loaded();
    fireEvent.click(screen.getByText("History & Approvals"));
    expect(document.body.querySelector(".approval-entry")).toHaveTextContent("03/12/2026");
  });

  it("keys an entry that has no id at all", async () => {
    renderPage({
      data: baseTimesheet({ timesheetHistories: [{ action: "APPROVED", by: "Sam" }] }),
    });
    await loaded();
    fireEvent.click(screen.getByText("History & Approvals"));
    // No timestamp on the entry either, so the date falls through to N/A.
    expect(document.body.querySelector(".approval-entry")).toHaveTextContent("N/A");
  });
});

describe("history phrasing the entry cannot fill in", () => {
  it("says N/A for the client when the appointment stored no name", async () => {
    renderPage({
      data: baseTimesheet({
        appointment: { ...baseTimesheet().appointment, client: {} },
        timesheetHistories: [{ id: "h1", action: "CREATED", createdAt: "2026-03-10T12:00:00" }],
      }),
    });
    await loaded();
    fireEvent.click(screen.getByText("History & Approvals"));
    expect(document.body.querySelector(".approval-entry")).toHaveTextContent(
      "Timesheet for N/A created on"
    );
  });

  it("falls back to `updated` for an action that is only whitespace", async () => {
    renderPage({
      data: baseTimesheet({
        // Whitespace survives the caller's `|| "Updated"` but trims to nothing.
        timesheetHistories: [{ id: "h1", action: "   ", createdAt: "2026-03-10T12:00:00" }],
      }),
    });
    await loaded();
    fireEvent.click(screen.getByText("History & Approvals"));
    expect(document.body.querySelector(".approval-entry")).toHaveTextContent(
      "Timesheet updated by Unknown on"
    );
  });
});

describe("the program data modal on sparse targets", () => {
  const openWith = async (sessionDatas) => {
    renderPage({ data: baseTimesheet({ sessionDatas }) });
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: /View All/ }));
  };

  const modal = () => screen.getByText("All Program Data").closest(".modal-content");

  it("dashes out every column of a task-analysis step with nothing but an id", async () => {
    await openWith([{ id: "s1", data: { steps: [{ id: 7 }] } }]);
    expect(within(modal()).getAllByText("—").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("shows a zero frequency count and a dashed note", async () => {
    await openWith([{ id: "s1", data: { numberOfOccurrence: 0 } }]);
    expect(screen.getByText("Type: Frequency")).toBeInTheDocument();
    // Scoped to the modal: the history tab badge also reads "0".
    expect(within(modal()).getByText("0")).toBeInTheDocument();
    expect(within(modal()).getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });

  it("prints a duration's own note beside the clock value", async () => {
    await openWith([{ id: "s1", data: { duration: 90, notes: "settled quickly" } }]);
    expect(screen.getByText("00:01:30")).toBeInTheDocument();
    expect(screen.getAllByText("settled quickly").length).toBeGreaterThan(0);
  });

  it("prints a rate's own note beside the derived figure", async () => {
    await openWith([
      { id: "s1", data: { numberOfOccurrence: 4, duration: 60, notes: "after lunch" } },
    ]);
    expect(screen.getByText("4.00/min")).toBeInTheDocument();
    expect(screen.getAllByText("after lunch").length).toBeGreaterThan(0);
  });

  it("scores a percentage-correct target that never recorded a percentage", async () => {
    await openWith([
      {
        id: "s1",
        // The second trial recorded nothing, so its performance cell dashes out.
        data: { percentageCorrect: null, trials: [{ performance: "incorrect" }, {}] },
      },
    ]);
    expect(screen.getByText("Overall: 0% Correct")).toBeInTheDocument();
    // No trial ids either, so the rows are numbered by position.
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(within(modal()).getByText("2")).toBeInTheDocument();
    expect(within(modal()).getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });

  it("numbers a trials/opportunities row by position when the trial has none", async () => {
    await openWith([
      { id: "s1", data: { trials: [{ performance: "prompted" }, { trial: 2 }] } },
    ]);
    expect(screen.getByText("Type: Trials/Opportunities")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    // The second trial has no response of its own.
    expect(within(modal()).getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });

  it("derives a rate over a target that recorded no occurrences", async () => {
    await openWith([{ id: "s1", data: { numberOfOccurrence: 0, duration: 60 } }]);
    expect(screen.getByText("Type: Rate")).toBeInTheDocument();
    expect(screen.getByText("0.00/min")).toBeInTheDocument();
  });

  it("numbers a target that carries no id by its position", async () => {
    await openWith([{ data: { numberOfOccurrence: 2 } }]);
    expect(screen.getByText("Target 1")).toBeInTheDocument();
  });
});

describe("what the exporter writes for a thin timesheet", () => {
  it("says there are no notes when the timesheet carries none", async () => {
    await exportIt(baseTimesheet({ note: "" }));
    expect(pdfTexts()).toContain("No session notes available");
    expect(pdfTexts()).toContain("No program data available for this session");
  });

  it("calls the file unknown when the timesheet has no id", async () => {
    await exportIt(baseTimesheet({ id: null, startTime: null }));
    expect(pdf.save).toHaveBeenCalledWith("Timesheet_unknown_N-A_Complete.pdf");
  });

  it("writes the travel block with N/A for a missing end time", async () => {
    await exportIt(baseTimesheet({ travelStartTime: "2026-03-10T08:30:00" }));
    expect(pdfTexts()).toContain("Travel Start:");
    expect(pdfTexts()).toContain("0.00 hours");
  });

  it("writes PENDING for statuses the record never set", async () => {
    await exportIt(
      baseTimesheet({ clientApprovalStatus: null, supervisorApprovalStatus: null })
    );
    expect(pdfTexts()).toContain("Client Approval: PENDING");
    expect(pdfTexts()).toContain("Supervisor Approval: PENDING");
  });

  it("writes an empty client name and N/A clinicians for a nameless appointment", async () => {
    await exportIt(
      baseTimesheet({
        appointment: { clientId: "client-1", client: {}, clinicians: [] },
      })
    );
    // The name collapses to an empty string, which the row writer replaces.
    expect(pdfTexts().filter((t) => t === "N/A").length).toBeGreaterThanOrEqual(3);
  });

  it("writes N/A across the session block when there is no appointment", async () => {
    await exportIt(baseTimesheet({ appointment: null }));
    expect(pdfTexts()).toContain("Client ID:");
    expect(pdfTexts().filter((t) => t === "N/A").length).toBeGreaterThanOrEqual(6);
  });

  it("writes N/A for an end time the record never captured", async () => {
    await exportIt(baseTimesheet({ endTime: null }));
    expect(pdfTexts()).toContain("Session End:");
    expect(pdfTexts()).toContain("N/A");
  });

  it("measures the travel block when both travel times were logged", async () => {
    await exportIt(
      baseTimesheet({
        travelStartTime: "2026-03-10T08:30:00",
        travelEndTime: "2026-03-10T09:00:00",
      })
    );
    expect(pdfTexts()).toContain("Travel End:");
    expect(pdfTexts()).toContain("0.50 hours");
  });

  it("starts a fresh page, watermark and all, once the notes overflow", async () => {
    // Each of these lines advances yPos by the 7mm body line height, so a
    // hundred of them run well past the 297mm page.
    pdf.lines = 100;
    await exportIt();
    expect(pdf.addPage).toHaveBeenCalled();
    expect(pdfTexts().filter((t) => t === "CONFIDENTIAL").length).toBeGreaterThan(1);
  });
});

describe("what the exporter writes for the client authorization", () => {
  const approved = (approval) =>
    baseTimesheet({
      clientApprovalStatus: "APPROVED",
      sessionApprovals: [{ createdAt: "2026-03-11T10:00:00", ...approval }],
    });

  it("records the confirmation and both ratings", async () => {
    await exportIt(approved({ confirmDelivery: true, rateService: 3, rateTherapist: 5 }));
    expect(pdfTexts()).toContain("3/5");
    expect(pdfTexts()).toContain("5/5");
    expect(pdfTexts()).toContain("Delivery Confirmed:");
  });

  it("zeroes ratings the client never gave and marks delivery unconfirmed", async () => {
    await exportIt(approved({}));
    expect(pdfTexts().filter((t) => t === "0/5")).toHaveLength(2);
    // No signature block at all when nothing was captured.
    expect(pdfTexts()).not.toContain("Client Signature:");
  });

  it("notes a signature it could not draw instead of failing the export", async () => {
    pdf.signatureThrows = true;
    await exportIt(approved({ signature: "AAAA" }));
    expect(pdfTexts()).toContain("(Signature could not be rendered)");
    expect(toastMock.showToast).toHaveBeenCalledWith(
      "Complete PDF exported successfully!",
      "success"
    );
  });

  it("passes a signature that already carries a data URI through unchanged", async () => {
    await exportIt(approved({ signature: "data:image/png;base64,BBBB" }));
    expect(pdf.addImage).toHaveBeenCalledWith(
      "data:image/png;base64,BBBB",
      "PNG",
      expect.any(Number),
      expect.any(Number),
      60,
      25
    );
  });
});

describe("what the exporter writes for program targets", () => {
  it("prints a target's general notes above its table", async () => {
    await exportIt(
      baseTimesheet({
        sessionDatas: [
          { id: "s1", data: { steps: [{ id: 1 }], notes: "target-level note" } },
        ],
      })
    );
    expect(pdfTexts()).toContain("Notes");
    expect(pdfTexts()).toContain("target-level note#0");
  });

  it("lists the leftover scalar fields of a shape it does not recognise", async () => {
    await exportIt(
      baseTimesheet({
        sessionDatas: [{ id: "s1", data: { promptLevel: "full", intensity: 3 } }],
      })
    );
    expect(pdfTexts()).toContain("Details");
    // Camel case is spaced out into a readable label.
    expect(pdfTexts()).toContain("Prompt Level");
    expect(pdfTexts()).toContain("Intensity");
  });

  it("writes no detail block when every leftover field is empty or nested", async () => {
    await exportIt(
      baseTimesheet({
        sessionDatas: [
          { id: "s1", data: { blank: "", missing: null, nested: { a: 1 }, notes: "only a note" } },
        ],
      })
    );
    expect(pdfTexts()).not.toContain("Details");
    expect(pdfTexts()).toContain("only a note#0");
  });

  it("treats a target with no data block as unknown and writes nothing for it", async () => {
    await exportIt(baseTimesheet({ sessionDatas: [{ id: "s1" }] }));
    expect(pdfTexts()).toContain("Type: Unknown");
    expect(pdf.autoTable).not.toHaveBeenCalled();
  });

  it("recognises duration and rate targets and details their scalar fields", async () => {
    await exportIt(
      baseTimesheet({
        sessionDatas: [
          { id: "s1", data: { duration: 60 } },
          { id: "s2", data: { duration: 60, numberOfOccurrence: 3 } },
        ],
      })
    );
    expect(pdfTexts()).toContain("Type: Duration");
    expect(pdfTexts()).toContain("Type: Rate");
    // Neither type has a table of its own, so both fall to the details rows.
    expect(pdfTexts().filter((t) => t === "Details")).toHaveLength(2);
    expect(pdfTexts()).toContain("Number Of Occurrence");
  });

  it("blanks the cells of a task analysis step that carries no id", async () => {
    await exportIt(
      baseTimesheet({ sessionDatas: [{ id: "s1", data: { steps: [{ description: "Wash" }] } }] })
    );
    const [, options] = pdf.autoTable.mock.calls.at(-1);
    expect(options.body[0]).toEqual(["", "Wash", "", "", ""]);
  });

  it("writes NR for a latency trial that never started", async () => {
    await exportIt(
      baseTimesheet({ sessionDatas: [{ id: "s1", data: { trials: [{ latency: null }] } }] })
    );
    const [, options] = pdf.autoTable.mock.calls.at(-1);
    expect(options.body[0]).toEqual(["", "", "NR", "", ""]);
  });

  it("blanks the cells of a trials/opportunities row that recorded nothing", async () => {
    await exportIt(
      baseTimesheet({
        sessionDatas: [
          { id: "s1", data: { trials: [{ performance: "correct" }, { trial: 2 }] } },
        ],
      })
    );
    const [, options] = pdf.autoTable.mock.calls.at(-1);
    expect(options.body[0]).toEqual(["", "", "correct", ""]);
    expect(options.body[1]).toEqual([2, "", "", ""]);
  });

  it("writes the frequency figures as plain rows rather than a table", async () => {
    await exportIt(
      baseTimesheet({ sessionDatas: [{ id: "s1", data: { numberOfOccurrence: 0 } }] })
    );
    expect(pdfTexts()).toContain("Frequency Data:");
    expect(pdfTexts()).toContain("0");
    expect(pdfTexts()).toContain("N/A");
  });
});

describe("what the exporter writes for billing and history", () => {
  it("marks a dormant authorization inactive and skips its service table", async () => {
    await exportIt(
      baseTimesheet({
        authorizationsUsed: [
          {
            id: "auth-1",
            authorizationNumber: "A-100",
            startDate: "2026-01-05T00:00:00",
            endDate: "2026-12-31T00:00:00",
            isActive: false,
            clientAuthorizationServices: [],
          },
        ],
      })
    );
    expect(pdfTexts()).toContain("Inactive");
    expect(pdfTexts()).toContain("Authorization 1: N/A");
    expect(pdf.autoTable).not.toHaveBeenCalled();
  });

  it("reports the remaining units as zero when more were used than authorized", async () => {
    await exportIt(
      baseTimesheet({
        authorizationsUsed: [
          {
            id: "auth-1",
            title: "ABA Authorization",
            isActive: true,
            clientAuthorizationServices: [{ id: "svc-1", units: 5, usedUnit: 9, per: "15min" }],
          },
        ],
      })
    );
    expect(pdfTexts()).toContain("Active");
    expect(pdfTexts()).toContain("0");
    expect(pdf.autoTable).toHaveBeenCalledTimes(1);
  });

  it("counts an authorization with no services list, and a service with no units", async () => {
    await exportIt(
      baseTimesheet({
        authorizationsUsed: [
          // No services key at all: the reduce runs over a substituted list.
          { id: "auth-1", title: "Bare Authorization", isActive: true },
          { id: "auth-2", title: "Unit-less", isActive: true, clientAuthorizationServices: [{}] },
        ],
      })
    );
    expect(pdfTexts()).toContain("Authorization 1: Bare Authorization");
    const [, options] = pdf.autoTable.mock.calls.at(-1);
    expect(options.body[0]).toEqual([1, "N/A", "N/A", "0", "N/A", "N/A"]);
  });

  it("tabulates the history, preferring performedBy and appending the reason", async () => {
    await exportIt(
      baseTimesheet({
        timesheetHistories: [
          {
            id: "h1",
            action: "REJECTED",
            createdAt: "2026-03-11T09:00:00",
            performedBy: "Sam",
            by: "ignored",
            reason: "hours do not add up",
          },
          // Nothing but a date: author and action both fall back.
          { id: "h2", date: "2026-03-12T09:00:00" },
        ],
      })
    );
    const [, options] = pdf.autoTable.mock.calls.at(-1);
    expect(options.head).toEqual([["#", "Date/Time", "Performed By", "Action", "Notes"]]);
    expect(options.body[0]).toEqual([
      1,
      expect.stringContaining("03/11/2026"),
      "Sam",
      "REJECTED",
      "Reason: hours do not add up",
    ]);
    expect(options.body[1]).toEqual([
      2,
      expect.stringContaining("03/12/2026"),
      "Unknown",
      "Updated",
      "",
    ]);
  });
});

describe("who the exporter credits in the footer", () => {
  it("names the signed-in user", async () => {
    await exportIt();
    expect(
      pdfTexts().some((t) => t.startsWith("Generated by Supervisor Sam on"))
    ).toBe(true);
  });

  it("falls back to the email address when no full name is stored", async () => {
    await exportIt(undefined, { fullName: undefined });
    expect(
      pdfTexts().some((t) => t.startsWith("Generated by sam@example.com on"))
    ).toBe(true);
  });

  it("credits the system when the user record has neither", async () => {
    await exportIt(undefined, { fullName: undefined, email: undefined });
    expect(pdfTexts().some((t) => t.startsWith("Generated by System on"))).toBe(true);
  });
});
