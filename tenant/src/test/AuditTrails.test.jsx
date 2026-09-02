import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The audit trail view for one clinical report: a back button, a list of
 * events rendered as prose, and client-side paging once there are more than ten
 * of them.
 *
 * The report id, the client name and the document title all arrive in the
 * router's location state rather than from the endpoint, so the state is the
 * main dial these tests turn -- with no id at all the view never fetches and
 * shows an error instead.
 *
 * Almost every line of the file is the `switch` that turns an action word into
 * a sentence, plus the fallback chains that decide who performed the event and
 * when. Those chains run in the caller, before `renderAuditEntry` sees the
 * entry, which makes some of the defaults inside `renderAuditEntry` itself
 * unreachable: `action`, `by` and `date` are already defaulted by the time it
 * is called. Dates are asserted around rather than on, so the suite does not
 * depend on the machine's timezone.
 */

const apiMock = vi.hoisted(() => ({ GetClinicalReportAuditTrails: vi.fn() }));
vi.mock("../api/TemplateAndReportApi", () => ({ default: apiMock }));

const route = vi.hoisted(() => ({ state: null, navigate: vi.fn() }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => route.navigate,
  useLocation: () => ({ state: route.state }),
}));

import AuditTrails from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/AuditTrails";

const store = () =>
  configureStore({
    reducer: {
      authentication: authReducer,
      generalSettings: generalSettingsReducer,
    },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user: { id: "user-1", tenantId: "tenant-1", accessToken: "at", refreshToken: "rt" },
      },
      // Preloaded as loaded so useFormatSettings never reaches for the
      // settings endpoint.
      generalSettings: {
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12-hour",
        currency: "USD",
        loaded: true,
      },
    },
  });

const renderPage = () =>
  render(
    <Provider store={store()}>
      <AuditTrails />
    </Provider>
  );

const respondWith = (rows) =>
  apiMock.GetClinicalReportAuditTrails.mockResolvedValue({ data: rows });

const lines = () => Array.from(document.body.querySelectorAll(".approval-line"));

/** Renders a single event and returns the sentence it produced. */
const sentenceFor = async (entry) => {
  respondWith([{ id: "a-1", createdAt: "2024-01-15T10:30:00Z", ...entry }]);
  renderPage();
  await waitFor(() => expect(lines()).toHaveLength(1));
  return lines()[0];
};

