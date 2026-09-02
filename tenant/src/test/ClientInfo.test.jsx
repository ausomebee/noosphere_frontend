import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";
import formBuilderReducer from "../ReduxStore/features/formBuilderSlice";

/**
 * The Client Information tab of the client panel: an avatar strip of assigned
 * clinicians, a "Manage candidate" menu, the read-only basic-information
 * accordion, and a Documents & Forms accordion with three tabs of its own.
 *
 * The three tabs each own a fetch that only runs while that tab is showing, so
 * most of these tests switch tab first and then assert. The Document Requests
 * tab is hand-rolled rather than a CustomTable -- rows expand in place to show
 * uploaded files, or a nudge/cancel pair while the client still owes a
 * document -- so it is driven through raw rows instead of the shared table.
 *
 * Everything the tab can open is a probe: the portal-settings, add-client,
 * upload, request, form-library and delete modals all record their props and
 * expose their callbacks, which is how the save and confirm paths get
 * exercised without dragging in another suite's component. The document viewer
 * hook is mocked because the real one throws outside its provider.
 */

const tenantApi = vi.hoisted(() => ({ UpdateCandidate: vi.fn() }));
vi.mock("../api/TenantApis", () => ({ default: tenantApi }));

const panelApi = vi.hoisted(() => ({
  GetAllClientDocument: vi.fn(),
  GetAllClientDocumentRequested: vi.fn(),
  GetAllFormsByTenantClientId: vi.fn(),
  AttachFormToClient: vi.fn(),
  CreateClientDocuments: vi.fn(),
  CreateClientDocumentsRequest: vi.fn(),
  NudgeClientDocumentRequest: vi.fn(),
  CancelClientDocumentRequest: vi.fn(),
  deleteClientsDocument: vi.fn(),
}));
vi.mock("../api/clientPanelApis", () => ({ default: panelApi }));

const formsApi = vi.hoisted(() => ({
  GetFormsByTenantId: vi.fn(),
  GetFormsByFormId: vi.fn(),
}));
vi.mock("../api/customFormsApi", () => ({ default: formsApi }));

const toastMock = vi.hoisted(() => ({ showToast: vi.fn(), showApiError: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toastMock.showToast(...a),
  showApiError: (...a) => toastMock.showApiError(...a),
}));

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
  useParams: () => ({ tenantClientId: "tc-1" }),
}));

const viewer = vi.hoisted(() => ({ openDocument: vi.fn(), downloadDocument: vi.fn() }));
vi.mock("../hooks/useDocumentViewer", () => ({ default: () => viewer }));

const probes = vi.hoisted(() => {
  const props = {};
  const record = (name) => (received) => {
    props[name] = received;
    return received.isOpen ? <div data-testid={`${name}-modal`} /> : null;
  };
  return { props, record };
});
vi.mock("../Components/ReusableModal/ClientModal/ClientAccessModal", () => ({
  default: probes.record("portal"),
}));
vi.mock("../Components/ReusableModal/ClientModal/AddClientModal", () => ({
  default: probes.record("addClient"),
}));
vi.mock("../Components/ReusableModal/ClientModal/NewDocumentRequestModal", () => ({
  default: probes.record("newRequest"),
}));
vi.mock("../Components/ReusableModal/ClientModal/ClientDocumentUploadModal", () => ({
  default: probes.record("upload"),
}));
vi.mock("../Components/ReusableModal/ClientModal/ClientDocumentRequestModal", () => ({
  default: probes.record("requestView"),
}));
vi.mock("../Components/ReusableModal/ClientModal/FormLibraryModal", () => ({
  default: probes.record("library"),
}));
// Two delete modals render at once (document + request), so each records under
// the title it was given rather than overwriting a single slot.
vi.mock("../Components/ReusableModal/OrganizationModal/DeleteModal", () => ({
  default: (received) => {
    probes.props[received.title] = received;
    return received.isOpen ? (
      <div data-testid="delete-modal">
        <p>{received.message}</p>
        {/* The real DeleteModal awaits onConfirm inside ReusableModal, which
            swallows the rejection because the handlers re-throw deliberately to
            keep the modal open. Dropping the promise here instead would leak an
            unhandled rejection and fail the run even though every test passes. */}
        <button
          onClick={() => Promise.resolve(received.onConfirm()).catch(() => {})}
        >
          {received.confirmLabel || "Delete"}
        </button>
      </div>
    ) : null;
  },
}));

import ClientInformationTab from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClientInfo";

const clientData = (over = {}) => ({
  clientId: "client-1",
  tenantId: "tenant-1",
  dbAccess: true,
  documentAccess: false,
  clinicians: [{ id: "aaa", fullName: "Grace Hopper" }],
  client: {
    firstName: "Ada",
    lastName: "Lovelace",
    preferredName: "Addy",
    gender: "Female",
    DOB: "2015-04-02T00:00:00.000Z",
    email: "ada@example.com",
    phoneNumber: "555-0100",
    streetAddress: "1 Analytical Way",
    city: "London",
    state: "LDN",
    country: "UK",
    zipCode: "E1",
    payer: { payerName: "Blue Shield" },
    caregiverName: "Annabella",
    caregiverPhone: "555-0111",
    caregiverRelationship: "Mother",
    caregiverEmail: "bella@example.com",
    caregiverCity: "London",
  },
  ...over,
});

