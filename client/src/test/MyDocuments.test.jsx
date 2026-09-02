import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

const apiMock = vi.hoisted(() => ({
  GetAllFolders: vi.fn(),
  GetRecentFiles: vi.fn(),
  GetAllFiles: vi.fn(),
  CreateNewFolder: vi.fn(),
  UpdateFolderName: vi.fn(),
  CreateNewFile: vi.fn(),
}));
vi.mock("../api/documentsAndFormsApis", () => ({ default: apiMock }));

const showToast = vi.fn();
vi.mock("../Helper/ShowToast", () => ({ showToast: (...a) => showToast(...a) }));

const openDocument = vi.fn();
vi.mock("../hooks/useDocumentViewer", () => ({ default: () => ({ openDocument }) }));

// The three document modals have their own suites; here they are probes that
// expose the callbacks this page hands them.
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
vi.mock("../Components/Modal/DocumentModal/NewFolderModal", () => stubModal("folder"));
vi.mock("../Components/Modal/DocumentModal/NewFileModal", () => stubModal("file"));
vi.mock("../Components/Modal/DocumentModal/FolderFileModal", () => stubModal("folderFiles"));

import MyDocuments from "../Pages/DocumentsAndForms/MyDocuments/MyDocuments";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The client's document library.
 *
 * Folders, recent files and all files load in parallel and each has its own
 * catch, so one endpoint failing leaves the other two sections populated.
 *
 * A file's link is looked for under four different keys in turn -- `url`,
 * `fileUrl`, `downloadUrl`, `previewUrl` -- because the backend has used all
 * four; a file with none of them is rendered plain and warns rather than
 * opening. The single NewFolderModal serves both create and rename, told apart
 * by which callback the page passes it.
 */

const ok = (data) => ({ data: { data } });

const folder = (over = {}) => ({
  id: "fo1",
  name: "Assessments",
  createdAt: "2026-03-01",
  folderSize: 3,
  ...over,
});

const file = (over = {}) => ({
  id: "fi1",
  name: "Report.pdf",
  createdAt: "2026-03-01",
  size: "1 MB",
  uploadedBy: "Dr Ada Bell",
  url: "https://cdn/report.pdf",
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

const renderPage = async (store = makeStore()) => {
  const view = render(
    <Provider store={store}>
      <MyDocuments />
    </Provider>
  );
  await waitFor(() => expect(screen.getByText("My Documents")).toBeInTheDocument());
  return view;
};

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
  Object.keys(modalProps).forEach((k) => delete modalProps[k]);
  apiMock.GetAllFolders.mockResolvedValue(ok([folder()]));
  apiMock.GetRecentFiles.mockResolvedValue(ok([file()]));
  apiMock.GetAllFiles.mockResolvedValue(ok([file()]));
  apiMock.CreateNewFolder.mockResolvedValue(ok(folder({ id: "fo2", name: "New" })));
  apiMock.UpdateFolderName.mockResolvedValue({});
  apiMock.CreateNewFile.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading the three sections", () => {
  it("fetches all three with the client's tenant link", async () => {
    await renderPage();
    await waitFor(() => expect(apiMock.GetAllFiles).toHaveBeenCalled());
    const args = { clientTenantId: "tc1", accessToken: "at", refreshToken: "rt" };
    expect(apiMock.GetAllFolders).toHaveBeenCalledWith(args);
    expect(apiMock.GetRecentFiles).toHaveBeenCalledWith(args);
  });

  it("fetches nothing without a tenant link, and stops loading", async () => {
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: { auth: { isAuthenticated: false, user: null } },
    });
    await renderPage(store);
    expect(apiMock.GetAllFolders).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText("No folders yet")).toBeInTheDocument());
    expect(screen.getByText("No recent files")).toBeInTheDocument();
    expect(screen.getByText("No files uploaded yet")).toBeInTheDocument();
  });

  it("renders a folder card, a recent card and a table row", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText("Assessments")).toBeInTheDocument());
    expect(document.body.querySelector(".recent-card")).toBeInTheDocument();
    expect(screen.getByText("Dr Ada Bell")).toBeInTheDocument();
  });

  it("shows all three empty states when everything comes back empty", async () => {
    apiMock.GetAllFolders.mockResolvedValue(ok([]));
    apiMock.GetRecentFiles.mockResolvedValue(ok([]));
    apiMock.GetAllFiles.mockResolvedValue(ok([]));
    await renderPage();
    await waitFor(() => expect(screen.getByText("No folders yet")).toBeInTheDocument());
    expect(screen.getByText("No recent files")).toBeInTheDocument();
    expect(screen.getByText("No files uploaded yet")).toBeInTheDocument();
  });

  it("copes with responses carrying no data at all", async () => {
    apiMock.GetAllFolders.mockResolvedValue({});
    apiMock.GetRecentFiles.mockResolvedValue({});
    apiMock.GetAllFiles.mockResolvedValue({});
    await renderPage();
    await waitFor(() => expect(screen.getByText("No folders yet")).toBeInTheDocument());
  });

  it.each([
    ["GetAllFolders", "No folders yet"],
    ["GetRecentFiles", "No recent files"],
    ["GetAllFiles", "No files uploaded yet"],
  ])("keeps the other sections when %s fails", async (failing, emptyMessage) => {
    apiMock[failing].mockRejectedValue(new Error("offline"));
    await renderPage();
    await waitFor(() => expect(screen.getByText(emptyMessage)).toBeInTheDocument());
    // The other two still have their data.
    const empties = document.body.querySelectorAll(".empty-state");
    expect(empties).toHaveLength(1);
  });

  it("labels a file with no recorded size or uploader", async () => {
    apiMock.GetRecentFiles.mockResolvedValue(ok([file({ size: null })]));
    apiMock.GetAllFiles.mockResolvedValue(ok([file({ uploadedBy: null })]));
    await renderPage();
    await waitFor(() => expect(screen.getByText("Unknown")).toBeInTheDocument());
    expect(document.body.querySelector(".recent-meta").textContent).toContain("—");
  });

  it("labels a folder with no recorded item count", async () => {
    apiMock.GetAllFolders.mockResolvedValue(ok([folder({ folderSize: null })]));
    await renderPage();
    await waitFor(() =>
      expect(document.body.querySelector(".folder-meta").textContent).toContain("0 items")
    );
  });
});

