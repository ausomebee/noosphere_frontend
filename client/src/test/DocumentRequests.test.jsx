import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

const apiMock = vi.hoisted(() => ({
  GetAllRequestDocuments: vi.fn(),
  GetCountsForDocumentRequests: vi.fn(),
  GetAllClientForms: vi.fn(),
  GetFormsCounts: vi.fn(),
  AttachDocumentsToRequest: vi.fn(),
}));
vi.mock("../api/documentsAndFormsApis", () => ({ default: apiMock }));

const showToast = vi.fn();
vi.mock("../Helper/ShowToast", () => ({ showToast: (...a) => showToast(...a) }));

const openDocument = vi.fn();
vi.mock("../hooks/useDocumentViewer", () => ({
  default: () => ({ openDocument }),
}));

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

// Both upload paths funnel into the same attach handler, so the modals are
// reduced to probes that hand it a list of urls on demand.
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
vi.mock("../Components/Modal/ClientDocumentUploadModal", () => stubModal("upload"));
vi.mock("../Components/Modal/SelectFromMyDocumentsModal", () => stubModal("select"));

import DocumentRequests from "../Pages/DocumentsAndForms/DocumentRequest/DocumentRequests";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The client's document-and-form request list.
 *
 * Two independent tables load in one pass: a request fails without taking the
 * other down, because each half has its own try/catch. Every request row is
 * expandable -- an unfulfilled one offers the two upload routes, a fulfilled
 * one flattens the `documentDetails` map (doc1, doc2, ...) across every
 * `clientDocuments` entry into a single list.
 *
 * Attaching validates before it calls the API: nothing selected is refused, and
 * so is more than one file against a request that allows only one.
 */

const ok = (data) => ({ data: { data } });

const request = (over = {}) => ({
  id: "r1",
  name: "Proof of address",
  description: "A recent utility bill",
  allowMultiple: false,
  status: "PENDING",
  dueDate: "2026-04-01",
  createdAt: "2026-03-01",
  clientDocuments: [],
  ...over,
});

