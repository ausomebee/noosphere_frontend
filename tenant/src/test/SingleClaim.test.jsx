import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The claim detail page. A claim is really an approved timesheet, so the page
 * reuses `GetSingleTimeSheetByTimesheetId` and then reads every field twice:
 * once off the record itself and once off its appointment, because the endpoint
 * fills one or the other depending on how the claim was created. Nearly every
 * branch here is one of those "record, else appointment, else N/A" chains.
 *
 * Nothing renders until the fetch resolves, and a rejected fetch leaves the
 * loader up forever — `claimData` stays null, which the render guard treats the
 * same as still loading.
 *
 * jsPDF is imported dynamically inside the export handler, so it is stubbed
 * down to the methods the exporter touches; an unmocked one would write a real
 * PDF into the repo. The stub records `save` and the autoTable calls, which is
 * all the export path can meaningfully be asserted on.
 */

const apiMock = vi.hoisted(() => ({ GetSingleTimeSheetByTimesheetId: vi.fn() }));
vi.mock("../api/billingAndPaymentsApi", () => ({ default: apiMock }));

const toastMock = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toastMock.showToast(...a),
  showApiError: vi.fn(),
}));

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
  useParams: () => ({ claimId: "claim-1" }),
}));

// The accordion runs its own auth-backed service-code fetch; only the rows the
// page derives for it matter here.
const accordion = vi.hoisted(() => ({ last: null }));
vi.mock("../Components/Table/AccordionTable", () => ({
  default: (props) => {
    accordion.last = props;
    return <div data-testid="claim-accordion">{props.tableName}</div>;
  },
}));

const pdf = vi.hoisted(() => ({
  save: vi.fn(),
  autoTable: vi.fn(),
  construct: vi.fn(),
  text: vi.fn(),
  setPage: vi.fn(),
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
      this.text = pdf.text;
      this.setPage = pdf.setPage;
      this.save = pdf.save;
    }
  },
}));
vi.mock("jspdf-autotable", () => ({ default: (...a) => pdf.autoTable(...a) }));

import SingleClaim from "../Pages/BillingAndPayment/Claims/SingleClaim";

// Local-time strings on purpose: a trailing Z would make the rendered date
// depend on the machine's timezone.
const baseClaim = (over = {}) => ({
  id: "claim-1",
  createdAt: "2026-04-02T09:00:00",
  client: { firstName: "Ada", lastName: "Lovelace", insuranceId: "INS-1" },
  clinicians: [{ id: "cl-1", fullName: "Grace Hopper", npi: "111" }],
  appointment: {
    id: "appt-1",
    serviceLocation: "Home",
    session: { name: "Direct Therapy" },
  },
  practiceNPI: "9999999999",
  practiceLocation: "Main Clinic",
  approver: { fullName: "Supervisor Sam" },
  supervisorApprovalStatus: "APPROVED",
  clientApprovalStatus: "APPROVED",
  authorizationsUsed: [],
  ...over,
});

const makeStore = () =>
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
          role: { roleModuleAccesses: [] },
        },
      },
      // Preloaded as loaded so useFormatSettings never reaches the settings API.
      generalSettings: {
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12-hour",
        currency: "USD",
        loaded: true,
      },
    },
  });

const renderPage = ({ data, wrapped = true } = {}) => {
  if (data !== undefined) {
    apiMock.GetSingleTimeSheetByTimesheetId.mockResolvedValue(wrapped ? { data } : data);
  }
  return render(
    <Provider store={makeStore()}>
      <SingleClaim />
    </Provider>
  );
};

const loaded = () => screen.findByText("General Information");

// Label and value sit in sibling spans, so read the value off the sibling.
const fieldValue = (label) =>
  screen.getByText(label).nextElementSibling?.textContent?.trim() ?? "";

const openActions = () =>
  fireEvent.click(screen.getByRole("button", { name: /Actions/ }));

// Every string the exporter wrote, in order.
const pdfTexts = () => pdf.text.mock.calls.map((c) => String(c[0]));