beforeEach(() => {
  vi.clearAllMocks();
  route.state = {
    reportId: "r-1",
    clientName: "Ada Lovelace",
    documentTitle: "Initial assessment",
  };
  respondWith([]);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getting the trail on screen", () => {
  it("shows a loader until the events arrive", async () => {
    renderPage();
    expect(screen.getByRole("status")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });

  it("says so when the report has no history yet", async () => {
    renderPage();
    expect(
      await screen.findByText("No audit trail data available for this report.")
    ).toBeInTheDocument();
  });

  it("treats a payload with no list as an empty history", async () => {
    apiMock.GetClinicalReportAuditTrails.mockResolvedValue({});
    renderPage();
    expect(
      await screen.findByText("No audit trail data available for this report.")
    ).toBeInTheDocument();
  });

  it("goes back a page when Back is pressed", async () => {
    renderPage();
    fireEvent.click(screen.getAllByRole("button", { name: "Back" })[0]);
    expect(route.navigate).toHaveBeenCalledWith(-1);
    await screen.findByText("No audit trail data available for this report.");
  });
});

describe("the ways the trail can fail to load", () => {
  it("refuses to fetch without a report id in the location state", async () => {
    route.state = null;
    renderPage();
    expect(await screen.findByText("Oops!")).toBeInTheDocument();
    expect(apiMock.GetClinicalReportAuditTrails).not.toHaveBeenCalled();
  });

  it.each([
    ["an error that explains itself", new Error("Gateway timeout")],
    ["an error that does not", {}],
  ])("shows the same fallback for %s", async (_name, thrown) => {
    apiMock.GetClinicalReportAuditTrails.mockRejectedValue(thrown);
    renderPage();
    expect(
      await screen.findByText(
        "Something went wrong loading audit trails. Please try again."
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No audit trail data available for this report.")
    ).not.toBeInTheDocument();
  });

  it("reloads the page when the retry button is used", async () => {
    apiMock.GetClinicalReportAuditTrails.mockRejectedValue(new Error("boom"));
    const reload = vi.fn();
    // jsdom's own location.reload throws "not implemented", so it is replaced
    // for the length of this test.
    const original = window.location;
    delete window.location;
    window.location = { ...original, reload };
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Try Again" }));
    expect(reload).toHaveBeenCalled();
    window.location = original;
  });
});

describe("the sentence each action turns into", () => {
  it.each([
    ["CREATED", /Initial assessment for Ada Lovelace created on .+ by Jane Doe/],
    ["CREATION", /Initial assessment for Ada Lovelace created on .+ by Jane Doe/],
    ["DRAFT", /Initial assessment saved as a draft by Jane Doe on /],
    ["EDITED", /Initial assessment edited by Jane Doe on /],
    ["UPDATED", /Initial assessment edited by Jane Doe on /],
    ["UPDATE", /Initial assessment edited by Jane Doe on /],
    ["SUBMITTED", /Initial assessment submitted for approval by Jane Doe on /],
    ["SUBMISSION", /Initial assessment submitted for approval by Jane Doe on /],
    ["APPROVED", /Initial assessment approved by Jane Doe on /],
    ["APPROVAL", /Initial assessment approved by Jane Doe on /],
    ["REJECTED", /Initial assessment rejected by Jane Doe on /],
    ["REJECTION", /Initial assessment rejected by Jane Doe on /],
    ["SENT", /Initial assessment sent to Ada Lovelace on /],
    ["SENT_TO_CLIENT", /Initial assessment sent to Ada Lovelace on /],
    ["REQUESTED", /Changes requested on Initial assessment by Jane Doe on /],
    ["CHANGE_REQUESTED", /Changes requested on Initial assessment by Jane Doe on /],
    ["SIGNED", /Initial assessment signed by Jane Doe on /],
    ["SIGNATURE", /Initial assessment signed by Jane Doe on /],
  ])("reads %s as prose", async (action, expected) => {
    const line = await sentenceFor({ action, staff: { fullName: "Jane Doe" } });
    expect(line).toHaveTextContent(expected);
  });

  it("colours the approval verb green and the rejection verb red", async () => {
    respondWith([
      { id: "a-1", action: "APPROVED", staff: { fullName: "Jane Doe" } },
      { id: "a-2", action: "REJECTED", staff: { fullName: "Jane Doe" } },
      { id: "a-3", action: "CHANGE_REQUESTED", staff: { fullName: "Jane Doe" } },
      { id: "a-4", action: "SIGNED", staff: { fullName: "Jane Doe" } },
    ]);
    renderPage();
    await waitFor(() => expect(lines()).toHaveLength(4));
    expect(lines()[0].querySelector(".approval-action.is-approved")).toHaveTextContent(
      "approved"
    );
    expect(lines()[1].querySelector(".approval-action.is-rejected")).toHaveTextContent(
      "rejected"
    );
    expect(lines()[2].querySelector(".approval-action.is-rejected")).toHaveTextContent(
      "Changes requested"
    );
    expect(lines()[3].querySelector(".approval-action.is-approved")).toHaveTextContent(
      "signed"
    );
  });

  it("lowercases an unrecognised action and unpicks its underscores", async () => {
    const line = await sentenceFor({
      action: "ARCHIVED_BY_ADMIN",
      staff: { fullName: "Jane Doe" },
    });
    expect(line).toHaveTextContent(/Initial assessment archived by admin by Jane Doe on /);
  });

  it("is not fooled by casing or stray whitespace", async () => {
    const line = await sentenceFor({
      action: "  approved  ",
      staff: { fullName: "Jane Doe" },
    });
    expect(line).toHaveTextContent(/Initial assessment approved by Jane Doe on /);
  });

  it("reads an event with no action word at all as an edit", async () => {
    // The caller defaults a missing action to "Updated", which lands on the
    // UPDATED arm of the switch rather than on the default one.
    const line = await sentenceFor({ staff: { fullName: "Jane Doe" } });
    expect(line).toHaveTextContent(/Initial assessment edited by Jane Doe on /);
  });

  it.each([
    ["type", { type: "SIGNED" }, /signed by/],
    ["activity", { activity: "REJECTED" }, /rejected by/],
  ])("takes the action from %s when there is no action", async (_n, entry, expected) => {
    const line = await sentenceFor({ ...entry, staff: { fullName: "Jane Doe" } });
    expect(line).toHaveTextContent(expected);
  });
});

describe("who the event is attributed to", () => {
  it.each([
    ["the staff record", { staff: { fullName: "Jane Doe" } }, "Jane Doe"],
    ["the user record", { user: { fullName: "Sam Ray" } }, "Sam Ray"],
    ["performedBy", { performedBy: "Ada L" }, "Ada L"],
    ["userName", { userName: "alovelace" }, "alovelace"],
    ["the entry's own by", { by: "Legacy actor" }, "Legacy actor"],
    ["nobody at all", {}, "Unknown"],
  ])("names %s", async (_name, entry, expected) => {
    const line = await sentenceFor({ action: "EDITED", ...entry });
    expect(line).toHaveTextContent(`edited by ${expected} on`);
  });
});

describe("the date and the names carried in from the previous page", () => {
  it.each([
    ["createdAt", { createdAt: "2024-01-15T10:30:00Z" }],
    ["date", { date: "2024-01-15T10:30:00Z" }],
    ["timestamp", { timestamp: "2024-01-15T10:30:00Z" }],
  ])("reads the time from %s", async (_n, stamp) => {
    respondWith([{ id: "a-1", action: "EDITED", staff: { fullName: "Jane Doe" }, ...stamp }]);
    renderPage();
    await waitFor(() => expect(lines()).toHaveLength(1));
    expect(lines()[0]).not.toHaveTextContent("N/A");
  });

  it("writes N/A when the event carries no time at all", async () => {
    respondWith([{ id: "a-1", action: "EDITED", staff: { fullName: "Jane Doe" } }]);
    renderPage();
    await waitFor(() => expect(lines()).toHaveLength(1));
    expect(lines()[0]).toHaveTextContent("edited by Jane Doe on N/A");
  });

  it("calls the report a clinical report when no title was carried in", async () => {
    route.state = { reportId: "r-1" };
    const line = await sentenceFor({ action: "EDITED", staff: { fullName: "Jane Doe" } });
    expect(line).toHaveTextContent(/^Clinical report edited by/);
  });

  it("falls back to the event's own client, then to N/A", async () => {
    route.state = { reportId: "r-1", documentTitle: "Initial assessment" };
    respondWith([
      { id: "a-1", action: "SENT", for: "Grace H" },
      { id: "a-2", action: "SENT" },
    ]);
    renderPage();
    await waitFor(() => expect(lines()).toHaveLength(2));
    expect(lines()[0]).toHaveTextContent("sent to Grace H on");
    expect(lines()[1]).toHaveTextContent("sent to N/A on");
  });

  it("still lists events that arrive without an id", async () => {
    respondWith([
      { action: "EDITED", staff: { fullName: "Jane Doe" } },
      { action: "APPROVED", staff: { fullName: "Jane Doe" } },
    ]);
    renderPage();
    await waitFor(() => expect(lines()).toHaveLength(2));
  });
});

describe("paging a long trail", () => {
  const many = (count) =>
    Array.from({ length: count }, (_, i) => ({
      id: `a-${i}`,
      action: "EDITED",
      staff: { fullName: `Actor ${i}` },
    }));

  it("keeps a trail of ten on one page with no pager", async () => {
    respondWith(many(10));
    renderPage();
    await waitFor(() => expect(lines()).toHaveLength(10));
    expect(document.body.querySelector(".pagination")).not.toBeInTheDocument();
  });

  it("splits a longer trail and moves between the pages", async () => {
    respondWith(many(12));
    renderPage();
    await waitFor(() => expect(lines()).toHaveLength(10));
    expect(screen.getByText("Actor 0")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    await waitFor(() => expect(lines()).toHaveLength(2));
    expect(screen.getByText("Actor 11")).toBeInTheDocument();
    expect(screen.queryByText("Actor 0")).not.toBeInTheDocument();
  });
});