const form = (over = {}) => ({
  id: "f1",
  formId: "form-1",
  form: { name: "Intake questionnaire" },
  createdAt: "2026-03-01",
  status: "PENDING",
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

const renderPage = async () => {
  const view = render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <DocumentRequests />
      </MemoryRouter>
    </Provider>
  );
  await waitFor(() => expect(apiMock.GetAllRequestDocuments).toHaveBeenCalled());
  return view;
};

const expandRequest = async () => {
  await waitFor(() => expect(screen.getByText("Proof of address")).toBeInTheDocument());
  fireEvent.click(screen.getAllByLabelText("Expand row")[0]);
};

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
  Object.keys(modalProps).forEach((k) => delete modalProps[k]);
  apiMock.GetAllRequestDocuments.mockResolvedValue(ok([request()]));
  apiMock.GetCountsForDocumentRequests.mockResolvedValue(ok({ request: { PENDING: 2 }, overdue: 0 }));
  apiMock.GetAllClientForms.mockResolvedValue(ok([form()]));
  apiMock.GetFormsCounts.mockResolvedValue(ok({ forms: {}, overdue: 0, PENDING: 1 }));
  apiMock.AttachDocumentsToRequest.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading both sections", () => {
  it("fetches with the signed-in client's tenant link", async () => {
    await renderPage();
    expect(apiMock.GetAllRequestDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ clientTenantId: "tc1", accessToken: "at", refreshToken: "rt" })
    );
    await waitFor(() => expect(apiMock.GetFormsCounts).toHaveBeenCalled());
  });

  it("fetches nothing without a tenant link", async () => {
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: { auth: { isAuthenticated: false, user: null } },
    });
    render(
      <Provider store={store}>
        <MemoryRouter>
          <DocumentRequests />
        </MemoryRouter>
      </Provider>
    );
    expect(apiMock.GetAllRequestDocuments).not.toHaveBeenCalled();
  });

  it("renders a request row and a form row", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText("Proof of address")).toBeInTheDocument());
    expect(screen.getByText("Intake questionnaire")).toBeInTheDocument();
  });

  it("names a request and a form the API left blank", async () => {
    apiMock.GetAllRequestDocuments.mockResolvedValue(
      ok([request({ name: undefined, description: undefined, status: undefined })])
    );
    apiMock.GetAllClientForms.mockResolvedValue(
      ok([form({ form: undefined, createdAt: undefined, status: undefined })])
    );
    await renderPage();
    await waitFor(() => expect(screen.getByText("Unnamed Request")).toBeInTheDocument());
    expect(screen.getByText("Unnamed Form")).toBeInTheDocument();
  });

  it("shows the pending counts as badges", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText("2 new")).toBeInTheDocument());
    expect(screen.getByText("1 new")).toBeInTheDocument();
  });

  it("defaults the badges to zero when the counts come back empty", async () => {
    apiMock.GetCountsForDocumentRequests.mockResolvedValue({ data: {} });
    apiMock.GetFormsCounts.mockResolvedValue({ data: {} });
    await renderPage();
    await waitFor(() => expect(screen.getAllByText("0 new")).toHaveLength(2));
  });

  it("warns about overdue documents and forms", async () => {
    apiMock.GetCountsForDocumentRequests.mockResolvedValue(ok({ request: {}, overdue: 3 }));
    apiMock.GetFormsCounts.mockResolvedValue(ok({ forms: {}, overdue: 2 }));
    await renderPage();
    await waitFor(() => expect(screen.getByText("3 documents overdue")).toBeInTheDocument());
    expect(screen.getByText("2 forms overdue")).toBeInTheDocument();
  });

  it("shows both empty states when there is nothing to do", async () => {
    apiMock.GetAllRequestDocuments.mockResolvedValue(ok([]));
    apiMock.GetAllClientForms.mockResolvedValue(ok([]));
    await renderPage();
    await waitFor(() => expect(screen.getByText("No document requests")).toBeInTheDocument());
    expect(screen.getByText("No form requests")).toBeInTheDocument();
  });

  it("copes with responses carrying no data at all", async () => {
    apiMock.GetAllRequestDocuments.mockResolvedValue({});
    apiMock.GetAllClientForms.mockResolvedValue({});
    await renderPage();
    await waitFor(() => expect(screen.getByText("No document requests")).toBeInTheDocument());
  });

  it("still loads the forms when the documents fetch fails", async () => {
    apiMock.GetAllRequestDocuments.mockRejectedValue(new Error("offline"));
    await renderPage();
    await waitFor(() => expect(screen.getByText("Intake questionnaire")).toBeInTheDocument());
    expect(screen.getByText("No document requests")).toBeInTheDocument();
  });

  it("still shows the documents when the forms fetch fails", async () => {
    apiMock.GetAllClientForms.mockRejectedValue(new Error("offline"));
    await renderPage();
    await waitFor(() => expect(screen.getByText("Proof of address")).toBeInTheDocument());
    expect(screen.getByText("No form requests")).toBeInTheDocument();
  });
});

describe("status colouring", () => {
  it.each([
    ["UPLOADED", "status-success"],
    ["COMPLETED", "status-success"],
    ["FILLED", "status-success"],
    ["OVERDUE", "status-danger"],
    ["PENDING", "status-warning"],
    ["something else", "status-warning"],
  ])("renders %s as %s", async (status, expected) => {
    apiMock.GetAllRequestDocuments.mockResolvedValue(ok([request({ status })]));
    await renderPage();
    await waitFor(() =>
      expect(document.body.querySelector(`.${expected}`)).toBeInTheDocument()
    );
  });

  it("is not fooled by casing or stray whitespace", async () => {
    apiMock.GetAllRequestDocuments.mockResolvedValue(ok([request({ status: "  uploaded " })]));
    await renderPage();
    await waitFor(() =>
      expect(document.body.querySelector(".status-success")).toBeInTheDocument()
    );
  });

  it("dashes a request with no due date", async () => {
    apiMock.GetAllRequestDocuments.mockResolvedValue(ok([request({ dueDate: null })]));
    await renderPage();
    await waitFor(() => expect(screen.getAllByText("—").length).toBeGreaterThan(0));
  });
});