beforeEach(() => {
  vi.clearAllMocks();
  pdf.shouldThrow = false;
  apiMock.GetSingleTimeSheetByTimesheetId.mockResolvedValue({ data: baseClaim() });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading the claim", () => {
  it("shows only a loader until the claim arrives", async () => {
    renderPage();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    await loaded();
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });

  it("passes the route id and the caller's tokens to the endpoint", async () => {
    renderPage();
    await loaded();
    expect(apiMock.GetSingleTimeSheetByTimesheetId).toHaveBeenCalledWith({
      timeSheetId: "claim-1",
      accessToken: "at",
      refreshToken: "rt",
    });
  });

  it("accepts a bare claim as well as one wrapped in a data envelope", async () => {
    renderPage({ data: baseClaim({ practiceNPI: "1212121212" }), wrapped: false });
    await loaded();
    expect(fieldValue("Practice NPI")).toBe("1212121212");
  });

  it("stays on the loader when the fetch fails", async () => {
    apiMock.GetSingleTimeSheetByTimesheetId.mockRejectedValue(new Error("boom"));
    renderPage();
    await waitFor(() =>
      expect(apiMock.GetSingleTimeSheetByTimesheetId).toHaveBeenCalled()
    );
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("General Information")).not.toBeInTheDocument();
  });

  it("sends the user back when Back is pressed", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getAllByRole("button", { name: /Back/ })[0]);
    expect(navigate).toHaveBeenCalledWith(-1);
  });
});

describe("the general information card", () => {
  it("reads the client and clinicians straight off the claim", async () => {
    renderPage();
    await loaded();
    expect(fieldValue("Client Name")).toBe("Ada Lovelace");
    expect(fieldValue("Clinician(s) Name")).toBe("Grace Hopper");
    expect(fieldValue("Clinician NPI(s)")).toBe("111");
    expect(fieldValue("Date")).toBe("04/02/2026");
    expect(fieldValue("Practice Location")).toBe("Main Clinic");
  });

  it("falls back to the appointment's client when the claim carries none", async () => {
    renderPage({
      data: baseClaim({
        client: null,
        appointment: {
          id: "appt-1",
          serviceLocation: "Clinic",
          client: { firstName: "Alan", lastName: "Turing" },
        },
      }),
    });
    await loaded();
    expect(fieldValue("Client Name")).toBe("Alan Turing");
    expect(fieldValue("Service Location")).toBe("Clinic");
  });

  it("shows a dash for a client record with no name at all", async () => {
    renderPage({ data: baseClaim({ client: {} }) });
    await loaded();
    expect(fieldValue("Client Name")).toBe("--");
  });

  it("says N/A when neither the claim nor its appointment names a client", async () => {
    renderPage({ data: baseClaim({ client: null, appointment: null }) });
    await loaded();
    expect(fieldValue("Client Name")).toBe("N/A");
    expect(fieldValue("Service Location")).toBe("N/A");
  });

  it("falls back to the appointment's clinicians and fills the gaps in each", async () => {
    renderPage({
      data: baseClaim({
        clinicians: null,
        appointment: {
          id: "appt-1",
          clinicians: [{ id: "cl-1", npi: "222" }, { id: "cl-2", fullName: "Barbara Liskov" }],
        },
      }),
    });
    await loaded();
    expect(fieldValue("Clinician(s) Name")).toBe("Unknown, Barbara Liskov");
    expect(fieldValue("Clinician NPI(s)")).toBe("222, N/A");
  });

  it("says N/A when there are no clinicians on either record", async () => {
    renderPage({ data: baseClaim({ clinicians: [], appointment: null }) });
    await loaded();
    expect(fieldValue("Clinician(s) Name")).toBe("N/A");
    expect(fieldValue("Clinician NPI(s)")).toBe("N/A");
  });

  it("falls back to the appointment's service location for the practice location", async () => {
    renderPage({ data: baseClaim({ practiceLocation: null }) });
    await loaded();
    expect(fieldValue("Practice Location")).toBe("Home");
  });

  it("shows a dash for an appointment client with no name either", async () => {
    renderPage({
      data: baseClaim({ client: null, appointment: { id: "appt-1", client: {} } }),
    });
    await loaded();
    expect(fieldValue("Client Name")).toBe("--");
  });

  it("fills every field of a claim that carries nothing but a date", async () => {
    renderPage({
      data: {
        id: null,
        createdAt: "2026-04-02T09:00:00",
        // A null clinician list rather than an empty one: an empty array is
        // truthy, so only null reaches the last fallback in the chain.
        clinicians: null,
        client: null,
        appointment: null,
      },
    });
    await loaded();
    expect(fieldValue("Clinician(s) Name")).toBe("N/A");
    expect(fieldValue("Clinician NPI(s)")).toBe("N/A");
    expect(fieldValue("Practice Location")).toBe("N/A");
    expect(fieldValue("Practice NPI")).toBe("N/A");
    expect(fieldValue("Service Location")).toBe("N/A");
  });

  it("says N/A for a practice NPI the claim never recorded", async () => {
    renderPage({ data: baseClaim({ practiceNPI: null }) });
    await loaded();
    expect(fieldValue("Practice NPI")).toBe("N/A");
  });
});

