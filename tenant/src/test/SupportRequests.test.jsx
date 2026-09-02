import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The tenant's Support Requests page: two fetches on mount (the ticket list and
 * the three overview counters), a permission-gated table whose rows can be
 * viewed or withdrawn, and a modal that posts a new ticket with attachments.
 *
 * `CustomTable` is a probe here rather than the real component. The page's own
 * work is the shape it hands the table -- the row mapping, the status badge, the
 * filter definitions and the permission-filtered action list -- and going
 * through the real table's react-select filter controls would test the table
 * instead. Keeping it out also leaves exactly one react-select on the page (the
 * modal's Category picker), so the picker can be driven without disambiguating.
 *
 * The icon packs are mocked down to marker elements because the attachment list
 * picks a different icon per file extension, and two react-icons SVGs are
 * indistinguishable in the DOM otherwise.
 */

const api = vi.hoisted(() => ({
  GetHelpAndSupportTicketsByTenantId: vi.fn(),
  GetHelpAndSupportTicketsOverviewByTenantId: vi.fn(),
  ChangeSupportRequestStatus: vi.fn(),
  CreateHelpAndSupportTicket: vi.fn(),
}));
vi.mock("../api/helpAndSupportApi", () => ({ default: api }));

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

const table = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/Table/CustomTable", () => ({
  default: (props) => {
    table.props = props;
    return (
      <div data-testid="table" data-loading={String(!!props.loading)}>
        {props.data.map((row) => (
          <div key={row.id} data-testid="row">
            {props.columns.map((col) => (
              <span key={col.key} data-cell={col.key}>
                {col.render ? col.render(row) : row[col.key]}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  },
}));

vi.mock("react-icons/bs", () => ({
  BsCloudUpload: () => <span data-icon="cloud" />,
  BsFileEarmarkPdf: () => <span data-icon="pdf" />,
  BsFileEarmarkPlay: () => <span data-icon="gif" />,
}));
vi.mock("react-icons/fa", () => ({
  FaRegFile: () => <span data-icon="generic" />,
  FaPhotoVideo: () => <span data-icon="video" />,
  FaImage: () => <span data-icon="image" />,
  FaCheckCircle: () => <span data-icon="check" />,
  FaLock: () => <span data-icon="lock" />,
}));

import SupportRequests from "../Pages/HelpAndSupport/SupportRequests/SupportRequests";

const ticket = (over = {}) => ({
  id: "t-1",
  category: "Bug Report",
  description: "Checkout hangs",
  status: "Resolved",
  createdAt: "2026-04-02T10:00:00.000Z",
  loggedBy: { firstName: "Ada", lastName: "Lovelace" },
  ...over,
});

const overview = {
  allIssues: { _count: { _all: 12 } },
  resolvedIssues: { _count: { _all: 5 } },
  pendingIssues: { _count: { _all: 7 } },
};

const store = ({ permissions, tenantId = "tenant-1" } = {}) =>
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

const renderPage = (opts) =>
  render(
    <Provider store={store(opts)}>
      <SupportRequests />
    </Provider>
  );

const rows = () => screen.queryAllByTestId("row");
const cell = (row, key) => row.querySelector(`[data-cell="${key}"]`);

const openSubmitModal = async () => {
  fireEvent.click(screen.getByRole("button", { name: /Submit a new request/i }));
  await screen.findByRole("dialog");
};

// The Category picker is a react-select; typing narrows the menu so Enter lands
// on a known option rather than whichever happens to be first.
const chooseCategory = (query) => {
  const input = document.body.querySelector(".input-select input");
  fireEvent.change(input, { target: { value: query } });
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.keyDown(input, { key: "Enter" });
};

const fileInput = () => document.body.querySelector('input[type="file"]');

beforeEach(() => {
  vi.clearAllMocks();
  table.props = null;
  api.GetHelpAndSupportTicketsByTenantId.mockResolvedValue({ data: [ticket()] });
  api.GetHelpAndSupportTicketsOverviewByTenantId.mockResolvedValue({ data: overview });
  api.ChangeSupportRequestStatus.mockResolvedValue({});
  api.CreateHelpAndSupportTicket.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("permission gating", () => {
  it("shows the access denied panel without the list permission", () => {
    renderPage({ permissions: ["create_support_request"] });
    expect(
      screen.getByText("You don't have permission to view this.")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("table")).not.toBeInTheDocument();
  });

  it("hides the submit button from a role that may only read the list", async () => {
    renderPage({ permissions: ["view_support_request_list"] });
    await screen.findByTestId("table");
    expect(
      screen.queryByRole("button", { name: /Submit a new request/i })
    ).not.toBeInTheDocument();
  });
});

describe("loading the page", () => {
  it("asks for the tenant's tickets and counters with both tokens", async () => {
    renderPage();
    await waitFor(() =>
      expect(api.GetHelpAndSupportTicketsByTenantId).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(api.GetHelpAndSupportTicketsOverviewByTenantId).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    await waitFor(() =>
      expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false")
    );
  });

  it("fetches nothing at all until a tenant is known", async () => {
    renderPage({ tenantId: null });
    await screen.findByTestId("table");
    expect(api.GetHelpAndSupportTicketsByTenantId).not.toHaveBeenCalled();
    expect(api.GetHelpAndSupportTicketsOverviewByTenantId).not.toHaveBeenCalled();
    // The early return skips the `finally`, so the table stays in its loading state.
    expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "true");
  });

  it("fills the three counters from the overview response", async () => {
    renderPage();
    expect(await screen.findByText("12")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("reads a counter with no count block as zero", async () => {
    api.GetHelpAndSupportTicketsOverviewByTenantId.mockResolvedValue({
      data: { allIssues: { _count: {} }, resolvedIssues: null },
    });
    renderPage();
    await waitFor(() => expect(screen.getAllByText("0")).toHaveLength(3));
  });

  it("leaves the counters at zero when the overview carries no data", async () => {
    api.GetHelpAndSupportTicketsOverviewByTenantId.mockResolvedValue({ data: null });
    renderPage();
    await screen.findByTestId("table");
    expect(screen.getAllByText("0")).toHaveLength(3);
  });

  it("leaves the counters at zero when the overview request fails", async () => {
    api.GetHelpAndSupportTicketsOverviewByTenantId.mockRejectedValue(new Error("500"));
    renderPage();
    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        "Failed to fetch overview:",
        expect.any(Error)
      )
    );
    expect(screen.getAllByText("0")).toHaveLength(3);
  });

  it("empties the table when the ticket request fails", async () => {
    api.GetHelpAndSupportTicketsByTenantId.mockRejectedValue(new Error("nope"));
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false")
    );
    expect(rows()).toHaveLength(0);
  });

  it("empties the table when the ticket response has no data key", async () => {
    api.GetHelpAndSupportTicketsByTenantId.mockResolvedValue({});
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false")
    );
    expect(rows()).toHaveLength(0);
  });
});

describe("the row mapping", () => {
  it("renders a complete ticket into its row", async () => {
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    const row = rows()[0];
    expect(cell(row, "issueCategory")).toHaveTextContent("Bug Report");
    expect(cell(row, "description")).toHaveTextContent("Checkout hangs");
    expect(cell(row, "loggedBy")).toHaveTextContent("Ada Lovelace");
    expect(cell(row, "dateReported")).toHaveTextContent("04/02/2026");
    expect(cell(row, "status")).toHaveTextContent("Resolved");
  });

  it("truncates a description past thirty characters", async () => {
    api.GetHelpAndSupportTicketsByTenantId.mockResolvedValue({
      data: [ticket({ description: "a".repeat(45) })],
    });
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(cell(rows()[0], "description")).toHaveTextContent(`${"a".repeat(30)}...`);
  });

  it("falls back to N/A for a ticket with no category or description", async () => {
    api.GetHelpAndSupportTicketsByTenantId.mockResolvedValue({
      data: [ticket({ category: null, description: null, loggedBy: null, tenant: null })],
    });
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    const row = rows()[0];
    expect(cell(row, "issueCategory")).toHaveTextContent("N/A");
    expect(cell(row, "description")).toHaveTextContent("N/A");
    expect(cell(row, "loggedBy")).toHaveTextContent("N/A");
  });

  it("calls an unstatused ticket Not Started", async () => {
    api.GetHelpAndSupportTicketsByTenantId.mockResolvedValue({
      data: [ticket({ status: null })],
    });
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(cell(rows()[0], "status")).toHaveTextContent("Not Started");
  });
});

describe("the status badge", () => {
  const badge = (row) => cell(row, "status").querySelector("span");

  it("maps a known status onto its own class", async () => {
    api.GetHelpAndSupportTicketsByTenantId.mockResolvedValue({
      data: [ticket({ id: "a", status: "In Resolution" })],
    });
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(badge(rows()[0])).toHaveClass("in-resolution");
  });

  it("falls back to the pending class for a status it does not know", async () => {
    api.GetHelpAndSupportTicketsByTenantId.mockResolvedValue({
      data: [ticket({ status: "Withdrawn" })],
    });
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(badge(rows()[0])).toHaveClass("pending");
  });
});

describe("the table filters", () => {
  const filterBy = (value) => table.props.filters.find((f) => f.value === value);

  beforeEach(() => {
    api.GetHelpAndSupportTicketsByTenantId.mockResolvedValue({
      data: [
        ticket({ id: "t-1", status: "Resolved", category: "Bug Report" }),
        ticket({ id: "t-2", status: "Resolved", category: "Performance" }),
        ticket({ id: "t-3", status: null, category: null }),
      ],
    });
  });

  it("offers one option per distinct status and category", async () => {
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(3));
    expect(filterBy("status").filterValues).toEqual([
      { value: "Resolved", label: "Resolved" },
      { value: "Not Started", label: "Not Started" },
    ]);
    expect(filterBy("issueCategory").filterValues).toEqual([
      { value: "Bug Report", label: "Bug Report" },
      { value: "Performance", label: "Performance" },
      { value: "N/A", label: "N/A" },
    ]);
  });

  it("keeps every row while no filter value is chosen", async () => {
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(3));
    const row = { status: "Resolved", issueCategory: "Bug Report", dateReported: "04/02/2026" };
    expect(filterBy("status").filterFunction(row, "")).toBe(true);
    expect(filterBy("issueCategory").filterFunction(row, "")).toBe(true);
    expect(filterBy("dateTime").filterFunction(row, "")).toBe(true);
  });

  it("keeps only the rows matching the chosen value", async () => {
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(3));
    const row = { status: "Resolved", issueCategory: "Bug Report", dateReported: "04/02/2026" };
    expect(filterBy("status").filterFunction(row, "Resolved")).toBe(true);
    expect(filterBy("status").filterFunction(row, "Pending")).toBe(false);
    expect(filterBy("issueCategory").filterFunction(row, "Bug Report")).toBe(true);
    expect(filterBy("issueCategory").filterFunction(row, "Performance")).toBe(false);
    expect(filterBy("dateTime").filterFunction(row, "04/02/2026")).toBe(true);
    expect(filterBy("dateTime").filterFunction(row, "04/03/2026")).toBe(false);
  });
});

describe("the row actions", () => {
  const items = () => table.props.actions()[0].items;

  it("offers both entries to a role holding both permissions", async () => {
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(items().map((i) => i.label)).toEqual([
      "View request details",
      "Withdraw Request",
    ]);
  });

  it("drops the entry whose permission the role lacks", async () => {
    renderPage({ permissions: ["view_support_request_list", "view_support_request"] });
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(items().map((i) => i.label)).toEqual(["View request details"]);
  });

  it("leaves the menu empty for a role with neither permission", async () => {
    renderPage({ permissions: ["view_support_request_list"] });
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(items()).toEqual([]);
  });

  it("routes to the request's own page", async () => {
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    items()[0].onClick({ id: "t-1" });
    expect(navigate).toHaveBeenCalledWith("/help/support-requests/t-1");
  });
});

describe("withdrawing a request", () => {
  const withdraw = async () => {
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    table.props.actions()[0].items[1].onClick({ id: "t-1" });
  };

  it("posts the Withdrawn status and reloads both fetches", async () => {
    await withdraw();
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
    await waitFor(() =>
      expect(api.GetHelpAndSupportTicketsByTenantId).toHaveBeenCalledTimes(2)
    );
    expect(api.GetHelpAndSupportTicketsOverviewByTenantId).toHaveBeenCalledTimes(2);
  });

  it("surfaces the rejection's own message", async () => {
    api.ChangeSupportRequestStatus.mockRejectedValue(new Error("Already closed"));
    await withdraw();
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Already closed", "error")
    );
  });

  it("falls back to a generic message when the rejection carries none", async () => {
    api.ChangeSupportRequestStatus.mockRejectedValue({});
    await withdraw();
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Failed to withdraw request", "error")
    );
  });
});

describe("submitting a new request", () => {
  const fill = ({ category = true, title = true, description = true } = {}) => {
    if (category) chooseCategory("Bug Rep");
    if (title) {
      fireEvent.change(screen.getByPlaceholderText("Type something"), {
        target: { value: "Cannot log in" },
      });
    }
    if (description) {
      fireEvent.change(screen.getByPlaceholderText("Enter a description..."), {
        target: { value: "It spins forever" },
      });
    }
  };

  const submit = () => fireEvent.click(screen.getByRole("button", { name: "Submit" }));

  it("posts the filled form with its attachments and closes on success", async () => {
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    await openSubmitModal();
    fill();
    const attachment = new File(["x"], "trace.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput(), { target: { files: [attachment] } });
    submit();
    await waitFor(() =>
      expect(api.CreateHelpAndSupportTicket).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        category: "Bug Report",
        title: "Cannot log in",
        description: "It spins forever",
        attachment: [attachment],
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith(
      "Support request submitted successfully",
      "success"
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(api.GetHelpAndSupportTicketsByTenantId).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["category", { category: false }],
    ["title", { title: false }],
    ["description", { description: false }],
  ])("refuses to post with no %s", async (_field, missing) => {
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    await openSubmitModal();
    fill(missing);
    submit();
    expect(api.CreateHelpAndSupportTicket).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("keeps the modal open and reports a refused submission", async () => {
    api.CreateHelpAndSupportTicket.mockRejectedValue(new Error("413"));
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    await openSubmitModal();
    fill();
    submit();
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith(
        "Failed to submit support request",
        "error"
      )
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("clears what was typed when the modal is cancelled and reopened", async () => {
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    await openSubmitModal();
    fill();
    fireEvent.change(fileInput(), {
      target: { files: [new File(["x"], "a.png")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await openSubmitModal();
    expect(screen.getByPlaceholderText("Type something")).toHaveValue("");
    expect(screen.getByPlaceholderText("Enter a description...")).toHaveValue("");
    expect(document.body.querySelectorAll(".file-item")).toHaveLength(0);
  });
});

describe("the attachment list", () => {
  const open = async () => {
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    await openSubmitModal();
  };

  const attach = (...names) =>
    fireEvent.change(fileInput(), {
      target: { files: names.map((n) => new File(["ab"], n)) },
    });

  const iconsInList = () =>
    Array.from(document.body.querySelectorAll(".file-info [data-icon]")).map((n) =>
      n.getAttribute("data-icon")
    );

  it("picks an icon per extension, and the generic one for anything else", async () => {
    await open();
    attach("report.pdf", "clip.mp4", "loop.gif", "shot.png", "notes.txt", "");
    expect(iconsInList()).toEqual([
      "pdf",
      "video",
      "gif",
      "image",
      "generic",
      "generic",
    ]);
  });

  it("shows each file's name beside its size", async () => {
    await open();
    attach("report.pdf");
    expect(document.body.querySelector(".file-name").textContent).toBe(
      "report.pdf • 2 B"
    );
  });

  it("appends a second selection to the first", async () => {
    await open();
    attach("one.pdf");
    attach("two.pdf");
    expect(document.body.querySelectorAll(".file-item")).toHaveLength(2);
  });

  it("removes only the file whose bin was clicked", async () => {
    await open();
    attach("one.pdf", "two.pdf");
    fireEvent.click(screen.getAllByLabelText("Remove file")[0]);
    expect(document.body.querySelectorAll(".file-name")).toHaveLength(1);
    expect(document.body.querySelector(".file-name").textContent).toContain("two.pdf");
  });

  it("ignores a selection that carries no files", async () => {
    await open();
    fireEvent.change(fileInput(), { target: { files: [] } });
    expect(document.body.querySelectorAll(".file-item")).toHaveLength(0);
  });

  it("accepts files dropped onto the upload area", async () => {
    await open();
    const area = document.body.querySelector(".upload-area");
    fireEvent.drop(area, { dataTransfer: { files: [new File(["x"], "drop.png")] } });
    expect(document.body.querySelector(".file-name").textContent).toContain("drop.png");
  });

  it("ignores a drop with nothing in it", async () => {
    await open();
    const area = document.body.querySelector(".upload-area");
    fireEvent.drop(area, { dataTransfer: {} });
    fireEvent.dragOver(area, { dataTransfer: {} });
    expect(document.body.querySelectorAll(".file-item")).toHaveLength(0);
  });

  it("opens the file picker when the upload area is clicked", async () => {
    await open();
    const click = vi.spyOn(fileInput(), "click").mockImplementation(() => {});
    fireEvent.click(document.body.querySelector(".upload-area"));
    expect(click).toHaveBeenCalled();
  });
});