describe("an unfulfilled request", () => {
  it("offers both upload routes when expanded", async () => {
    await renderPage();
    await expandRequest();
    expect(screen.getByText("Awaiting upload...")).toBeInTheDocument();
    expect(screen.getByText("Upload New")).toBeInTheDocument();
    expect(screen.getByText("Select from My Documents")).toBeInTheDocument();
  });

  it("opens the upload modal", async () => {
    await renderPage();
    await expandRequest();
    fireEvent.click(screen.getByText("Upload New"));
    await waitFor(() => expect(screen.getByTestId("upload-open")).toBeInTheDocument());
  });

  it("opens the my-documents modal", async () => {
    await renderPage();
    await expandRequest();
    fireEvent.click(screen.getByText("Select from My Documents"));
    await waitFor(() => expect(screen.getByTestId("select-open")).toBeInTheDocument());
  });

  it("forgets the request when the upload modal is dismissed", async () => {
    await renderPage();
    await expandRequest();
    fireEvent.click(screen.getByText("Upload New"));
    await waitFor(() => expect(screen.getByTestId("upload-open")).toBeInTheDocument());
    act(() => modalProps.upload.onClose());
    await waitFor(() => expect(screen.queryByTestId("upload-open")).toBeNull());
  });

  it("forgets the request when the my-documents modal is dismissed", async () => {
    await renderPage();
    await expandRequest();
    fireEvent.click(screen.getByText("Select from My Documents"));
    await waitFor(() => expect(screen.getByTestId("select-open")).toBeInTheDocument());
    act(() => modalProps.select.onClose());
    await waitFor(() => expect(screen.queryByTestId("select-open")).toBeNull());
  });
});

describe("attaching documents", () => {
  const openUpload = async () => {
    await renderPage();
    await expandRequest();
    fireEvent.click(screen.getByText("Upload New"));
    await waitFor(() => expect(screen.getByTestId("upload-open")).toBeInTheDocument());
  };

  it("sends one document per url, keyed doc1, doc2, ...", async () => {
    apiMock.GetAllRequestDocuments.mockResolvedValue(ok([request({ allowMultiple: true })]));
    await openUpload();
    await act(async () => {
      await modalProps.upload.onFilesReady(["https://x/a.PDF", "https://x/b.png"]);
    });

    const [payload] = apiMock.AttachDocumentsToRequest.mock.calls[0];
    expect(payload.requestId).toBe("r1");
    expect(Object.keys(payload.documentDetails)).toEqual(["doc1", "doc2"]);
    // The extension is taken from the url and lowercased for the file type.
    expect(payload.documentDetails.doc1.fileType).toBe("pdf");
    expect(payload.documentDetails.doc2.name).toBe("Document 2 - Proof of address");
  });

  it("takes the file type from the last dot in the whole url", async () => {
    await openUpload();
    await act(async () => {
      await modalProps.upload.onFilesReady(["https://files.example.com/report"]);
    });
    const [payload] = apiMock.AttachDocumentsToRequest.mock.calls[0];
    // The split is over the entire url, not just its last path segment, so a
    // dotless filename inherits whatever followed the host's last dot.
    expect(payload.documentDetails.doc1.fileType).toBe("com/report");
  });

  it("confirms a single attachment in the singular", async () => {
    await openUpload();
    await act(async () => { await modalProps.upload.onFilesReady(["https://x/a.pdf"]); });
    expect(showToast).toHaveBeenCalledWith("1 document attached successfully", "success");
  });

  it("confirms several attachments in the plural", async () => {
    apiMock.GetAllRequestDocuments.mockResolvedValue(ok([request({ allowMultiple: true })]));
    await openUpload();
    await act(async () => {
      await modalProps.upload.onFilesReady(["https://x/a.pdf", "https://x/b.pdf"]);
    });
    expect(showToast).toHaveBeenCalledWith("2 documents attached successfully", "success");
  });

  it("reloads the request list once the attachment lands", async () => {
    await openUpload();
    const before = apiMock.GetAllRequestDocuments.mock.calls.length;
    await act(async () => { await modalProps.upload.onFilesReady(["https://x/a.pdf"]); });
    expect(apiMock.GetAllRequestDocuments.mock.calls.length).toBe(before + 1);
  });

  it("refuses an empty selection", async () => {
    await openUpload();
    await act(async () => { await modalProps.upload.onFilesReady([]); });
    expect(showToast).toHaveBeenCalledWith("No files selected", "error");
    expect(apiMock.AttachDocumentsToRequest).not.toHaveBeenCalled();
  });

  it("refuses a selection that is not a list", async () => {
    await openUpload();
    await act(async () => { await modalProps.upload.onFilesReady(undefined); });
    expect(showToast).toHaveBeenCalledWith("No files selected", "error");
  });

  it("refuses several files against a single-document request", async () => {
    await openUpload();
    await act(async () => {
      await modalProps.upload.onFilesReady(["https://x/a.pdf", "https://x/b.pdf"]);
    });
    expect(showToast).toHaveBeenCalledWith("This request allows only one document", "error");
    expect(apiMock.AttachDocumentsToRequest).not.toHaveBeenCalled();
  });

  it("reports a failed attachment", async () => {
    apiMock.AttachDocumentsToRequest.mockRejectedValue(new Error("server said no"));
    await openUpload();
    await act(async () => { await modalProps.upload.onFilesReady(["https://x/a.pdf"]); });
    expect(showToast).toHaveBeenCalledWith("Failed to attach documents", "error");
  });

  it("leaves the list alone when the reload fails", async () => {
    await openUpload();
    apiMock.GetAllRequestDocuments.mockRejectedValue(new Error("offline"));
    await act(async () => { await modalProps.upload.onFilesReady(["https://x/a.pdf"]); });
    expect(showToast).toHaveBeenCalledWith("1 document attached successfully", "success");
    await waitFor(() => expect(screen.getByText("Proof of address")).toBeInTheDocument());
  });

  it("attaches from the my-documents route too", async () => {
    await renderPage();
    await expandRequest();
    fireEvent.click(screen.getByText("Select from My Documents"));
    await waitFor(() => expect(screen.getByTestId("select-open")).toBeInTheDocument());
    await act(async () => {
      await modalProps.select.onDocumentsSelected(["https://x/a.pdf"]);
    });
    expect(apiMock.AttachDocumentsToRequest).toHaveBeenCalled();
  });
});