describe("opening a file", () => {
  it.each([
    ["url", { url: "https://cdn/a.pdf" }],
    ["fileUrl", { url: null, fileUrl: "https://cdn/a.pdf" }],
    ["downloadUrl", { url: null, downloadUrl: "https://cdn/a.pdf" }],
    ["previewUrl", { url: null, previewUrl: "https://cdn/a.pdf" }],
  ])("finds the link under %s", async (_key, over) => {
    apiMock.GetRecentFiles.mockResolvedValue(ok([file(over)]));
    await renderPage();
    await waitFor(() => expect(document.body.querySelector(".recent-card")).toBeTruthy());
    fireEvent.click(document.body.querySelector(".recent-card"));
    expect(openDocument).toHaveBeenCalledWith("https://cdn/a.pdf", "Report.pdf");
  });

  it("warns when a recent file has no link at all", async () => {
    apiMock.GetRecentFiles.mockResolvedValue(ok([file({ url: "  " })]));
    await renderPage();
    await waitFor(() => expect(document.body.querySelector(".recent-card")).toBeTruthy());
    fireEvent.click(document.body.querySelector(".recent-card"));
    expect(showToast).toHaveBeenCalledWith("No file link available", "warning");
    expect(openDocument).not.toHaveBeenCalled();
  });

  it("opens a file from its name in the table", async () => {
    await renderPage();
    await waitFor(() => expect(document.body.querySelector(".file-name-cell")).toBeTruthy());
    fireEvent.click(document.body.querySelector(".file-name-cell"));
    expect(openDocument).toHaveBeenCalledWith("https://cdn/report.pdf", "Report.pdf");
  });

  it("warns when a table row has no link", async () => {
    apiMock.GetAllFiles.mockResolvedValue(ok([file({ url: "" })]));
    await renderPage();
    await waitFor(() => expect(document.body.querySelector(".file-name-cell")).toBeTruthy());
    fireEvent.click(document.body.querySelector(".file-name-cell"));
    expect(showToast).toHaveBeenCalledWith("No file link available", "warning");
  });

  it("opens a file from the row-actions menu", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByLabelText("More actions")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("More actions"));
    fireEvent.click(screen.getByText("View"));
    expect(openDocument).toHaveBeenCalledWith("https://cdn/report.pdf", "Report.pdf");
  });

  it("warns from the menu when the file has no link", async () => {
    apiMock.GetAllFiles.mockResolvedValue(ok([file({ url: "" })]));
    await renderPage();
    await waitFor(() => expect(screen.getByLabelText("More actions")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("More actions"));
    fireEvent.click(screen.getByText("View"));
    expect(showToast).toHaveBeenCalledWith(
      "No preview/download link available for this file",
      "warning"
    );
  });

  it("names an unnamed file for the viewer", async () => {
    apiMock.GetRecentFiles.mockResolvedValue(ok([file({ name: null })]));
    await renderPage();
    await waitFor(() => expect(document.body.querySelector(".recent-card")).toBeTruthy());
    fireEvent.click(document.body.querySelector(".recent-card"));
    expect(openDocument).toHaveBeenCalledWith("https://cdn/report.pdf", "Document");
  });
});

