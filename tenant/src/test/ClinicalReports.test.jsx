import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The Clinical Reports tab of the client panel: five lifecycle tabs over one
 * table, each with its own fetch and its own row menu, plus the create modal
 * and two hand-rolled dialogs (delete confirmation and the list of signed PDF
 * versions).
 *
 * The table is the real CustomTable, because the tab's row actions only exist
 * inside it and the permission gating is about which menu entries appear. Its
 * export helpers are mocked -- the real ones reach for jsPDF and would write a
 * file into the repo.
 *
 * Everything the tab navigates to is asserted through the router state it
 * builds rather than by rendering the builder, and the create modal is a probe
 * that hands its callback back to the test.
 */

const api = vi.hoisted(() => ({
  GeClinicalReportByTenantIdAndStatus: vi.fn(),
  GetClinicalReportByApproverId: vi.fn(),
  DeleteClinicalReport: vi.fn(),
  DuplicateClinicalReport: vi.fn(),
  WithdrawClientClinicalReport: vi.fn(),
  NudgeClientForReport: vi.fn(),
}));
vi.mock("../api/TemplateAndReportApi", () => ({ default: api }));

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

const router = vi.hoisted(() => ({ navigate: vi.fn(), params: {} }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => router.navigate,
  useParams: () => router.params,
}));

const viewer = vi.hoisted(() => ({ openDocument: vi.fn(), downloadDocument: vi.fn() }));
vi.mock("../hooks/useDocumentViewer", () => ({ default: () => viewer }));

// The real export helpers pull in jsPDF, which writes an actual file.
vi.mock("../utils/TableUtils", () => ({
  exportTableData: vi.fn(),
  exportTableToPDF: vi.fn(),
  printTableData: vi.fn(),
}));

const createModal = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/ReusableModal/ClientModal/ClinicalReport/CreateAReportDocumentModal", () => ({
  default: (received) => {
    createModal.props = received;
    return received.isOpen ? <div data-testid="create-modal" /> : null;
  },
}));

import ClinicalReportsTab from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalReports";

const report = (over = {}) => ({
  id: "rep-1",
  title: "Behaviour Plan",
  createdAt: "2026-01-05T10:00:00",
  updatedAt: "2026-02-06T10:00:00",
  creator: { fullName: "Ada Lovelace" },
  approver: { fullName: "Grace Hopper" },
  status: "DRAFT",
  clinicalReportVersions: [],
  clinicalReportChangeRequests: [],
  ...over,
});

const clientData = {
  clientId: "client-1",
  client: { firstName: "Sam", lastName: "Rivers" },
};

const renderTab = ({ permissions, data = clientData } = {}) => {
  const store = configureStore({
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
        user: {
          id: "user-1",
          tenantId: "tenant-1",
          accessToken: "at",
          refreshToken: "rt",
          // An empty accesses array is the org-owner case: everything granted.
          role: permissions
            ? { roleModuleAccesses: [{ module: "CLIENTS", permissions }] }
            : { roleModuleAccesses: [] },
        },
      },
      // Marked loaded so useFormatSettings never reaches for the settings API.
      generalSettings: {
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12-hour",
        currency: "USD",
        loaded: true,
      },
    },
  });
  return render(
    <Provider store={store}>
      <ClinicalReportsTab clientData={data} />
    </Provider>
  );
};