describe("a fulfilled request", () => {
  const uploaded = (documentDetails, over = {}) =>
    request({
      status: "UPLOADED",
      clientDocuments: [{ createdAt: "2026-03-02", documentDetails, ...over }],
    });

  it("lists every document across the entries", async () => {
    apiMock.GetAllRequestDocuments.mockResolvedValue(
      ok([
        uploaded({
          doc1: { name: "Bill.pdf", url: "https://x/a.pdf", fileType: "pdf", size: "1 MB" },
          doc2: { name: "Lease.pdf", url: "https://x/b.pdf", fileType: "pdf", size: "2 MB" },
        }),
      ])
    );
    await renderPage();
    await expandRequest();
    expect(screen.getByText("2 Documents Uploaded")).toBeInTheDocument();
    expect(screen.getByText("Bill.pdf")).toBeInTheDocument();
    expect(screen.getByText("Lease.pdf")).toBeInTheDocument();
  });

  it("says one document in the singular", async () => {
    apiMock.GetAllRequestDocuments.mockResolvedValue(
      ok([uploaded({ doc1: { name: "Bill.pdf", url: "https://x/a.pdf", fileType: "pdf" } })])
    );
    await renderPage();
    await expandRequest();
    expect(screen.getByText("1 Document Uploaded")).toBeInTheDocument();
  });

  it("labels a document the API named nothing", async () => {
    apiMock.GetAllRequestDocuments.mockResolvedValue(
      ok([uploaded({ doc1: { url: "https://x/a.pdf" } })])
    );
    await renderPage();
    await expandRequest();
    expect(screen.getByText("Document")).toBeInTheDocument();
    expect(screen.getByText("FILE")).toBeInTheDocument();
  });

  it("hides a placeholder size rather than printing a dash", async () => {
    apiMock.GetAllRequestDocuments.mockResolvedValue(
      ok([uploaded({ doc1: { name: "Bill.pdf", url: "https://x/a.pdf", size: "—" } })])
    );
    await renderPage();
    await expandRequest();
    expect(screen.getByText("Bill.pdf")).toBeInTheDocument();
  });

  it("skips an entry that carries no document details", async () => {
    apiMock.GetAllRequestDocuments.mockResolvedValue(
      ok([
        request({
          status: "UPLOADED",
          clientDocuments: [{ createdAt: "2026-03-02" }],
        }),
      ])
    );
    await renderPage();
    await expandRequest();
    expect(screen.getByText("0 Documents Uploaded")).toBeInTheDocument();
  });

  it("opens a document in the viewer", async () => {
    apiMock.GetAllRequestDocuments.mockResolvedValue(
      ok([uploaded({ doc1: { name: "Bill.pdf", url: "https://x/a.pdf", fileType: "pdf" } })])
    );
    await renderPage();
    await expandRequest();
    fireEvent.click(screen.getByText("View"));
    expect(openDocument).toHaveBeenCalledWith("https://x/a.pdf", "Bill.pdf");
  });

  it("names an unnamed document for the viewer too", async () => {
    apiMock.GetAllRequestDocuments.mockResolvedValue(
      ok([uploaded({ doc1: { url: "https://x/a.pdf", name: "" } })])
    );
    await renderPage();
    await expandRequest();
    fireEvent.click(screen.getByText("View"));
    expect(openDocument).toHaveBeenCalledWith("https://x/a.pdf", "Document");
  });
});

