import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * One support ticket's detail page: a single fetch, an information table, the
 * attachment list rendered twice (as links and as a document list), and the
 * activity log behind the Track Progress modal.
 *
 * The modal and its pagination are the real components -- the page's paging
 * behaviour is the point of the log tests, and there is nothing heavy behind
 * either. Only the document viewer is stubbed, since it throws outside its
 * provider.
 *
 * S3 keys arrive prefixed with an upload timestamp ("1764605574756-report.pdf")
 * and the page strips it, so the attachment fixtures keep that exact shape.
 */

const api = vi.hoisted(() => ({
  GetSingleTicketById: vi.fn(),
  ChangeSupportRequestStatus: vi.fn(),
}));
vi.mock("../api/helpAndSupportApi", () => ({ default: api }));

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

const viewer = vi.hoisted(() => ({ openDocument: vi.fn(), downloadDocument: vi.fn() }));
vi.mock("../hooks/useDocumentViewer", () => ({ default: () => viewer }));

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

import ViewRequestDetails from "../Pages/HelpAndSupport/SupportRequests/ViewRequestDetails";

const ticket = (over = {}) => ({
  id: "t-1",
  category: "Bug Report",
  title: "Checkout hangs",
  status: "In Resolution",
  description: "Users are stuck on the payment step",
  createdAt: "2026-04-02T10:00:00.000Z",
  updatedAt: "2026-04-03T11:30:00.000Z",
  loggedBy: { firstName: "Ada", lastName: "Lovelace" },
  attachments: [
    { key: "1764605574756-trace.pdf", location: "https://files/trace.pdf" },
  ],
  Logs: [],
  ...over,
});

const log = (over = {}) => ({
  logId: "log-1",
  accessedBy: "ajibola oluwagbemileke",
  action: "updated issue",
  outcome: "SUCCESS",
  createdAt: "2026-04-03T09:00:00.000Z",
  ...over,
});

const store = ({ permissions } = {}) =>
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
          // An empty accesses array is the org-owner case: every permission.
          role: permissions
            ? { roleModuleAccesses: [{ module: "HELP_AND_SUPPORT", permissions }] }
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