describe("the service information accordion", () => {
  const withAuthorizations = () =>
    baseClaim({
      authorizationsUsed: [
        {
          id: "auth-1",
          title: "ABA Authorization",
          authorizationNumber: "A-100",
          startDate: "2026-01-05T00:00:00",
          clientAuthorizationServices: [
            { serviceCode: { code: "97153" }, serviceCodeId: "sc-1", modifiers: "HO", units: 800, usedUnit: 2, per: "15min" },
            { units: 200, usedUnit: 0 },
            // Nothing at all: both unit totals have to fall back to zero.
            {},
          ],
        },
        // No title, no number and no services: every fallback at once.
        { clientAuthorizationServices: null },
      ],
    });

  it("hands the accordion an empty set when no authorization was used", async () => {
    renderPage();
    await loaded();
    expect(accordion.last.data).toEqual([]);
    expect(accordion.last.initialServiceData).toEqual({});
    expect(accordion.last.isEditMode).toBe(false);
  });

  it("copes with a claim that has no authorizations field at all", async () => {
    renderPage({ data: baseClaim({ authorizationsUsed: undefined }) });
    await loaded();
    expect(accordion.last.data).toEqual([]);
  });

  it("summarises used and authorized units per authorization", async () => {
    renderPage({ data: withAuthorizations() });
    await loaded();
    expect(accordion.last.data[0]).toEqual({
      id: "auth-1",
      authorization: "ABA Authorization",
      authorizationNumber: "A-100",
      utilization: 0.2,
      unitsSummary: "2 / 1000",
      date: "01/05/2026",
    });
  });

  it("falls back to the row index and N/A for an authorization with nothing on it", async () => {
    renderPage({ data: withAuthorizations() });
    await loaded();
    expect(accordion.last.data[1]).toMatchObject({
      id: 1,
      authorization: "N/A",
      authorizationNumber: "N/A",
      utilization: 0,
      unitsSummary: "0 / 0",
      date: "N/A",
    });
  });

  it("keys the service rows by authorization index and skips one with no services", async () => {
    renderPage({ data: withAuthorizations() });
    await loaded();
    const services = accordion.last.initialServiceData;
    // The second authorization has a null services list, so it gets no key.
    expect(Object.keys(services)).toEqual(["0"]);
    expect(services[0][0]).toEqual({
      serviceCode: "97153",
      serviceCodeId: "sc-1",
      modifiers: "HO",
      units: 800,
      usedUnit: 2,
      per: "15min",
    });
    expect(services[0][1]).toEqual({
      serviceCode: "N/A",
      serviceCodeId: "",
      modifiers: "N/A",
      units: 200,
      usedUnit: 0,
      per: "N/A",
    });
    expect(services[0][2]).toMatchObject({ units: 0, usedUnit: 0 });
  });

  it("counts a service with no units at all as zero on both sides", async () => {
    renderPage({ data: withAuthorizations() });
    await loaded();
    // 800 + 200 + nothing, against 2 + 0 + nothing.
    expect(accordion.last.data[0].unitsSummary).toBe("2 / 1000");
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
});

describe("exporting the claim as a PDF", () => {
  const exportIt = async (data) => {
    renderPage(data ? { data } : {});
    await loaded();
    openActions();
    fireEvent.click(screen.getByText("Export as PDF"));
  };

  it("builds an A4 portrait document and names the file after the claim", async () => {
    await exportIt();
    await waitFor(() => expect(pdf.save).toHaveBeenCalled());
    expect(pdf.construct).toHaveBeenCalledWith("p", "mm", "a4");
    expect(pdf.save).toHaveBeenCalledWith("Claim_claim-1_04-02-2026.pdf");
    expect(toastMock.showToast).toHaveBeenCalledWith("PDF exported successfully!", "success");
  });

  it("calls the claim unknown in the filename when it carries no id", async () => {
    await exportIt(baseClaim({ id: null, createdAt: null }));
    await waitFor(() => expect(pdf.save).toHaveBeenCalled());
    expect(pdf.save).toHaveBeenCalledWith("Claim_unknown_N-A.pdf");
  });

  it("skips the service section entirely when no authorization was used", async () => {
    await exportIt();
    await waitFor(() => expect(pdf.save).toHaveBeenCalled());
    expect(pdf.autoTable).not.toHaveBeenCalled();
  });

  it("lays out a summary table plus one table per authorization that has services", async () => {
    await exportIt(
      baseClaim({
        authorizationsUsed: [
          {
            id: "auth-1",
            title: "ABA Authorization",
            startDate: "2026-01-05T00:00:00",
            clientAuthorizationServices: [{ serviceCode: { code: "97153" }, units: 8, per: "15min" }],
          },
          // No services: contributes a summary row but no detail table.
          { id: "auth-2", clientAuthorizationServices: [] },
        ],
      })
    );
    await waitFor(() => expect(pdf.save).toHaveBeenCalled());
    expect(pdf.autoTable).toHaveBeenCalledTimes(2);
  });

  it("stamps a page footer on every page", async () => {
    await exportIt();
    await waitFor(() => expect(pdf.save).toHaveBeenCalled());
    expect(pdf.setPage).toHaveBeenCalledTimes(2);
    expect(pdf.text).toHaveBeenCalledWith("Page 1 of 2", 105, 287, { align: "center" });
  });

  it("writes N/A into the metadata rows the claim left empty", async () => {
    await exportIt(baseClaim({ practiceNPI: null, timesheetId: null, client: {} }));
    await waitFor(() => expect(pdf.save).toHaveBeenCalled());
    expect(pdf.text).toHaveBeenCalledWith("N/A", 65, expect.any(Number));
  });

  it("takes the client off the appointment when the claim has none", async () => {
    await exportIt(
      baseClaim({ client: null, appointment: { id: "appt-1", client: { firstName: "Alan" } } })
    );
    await waitFor(() => expect(pdf.save).toHaveBeenCalled());
    expect(pdfTexts()).toContain("Alan");
  });

  it("writes the surname alone when that is all the appointment stored", async () => {
    await exportIt(
      baseClaim({ client: null, appointment: { id: "appt-1", client: { lastName: "Turing" } } })
    );
    await waitFor(() => expect(pdf.save).toHaveBeenCalled());
    expect(pdfTexts()).toContain("Turing");
  });

  it("writes N/A when neither record names a client or a location", async () => {
    await exportIt(baseClaim({ client: null, appointment: null }));
    await waitFor(() => expect(pdf.save).toHaveBeenCalled());
    // Client, insurance id, timesheet id, service location and practice NPI
    // all collapse to the same placeholder.
    expect(pdfTexts().filter((t) => t === "N/A").length).toBeGreaterThanOrEqual(4);
  });

  it("fills the service table with placeholders for a bare authorization", async () => {
    await exportIt(
      baseClaim({
        authorizationsUsed: [
          // No title and a service with nothing but a modifier string.
          { id: "auth-1", clientAuthorizationServices: [{ modifiers: "HO" }] },
        ],
      })
    );
    await waitFor(() => expect(pdf.save).toHaveBeenCalled());
    expect(pdfTexts()).toContain("Authorization 1: N/A");
    const [, options] = pdf.autoTable.mock.calls.at(-1);
    expect(options.body[0]).toEqual([1, "N/A", "HO", "0", "N/A"]);
  });

  it("warns instead of throwing when the document cannot be built", async () => {
    pdf.shouldThrow = true;
    await exportIt();
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Failed to export PDF.", "error")
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