describe("the forms table", () => {
  it("links a pending form to its renderer", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText("Fill form")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Fill form"));
    expect(navigate).toHaveBeenCalledWith("/forms/renderer/form-1");
  });

  it("offers no link once a form is filled", async () => {
    apiMock.GetAllClientForms.mockResolvedValue(ok([form({ status: "FILLED" })]));
    await renderPage();
    await waitFor(() => expect(screen.getByText("Intake questionnaire")).toBeInTheDocument());
    expect(screen.queryByText("Fill form")).not.toBeInTheDocument();
  });
});

describe("edges of the request list", () => {
  const openUpload = async () => {
    await renderPage();
    await expandRequest();
    fireEvent.click(screen.getByText("Upload New"));
    await waitFor(() => expect(screen.getByTestId("upload-open")).toBeInTheDocument());
  };

  it("copes with a request that records no attached documents", async () => {
    apiMock.GetAllRequestDocuments.mockResolvedValue(
      ok([request({ clientDocuments: undefined })])
    );
    await renderPage();
    await expandRequest();
    expect(screen.getByText("Awaiting upload...")).toBeInTheDocument();
  });

  it("reshapes the reloaded list the same way as the first load", async () => {
    await openUpload();
    apiMock.GetAllRequestDocuments.mockResolvedValue(
      ok([
        request({
          id: "r2",
          name: undefined,
          description: undefined,
          status: undefined,
          allowMultiple: undefined,
          clientDocuments: undefined,
        }),
      ])
    );
    await act(async () => { await modalProps.upload.onFilesReady(["https://x/a.pdf"]); });

    await waitFor(() => expect(screen.getByText("Unnamed Request")).toBeInTheDocument());
    expect(document.body.querySelector(".status-warning")).toBeInTheDocument();
  });

  it("copes with a reload that returns nothing at all", async () => {
    await openUpload();
    apiMock.GetAllRequestDocuments.mockResolvedValue({});
    await act(async () => { await modalProps.upload.onFilesReady(["https://x/a.pdf"]); });
    await waitFor(() => expect(screen.getByText("No document requests")).toBeInTheDocument());
  });

  it("keeps a document's own name when opening it from the viewer", async () => {
    apiMock.GetAllRequestDocuments.mockResolvedValue(
      ok([
        request({
          status: "UPLOADED",
          clientDocuments: [
            {
              createdAt: "2026-03-02",
              documentDetails: { doc1: { name: "Bill.pdf", url: "https://cdn/a.pdf" } },
            },
          ],
        }),
      ])
    );
    await renderPage();
    await expandRequest();
    fireEvent.click(screen.getByText("View"));
    expect(openDocument).toHaveBeenCalledWith("https://cdn/a.pdf", "Bill.pdf");
  });
});

describe("a url the file-type reader cannot parse", () => {
  it("calls a url with no dot in it an unknown type", async () => {
    await renderPage();
    await expandRequest();
    fireEvent.click(screen.getByText("Upload New"));
    await waitFor(() => expect(screen.getByTestId("upload-open")).toBeInTheDocument());

    await act(async () => {
      await modalProps.upload.onFilesReady(["https://cdn/report"]);
    });
    // With nothing after a dot to take, the split yields the whole string, and
    // only a genuinely empty result falls through to "unknown".
    const [payload] = apiMock.AttachDocumentsToRequest.mock.calls[0];
    expect(payload.documentDetails.doc1.fileType).toBe("https://cdn/report");
  });

  it("calls a url ending in a dot an unknown type", async () => {
    await renderPage();
    await expandRequest();
    fireEvent.click(screen.getByText("Upload New"));
    await waitFor(() => expect(screen.getByTestId("upload-open")).toBeInTheDocument());

    await act(async () => {
      await modalProps.upload.onFilesReady(["https://cdn/report."]);
    });
    const [payload] = apiMock.AttachDocumentsToRequest.mock.calls[0];
    expect(payload.documentDetails.doc1.fileType).toBe("unknown");
  });
});

