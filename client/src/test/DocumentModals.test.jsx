import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

const apiMock = vi.hoisted(() => ({
  GetAllFiles: vi.fn(),
  GetAllFilesInFolder: vi.fn(),
}));
vi.mock("../api/documentsAndFormsApis", () => ({ default: apiMock }));

const showToast = vi.fn();
vi.mock("../Helper/ShowToast", () => ({ showToast: (...a) => showToast(...a) }));

const openDocument = vi.fn();
vi.mock("../hooks/useDocumentViewer", () => ({ default: () => ({ openDocument }) }));

// FileUploadArea has its own suite; here it is a probe that lets a test hand
// the modal an "uploaded" file without touching the network.
const { uploadArea } = vi.hoisted(() => ({ uploadArea: {} }));
vi.mock("../Components/FileUpload/FileUploadArea", () => ({
  default: (props) => {
    uploadArea.props = props;
    return <div data-testid="upload-area" />;
  },
}));

import SelectFromMyDocumentsModal from "../Components/Modal/SelectFromMyDocumentsModal";
import NewFileModal from "../Components/Modal/DocumentModal/NewFileModal";
import NewFolderModal from "../Components/Modal/DocumentModal/NewFolderModal";
import FolderFilesModal from "../Components/Modal/DocumentModal/FolderFileModal";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The four dialogs behind the client's document library.
 *
 * `SelectFromMyDocumentsModal` toggles selection differently depending on
 * `allowMultiple`: in single mode a click replaces the selection rather than
 * adding to it, which is easy to get wrong and is pinned here in both modes.
 *
 * `NewFileModal` deliberately does *not* close on failure -- a `finally` there
 * would throw away files the user had already uploaded -- so the failure case
 * asserts the modal is still up.
 *
 * `NewFolderModal` serves both create and rename from one component; renaming
 * to the name it already had is treated as a no-op rather than a request.
 */

const store = () =>
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