describe("the New menu", () => {
  it("opens the folder modal", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("New"));
    fireEvent.click(screen.getByText("New Folder"));
    await waitFor(() => expect(screen.getByTestId("folder-open")).toBeInTheDocument());
  });

  it("opens the file modal", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("New"));
    fireEvent.click(screen.getByText("New File"));
    await waitFor(() => expect(screen.getByTestId("file-open")).toBeInTheDocument());
  });

  it("closes again on a second click", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("New"));
    expect(screen.getByText("New File")).toBeInTheDocument();
    fireEvent.click(screen.getByText("New"));
    expect(screen.queryByText("New File")).not.toBeInTheDocument();
  });

  it("opens the folder modal from the folders empty state too", async () => {
    apiMock.GetAllFolders.mockResolvedValue(ok([]));
    await renderPage();
    await waitFor(() => expect(screen.getByText("No folders yet")).toBeInTheDocument());
    fireEvent.click(screen.getByText("New Folder"));
    await waitFor(() => expect(screen.getByTestId("folder-open")).toBeInTheDocument());
  });

  it("opens the file modal from the files empty state too", async () => {
    apiMock.GetAllFiles.mockResolvedValue(ok([]));
    await renderPage();
    await waitFor(() => expect(screen.getByText("Upload File")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Upload File"));
    await waitFor(() => expect(screen.getByTestId("file-open")).toBeInTheDocument());
  });
});