const openTab = async (name) => {
  // The target only exists once the data behind it has rendered, so it has
  // to be waited for rather than assumed present.
  await waitFor(() => expect(screen.getByRole("tab", { name })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("tab", { name }));
  await waitFor(() =>
    expect(screen.getByRole("tab", { name })).toHaveAttribute("aria-selected", "true")
  );
};

const openRowMenu = (index = 0) =>
  fireEvent.click(document.body.querySelectorAll(".action-cell .action-button")[index]);

const menuItems = () =>
  Array.from(document.body.querySelectorAll(".action-dropdown .dropdown-item")).map(
    (b) => b.textContent
  );

const clickMenuItem = (label) =>
  fireEvent.click(
    Array.from(document.body.querySelectorAll(".action-dropdown .dropdown-item")).find(
      (b) => b.textContent === label
    )
  );

// The filter pickers are react-select, not native selects: open the menu from
// the keyboard, then click the option inside that picker's own menu.
const chooseFilter = (containerSelector, optionText) => {
  const container = document.body.querySelector(containerSelector);
  fireEvent.keyDown(container.querySelector("input"), { key: "ArrowDown", keyCode: 40 });
  // Only one menu is ever open, and it may render outside its own container.
  const option = Array.from(document.body.querySelectorAll(".rs__option")).find(
    (o) => o.textContent === optionText
  );
  fireEvent.click(option);
};

const dataRows = () =>
  Array.from(document.body.querySelectorAll("tbody tr")).filter(
    (tr) => !tr.querySelector("td[colspan]")
  );

beforeEach(() => {
  vi.clearAllMocks();
  router.params = { tenantClientId: "tc-1", clientId: "client-1" };
  createModal.props = null;
  api.GeClinicalReportByTenantIdAndStatus.mockResolvedValue({ data: [] });
  api.GetClinicalReportByApproverId.mockResolvedValue({ data: [] });
  api.DeleteClinicalReport.mockResolvedValue({});
  api.DuplicateClinicalReport.mockResolvedValue({});
  api.WithdrawClientClinicalReport.mockResolvedValue({});
  api.NudgeClientForReport.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("loading a tab's reports", () => {
  it("asks for the client's drafts as soon as the tab opens", async () => {
    renderTab();
    await waitFor(() =>
      expect(api.GeClinicalReportByTenantIdAndStatus).toHaveBeenCalledWith({
        clientTenantId: "tc-1",
        status: "DRAFT",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
  });

  it.each([
    ["Awaiting Signature", "AWAITING_SIGNATURE"],
    ["Change Requested", "CHANGES_REQUESTED"],
    ["Client Signed", "SIGNED"],
  ])("asks for the %s reports by status", async (tab, status) => {
    renderTab();
    await openTab(tab);
    await waitFor(() =>
      expect(api.GeClinicalReportByTenantIdAndStatus).toHaveBeenCalledWith({
        clientTenantId: "tc-1",
        status,
        accessToken: "at",
        refreshToken: "rt",
      })
    );
  });

  it("asks for the submissions by approver rather than by status", async () => {
    renderTab();
    await openTab("Submitted For Approval");
    await waitFor(() =>
      expect(api.GetClinicalReportByApproverId).toHaveBeenCalledWith({
        approverId: "user-1",
        clientTenantId: "tc-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
  });

  it("fetches nothing at all when the route names no client", async () => {
    router.params = { tenantClientId: "tc-1" };
    renderTab();
    await waitFor(() => expect(screen.getByRole("tab", { name: "Drafts" })).toBeInTheDocument());
    expect(api.GeClinicalReportByTenantIdAndStatus).not.toHaveBeenCalled();
  });

  it("shows what the endpoint returned, formatted for the table", async () => {
    api.GeClinicalReportByTenantIdAndStatus.mockResolvedValue({ data: [report()] });
    renderTab();
    expect(await screen.findByText("Behaviour Plan")).toBeInTheDocument();
    expect(screen.getByText("01/05/2026")).toBeInTheDocument();
    expect(screen.getByText("02/06/2026")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
  });

  it("names the gaps in a bare report record", async () => {
    api.GeClinicalReportByTenantIdAndStatus.mockResolvedValue({ data: [{ id: "rep-1" }] });
    renderTab();
    expect(await screen.findByText("Untitled Report")).toBeInTheDocument();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.getByText("None")).toBeInTheDocument();
    // Neither date is set, so the formatter's own placeholder shows twice.
    expect(screen.getAllByText("N/A")).toHaveLength(2);
  });

  it("empties the table when the endpoint answers with nothing at all", async () => {
    api.GeClinicalReportByTenantIdAndStatus.mockResolvedValue(undefined);
    renderTab();
    await waitFor(() => expect(api.GeClinicalReportByTenantIdAndStatus).toHaveBeenCalled());
    expect(dataRows()).toHaveLength(0);
  });

  it("empties the table when the fetch is refused", async () => {
    api.GeClinicalReportByTenantIdAndStatus.mockRejectedValue(new Error("500"));
    renderTab();
    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(dataRows()).toHaveLength(0);
    expect(toast.showToast).not.toHaveBeenCalled();
  });

  it("keeps one row per id and says so in development", async () => {
    api.GeClinicalReportByTenantIdAndStatus.mockResolvedValue({
      data: [report(), report(), report({ id: "rep-2", title: "Second Plan" })],
    });
    renderTab();
    expect(await screen.findByText("Second Plan")).toBeInTheDocument();
    expect(dataRows()).toHaveLength(2);
    await waitFor(() =>
      expect(console.warn).toHaveBeenCalledWith("Filtered 1 duplicate reports")
    );
  });

  it("stays quiet about the duplicates it dropped in production", async () => {
    vi.stubEnv("DEV", false);
    api.GeClinicalReportByTenantIdAndStatus.mockResolvedValue({
      data: [report(), report()],
    });
    renderTab();
    await waitFor(() => expect(dataRows()).toHaveLength(1));
    expect(console.warn).not.toHaveBeenCalled();
  });
});

describe("the drafts tab", () => {
  const open = async ({ permissions } = {}) => {
    api.GeClinicalReportByTenantIdAndStatus.mockResolvedValue({ data: [report()] });
    renderTab({ permissions });
    await screen.findByText("Behaviour Plan");
    openRowMenu();
  };

  it("offers edit, duplicate and delete", async () => {
    await open();
    expect(menuItems()).toEqual(["Edit", "Duplicate", "Delete Document"]);
  });

  it("withholds duplicate from a role without the permission", async () => {
    await open({ permissions: ["view_clinical_report"] });
    expect(menuItems()).toEqual(["Edit", "Delete Document"]);
  });

  it("opens the builder in edit mode with the row's metadata", async () => {
    await open();
    clickMenuItem("Edit");
    expect(router.navigate).toHaveBeenCalledWith("/clinical-report/report-builder", {
      state: {
        id: "rep-1",
        metadata: {
          documentTitle: "Behaviour Plan",
          dateCreated: "01/05/2026",
          createdBy: "Ada Lovelace",
          approverSupervisor: "Grace Hopper",
          lastUpdated: "02/06/2026",
          status: "DRAFT",
          version: "v1",
          hasChangesRequested: false,
          changeRequestedBy: null,
          changeRequestMessage: "",
          clientData,
        },
        mode: "edit",
        activeTab: "drafts",
      },
    });
  });

  it("duplicates a report and reloads the list", async () => {
    await open();
    clickMenuItem("Duplicate");
    await waitFor(() =>
      expect(api.DuplicateClinicalReport).toHaveBeenCalledWith({
        Id: "rep-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith("Report duplicated successfully", "success");
    await waitFor(() =>
      expect(api.GeClinicalReportByTenantIdAndStatus).toHaveBeenCalledTimes(2)
    );
  });

  it("reports a refused duplication", async () => {
    api.DuplicateClinicalReport.mockRejectedValue(new Error("500"));
    await open();
    clickMenuItem("Duplicate");
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Failed to duplicate report", "error")
    );
  });
});

describe("deleting a report", () => {
  const openDelete = async () => {
    api.GeClinicalReportByTenantIdAndStatus.mockResolvedValue({ data: [report()] });
    renderTab();
    await screen.findByText("Behaviour Plan");
    openRowMenu();
    clickMenuItem("Delete Document");
  };

  it("asks first, naming the report", async () => {
    await openDelete();
    expect(screen.getByText("Confirm Deletion")).toBeInTheDocument();
    expect(screen.getByText('"Behaviour Plan"')).toBeInTheDocument();
    expect(api.DeleteClinicalReport).not.toHaveBeenCalled();
  });

  it("keeps the report when the confirmation is cancelled", async () => {
    await openDelete();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Confirm Deletion")).not.toBeInTheDocument();
    expect(screen.getByText("Behaviour Plan")).toBeInTheDocument();
    expect(api.DeleteClinicalReport).not.toHaveBeenCalled();
  });

  it("drops the row from the table once the delete lands", async () => {
    await openDelete();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(api.DeleteClinicalReport).toHaveBeenCalledWith({
        Id: "rep-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith("Report deleted successfully", "success");
    await waitFor(() => expect(screen.queryByText("Behaviour Plan")).not.toBeInTheDocument());
  });

  it("keeps the row and says so when the delete is refused", async () => {
    api.DeleteClinicalReport.mockRejectedValue(new Error("409"));
    await openDelete();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Failed to delete report", "error")
    );
    expect(screen.getByText("Behaviour Plan")).toBeInTheDocument();
    expect(screen.queryByText("Confirm Deletion")).not.toBeInTheDocument();
  });

  it("highlights the confirmation buttons on hover and restores them on leave", async () => {
    await openDelete();
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const remove = screen.getByRole("button", { name: "Delete" });
    const restingCancel = cancel.style.backgroundColor;
    const restingRemove = remove.style.backgroundColor;
    fireEvent.mouseOver(cancel);
    expect(cancel.style.backgroundColor).not.toBe(restingCancel);
    fireEvent.mouseOut(cancel);
    expect(cancel.style.backgroundColor).toBe(restingCancel);
    fireEvent.mouseOver(remove);
    expect(remove.style.backgroundColor).not.toBe(restingRemove);
    fireEvent.mouseOut(remove);
    expect(remove.style.backgroundColor).toBe(restingRemove);
  });
});

describe("the submitted for approval tab", () => {
  const open = async ({ permissions } = {}) => {
    api.GetClinicalReportByApproverId.mockResolvedValue({
      data: [report({ status: "SUBMITTED" })],
    });
    renderTab({ permissions });
    await openTab("Submitted For Approval");
    await screen.findByText("Behaviour Plan");
  };

  it("lets an approver open the document for review", async () => {
    await open();
    openRowMenu();
    expect(menuItems()).toEqual(["View Document"]);
    clickMenuItem("View Document");
    expect(router.navigate.mock.calls[0][1].state).toMatchObject({
      mode: "submittedForApproval",
      activeTab: "submittedForApproval",
    });
  });

  it("leaves the row menu empty for a role that cannot approve", async () => {
    await open({ permissions: ["view_clinical_report"] });
    openRowMenu();
    expect(menuItems()).toEqual([]);
  });
});

describe("the awaiting signature tab", () => {
  const open = async ({ permissions } = {}) => {
    api.GeClinicalReportByTenantIdAndStatus.mockResolvedValue({
      data: [report({ status: "AWAITING_SIGNATURE" })],
    });
    renderTab({ permissions });
    await openTab("Awaiting Signature");
    await screen.findByText("Behaviour Plan");
    openRowMenu();
  };

  it("offers view, nudge and withdraw", async () => {
    await open();
    expect(menuItems()).toEqual(["View", "Nudge Client", "Withdraw"]);
  });

  it("leaves a role with neither permission only the withdrawal", async () => {
    await open({ permissions: ["duplicate_clinical_report"] });
    expect(menuItems()).toEqual(["Withdraw"]);
  });

  it("nudges the client about an unsigned report", async () => {
    await open();
    clickMenuItem("Nudge Client");
    await waitFor(() =>
      expect(api.NudgeClientForReport).toHaveBeenCalledWith({
        clinicalReportId: "rep-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith(
      "Nudge sent to client successfully",
      "success"
    );
  });

  it("reports a failed nudge", async () => {
    api.NudgeClientForReport.mockRejectedValue(new Error("502"));
    await open();
    clickMenuItem("Nudge Client");
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Failed to nudge client", "error")
    );
  });

  it("withdraws a report and reloads the list", async () => {
    await open();
    // Opening the tab already cost one fetch on top of the drafts one.
    const before = api.GeClinicalReportByTenantIdAndStatus.mock.calls.length;
    clickMenuItem("Withdraw");
    await waitFor(() =>
      expect(api.WithdrawClientClinicalReport).toHaveBeenCalledWith({
        clinicalReportId: "rep-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith("Report withdrawn successfully", "success");
    await waitFor(() =>
      expect(api.GeClinicalReportByTenantIdAndStatus.mock.calls.length).toBe(before + 1)
    );
  });

  it("reports a refused withdrawal", async () => {
    api.WithdrawClientClinicalReport.mockRejectedValue(new Error("409"));
    await open();
    clickMenuItem("Withdraw");
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Failed to withdraw report", "error")
    );
  });
});

describe("the change requested tab", () => {
  it("opens the builder in change-requested mode, carrying the notice", async () => {
    api.GeClinicalReportByTenantIdAndStatus.mockResolvedValue({
      data: [report({ status: "CHANGES_REQUESTED" })],
    });
    renderTab();
    await openTab("Change Requested");
    await screen.findByText("Behaviour Plan");
    openRowMenu();
    expect(menuItems()).toEqual(["Edit Document (Changes Requested)"]);
    clickMenuItem("Edit Document (Changes Requested)");
    expect(router.navigate.mock.calls[0][1].state.metadata).toMatchObject({
      hasChangesRequested: true,
      changeRequestedBy: "supervisor",
      changeRequestMessage: "Changes requested by supervisor",
      status: "CHANGES_REQUESTED",
    });
  });
});

describe("the client signed tab", () => {
  const signed = (over = {}) =>
    report({
      status: "SIGNED",
      clinicalReportVersions: [
        { id: "v2", versionNumber: 2, url: "https://files/v2.pdf", createdAt: "2026-03-02T09:00:00" },
        { id: "v1", versionNumber: 1, url: "https://files/v1.pdf", createdAt: "2026-03-01T09:00:00" },
      ],
      ...over,
    });

  const open = async ({ permissions, row = signed(), data } = {}) => {
    api.GeClinicalReportByTenantIdAndStatus.mockResolvedValue({ data: [row] });
    renderTab({ permissions, data });
    await openTab("Client Signed");
    await screen.findByText("Behaviour Plan");
    openRowMenu();
  };

  it("counts the signed versions into the row's version label", async () => {
    await open();
    expect(screen.getByText("Behaviour Plan")).toBeInTheDocument();
    clickMenuItem("View Signed Document (PDF)");
    expect(screen.getByText("Signed Documents")).toBeInTheDocument();
    // Sorted by version number rather than the order the API sent them.
    const rows = document.body.querySelectorAll('[aria-labelledby="signed-pdf-title"] p');
    expect(rows[1]).toHaveTextContent("Version 1");
  });

  it("opens a chosen version in the document viewer", async () => {
    await open();
    clickMenuItem("View Signed Document (PDF)");
    fireEvent.click(screen.getAllByRole("button", { name: "View PDF" })[1]);
    expect(viewer.openDocument).toHaveBeenCalledWith(
      "https://files/v2.pdf",
      "Behaviour Plan - Version 2"
    );
  });

  it("says so when a signed report has no stored versions", async () => {
    await open({ row: report({ status: "SIGNED", clinicalReportVersions: [] }) });
    clickMenuItem("View Signed Document (PDF)");
    expect(screen.getByText("No signed versions available.")).toBeInTheDocument();
  });

  it("closes the versions dialog from either control", async () => {
    await open();
    clickMenuItem("View Signed Document (PDF)");
    fireEvent.click(screen.getByRole("button", { name: "Close signed documents dialog" }));
    expect(screen.queryByText("Signed Documents")).not.toBeInTheDocument();
    openRowMenu();
    clickMenuItem("View Signed Document (PDF)");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText("Signed Documents")).not.toBeInTheDocument();
  });

  it("highlights the dialog's buttons on hover and restores them on leave", async () => {
    await open();
    clickMenuItem("View Signed Document (PDF)");
    const view = screen.getAllByRole("button", { name: "View PDF" })[0];
    const close = screen.getByRole("button", { name: "Close" });
    const restingView = view.style.backgroundColor;
    const restingClose = close.style.backgroundColor;
    fireEvent.mouseOver(view);
    expect(view.style.backgroundColor).not.toBe(restingView);
    fireEvent.mouseOut(view);
    expect(view.style.backgroundColor).toBe(restingView);
    fireEvent.mouseOver(close);
    expect(close.style.backgroundColor).not.toBe(restingClose);
    fireEvent.mouseOut(close);
    expect(close.style.backgroundColor).toBe(restingClose);
  });

  it("opens the audit trail with the client's name", async () => {
    await open();
    clickMenuItem("View Audit Trail");
    expect(router.navigate).toHaveBeenCalledWith("/clinical-report/audit-trails", {
      state: {
        reportId: "rep-1",
        clientName: "Sam Rivers",
        documentTitle: "Behaviour Plan",
      },
    });
  });

  it("sends an empty name when the panel knows of no client", async () => {
    // `null` rather than omitted: the helper's own default fills in a client.
    await open({ data: null });
    clickMenuItem("View Audit Trail");
    expect(router.navigate.mock.calls[0][1].state.clientName).toBe("");
  });

  it("withholds the read-only view from a role without the permission", async () => {
    await open({ permissions: ["duplicate_clinical_report"] });
    expect(menuItems()).toEqual([
      "View Signed Document (PDF)",
      "View Audit Trail",
    ]);
  });

  it("opens the builder read-only for a role that may view", async () => {
    await open();
    clickMenuItem("View");
    expect(router.navigate.mock.calls[0][1].state).toMatchObject({
      mode: "clientSigned",
      activeTab: "clientSigned",
    });
  });
});

describe("creating a report", () => {
  it("opens the create modal from the header button", async () => {
    renderTab();
    expect(screen.queryByTestId("create-modal")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /New Document\/Report/ }));
    expect(screen.getByTestId("create-modal")).toBeInTheDocument();
    expect(createModal.props.clientData).toEqual(clientData.client);
  });

  it("hands the modal's own close back to it", () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /New Document\/Report/ }));
    act(() => createModal.props.onClose());
    expect(screen.queryByTestId("create-modal")).not.toBeInTheDocument();
  });

  it("carries the modal's answers into the builder and closes", () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /New Document\/Report/ }));
    act(() =>
      createModal.props.onStartCreating({
        formData: { activeSections: ["goalsTargets"] },
        metadata: { documentTitle: "Support Plan" },
        mode: "newFromTemplate",
      })
    );
    expect(router.navigate).toHaveBeenCalledWith("/clinical-report/report-builder", {
      state: {
        formData: { activeSections: ["goalsTargets"] },
        metadata: { documentTitle: "Support Plan" },
        mode: "newFromTemplate",
      },
    });
    expect(screen.queryByTestId("create-modal")).not.toBeInTheDocument();
  });

  it("hands the modal nothing when the panel has no client record", () => {
    renderTab({ data: null });
    fireEvent.click(screen.getByRole("button", { name: /New Document\/Report/ }));
    expect(createModal.props.clientData).toBeUndefined();
  });
});

describe("filtering the table", () => {
  const twoReports = [
    report(),
    report({ id: "rep-2", title: "Support Plan", creator: { fullName: "Grace Hopper" } }),
  ];

  it("narrows the rows by document title", async () => {
    api.GeClinicalReportByTenantIdAndStatus.mockResolvedValue({ data: twoReports });
    renderTab();
    await screen.findByText("Support Plan");
    chooseFilter(".filter-label", "Document Title");
    chooseFilter(".filter-value-select-container", "Support Plan");
    expect(dataRows()).toHaveLength(1);
    // The picker now shows the same text as the row it left behind, so the
    // surviving row is read off the table body.
    expect(dataRows()[0]).toHaveTextContent("Support Plan");
    expect(screen.queryByText("Behaviour Plan")).not.toBeInTheDocument();
  });

  it("narrows the rows by who created them", async () => {
    api.GeClinicalReportByTenantIdAndStatus.mockResolvedValue({ data: twoReports });
    renderTab();
    await screen.findByText("Support Plan");
    chooseFilter(".filter-label", "Created By");
    chooseFilter(".filter-value-select-container", "Ada Lovelace");
    expect(dataRows()).toHaveLength(1);
    expect(screen.getByText("Behaviour Plan")).toBeInTheDocument();
  });

  it("searches across the row rather than one column", async () => {
    api.GeClinicalReportByTenantIdAndStatus.mockResolvedValue({ data: twoReports });
    renderTab();
    await screen.findByText("Support Plan");
    // "Grace Hopper" approves both, so the term has to be one only the
    // second row carries anywhere.
    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "Support" },
    });
    expect(dataRows()).toHaveLength(1);
    expect(screen.getByText("Support Plan")).toBeInTheDocument();
  });
});