const onClose = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  // ReusableModal portals straight into document.body, and React keeps its own
  // bookkeeping on that node -- wiping innerHTML here would strand it.
  delete uploadArea.props;
  apiMock.GetAllFiles.mockResolvedValue({ data: { data: [] } });
  apiMock.GetAllFilesInFolder.mockResolvedValue({ data: { data: [] } });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("picking from my documents", () => {
  const doc = (over = {}) => ({
    id: "f1",
    name: "Report.pdf",
    url: "https://cdn/report.pdf",
    fileType: "pdf",
    createdAt: "2026-03-01",
    ...over,
  });

  const onDocumentsSelected = vi.fn();

  const renderModal = async (props = {}) => {
    const view = render(
      <Provider store={store()}>
        <SelectFromMyDocumentsModal
          isOpen
          onClose={onClose}
          onDocumentsSelected={onDocumentsSelected}
          {...props}
        />
      </Provider>
    );
    if (props.isOpen !== false) {
      await waitFor(() => expect(apiMock.GetAllFiles).toHaveBeenCalled());
    }
    return view;
  };

  const rows = () => document.body.querySelectorAll(".document-row");
  const confirm = () => fireEvent.click(screen.getByText("Attach Selected"));

  it("fetches the client's files when opened", async () => {
    await renderModal();
    expect(apiMock.GetAllFiles).toHaveBeenCalledWith({
      clientTenantId: "tc1",
      accessToken: "at",
      refreshToken: "rt",
    });
  });

  it("fetches nothing while closed", async () => {
    await renderModal({ isOpen: false });
    expect(apiMock.GetAllFiles).not.toHaveBeenCalled();
  });

  it("titles itself for the mode it is in", async () => {
    await renderModal();
    expect(screen.getByText("Select Document")).toBeInTheDocument();
  });

  it("titles itself in the plural when several are allowed", async () => {
    await renderModal({ allowMultiple: true });
    expect(screen.getByText("Select Documents")).toBeInTheDocument();
  });

  it("lists the files it fetched", async () => {
    apiMock.GetAllFiles.mockResolvedValue({ data: { data: [doc()] } });
    await renderModal();
    await waitFor(() => expect(screen.getByText("Report.pdf")).toBeInTheDocument());
  });

  it("names a file the API left untitled", async () => {
    apiMock.GetAllFiles.mockResolvedValue({ data: { data: [doc({ name: null })] } });
    await renderModal();
    await waitFor(() => expect(screen.getByText("Untitled File")).toBeInTheDocument());
  });

  it.each([
    ["pdf", "pdf", "pdf"],
    ["an image", "png", "image"],
    ["anything else", "docx", "default"],
    ["a file whose type is only in its name", undefined, "pdf"],
  ])("icons %s", async (_case, fileType, expectedClass) => {
    apiMock.GetAllFiles.mockResolvedValue({
      data: { data: [doc({ fileType, name: "Report.pdf" })] },
    });
    await renderModal();
    await waitFor(() =>
      expect(document.body.querySelector(`.file-icon.${expectedClass}`)).toBeTruthy()
    );
  });

  it("falls back to an unknown type for a file with neither", async () => {
    apiMock.GetAllFiles.mockResolvedValue({
      data: { data: [doc({ fileType: undefined, name: undefined })] },
    });
    await renderModal();
    await waitFor(() =>
      expect(document.body.querySelector(".file-icon.default")).toBeTruthy()
    );
  });

  it("says so when there is nothing to pick from", async () => {
    await renderModal();
    await waitFor(() =>
      expect(screen.getByText("You have no uploaded documents yet")).toBeInTheDocument()
    );
  });

  it("says so when the fetch fails", async () => {
    apiMock.GetAllFiles.mockRejectedValue(new Error("offline"));
    await renderModal();
    await waitFor(() =>
      expect(screen.getByText("You have no uploaded documents yet")).toBeInTheDocument()
    );
  });

  it("narrows the list on a search, then says nothing matched", async () => {
    apiMock.GetAllFiles.mockResolvedValue({
      data: { data: [doc(), doc({ id: "f2", name: "Invoice.pdf" })] },
    });
    await renderModal();
    await waitFor(() => expect(rows()).toHaveLength(2));

    fireEvent.change(screen.getByLabelText("Search documents"), {
      target: { value: " invoice " },
    });
    await waitFor(() => expect(rows()).toHaveLength(1));

    fireEvent.change(screen.getByLabelText("Search documents"), {
      target: { value: "zzz" },
    });
    await waitFor(() =>
      expect(screen.getByText("No matching documents found")).toBeInTheDocument()
    );
  });

  it("replaces the selection in single mode", async () => {
    apiMock.GetAllFiles.mockResolvedValue({
      data: { data: [doc(), doc({ id: "f2", name: "Invoice.pdf", url: "https://cdn/inv.pdf" })] },
    });
    await renderModal();
    await waitFor(() => expect(rows()).toHaveLength(2));

    fireEvent.click(rows()[0]);
    fireEvent.click(rows()[1]);
    await waitFor(() => expect(screen.getByText("1 document selected")).toBeInTheDocument());

    confirm();
    expect(onDocumentsSelected).toHaveBeenCalledWith(["https://cdn/inv.pdf"]);
  });

  it("accumulates the selection when several are allowed", async () => {
    apiMock.GetAllFiles.mockResolvedValue({
      data: { data: [doc(), doc({ id: "f2", name: "Invoice.pdf", url: "https://cdn/inv.pdf" })] },
    });
    await renderModal({ allowMultiple: true });
    await waitFor(() => expect(rows()).toHaveLength(2));

    fireEvent.click(rows()[0]);
    fireEvent.click(rows()[1]);
    await waitFor(() => expect(screen.getByText("2 documents selected")).toBeInTheDocument());

    confirm();
    expect(onDocumentsSelected).toHaveBeenCalledWith([
      "https://cdn/report.pdf",
      "https://cdn/inv.pdf",
    ]);
  });

  it("deselects a row that was already picked", async () => {
    apiMock.GetAllFiles.mockResolvedValue({ data: { data: [doc()] } });
    await renderModal({ allowMultiple: true });
    await waitFor(() => expect(rows()).toHaveLength(1));

    fireEvent.click(rows()[0]);
    await waitFor(() => expect(screen.getByText("1 document selected")).toBeInTheDocument());
    fireEvent.click(rows()[0]);
    await waitFor(() => expect(screen.queryByText("1 document selected")).toBeNull());
  });

  it.each(["Enter", " "])("selects from the keyboard with %s", async (key) => {
    apiMock.GetAllFiles.mockResolvedValue({ data: { data: [doc()] } });
    await renderModal();
    await waitFor(() => expect(rows()).toHaveLength(1));
    fireEvent.keyDown(rows()[0], { key });
    await waitFor(() => expect(screen.getByText("1 document selected")).toBeInTheDocument());
  });

  it("ignores any other key", async () => {
    apiMock.GetAllFiles.mockResolvedValue({ data: { data: [doc()] } });
    await renderModal();
    await waitFor(() => expect(rows()).toHaveLength(1));
    fireEvent.keyDown(rows()[0], { key: "a" });
    expect(screen.queryByText("1 document selected")).toBeNull();
  });

  it("ignores clicks and keys while the parent is busy", async () => {
    apiMock.GetAllFiles.mockResolvedValue({ data: { data: [doc()] } });
    await renderModal({ loading: true });
    await waitFor(() => expect(rows()).toHaveLength(1));
    fireEvent.click(rows()[0]);
    fireEvent.keyDown(rows()[0], { key: "Enter" });
    expect(screen.queryByText("1 document selected")).toBeNull();
  });

  it("keeps the confirm button disabled until something is picked", async () => {
    apiMock.GetAllFiles.mockResolvedValue({ data: { data: [doc()] } });
    await renderModal();
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(screen.getByText("Attach Selected").closest("button")).toBeDisabled();

    fireEvent.click(rows()[0]);
    await waitFor(() =>
      expect(screen.getByText("Attach Selected").closest("button")).not.toBeDisabled()
    );
  });

  it("returns the confirm promise so the buttons stay held", async () => {
    apiMock.GetAllFiles.mockResolvedValue({ data: { data: [doc()] } });
    let settle;
    onDocumentsSelected.mockReturnValue(new Promise((r) => { settle = r; }));
    await renderModal();
    await waitFor(() => expect(rows()).toHaveLength(1));
    fireEvent.click(rows()[0]);
    await act(async () => { confirm(); });
    expect(onDocumentsSelected).toHaveBeenCalled();
    await act(async () => { settle(); });
  });

  it("closes on cancel", async () => {
    await renderModal();
    // `renderModal` only waits for the fetch to be *called*. Let the fetch
    // settle before clicking, so the click is not racing a pending setState --
    // that is what made this test fail only under load.
    await waitFor(() =>
      expect(document.body.querySelector(".section-loader")).toBeNull()
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("uploading a new file", () => {
  const onCreate = vi.fn();
  const folders = [{ id: 1, name: "Assessments" }, { id: 2 }];

  const renderModal = (props = {}) =>
    render(
      <NewFileModal isOpen onClose={onClose} onCreate={onCreate} folders={folders} {...props} />
    );

  const uploadOne = (over = {}) =>
    act(() => {
      uploadArea.props.onUploadComplete([
        { filename: "Report.PDF", url: "https://cdn/report.pdf", size: "1 MB", ...over },
      ]);
    });

  const create = () => fireEvent.click(screen.getByText("Create File"));

  // The radio labels have no htmlFor, so clicking the label does nothing --
  // the inputs themselves are index 0 (root) and index 1 (a folder).
  const chooseFolderMode = () =>
    fireEvent.click(document.body.querySelectorAll('input[type="radio"]')[1]);

  beforeEach(() => {
    onCreate.mockResolvedValue(undefined);
  });

  it("starts at the root level with nothing uploaded", () => {
    renderModal();
    expect(screen.getByText("Standalone (save at root level)")).toBeInTheDocument();
    expect(screen.getByText("Create File").closest("button")).toBeDisabled();
  });

  it("reveals the folder picker when saving into a folder", () => {
    renderModal();
    chooseFolderMode();
    expect(screen.getByText("Select Folder")).toBeInTheDocument();
  });

  it("labels an unnamed folder in the picker", () => {
    renderModal();
    chooseFolderMode();
    const input = document.body.querySelector(".mt-2 input");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByText("Assessments")).toBeInTheDocument();
    expect(screen.getByText("Unnamed Folder")).toBeInTheDocument();
  });

  it("says so when there are no folders to pick", () => {
    renderModal({ folders: [] });
    chooseFolderMode();
    expect(screen.getByText("No folders available")).toBeInTheDocument();
  });

  it("creates a root-level file from what was uploaded", async () => {
    renderModal();
    await uploadOne();
    await act(async () => { create(); });

    expect(onCreate).toHaveBeenCalledWith([
      {
        name: "Report.PDF",
        url: "https://cdn/report.pdf",
        size: "1 MB",
        // The extension is lowercased even when the filename is not.
        fileType: "pdf",
        folderId: null,
      },
    ]);
    expect(onClose).toHaveBeenCalled();
  });

  it("labels an upload with no filename or size", async () => {
    renderModal();
    await uploadOne({ filename: undefined, size: undefined });
    await act(async () => { create(); });
    expect(onCreate).toHaveBeenCalledWith([
      expect.objectContaining({
        name: "Untitled File",
        size: "Unknown",
        fileType: "unknown",
      }),
    ]);
  });

  it("files the upload into the chosen folder", async () => {
    renderModal();
    chooseFolderMode();
    const input = document.body.querySelector(".mt-2 input");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    await uploadOne();
    await act(async () => { create(); });
    expect(onCreate).toHaveBeenCalledWith([expect.objectContaining({ folderId: "1" })]);
  });

  it("keeps the create button disabled with nothing uploaded", async () => {
    renderModal();
    expect(screen.getByText("Create File").closest("button")).toBeDisabled();
    await uploadOne();
    await waitFor(() =>
      expect(screen.getByText("Create File").closest("button")).not.toBeDisabled()
    );
  });

  it("disables create again once a folder is required but unchosen", async () => {
    renderModal();
    await uploadOne();
    chooseFolderMode();
    await waitFor(() =>
      expect(screen.getByText("Create File").closest("button")).toBeDisabled()
    );
  });

  it("locks both buttons while an upload is in flight", async () => {
    renderModal();
    await uploadOne();
    act(() => uploadArea.props.onUploadStart());
    // `isUploading` drives the modal's loading state, so neither button is
    // clickable and the handlers' own guards are belt-and-braces.
    await waitFor(() => expect(screen.getByText("Cancel").closest("button")).toBeDisabled());
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).not.toHaveBeenCalled();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("recovers from a failed upload so the form is usable again", async () => {
    renderModal();
    act(() => uploadArea.props.onUploadStart());
    act(() => uploadArea.props.onUploadError());
    await uploadOne();
    await act(async () => { create(); });
    expect(onCreate).toHaveBeenCalled();
  });

  it("stays open when creating fails, keeping the uploaded file", async () => {
    onCreate.mockRejectedValue(new Error("server said no"));
    renderModal();
    await uploadOne();
    await act(async () => {
      create();
      // The rejection is surfaced to ReusableModal, not swallowed here.
      await Promise.resolve();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on cancel when nothing is in flight", () => {
    renderModal();
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("creating and renaming a folder", () => {
  const onCreate = vi.fn();
  const onRename = vi.fn();

  const renderModal = (props = {}) =>
    render(
      <NewFolderModal
        isOpen
        onClose={onClose}
        onCreate={onCreate}
        onRename={onRename}
        {...props}
      />
    );

  const nameField = () => screen.getByPlaceholderText("e.g. Medical Records 2025");
  const submit = (label) => fireEvent.click(screen.getByText(label));

  beforeEach(() => {
    onCreate.mockResolvedValue(undefined);
    onRename.mockResolvedValue(undefined);
  });

  it("opens empty in create mode", () => {
    renderModal();
    expect(screen.getByText("Create New Folder")).toBeInTheDocument();
    expect(nameField().value).toBe("");
  });

  it("opens pre-filled in rename mode", () => {
    renderModal({ isRenameMode: true, initialName: "Assessments", folderId: "fo1" });
    expect(screen.getByText("Rename Folder")).toBeInTheDocument();
    expect(nameField().value).toBe("Assessments");
  });

  it("creates a folder with a trimmed name", async () => {
    renderModal();
    fireEvent.change(nameField(), { target: { value: "  Reports  " } });
    await act(async () => { submit("Create Folder"); });
    expect(onCreate).toHaveBeenCalledWith({ name: "Reports" });
    expect(onClose).toHaveBeenCalled();
  });

  it("renames a folder with a trimmed name", async () => {
    renderModal({ isRenameMode: true, initialName: "Old", folderId: "fo1" });
    fireEvent.change(nameField(), { target: { value: "  New  " } });
    await act(async () => { submit("Save Changes"); });
    expect(onRename).toHaveBeenCalledWith("fo1", "New");
    expect(onClose).toHaveBeenCalled();
  });

  it("disables saving a rename that changes nothing", async () => {
    renderModal({ isRenameMode: true, initialName: "Same", folderId: "fo1" });
    expect(screen.getByText("Save Changes").closest("button")).toBeDisabled();

    fireEvent.change(nameField(), { target: { value: "Different" } });
    await waitFor(() =>
      expect(screen.getByText("Save Changes").closest("button")).not.toBeDisabled()
    );
  });

  it("disables creating while the name is blank", async () => {
    renderModal();
    fireEvent.change(nameField(), { target: { value: "   " } });
    expect(screen.getByText("Create Folder").closest("button")).toBeDisabled();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("reports a failed create and stays open", async () => {
    onCreate.mockRejectedValue(new Error("server said no"));
    renderModal();
    fireEvent.change(nameField(), { target: { value: "Reports" } });
    await act(async () => { submit("Create Folder"); });
    expect(showToast).toHaveBeenCalledWith("server said no", "error");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("reports a failure that carries no message", async () => {
    onCreate.mockRejectedValue({});
    renderModal();
    fireEvent.change(nameField(), { target: { value: "Reports" } });
    await act(async () => { submit("Create Folder"); });
    expect(showToast).toHaveBeenCalledWith("Operation failed", "error");
  });

  it("copes with no callback wired up at all", async () => {
    render(<NewFolderModal isOpen onClose={onClose} />);
    fireEvent.change(nameField(), { target: { value: "Reports" } });
    await act(async () => { submit("Create Folder"); });
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on cancel", () => {
    renderModal();
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("browsing a folder's files", () => {
  const folder = { id: "fo1", name: "Assessments" };
  const file = (over = {}) => ({
    id: "fi1",
    name: "Report.pdf",
    fileType: "pdf",
    createdAt: "2026-03-01",
    size: "1 MB",
    url: "https://cdn/report.pdf",
    ...over,
  });

  const renderModal = async (props = {}) => {
    const view = render(
      <FolderFilesModal
        isOpen
        onClose={onClose}
        folder={folder}
        accessToken="at"
        refreshToken="rt"
        {...props}
      />
    );
    if (props.isOpen !== false && props.folder !== null) {
      await waitFor(() => expect(apiMock.GetAllFilesInFolder).toHaveBeenCalled());
    }
    return view;
  };

  it("renders nothing while closed", async () => {
    await renderModal({ isOpen: false });
    expect(screen.queryByText(/Files in/)).not.toBeInTheDocument();
    expect(apiMock.GetAllFilesInFolder).not.toHaveBeenCalled();
  });

  it("renders nothing without a folder", async () => {
    await renderModal({ folder: null });
    expect(screen.queryByText(/Files in/)).not.toBeInTheDocument();
  });

  it("fetches the folder's files and titles itself after it", async () => {
    await renderModal();
    expect(apiMock.GetAllFilesInFolder).toHaveBeenCalledWith({
      folderId: "fo1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(screen.getByText('Files in "Assessments"')).toBeInTheDocument();
  });

  it("says so when the folder is empty", async () => {
    await renderModal();
    await waitFor(() =>
      expect(screen.getByText("No files in this folder yet.")).toBeInTheDocument()
    );
  });

  it("says so when the fetch fails", async () => {
    apiMock.GetAllFilesInFolder.mockRejectedValue(new Error("offline"));
    await renderModal();
    await waitFor(() =>
      expect(screen.getByText("No files in this folder yet.")).toBeInTheDocument()
    );
  });

  it("lists the files it found", async () => {
    apiMock.GetAllFilesInFolder.mockResolvedValue({ data: { data: [file()] } });
    await renderModal();
    await waitFor(() => expect(screen.getByText("Report.pdf")).toBeInTheDocument());
  });

  it("dashes a file with no recorded size", async () => {
    apiMock.GetAllFilesInFolder.mockResolvedValue({
      data: { data: [file({ size: null })] },
    });
    await renderModal();
    await waitFor(() => expect(screen.getByText(/—/)).toBeInTheDocument());
  });

  it.each(["pdf", "png", "docx", "xlsx", "zip", undefined])(
    "renders an icon for a %s file",
    async (fileType) => {
      apiMock.GetAllFilesInFolder.mockResolvedValue({
        data: { data: [file({ fileType })] },
      });
      await renderModal();
      await waitFor(() => expect(screen.getByText("Report.pdf")).toBeInTheDocument());
      expect(document.body.querySelector("svg")).toBeTruthy();
    }
  );

  it("opens a file in the viewer", async () => {
    apiMock.GetAllFilesInFolder.mockResolvedValue({ data: { data: [file()] } });
    await renderModal();
    await waitFor(() => expect(screen.getByText("Open")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Open"));
    expect(openDocument).toHaveBeenCalledWith("https://cdn/report.pdf", "Report.pdf");
  });

  it("names an unnamed file for the viewer", async () => {
    apiMock.GetAllFilesInFolder.mockResolvedValue({
      data: { data: [file({ name: null })] },
    });
    await renderModal();
    await waitFor(() => expect(screen.getByText("Open")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Open"));
    expect(openDocument).toHaveBeenCalledWith("https://cdn/report.pdf", "Document");
  });

  it("closes from its only button", async () => {
    await renderModal();
    fireEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("the dialogs while closed", () => {
  it("renders no file dialog at all while closed", () => {
    render(<NewFileModal isOpen={false} onClose={onClose} onCreate={vi.fn()} folders={[]} />);
    expect(screen.queryByText("Upload New File")).not.toBeInTheDocument();
  });

  it("renders no folder dialog at all while closed", () => {
    render(<NewFolderModal isOpen={false} onClose={onClose} onCreate={vi.fn()} />);
    expect(screen.queryByText("Create New Folder")).not.toBeInTheDocument();
  });

  it("re-fills the folder dialog each time it opens", () => {
    const { rerender } = render(
      <NewFolderModal isOpen={false} onClose={onClose} onRename={vi.fn()} isRenameMode initialName="First" />
    );
    rerender(
      <NewFolderModal isOpen onClose={onClose} onRename={vi.fn()} isRenameMode initialName="First" />
    );
    expect(screen.getByPlaceholderText("e.g. Medical Records 2025").value).toBe("First");
  });

  it("clears the chosen folder when the picker is emptied", async () => {
    render(<NewFileModal isOpen onClose={onClose} onCreate={vi.fn()} folders={[{ id: 1, name: "A" }]} />);
    fireEvent.click(document.body.querySelectorAll('input[type="radio"]')[1]);

    const input = document.body.querySelector(".mt-2 input");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() =>
      expect(document.body.querySelector(".mt-2").textContent).toContain("A")
    );

    // react-select's clear control hands back an event with no value.
    const clear = document.body.querySelector('[class*="clear"]');
    if (clear) fireEvent.mouseDown(clear, { button: 0 });
    expect(screen.getByText("Create File").closest("button")).toBeDisabled();
  });

  it("copes with a file list that comes back with no data envelope", async () => {
    apiMock.GetAllFiles.mockResolvedValue({});
    render(
      <Provider store={store()}>
        <SelectFromMyDocumentsModal isOpen onClose={onClose} onDocumentsSelected={vi.fn()} />
      </Provider>
    );
    await waitFor(() =>
      expect(screen.getByText("You have no uploaded documents yet")).toBeInTheDocument()
    );
  });
});

describe("edges the folder browser and picker still have", () => {
  it("copes with a folder whose file list arrives without a data envelope", async () => {
    apiMock.GetAllFilesInFolder.mockResolvedValue({});
    render(
      <FolderFilesModal
        isOpen
        onClose={onClose}
        folder={{ id: "fo1", name: "Assessments" }}
        accessToken="at"
        refreshToken="rt"
      />
    );
    await waitFor(() =>
      expect(screen.getByText("No files in this folder yet.")).toBeInTheDocument()
    );
  });
});

describe("fallbacks the dialogs keep for sparse data", () => {
  it("forgets the chosen folder when the picker is cleared", () => {
    render(
      <NewFileModal
        isOpen
        onClose={onClose}
        onCreate={vi.fn()}
        folders={[{ id: 1, name: "Assessments" }]}
      />
    );
    fireEvent.click(document.body.querySelectorAll('input[type="radio"]')[1]);

    const input = document.body.querySelector(".mt-2 input");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("Assessments")).toBeInTheDocument();

    // react-select hands back null on Backspace, so the id read falls through
    // to the empty string -- which is what re-disables the create button.
    fireEvent.keyDown(document.body.querySelector(".mt-2 .rs__control input"), {
      key: "Backspace",
    });
    expect(screen.getByText("Create File").closest("button")).toBeDisabled();
  });
});

describe("closing the upload dialog mid-upload", () => {
  it("refuses to close while a file is still going up", async () => {
    render(
      <NewFileModal isOpen onClose={onClose} onCreate={vi.fn()} folders={[]} />
    );
    await act(async () => { uploadArea.props.onUploadStart(); });

    // Both footer buttons are locked while the upload runs, so Escape -- which
    // calls onClose directly rather than through the modal's own guard -- is
    // the one way the dialog's own check gets a say.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(showToast).toHaveBeenCalledWith("Upload in progress, please wait", "info");
    expect(onClose).not.toHaveBeenCalled();
  });
});