describe("creating and renaming a folder", () => {
  const openCreate = async () => {
    await renderPage();
    fireEvent.click(screen.getByText("New"));
    fireEvent.click(screen.getByText("New Folder"));
    await waitFor(() => expect(screen.getByTestId("folder-open")).toBeInTheDocument());
  };

  it("passes a create callback but no rename callback", async () => {
    await openCreate();
    expect(modalProps.folder.onCreate).toBeTypeOf("function");
    expect(modalProps.folder.onRename).toBeUndefined();
    expect(modalProps.folder.isRenameMode).toBe(false);
  });

  it("creates a folder and adds it to the grid", async () => {
    await openCreate();
    await act(async () => { await modalProps.folder.onCreate({ name: "  Reports  " }); });

    expect(apiMock.CreateNewFolder).toHaveBeenCalledWith({
      clientTenantId: "tc1",
      folderName: "Reports",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(showToast).toHaveBeenCalledWith('Folder "  Reports  " created', "success");
    // The grid now holds the original folder plus whatever the API returned.
    await waitFor(() =>
      expect(document.body.querySelectorAll(".folder-card")).toHaveLength(2)
    );
  });

  it("reports a failed creation", async () => {
    apiMock.CreateNewFolder.mockRejectedValue(new Error("server said no"));
    await openCreate();
    await act(async () => { await modalProps.folder.onCreate({ name: "Reports" }); });
    expect(showToast).toHaveBeenCalledWith("Failed to create folder", "error");
  });

  it("opens the same modal in rename mode, pre-filled", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByLabelText("Rename folder")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Rename folder"));

    await waitFor(() => expect(screen.getByTestId("folder-open")).toBeInTheDocument());
    expect(modalProps.folder.isRenameMode).toBe(true);
    expect(modalProps.folder.initialName).toBe("Assessments");
    expect(modalProps.folder.folderId).toBe("fo1");
    expect(modalProps.folder.onCreate).toBeUndefined();
  });

  it("renames the folder in place", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByLabelText("Rename folder")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Rename folder"));
    await act(async () => { await modalProps.folder.onRename("fo1", "  Renamed  "); });

    expect(apiMock.UpdateFolderName).toHaveBeenCalledWith({
      folderId: "fo1",
      name: "Renamed",
      accessToken: "at",
      refreshToken: "rt",
    });
    await waitFor(() => expect(screen.getByText("Renamed")).toBeInTheDocument());
  });

  it("reports a failed rename", async () => {
    apiMock.UpdateFolderName.mockRejectedValue(new Error("server said no"));
    await renderPage();
    await waitFor(() => expect(screen.getByLabelText("Rename folder")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Rename folder"));
    await act(async () => { await modalProps.folder.onRename("fo1", "Renamed"); });
    expect(showToast).toHaveBeenCalledWith("Failed to rename folder", "error");
  });

  it("closes both modes at once", async () => {
    await openCreate();
    act(() => modalProps.folder.onClose());
    await waitFor(() => expect(screen.queryByTestId("folder-open")).toBeNull());
  });
});

describe("uploading files", () => {
  const openFileModal = async () => {
    await renderPage();
    fireEvent.click(screen.getByText("New"));
    fireEvent.click(screen.getByText("New File"));
    await waitFor(() => expect(screen.getByTestId("file-open")).toBeInTheDocument());
  };

  it("creates one record per payload and reloads", async () => {
    await openFileModal();
    const before = apiMock.GetAllFiles.mock.calls.length;
    await act(async () => {
      await modalProps.file.onCreate([
        { name: "a.pdf", url: "https://cdn/a.pdf", size: "1 MB", fileType: "pdf", folderId: "fo1" },
        { name: "b.pdf", url: "https://cdn/b.pdf", size: "2 MB", fileType: "pdf" },
      ]);
    });

    expect(apiMock.CreateNewFile).toHaveBeenCalledTimes(2);
    expect(apiMock.CreateNewFile.mock.calls[0][0]).toEqual(
      expect.objectContaining({ name: "a.pdf", folderId: "fo1", clientTenantId: "tc1" })
    );
    // A payload with no folder is filed at the top level, not left undefined.
    expect(apiMock.CreateNewFile.mock.calls[1][0].folderId).toBeNull();
    expect(showToast).toHaveBeenCalledWith("File(s) uploaded successfully", "success");
    await waitFor(() =>
      expect(apiMock.GetAllFiles.mock.calls.length).toBeGreaterThan(before)
    );
  });

  it("reports a failed upload", async () => {
    apiMock.CreateNewFile.mockRejectedValue(new Error("server said no"));
    await openFileModal();
    await act(async () => {
      await modalProps.file.onCreate([{ name: "a.pdf", url: "https://cdn/a.pdf" }]);
    });
    expect(showToast).toHaveBeenCalledWith("Failed to upload file", "error");
  });

  it("hands the folder list to the file modal", async () => {
    await openFileModal();
    expect(modalProps.file.folders).toEqual([expect.objectContaining({ id: "fo1" })]);
  });

  it("closes the file modal", async () => {
    await openFileModal();
    act(() => modalProps.file.onClose());
    await waitFor(() => expect(screen.queryByTestId("file-open")).toBeNull());
  });
});

describe("browsing a folder", () => {
  it("opens the folder's file list on click", async () => {
    await renderPage();
    await waitFor(() => expect(document.body.querySelector(".folder-card")).toBeTruthy());
    fireEvent.click(document.body.querySelector(".folder-card"));
    await waitFor(() => expect(screen.getByTestId("folderFiles-open")).toBeInTheDocument());
    expect(modalProps.folderFiles.folder).toEqual(expect.objectContaining({ id: "fo1" }));
  });

  it.each(["Enter", " "])("opens it from the keyboard with %s", async (key) => {
    await renderPage();
    await waitFor(() => expect(document.body.querySelector(".folder-card")).toBeTruthy());
    fireEvent.keyDown(document.body.querySelector(".folder-card"), { key });
    await waitFor(() => expect(screen.getByTestId("folderFiles-open")).toBeInTheDocument());
  });

  it("ignores any other key", async () => {
    await renderPage();
    await waitFor(() => expect(document.body.querySelector(".folder-card")).toBeTruthy());
    fireEvent.keyDown(document.body.querySelector(".folder-card"), { key: "a" });
    expect(screen.queryByTestId("folderFiles-open")).toBeNull();
  });

  it("closes the folder's file list", async () => {
    await renderPage();
    await waitFor(() => expect(document.body.querySelector(".folder-card")).toBeTruthy());
    fireEvent.click(document.body.querySelector(".folder-card"));
    await waitFor(() => expect(screen.getByTestId("folderFiles-open")).toBeInTheDocument());
    act(() => modalProps.folderFiles.onClose());
    await waitFor(() => expect(screen.queryByTestId("folderFiles-open")).toBeNull());
  });
});

describe("the page's own controls", () => {
  it("records a search term", async () => {
    await renderPage();
    // The all-files table has a search box of its own with the same
    // placeholder; this one is the page header's.
    const box = document.body.querySelector(".table-search input");
    fireEvent.change(box, { target: { value: "report" } });
    expect(box.value).toBe("report");
  });

  it("switches between list and grid", async () => {
    await renderPage();
    const [list, grid] = document.body.querySelectorAll(".view-btn");
    expect(list.className).toContain("active");
    fireEvent.click(grid);
    expect(grid.className).toContain("active");
    fireEvent.click(list);
    expect(list.className).toContain("active");
  });
});

describe("edges of the library", () => {
  it("stays quiet about missing auth outside development", async () => {
    vi.stubEnv("DEV", false);
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: { auth: { isAuthenticated: false, user: null } },
    });
    await renderPage(store);
    await waitFor(() => expect(screen.getByText("No folders yet")).toBeInTheDocument());
    vi.unstubAllEnvs();
  });

  it("renders a recent file that carries no link under any key", async () => {
    apiMock.GetRecentFiles.mockResolvedValue(
      ok([file({ url: null, fileUrl: null, downloadUrl: null, previewUrl: null })])
    );
    apiMock.GetAllFiles.mockResolvedValue(
      ok([file({ url: null, fileUrl: null, downloadUrl: null, previewUrl: null })])
    );
    await renderPage();
    const card = await waitFor(() => {
      const found = document.body.querySelector(".recent-card");
      expect(found).toBeTruthy();
      return found;
    });
    // With nothing to open, the card is styled as plain text rather than a link.
    expect(card.style.cursor).toBe("default");
    expect(document.body.querySelector(".recent-name").style.textDecoration).toBe("none");

    fireEvent.click(card);
    expect(showToast).toHaveBeenCalledWith("No file link available", "warning");
  });

  it("renames only the folder that was chosen", async () => {
    apiMock.GetAllFolders.mockResolvedValue(
      ok([folder(), folder({ id: "fo2", name: "Consents" })])
    );
    await renderPage();
    await waitFor(() => expect(screen.getAllByLabelText("Rename folder")).toHaveLength(2));
    fireEvent.click(screen.getAllByLabelText("Rename folder")[0]);
    await act(async () => { await modalProps.folder.onRename("fo1", "Renamed"); });

    await waitFor(() => expect(screen.getByText("Renamed")).toBeInTheDocument());
    expect(screen.getByText("Consents")).toBeInTheDocument();
  });

  it("opens the rename dialog empty for a folder with no name", async () => {
    apiMock.GetAllFolders.mockResolvedValue(ok([folder({ name: undefined })]));
    await renderPage();
    await waitFor(() => expect(screen.getByLabelText("Rename folder")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Rename folder"));
    await waitFor(() => expect(screen.getByTestId("folder-open")).toBeInTheDocument());
    expect(modalProps.folder.initialName).toBe("");
  });

  it("names an unnamed file from the table and from the menu", async () => {
    apiMock.GetAllFiles.mockResolvedValue(ok([file({ name: null })]));
    await renderPage();
    await waitFor(() => expect(document.body.querySelector(".file-name-cell")).toBeTruthy());
    fireEvent.click(document.body.querySelector(".file-name-cell"));
    expect(openDocument).toHaveBeenLastCalledWith("https://cdn/report.pdf", "Document");

    fireEvent.click(screen.getByLabelText("More actions"));
    fireEvent.click(screen.getByText("View"));
    expect(openDocument).toHaveBeenLastCalledWith("https://cdn/report.pdf", "Document");
  });
});