const store = (permissions, tenantId = "tenant-1") =>
  configureStore({
    reducer: {
      authentication: authReducer,
      generalSettings: generalSettingsReducer,
      formBuilder: formBuilderReducer,
    },
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
          // An empty accesses array means org owner: every permission granted.
          role: permissions
            ? { roleModuleAccesses: [{ module: "CLIENTS", permissions }] }
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

const onUpdated = vi.fn();

// The store is handed back so tests can read what the page dispatched into it.
let activeStore;
const renderTab = ({ data = clientData(), permissions, tenantId } = {}) => {
  activeStore = store(permissions, tenantId);
  return render(
    <Provider store={activeStore}>
      <ClientInformationTab clientData={data} onUpdated={onUpdated} />
    </Provider>
  );
};

const infoValue = (label) =>
  screen.getByText(label).nextElementSibling?.textContent?.trim() ?? "";

const dataRows = () =>
  Array.from(document.body.querySelectorAll("tbody tr")).filter(
    (tr) => !tr.querySelector("td[colspan]")
  );

const openTab = async (name) => {
  fireEvent.click(screen.getByRole("button", { name }));
  await waitFor(() => expect(screen.getByRole("button", { name })).toHaveClass("doc-tab-active"));
};

beforeEach(() => {
  vi.clearAllMocks();
  panelApi.GetAllClientDocument.mockResolvedValue({ data: { data: [] } });
  panelApi.GetAllClientDocumentRequested.mockResolvedValue({ data: { data: [] } });
  panelApi.GetAllFormsByTenantClientId.mockResolvedValue({ data: { data: [] } });
  panelApi.AttachFormToClient.mockResolvedValue({});
  panelApi.CreateClientDocuments.mockResolvedValue({});
  panelApi.CreateClientDocumentsRequest.mockResolvedValue({});
  panelApi.NudgeClientDocumentRequest.mockResolvedValue({});
  panelApi.CancelClientDocumentRequest.mockResolvedValue({});
  panelApi.deleteClientsDocument.mockResolvedValue({});
  formsApi.GetFormsByTenantId.mockResolvedValue({ data: { data: [] } });
  formsApi.GetFormsByFormId.mockResolvedValue({ data: { data: {} } });
  tenantApi.UpdateCandidate.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the assigned clinician avatars", () => {
  const avatars = () => document.body.querySelectorAll(".avatar-group .avatar");

  it("initials a two-part name from its first and last word", () => {
    renderTab();
    expect(avatars()[0]).toHaveTextContent("GH");
    expect(avatars()[0]).toHaveAttribute("title", "Grace Hopper");
  });

  it("takes the first two letters of a single-word name", () => {
    renderTab({ data: clientData({ clinicians: [{ id: "b", fullName: "Prince" }] }) });
    expect(avatars()[0]).toHaveTextContent("PR");
  });

  it("labels a clinician with no name as unknown", () => {
    renderTab({ data: clientData({ clinicians: [{ id: "c" }] }) });
    expect(avatars()[0]).toHaveTextContent("UN");
    expect(avatars()[0]).toHaveAttribute("title", "Unknown");
  });

  it("shows only three avatars and counts the rest", () => {
    renderTab({
      data: clientData({
        clinicians: ["a", "b", "c", "d", "e"].map((id) => ({ id, fullName: `Nurse ${id}` })),
      }),
    });
    expect(avatars()).toHaveLength(3);
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("shows no avatars and no overflow count for an unassigned client", () => {
    renderTab({ data: clientData({ clinicians: [] }) });
    expect(avatars()).toHaveLength(0);
    expect(document.body.querySelector(".more-count")).not.toBeInTheDocument();
  });

  it("copes with a client record that has no clinicians key at all", () => {
    renderTab({ data: { clientId: "client-1" } });
    expect(avatars()).toHaveLength(0);
  });
});

describe("basic information", () => {
  it("shows the stored details, joining the address into one line", () => {
    renderTab();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("(Addy)")).toBeInTheDocument();
    expect(document.body.querySelector(".client-avatar")).toHaveTextContent("AL");
    expect(infoValue("Gender")).toBe("Female");
    expect(infoValue("Primary Payer")).toBe("Blue Shield");
    expect(infoValue("Date of Birth")).toBe("2015-04-02");
    expect(screen.getByText("1 Analytical Way, London, LDN, UK, E1")).toBeInTheDocument();
  });

  it("dashes out every field the client record leaves blank", () => {
    renderTab({ data: clientData({ client: { firstName: "Ada", lastName: "Lovelace" } }) });
    expect(infoValue("Gender")).toBe("—");
    expect(infoValue("Date of Birth")).toBe("—");
    expect(infoValue("Primary Payer")).toBe("—");
    // Both the client and the caregiver address collapse to a single dash.
    expect(screen.getAllByText("—").length).toBeGreaterThan(5);
    expect(screen.queryByText("(Addy)")).not.toBeInTheDocument();
  });

  it("drops the caregiver block when there is no client record", () => {
    renderTab({ data: { clientId: "client-1" } });
    expect(screen.queryByText("Caregiver Information")).not.toBeInTheDocument();
    expect(document.body.querySelector(".client-avatar")).toHaveTextContent("??");
    // The name is built by interpolation, so the missing halves become the
    // literal string "undefined" and the "—" fallback never gets a chance.
    expect(document.body.querySelector(".client-full-name")).toHaveTextContent(
      "undefined undefined"
    );
  });

  it("joins whatever caregiver address parts exist", () => {
    renderTab();
    expect(screen.getByText("Caregiver Information")).toBeInTheDocument();
    expect(screen.getByText("Annabella")).toBeInTheDocument();
    expect(screen.getByText("London")).toBeInTheDocument();
  });

  it("collapses and reopens the accordion", () => {
    renderTab();
    const header = screen.getByText("Basic Information", { selector: ".accordion-title" });
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    fireEvent.click(header);
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    fireEvent.click(header);
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });
});

describe("the manage candidate menu", () => {
  const openMenu = () =>
    fireEvent.click(screen.getByRole("button", { name: /Manage candidate/ }));

  it("stays closed until pressed and closes on a second press", () => {
    renderTab();
    expect(screen.queryByText("Client Portal Settings")).not.toBeInTheDocument();
    openMenu();
    expect(screen.getByText("Client Portal Settings")).toBeInTheDocument();
    openMenu();
    expect(screen.queryByText("Client Portal Settings")).not.toBeInTheDocument();
  });

  it("withholds the edit entry from a role that cannot edit the client", () => {
    renderTab({ permissions: ["view_client_document"] });
    openMenu();
    expect(screen.getByText("Client Portal Settings")).toBeInTheDocument();
    expect(screen.queryByText("Edit candidate information")).not.toBeInTheDocument();
  });

  it("opens the portal settings with the client's current access flags", () => {
    renderTab();
    openMenu();
    fireEvent.click(screen.getByText("Client Portal Settings"));
    expect(screen.getByTestId("portal-modal")).toBeInTheDocument();
    expect(probes.props.portal.clientTenantId).toBe("tc-1");
    expect(probes.props.portal.initialData).toEqual({
      clientPortalAccess: true,
      documentAccess: false,
      // Appointment requests are opt-out, so anything but an explicit false is on.
      requestAppointment: true,
    });
  });

  it("treats an explicit false appointment flag as off", () => {
    renderTab({ data: clientData({ requestAppointment: false }) });
    openMenu();
    fireEvent.click(screen.getByText("Client Portal Settings"));
    expect(probes.props.portal.initialData.requestAppointment).toBe(false);
  });
});

describe("saving an edited client", () => {
  const submit = async (data) => {
    renderTab();
    await probes.props.addClient.onSubmit(data);
  };

  it("sends only the fields that were filled in", async () => {
    await submit({ firstName: "Ada", lastName: "", email: null, phone: undefined, city: "Bath" });
    const payload = tenantApi.UpdateCandidate.mock.calls[0][0];
    expect(payload).toMatchObject({
      id: "client-1",
      tenantId: "tenant-1",
      accessToken: "at",
      refreshToken: "rt",
      firstName: "Ada",
      city: "Bath",
    });
    expect(payload).not.toHaveProperty("lastName");
    expect(payload).not.toHaveProperty("email");
    expect(payload).not.toHaveProperty("phoneNumber");
  });

  it("defaults both countries to the United States", async () => {
    await submit({ firstName: "Ada" });
    const payload = tenantApi.UpdateCandidate.mock.calls[0][0];
    expect(payload.country).toBe("United States");
    expect(payload.caregiverCountry).toBe("United States");
  });

  it("keeps a country the form supplied", async () => {
    await submit({ country: "Canada", caregiverCountry: "Canada" });
    const payload = tenantApi.UpdateCandidate.mock.calls[0][0];
    expect(payload.country).toBe("Canada");
    expect(payload.caregiverCountry).toBe("Canada");
  });

  it("confirms the save and asks the panel to refresh", async () => {
    await submit({ firstName: "Ada" });
    expect(toastMock.showToast).toHaveBeenCalledWith("Client updated successfully", "success");
    expect(onUpdated).toHaveBeenCalled();
  });

  it("reports a rejected save without closing the form", async () => {
    const failure = new Error("422");
    tenantApi.UpdateCandidate.mockRejectedValue(failure);
    await submit({ firstName: "Ada" });
    expect(toastMock.showApiError).toHaveBeenCalledWith(failure, "UPDATE_CLIENT");
    expect(onUpdated).not.toHaveBeenCalled();
  });
});

describe("the documents tab", () => {
  const documents = (docs) =>
    panelApi.GetAllClientDocument.mockResolvedValue({ data: { data: docs } });

  it("loads the client's documents as soon as the tab renders", async () => {
    renderTab();
    await waitFor(() =>
      expect(panelApi.GetAllClientDocument).toHaveBeenCalledWith({
        id: "tc-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
  });

  it("formats the created date and resolves the author from the staff record", async () => {
    documents([
      {
        id: "d1",
        name: "Consent form",
        createdAt: "2026-03-10T09:00:00",
        tenantStaff: { fullName: "Grace Hopper" },
        documentDetails: { fileUrl: "https://files/consent.pdf", type: "application/pdf" },
      },
    ]);
    renderTab();
    expect(await screen.findByText("Consent form")).toBeInTheDocument();
    expect(screen.getByText("03/10/2026")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
  });

  it("falls back through the author fields to System, and dashes an unparseable date", async () => {
    documents([
      { id: "d1", createdAt: "not-a-date", tenantStaff: { email: "sam@example.com" } },
      { id: "d2", createdBy: "importer" },
      { id: "d3" },
    ]);
    renderTab();
    expect(await screen.findAllByText("Untitled Document")).toHaveLength(3);
    expect(screen.getByText("sam@example.com")).toBeInTheDocument();
    expect(screen.getByText("importer")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("shows an empty table rather than an error when the fetch fails", async () => {
    panelApi.GetAllClientDocument.mockRejectedValue(new Error("500"));
    renderTab();
    await waitFor(() => expect(panelApi.GetAllClientDocument).toHaveBeenCalled());
    expect(dataRows()).toHaveLength(0);
    expect(toastMock.showToast).not.toHaveBeenCalled();
  });

  it("opens a document in the viewer", async () => {
    documents([
      { id: "d1", name: "Consent form", documentDetails: { fileUrl: "https://files/c.pdf" } },
    ]);
    renderTab();
    await screen.findByText("Consent form");
    fireEvent.click(screen.getByTitle("View"));
    expect(viewer.openDocument).toHaveBeenCalledWith("https://files/c.pdf", "Consent form");
  });

  it("does nothing for a document row with no file behind it", async () => {
    documents([{ id: "d1", name: "Consent form" }]);
    renderTab();
    await screen.findByText("Consent form");
    fireEvent.click(screen.getByTitle("View"));
    expect(viewer.openDocument).not.toHaveBeenCalled();
  });

  it("hides the row actions from a role with neither view nor delete", async () => {
    documents([{ id: "d1", name: "Consent form" }]);
    renderTab({ permissions: ["view_client_document_forms"] });
    await screen.findByText("Consent form");
    expect(screen.queryByTitle("View")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Delete")).not.toBeInTheDocument();
  });

  it("asks for confirmation before deleting, naming the document", async () => {
    documents([{ id: "d1", name: "Consent form" }]);
    renderTab();
    await screen.findByText("Consent form");
    fireEvent.click(screen.getByTitle("Delete"));
    expect(
      screen.getByText(
        '"Consent form" will be permanently removed. This can\'t be undone.'
      )
    ).toBeInTheDocument();
    expect(panelApi.deleteClientsDocument).not.toHaveBeenCalled();
  });

  it("deletes and reloads the list once confirmed", async () => {
    documents([{ id: "d1", name: "Consent form" }]);
    renderTab();
    await screen.findByText("Consent form");
    fireEvent.click(screen.getByTitle("Delete"));
    fireEvent.click(within(screen.getByTestId("delete-modal")).getByRole("button"));
    await waitFor(() =>
      expect(panelApi.deleteClientsDocument).toHaveBeenCalledWith({
        id: "d1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toastMock.showToast).toHaveBeenCalledWith("Document deleted successfully", "success");
    await waitFor(() => expect(panelApi.GetAllClientDocument).toHaveBeenCalledTimes(2));
  });

  it("surfaces the endpoint's own message when the delete is refused", async () => {
    documents([{ id: "d1", name: "Consent form" }]);
    panelApi.deleteClientsDocument.mockRejectedValue({
      response: { data: { message: "Document is locked" } },
    });
    renderTab();
    await screen.findByText("Consent form");
    fireEvent.click(screen.getByTitle("Delete"));
    fireEvent.click(within(screen.getByTestId("delete-modal")).getByRole("button"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Document is locked", "error")
    );
  });

  it("uploads a document through the New menu and reloads the list", async () => {
    renderTab();
    await waitFor(() => expect(panelApi.GetAllClientDocument).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /New/ }));
    fireEvent.click(screen.getByText("Upload Document"));
    expect(screen.getByTestId("upload-modal")).toBeInTheDocument();
    await probes.props.upload.onUpload({
      name: "Intake.pdf",
      documentDetails: { size: 120, fileType: "application/pdf", fileUrl: "https://files/i.pdf" },
    });
    expect(panelApi.CreateClientDocuments).toHaveBeenCalledWith({
      tenantClientId: "tc-1",
      name: "Intake.pdf",
      createdBy: "user-1",
      documentDetails: {
        size: 120,
        type: "application/pdf",
        fileUrl: "https://files/i.pdf",
      },
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toastMock.showToast).toHaveBeenCalledWith("Document uploaded successfully", "success");
  });

  it("hides the New menu from a role that cannot add documents", () => {
    renderTab({ permissions: ["view_client_document_forms"] });
    expect(screen.queryByRole("button", { name: /New/ })).not.toBeInTheDocument();
  });
});

describe("the document requests tab", () => {
  const requests = (rows) =>
    panelApi.GetAllClientDocumentRequested.mockResolvedValue({ data: { data: rows } });

  const open = async () => {
    renderTab();
    await openTab("Document Requests");
    await waitFor(() => expect(panelApi.GetAllClientDocumentRequested).toHaveBeenCalled());
  };

  it("only fetches the requests once the tab is chosen", async () => {
    renderTab();
    expect(panelApi.GetAllClientDocumentRequested).not.toHaveBeenCalled();
    await openTab("Document Requests");
    await waitFor(() => expect(panelApi.GetAllClientDocumentRequested).toHaveBeenCalled());
  });

  it("dashes a request with no due date and calls an unset status a pending upload", async () => {
    requests([{ id: "r1", name: "Insurance card", createdAt: "2026-03-01T00:00:00" }]);
    await open();
    expect(await screen.findByText("Insurance card")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    const badge = screen.getByText("Pending upload");
    expect(badge).toHaveClass("status-pending");
  });

  it.each([
    ["UPLOADED", "status-active"],
    ["completed", "status-active"],
    ["Filled", "status-active"],
    ["OVERDUE", "status-overdue"],
    ["PENDING", "status-pending"],
  ])("styles the %s status as %s", async (status, className) => {
    requests([{ id: "r1", name: "Insurance card", status }]);
    await open();
    expect(await screen.findByText(status)).toHaveClass(className);
  });

  it("expands a row to list its uploaded files and collapses it again", async () => {
    requests([
      {
        id: "r1",
        name: "Insurance card",
        status: "UPLOADED",
        clientDocuments: [
          { name: "front.png", documentDetails: { doc1: { url: "https://files/front.png" } } },
        ],
      },
    ]);
    await open();
    fireEvent.click(await screen.findByText("Insurance card"));
    expect(screen.getByText("Uploaded Documents (1)")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Insurance card"));
    expect(screen.queryByText("Uploaded Documents (1)")).not.toBeInTheDocument();
  });

  it("names a file after the request when the upload itself is unnamed", async () => {
    requests([
      {
        id: "r1",
        name: "Insurance card",
        status: "UPLOADED",
        clientDocuments: [{ documentDetails: { doc1: { fileUrl: "https://files/a.png" } } }],
      },
    ]);
    await open();
    fireEvent.click(await screen.findByText("Insurance card"));
    const panel = screen.getByText("Uploaded Documents (1)").parentElement;
    fireEvent.click(within(panel).getByText("View"));
    expect(viewer.openDocument).toHaveBeenCalledWith("https://files/a.png", "Insurance card");
  });

  it("downloads an uploaded file", async () => {
    requests([
      {
        id: "r1",
        name: "Insurance card",
        status: "UPLOADED",
        clientDocuments: [
          { name: "front.png", documentDetails: { doc1: { url: "https://files/front.png" } } },
        ],
      },
    ]);
    await open();
    fireEvent.click(await screen.findByText("Insurance card"));
    fireEvent.click(screen.getByText("Download"));
    expect(viewer.downloadDocument).toHaveBeenCalledWith("https://files/front.png", "front.png");
  });

  it("shows the awaiting-upload panel with no nudge for a request already uploaded", async () => {
    requests([{ id: "r1", name: "Insurance card", status: "UPLOADED" }]);
    await open();
    fireEvent.click(await screen.findByText("Insurance card"));
    expect(screen.getByText("Awaiting Upload from the Client..")).toBeInTheDocument();
    expect(screen.queryByText("Nudge")).not.toBeInTheDocument();
  });

  it("nudges the client and disables the button until the reminder lands", async () => {
    let release;
    panelApi.NudgeClientDocumentRequest.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    requests([{ id: "r1", name: "Insurance card", status: "PENDING" }]);
    await open();
    fireEvent.click(await screen.findByText("Insurance card"));
    fireEvent.click(screen.getByText("Nudge"));
    expect(await screen.findByText("Sending...")).toBeDisabled();
    release({});
    await waitFor(() => expect(screen.getByText("Nudge")).toBeInTheDocument());
    expect(toastMock.showToast).toHaveBeenCalledWith(
      'Reminder sent for "Insurance card"',
      "success"
    );
  });

  it("reports a failed nudge through the shared error reporter", async () => {
    const failure = new Error("502");
    panelApi.NudgeClientDocumentRequest.mockRejectedValue(failure);
    requests([{ id: "r1", name: "Insurance card", status: "OVERDUE" }]);
    await open();
    fireEvent.click(await screen.findByText("Insurance card"));
    fireEvent.click(screen.getByText("Nudge"));
    await waitFor(() =>
      expect(toastMock.showApiError).toHaveBeenCalledWith(failure, "NUDGE_DOCUMENT_REQUEST")
    );
  });

  it("confirms before cancelling a request, then withdraws it and reloads", async () => {
    requests([{ id: "r1", name: "Insurance card", status: "PENDING" }]);
    await open();
    fireEvent.click(await screen.findByText("Insurance card"));
    fireEvent.click(screen.getByText("Cancel request"));
    expect(
      screen.getByText(
        '"Insurance card" will be withdrawn and the client will no longer be asked to upload it.'
      )
    ).toBeInTheDocument();
    fireEvent.click(within(screen.getByTestId("delete-modal")).getByRole("button"));
    await waitFor(() =>
      expect(panelApi.CancelClientDocumentRequest).toHaveBeenCalledWith({
        id: "r1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toastMock.showToast).toHaveBeenCalledWith(
      'Request for "Insurance card" cancelled',
      "success"
    );
    await waitFor(() =>
      expect(panelApi.GetAllClientDocumentRequested).toHaveBeenCalledTimes(2)
    );
  });

  it("reports a failed cancellation", async () => {
    const failure = new Error("409");
    panelApi.CancelClientDocumentRequest.mockRejectedValue(failure);
    requests([{ id: "r1", name: "Insurance card", status: "PENDING" }]);
    await open();
    fireEvent.click(await screen.findByText("Insurance card"));
    fireEvent.click(screen.getByText("Cancel request"));
    fireEvent.click(within(screen.getByTestId("delete-modal")).getByRole("button"));
    await waitFor(() =>
      expect(toastMock.showApiError).toHaveBeenCalledWith(failure, "CANCEL_DOCUMENT_REQUEST")
    );
  });

  it("hides the nudge and cancel controls from a role granted neither", async () => {
    requests([{ id: "r1", name: "Insurance card", status: "PENDING" }]);
    renderTab({ permissions: ["view_document_request_list"] });
    await openTab("Document Requests");
    fireEvent.click(await screen.findByText("Insurance card"));
    expect(screen.getByText("Awaiting Upload from the Client..")).toBeInTheDocument();
    expect(screen.queryByText("Nudge")).not.toBeInTheDocument();
    expect(screen.queryByText("Cancel request")).not.toBeInTheDocument();
  });

  it("pages a list longer than ten requests", async () => {
    requests(
      Array.from({ length: 12 }, (_, i) => ({ id: `r${i}`, name: `Request ${i}` }))
    );
    await open();
    expect(await screen.findByText("Request 0")).toBeInTheDocument();
    expect(screen.queryByText("Request 11")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(screen.getByText("Request 11")).toBeInTheDocument();
    expect(screen.queryByText("Request 0")).not.toBeInTheDocument();
  });

  it("creates a new request from the modal and reloads the list", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "New document request" }));
    expect(screen.getByTestId("newRequest-modal")).toBeInTheDocument();
    await probes.props.newRequest.onSubmit({
      name: "Proof of address",
      description: "A recent bill",
      allowMultiple: true,
      dueDate: "2026-04-01",
    });
    expect(panelApi.CreateClientDocumentsRequest).toHaveBeenCalledWith({
      tenantClientId: "tc-1",
      name: "Proof of address",
      description: "A recent bill",
      allowMultiple: true,
      dueDate: "2026-04-01",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toastMock.showToast).toHaveBeenCalledWith("Document request created", "success");
  });
});

describe("the forms tab", () => {
  const assigned = (rows) =>
    panelApi.GetAllFormsByTenantClientId.mockResolvedValue({ data: { data: rows } });

  const open = async () => {
    renderTab();
    await openTab("Forms");
    await waitFor(() => expect(panelApi.GetAllFormsByTenantClientId).toHaveBeenCalled());
  };

  it("loads the tenant's form library on mount, before the tab is ever opened", async () => {
    renderTab();
    await waitFor(() =>
      expect(formsApi.GetFormsByTenantId).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
  });

  it("lists the assigned forms with their status", async () => {
    assigned([
      { id: "cf1", createdAt: "2026-02-01T00:00:00", status: "FILLED", form: { id: "f1", name: "Intake" } },
    ]);
    await open();
    expect(await screen.findByText("Intake")).toBeInTheDocument();
    expect(screen.getByText("02/01/2026")).toBeInTheDocument();
    expect(screen.getByText("FILLED")).toHaveClass("status-active");
  });

  it("calls an unassigned status Assigned and dashes a missing date", async () => {
    assigned([{ id: "cf1", form: { id: "f1", name: "Intake" } }]);
    await open();
    expect(await screen.findByText("Assigned")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("leaves the table empty when the assigned-forms fetch fails", async () => {
    panelApi.GetAllFormsByTenantClientId.mockRejectedValue(new Error("500"));
    await open();
    expect(dataRows()).toHaveLength(0);
  });

  it("loads a form into the builder store before navigating to the renderer", async () => {
    assigned([{ id: "cf1", form: { id: "f1", name: "Intake", formFields: [] } }]);
    formsApi.GetFormsByFormId.mockResolvedValue({
      data: { data: { name: "Intake v2", formFields: [{ id: "q1" }], status: "published" } },
    });
    await open();
    await screen.findByText("Intake");
    fireEvent.click(document.body.querySelector(".action-cell .action-button"));
    fireEvent.click(screen.getByText("View Form"));
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/custom-forms/forms/renderer/f1")
    );
    expect(formsApi.GetFormsByFormId).toHaveBeenCalledWith({
      formId: "f1",
      accessToken: "at",
      refreshToken: "rt",
    });
  });

  it("stays put when the form cannot be fetched", async () => {
    assigned([{ id: "cf1", form: { id: "f1", name: "Intake" } }]);
    formsApi.GetFormsByFormId.mockRejectedValue(new Error("404"));
    await open();
    await screen.findByText("Intake");
    fireEvent.click(document.body.querySelector(".action-cell .action-button"));
    fireEvent.click(screen.getByText("View Form"));
    await waitFor(() => expect(formsApi.GetFormsByFormId).toHaveBeenCalled());
    expect(navigate).not.toHaveBeenCalled();
  });

  it("nudges the client about an assigned form", async () => {
    assigned([{ id: "cf1", form: { id: "f1", name: "Intake" } }]);
    await open();
    await screen.findByText("Intake");
    fireEvent.click(document.body.querySelector(".action-cell .action-button"));
    fireEvent.click(screen.getByText("Nudge Client"));
    expect(toastMock.showToast).toHaveBeenCalledWith(
      'Nudge sent for form "Intake"',
      "success"
    );
  });

  it("re-reads the library when the New form menu is opened", async () => {
    await open();
    expect(formsApi.GetFormsByTenantId).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /New form/ }));
    await waitFor(() => expect(formsApi.GetFormsByTenantId).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Import from Library")).toBeInTheDocument();
  });

  it("hands the library modal the tenant's forms, naming any that have none", async () => {
    formsApi.GetFormsByTenantId.mockResolvedValue({
      data: { data: [{ id: "f1", name: "Intake" }, { id: "f2" }] },
    });
    await open();
    fireEvent.click(screen.getByRole("button", { name: /New form/ }));
    fireEvent.click(screen.getByText("Import from Library"));
    expect(screen.getByTestId("library-modal")).toBeInTheDocument();
    expect(probes.props.library.forms).toEqual([
      { id: "f1", name: "Intake" },
      { id: "f2", name: "Untitled Form" },
    ]);
  });

  it("assigns a chosen library form and reloads the assigned list", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: /New form/ }));
    fireEvent.click(screen.getByText("Import from Library"));
    await probes.props.library.onSelectForm("f1", "Intake");
    expect(panelApi.AttachFormToClient).toHaveBeenCalledWith({
      tenantClientId: "tc-1",
      formId: "f1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toastMock.showToast).toHaveBeenCalledWith('"Intake" assigned successfully', "success");
    await waitFor(() =>
      expect(panelApi.GetAllFormsByTenantClientId).toHaveBeenCalledTimes(2)
    );
  });

  it("surfaces the endpoint's message when an assignment is refused", async () => {
    panelApi.AttachFormToClient.mockRejectedValue({
      response: { data: { message: "Form already assigned" } },
    });
    await open();
    fireEvent.click(screen.getByRole("button", { name: /New form/ }));
    fireEvent.click(screen.getByText("Import from Library"));
    await probes.props.library.onSelectForm("f1", "Intake");
    expect(toastMock.showToast).toHaveBeenCalledWith("Form already assigned", "error");
  });
});

describe("tab visibility", () => {
  it("shows only the tabs the role can see", () => {
    renderTab({ permissions: ["view_client_forms_list"] });
    expect(screen.queryByRole("button", { name: "Documents" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Document Requests" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Forms" })).toBeInTheDocument();
  });

  it("still starts on the documents tab even when that tab is hidden", async () => {
    renderTab({ permissions: ["view_client_forms_list"] });
    // The default tab is not permission-aware, so the documents fetch runs and
    // its table renders with no tab button to switch away from.
    await waitFor(() => expect(panelApi.GetAllClientDocument).toHaveBeenCalled());
  });
});

describe("responses and failures with nothing useful in them", () => {
  it("leaves the documents table alone when the response has no body", async () => {
    panelApi.GetAllClientDocument.mockResolvedValue({});
    renderTab();
    await waitFor(() => expect(panelApi.GetAllClientDocument).toHaveBeenCalled());
    expect(dataRows()).toHaveLength(0);
  });

  it("empties the documents table when the body carries no rows", async () => {
    panelApi.GetAllClientDocument.mockResolvedValue({ data: {} });
    renderTab();
    await waitFor(() => expect(panelApi.GetAllClientDocument).toHaveBeenCalled());
    expect(dataRows()).toHaveLength(0);
  });

  it("leaves the requests list alone when the response has no body", async () => {
    panelApi.GetAllClientDocumentRequested.mockResolvedValue({});
    renderTab();
    await openTab("Document Requests");
    await waitFor(() => expect(panelApi.GetAllClientDocumentRequested).toHaveBeenCalled());
    expect(dataRows()).toHaveLength(0);
  });

  it("empties the requests list when the body carries no rows", async () => {
    panelApi.GetAllClientDocumentRequested.mockResolvedValue({ data: {} });
    renderTab();
    await openTab("Document Requests");
    await waitFor(() => expect(panelApi.GetAllClientDocumentRequested).toHaveBeenCalled());
    expect(dataRows()).toHaveLength(0);
  });

  it("empties the assigned forms when the response carries no rows", async () => {
    panelApi.GetAllFormsByTenantClientId.mockResolvedValue({});
    renderTab();
    await openTab("Forms");
    await waitFor(() => expect(panelApi.GetAllFormsByTenantClientId).toHaveBeenCalled());
    expect(dataRows()).toHaveLength(0);
  });

  it("offers an empty library when the tenant's forms come back without rows", async () => {
    formsApi.GetFormsByTenantId.mockResolvedValue({});
    renderTab();
    await openTab("Forms");
    fireEvent.click(screen.getByRole("button", { name: /New form/ }));
    fireEvent.click(screen.getByText("Import from Library"));
    expect(probes.props.library.forms).toEqual([]);
  });

  it("falls back to generic wording when a failed delete says nothing", async () => {
    panelApi.GetAllClientDocument.mockResolvedValue({
      data: { data: [{ id: "d1", name: "Consent form" }] },
    });
    panelApi.deleteClientsDocument.mockRejectedValue(new Error("boom"));
    renderTab();
    await screen.findByText("Consent form");
    fireEvent.click(screen.getByTitle("Delete"));
    fireEvent.click(within(screen.getByTestId("delete-modal")).getByRole("button"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Failed to delete document", "error")
    );
  });

  it("falls back to generic wording when a refused assignment says nothing", async () => {
    panelApi.AttachFormToClient.mockRejectedValue(new Error("boom"));
    renderTab();
    await openTab("Forms");
    fireEvent.click(screen.getByRole("button", { name: /New form/ }));
    fireEvent.click(screen.getByText("Import from Library"));
    await probes.props.library.onSelectForm("f1", "Intake");
    expect(toastMock.showToast).toHaveBeenCalledWith("Failed to assign form", "error");
  });

  it("never reaches for the form library without a tenant", async () => {
    renderTab({ tenantId: null });
    await openTab("Forms");
    fireEvent.click(screen.getByRole("button", { name: /New form/ }));
    // Neither the mount effect nor the New form button gets past the guard.
    expect(formsApi.GetFormsByTenantId).not.toHaveBeenCalled();
  });
});

describe("request rows the transform has to cope with", () => {
  const requests = (rows) =>
    panelApi.GetAllClientDocumentRequested.mockResolvedValue({ data: { data: rows } });

  const open = async () => {
    renderTab();
    await openTab("Document Requests");
    await waitFor(() => expect(panelApi.GetAllClientDocumentRequested).toHaveBeenCalled());
  };

  it("formats a due date when one was set", async () => {
    requests([
      {
        id: "r1",
        name: "Insurance card",
        createdAt: "2026-03-01T00:00:00",
        dueDate: "2026-03-15T00:00:00",
      },
    ]);
    await open();
    expect(await screen.findByText("03/15/2026")).toBeInTheDocument();
  });

  it("counts no files for an upload record with no details attached", async () => {
    requests([
      { id: "r1", name: "Insurance card", status: "UPLOADED", clientDocuments: [{}] },
    ]);
    await open();
    fireEvent.click(await screen.findByText("Insurance card"));
    expect(screen.getByText("Awaiting Upload from the Client..")).toBeInTheDocument();
    expect(screen.queryByText(/Uploaded Documents/)).not.toBeInTheDocument();
  });

  it("ignores a second nudge while the first reminder is still going out", async () => {
    let release;
    panelApi.NudgeClientDocumentRequest.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    requests([
      { id: "r1", name: "First request", status: "PENDING" },
      { id: "r2", name: "Second request", status: "PENDING" },
    ]);
    await open();
    fireEvent.click(await screen.findByText("First request"));
    fireEvent.click(screen.getByText("Second request"));
    const buttons = screen.getAllByText("Nudge");
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[0]);
    await screen.findByText("Sending...");
    // The other row's button is still live, but the handler refuses to overlap.
    fireEvent.click(screen.getByText("Nudge"));
    expect(panelApi.NudgeClientDocumentRequest).toHaveBeenCalledTimes(1);
    release({});
    await waitFor(() => expect(screen.getAllByText("Nudge")).toHaveLength(2));
  });
});

describe("loading a form into the builder", () => {
  const assigned = () =>
    panelApi.GetAllFormsByTenantClientId.mockResolvedValue({
      data: {
        data: [{ id: "cf1", form: { id: "f1", name: "Intake", formFields: [{ id: "q1" }] } }],
      },
    });

  const viewForm = async () => {
    renderTab();
    await openTab("Forms");
    await screen.findByText("Intake");
    fireEvent.click(document.body.querySelector(".action-cell .action-button"));
    fireEvent.click(screen.getByText("View Form"));
    await waitFor(() => expect(navigate).toHaveBeenCalled());
  };

  it("accepts a form returned without a nested data envelope", async () => {
    assigned();
    formsApi.GetFormsByFormId.mockResolvedValue({
      data: { name: "Intake v3", formFields: [{ id: "q9" }], status: "draft" },
    });
    await viewForm();
    expect(activeStore.getState().formBuilder.formName).toBe("Intake v3");
    expect(activeStore.getState().formBuilder.status).toBe("draft");
  });

  it("falls back to the row's own name and fields for a bare form record", async () => {
    assigned();
    formsApi.GetFormsByFormId.mockResolvedValue({ data: { data: {} } });
    await viewForm();
    const state = activeStore.getState().formBuilder;
    expect(state.formName).toBe("Intake");
    expect(state.elements).toHaveLength(1);
    // No stored status means the renderer treats it as published.
    expect(state.status).toBe("published");
  });
});