// `withId: false` mounts the page on a route carrying no ticket id, which is the
// only way to reach the guard that skips the fetch entirely.
const renderPage = ({ withId = true, ...opts } = {}) =>
  render(
    <Provider store={store(opts)}>
      <MemoryRouter initialEntries={[withId ? "/help/t-1" : "/help"]}>
        <Routes>
          <Route path="/help/:requestId" element={<ViewRequestDetails />} />
          <Route path="/help" element={<ViewRequestDetails />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

const loaded = () => screen.findByText("Issue Information");
// "Description" is both a section heading and a field label, so the lookup is
// scoped to the label cells rather than to the page's text.
const fieldValue = (label) =>
  Array.from(document.body.querySelectorAll(".field-label"))
    .find((td) => td.textContent === label)
    .closest("tr")
    .querySelector(".field-value").textContent;

const attachmentLinks = () =>
  Array.from(document.body.querySelectorAll(".attachment-link"));
const documentItems = () =>
  Array.from(document.body.querySelectorAll(".document-item"));
const openTrack = () => fireEvent.click(screen.getByRole("button", { name: /Track Progress/ }));

beforeEach(() => {
  vi.clearAllMocks();
  api.GetSingleTicketById.mockResolvedValue({ data: ticket() });
  api.ChangeSupportRequestStatus.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading the ticket", () => {
  it("spins until the ticket arrives", async () => {
    renderPage();
    expect(document.body.querySelector(".loading-spinner")).toBeInTheDocument();
    await loaded();
    expect(document.body.querySelector(".loading-spinner")).toBeNull();
    expect(api.GetSingleTicketById).toHaveBeenCalledWith({
      ticketId: "t-1",
      accessToken: "at",
      refreshToken: "rt",
    });
  });

  it("never leaves the spinner when the route carries no ticket id", async () => {
    renderPage({ withId: false });
    await waitFor(() => expect(api.GetSingleTicketById).not.toHaveBeenCalled());
    expect(document.body.querySelector(".loading-spinner")).toBeInTheDocument();
  });

  it("says so when the ticket does not exist", async () => {
    api.GetSingleTicketById.mockResolvedValue({ data: null });
    renderPage();
    expect(await screen.findByText("Request not found.")).toBeInTheDocument();
  });

  it("says so when the response has no data at all", async () => {
    api.GetSingleTicketById.mockResolvedValue(undefined);
    renderPage();
    expect(await screen.findByText("Request not found.")).toBeInTheDocument();
  });

  it("says so when the fetch is refused", async () => {
    api.GetSingleTicketById.mockRejectedValue(new Error("500"));
    renderPage();
    expect(await screen.findByText("Request not found.")).toBeInTheDocument();
    expect(console.error).toHaveBeenCalledWith(
      "Failed to fetch ticket:",
      expect.any(Error)
    );
  });
});

describe("the issue information table", () => {
  it("shows every field of a complete ticket", async () => {
    renderPage();
    await loaded();
    expect(fieldValue("Category")).toBe("Bug Report");
    expect(fieldValue("Title")).toBe("Checkout hangs");
    expect(fieldValue("Status")).toBe("In Resolution");
    expect(fieldValue("Logged by")).toBe("Ada Lovelace");
    expect(fieldValue("Date Reported")).toMatch(/^04\/02\/2026 /);
    expect(fieldValue("Last Update")).toMatch(/^04\/03\/2026 /);
    expect(fieldValue("Description")).toBe("Users are stuck on the payment step");
  });

  it("falls back to N/A on every field the ticket leaves blank", async () => {
    api.GetSingleTicketById.mockResolvedValue({
      data: {
        id: "t-2",
        category: null,
        title: null,
        status: null,
        description: null,
        createdAt: null,
        updatedAt: null,
      },
    });
    renderPage();
    await loaded();
    expect(fieldValue("Category")).toBe("N/A");
    expect(fieldValue("Title")).toBe("N/A");
    expect(fieldValue("Status")).toBe("N/A");
    expect(fieldValue("Logged by")).toBe("N/A");
    expect(fieldValue("Date Reported")).toBe("N/A");
    expect(fieldValue("Description")).toBe("N/A");
  });

  it("credits the tenant when no admin logged the ticket", async () => {
    api.GetSingleTicketById.mockResolvedValue({
      data: ticket({ loggedBy: null, tenant: { companyName: "Bright Futures" } }),
    });
    renderPage();
    await loaded();
    expect(fieldValue("Logged by")).toBe("Bright Futures");
  });
});

describe("the attachments", () => {
  it("strips the upload timestamp off each stored key", async () => {
    renderPage();
    await loaded();
    expect(attachmentLinks().map((b) => b.textContent)).toEqual(["trace.pdf"]);
    expect(documentItems()[0].textContent).toBe("trace.pdf");
  });

  it("numbers an attachment whose key is missing", async () => {
    api.GetSingleTicketById.mockResolvedValue({
      data: ticket({
        attachments: [{ location: "https://files/a" }, { location: "https://files/b" }],
      }),
    });
    renderPage();
    await loaded();
    expect(attachmentLinks().map((b) => b.textContent)).toEqual([
      "Attachment 1",
      "Attachment 2",
    ]);
    expect(documentItems().map((b) => b.textContent)).toEqual([
      "Document 1",
      "Document 2",
    ]);
  });

  it("opens the attachment link in the document viewer", async () => {
    renderPage();
    await loaded();
    fireEvent.click(attachmentLinks()[0]);
    expect(viewer.openDocument).toHaveBeenCalledWith(
      "https://files/trace.pdf",
      "trace.pdf"
    );
  });

  it("opens the same file from the document list", async () => {
    renderPage();
    await loaded();
    fireEvent.click(documentItems()[0]);
    expect(viewer.openDocument).toHaveBeenCalledWith(
      "https://files/trace.pdf",
      "trace.pdf"
    );
  });

  it("shows both empty states for a ticket with nothing attached", async () => {
    api.GetSingleTicketById.mockResolvedValue({ data: ticket({ attachments: [] }) });
    renderPage();
    await loaded();
    expect(screen.getByText("None")).toBeInTheDocument();
    expect(screen.getByText("No documents attached.")).toBeInTheDocument();
  });

  it("treats a ticket with no attachments key as having none", async () => {
    api.GetSingleTicketById.mockResolvedValue({
      data: ticket({ attachments: undefined }),
    });
    renderPage();
    await loaded();
    expect(screen.getByText("None")).toBeInTheDocument();
  });
});

describe("withdrawing the request", () => {
  it("posts the Withdrawn status and returns to the list", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Withdraw Request" }));
    await waitFor(() =>
      expect(api.ChangeSupportRequestStatus).toHaveBeenCalledWith({
        id: "t-1",
        status: "Withdrawn",
        updatedBy: "user-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith("Support request withdrawn", "success");
    expect(navigate).toHaveBeenCalledWith("/help/support-requests");
  });

  it("disables the button and spins while the request is in flight", async () => {
    let release;
    api.ChangeSupportRequestStatus.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    renderPage();
    await loaded();
    const button = screen.getByRole("button", { name: "Withdraw Request" });
    fireEvent.click(button);
    await waitFor(() => expect(button).toBeDisabled());
    expect(button.querySelector(".spinner")).toBeInTheDocument();
    release({});
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it("surfaces the rejection's own message and stays on the page", async () => {
    api.ChangeSupportRequestStatus.mockRejectedValue(new Error("Already closed"));
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Withdraw Request" }));
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Already closed", "error")
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when the rejection carries none", async () => {
    api.ChangeSupportRequestStatus.mockRejectedValue({});
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Withdraw Request" }));
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Failed to withdraw request", "error")
    );
  });

  it("hides the button from a role that may not withdraw", async () => {
    renderPage({ permissions: ["view_support_request"] });
    await loaded();
    expect(
      screen.queryByRole("button", { name: "Withdraw Request" })
    ).not.toBeInTheDocument();
  });

  it("goes back to the list from the back button", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(navigate).toHaveBeenCalledWith("/help/support-requests");
  });
});

describe("the progress track", () => {
  const withLogs = (logs, over = {}) =>
    api.GetSingleTicketById.mockResolvedValue({ data: ticket({ Logs: logs, ...over }) });

  const modal = () => screen.getByRole("dialog");

  it("says nothing has happened yet for a ticket with no log", async () => {
    renderPage();
    await loaded();
    openTrack();
    expect(within(modal()).getByText("No progress tracked yet.")).toBeInTheDocument();
    expect(document.body.querySelector(".pagination")).toBeNull();
  });

  it("titles the modal with the ticket's own name", async () => {
    renderPage();
    await loaded();
    openTrack();
    expect(within(modal()).getByText("Progress Track — Checkout hangs")).toBeInTheDocument();
  });

  it("prefers an explicit issue name over the title", async () => {
    withLogs([], { issueName: "Checkout outage" });
    renderPage();
    await loaded();
    openTrack();
    expect(
      within(modal()).getByText("Progress Track — Checkout outage")
    ).toBeInTheDocument();
  });

  it("drops the dash when the ticket has neither name nor title", async () => {
    withLogs([], { title: null });
    renderPage();
    await loaded();
    openTrack();
    expect(within(modal()).getByText("Progress Track")).toBeInTheDocument();
  });

  it("shows the newest entry first whatever order the API sent", async () => {
    withLogs([
      log({ logId: "old", action: "created issue", createdAt: "2026-04-01T09:00:00.000Z" }),
      log({ logId: "new", action: "resolved issue", createdAt: "2026-04-05T09:00:00.000Z" }),
    ]);
    renderPage();
    await loaded();
    openTrack();
    const headlines = document.body.querySelectorAll(".track-headline");
    expect(headlines[0].textContent).toContain("resolved issue");
    expect(headlines[1].textContent).toContain("created issue");
  });

  it("sorts an undated entry to the bottom", async () => {
    withLogs([
      log({ logId: "undated", action: "imported issue", createdAt: null }),
      log({ logId: "dated", action: "resolved issue" }),
    ]);
    renderPage();
    await loaded();
    openTrack();
    const headlines = document.body.querySelectorAll(".track-headline");
    expect(headlines[0].textContent).toContain("resolved issue");
    expect(headlines[1].textContent).toContain("imported issue");
    // No timestamp means no date line under that entry.
    expect(document.body.querySelectorAll(".track-date")).toHaveLength(1);
  });

  it("renders a person, their action and the time", async () => {
    withLogs([log()]);
    renderPage();
    await loaded();
    openTrack();
    expect(document.body.querySelector(".track-person").textContent).toBe(
      "Ajibola Oluwagbemileke"
    );
    expect(document.body.querySelector(".track-headline").textContent).toContain(
      "updated issue"
    );
    expect(document.body.querySelector(".track-date").textContent).toMatch(
      /^04\/03\/2026 /
    );
  });

  it("flags a failed step and shows its reason", async () => {
    withLogs([log({ outcome: "FAILED", reason: "Attachment rejected" })]);
    renderPage();
    await loaded();
    openTrack();
    expect(document.body.querySelector(".track-status.failed")).toBeInTheDocument();
    expect(document.body.querySelector(".track-reason").textContent).toBe(
      "Attachment rejected"
    );
  });

  it("leaves out the person when the log names nobody", async () => {
    withLogs([log({ accessedBy: null, admin: null })]);
    renderPage();
    await loaded();
    openTrack();
    expect(document.body.querySelector(".track-person")).toBeNull();
    expect(document.body.querySelector(".track-headline").textContent).toContain(
      "updated issue"
    );
  });

  it("pages a long history five at a time", async () => {
    withLogs(
      Array.from({ length: 7 }, (_, i) =>
        log({
          logId: `log-${i}`,
          action: `step ${i}`,
          // Descending timestamps keep the rendered order the same as the fixture.
          createdAt: `2026-04-0${7 - i}T09:00:00.000Z`,
        })
      )
    );
    renderPage();
    await loaded();
    openTrack();
    expect(document.body.querySelectorAll(".progress-track-item")).toHaveLength(5);
    expect(document.body.querySelector(".pagination")).toBeInTheDocument();
    fireEvent.click(within(modal()).getByRole("button", { name: "2" }));
    expect(document.body.querySelectorAll(".progress-track-item")).toHaveLength(2);
    expect(screen.getByText("step 5")).toBeInTheDocument();
  });

  it("closes again from the footer button", async () => {
    renderPage();
    await loaded();
    openTrack();
    fireEvent.click(within(modal()).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
