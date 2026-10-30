import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The staff document upload modal: one name field and one file drop area, over
 * a yup schema that insists on both, with the chosen file pushed to the image
 * endpoint the moment it is picked rather than on save.
 *
 * The drop area classifies a file before anything is sent -- too big, wrong
 * type, or fine -- and jsdom files have no real bytes, so the fixtures redefine
 * `size` on the File instead of allocating one.
 *
 * Two quirks of the current build shape almost every assertion here. First, the
 * drop area's own effect clears its row whenever the form value it is handed
 * has no `filename` or `documentsUrl`, which is every value except the one the
 * upload endpoint writes back — so a rejected file leaves no visible row and
 * its message is only observable as the save being blocked. Second,
 * `ReusableModal` has no `primaryButtonDisabled` prop, so only
 * `primaryButtonLoading` disables Save; that makes the "upload failed" guard
 * reachable by clicking, while the "wait for the upload" guard is not — the
 * button really is disabled for that one, so it is asserted as disabled.
 */

const upload = vi.hoisted(() => vi.fn());
vi.mock("../api/ImageUpload", () => ({ default: { UploadImage: upload } }));

const toast = vi.hoisted(() => vi.fn());
vi.mock("../Helper/ShowToast", () => ({ showToast: toast, showApiError: vi.fn() }));

import UploadTenantStaffDocumentModal from "../Components/ReusableModal/OrganizationModal/UploadTenantStaffDocumentModal";

const makeStore = (user = {}) =>
  configureStore({
    reducer: { authentication: authReducer, generalSettings: generalSettingsReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "t",
        user: {
          id: "u-1",
          tenantId: "tenant-1",
          email: "ada@example.com",
          accessToken: "access-1",
          refreshToken: "refresh-1",
          ...user,
        },
      },
      generalSettings: {
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12-hour",
        currency: "USD",
        // Already loaded, so useFormatSettings adds no fetch of its own.
        loaded: true,
      },
    },
  });

const renderModal = ({ user, ...props } = {}) => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const view = render(
    <Provider store={makeStore(user)}>
      <UploadTenantStaffDocumentModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        tenantStaffId="staff-1"
        {...props}
      />
    </Provider>
  );
  return { ...view, onSave, onClose };
};

// jsdom Files carry no bytes, so the size the classifier reads is set directly.
const fileOf = (name, type, bytes = 200 * 1024) => {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: bytes });
  return file;
};

const pdf = (bytes) => fileOf("licence.pdf", "application/pdf", bytes);

const title = () => document.body.querySelector(".modal-title-text");
const nameInput = () => screen.getByPlaceholderText("Enter document name");
const fileInput = () => document.body.querySelector(".upload-input");
const primary = () => document.body.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.body.querySelector(".modal-btn-secondary");
const fileRow = () => document.body.querySelector(".file-item");
const icon = () => document.body.querySelector(".file-icon");

const pick = async (file) =>
  act(async () => {
    fireEvent.change(fileInput(), { target: { files: file ? [file] : [] } });
  });

// A row only survives once the endpoint writes a filename back, so the stub is
// pointed at whatever file the test picked.
const pickUploaded = async (name, type) => {
  upload.mockResolvedValue(uploaded({ data: [{ url: "https://files.test/f", filename: name }] }));
  await pick(fileOf(name, type));
  await waitFor(() => expect(fileRow()).toBeInTheDocument());
};

const type = (value) => fireEvent.change(nameInput(), { target: { value } });

const submit = async () =>
  act(async () => {
    fireEvent.click(primary());
  });

function uploaded(over = {}) {
  return {
    success: true,
    data: [{ url: "https://files.test/licence.pdf", filename: "licence.pdf" }],
    error: null,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  upload.mockResolvedValue(uploaded());
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the modal shell", () => {
  it("titles itself for a new document", () => {
    renderModal();
    expect(title()).toHaveTextContent("Upload Document");
    expect(primary()).toHaveTextContent("Save");
    expect(secondary()).toHaveTextContent("Cancel");
  });

  it("titles itself for an edit", () => {
    renderModal({ mode: "edit", initialValues: { id: "d-1" } });
    expect(title()).toHaveTextContent("Edit Document");
  });

  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(document.body.querySelector(".modal-content")).toBeNull();
  });

  it("clears the form and closes from Cancel", async () => {
    const { onClose } = renderModal();
    type("Licence");
    await pick(pdf());
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(nameInput()).toHaveValue("");
    expect(fileRow()).toBeNull();
  });
});

describe("classifying the chosen file", () => {
  it("accepts a supported file and shows its size in kilobytes", async () => {
    renderModal();
    await pick(pdf(200 * 1024));
    await waitFor(() => expect(fileRow()).toBeInTheDocument());
    expect(fileRow()).toHaveTextContent("licence.pdf • 200 KB");
    expect(document.body.querySelector(".file-error")).toBeNull();
    expect(document.body.querySelector(".progress-bar")).toBeInTheDocument();
  });

  it("shows a size in megabytes once the file passes one", async () => {
    renderModal();
    await pick(pdf(2.5 * 1024 * 1024));
    await waitFor(() => expect(fileRow()).toBeInTheDocument());
    expect(fileRow()).toHaveTextContent("2.5 MB");
  });

  it("never sends a file over the fifty megabyte limit, and blocks the save", async () => {
    const { onSave } = renderModal();
    type("Licence");
    await pick(pdf(60 * 1024 * 1024));
    expect(upload).not.toHaveBeenCalled();
    await submit();
    expect(await screen.findByText("File upload failed")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("never sends a file type the endpoint will not take, and blocks the save", async () => {
    const { onSave } = renderModal();
    type("Notes");
    await pick(fileOf("notes.txt", "text/plain"));
    expect(upload).not.toHaveBeenCalled();
    await submit();
    expect(await screen.findByText("File upload failed")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("ignores a change event that carries no file", async () => {
    renderModal();
    await pick(null);
    expect(fileRow()).toBeNull();
    expect(upload).not.toHaveBeenCalled();
  });

  it("draws a different icon for each kind of file", async () => {
    const glyphs = [];
    const kinds = [
      ["licence.pdf", "application/pdf"],
      ["clip.mp4", "video/mp4"],
      ["loop.gif", "image/gif"],
      ["scan.png", "image/png"],
      // A supported MIME type with an extension the icon map does not know,
      // which is the only way to reach the catch-all glyph.
      ["archive.zip", "application/pdf"],
    ];
    for (const [name, mime] of kinds) {
      const view = renderModal();
      await pickUploaded(name, mime);
      glyphs.push(icon().innerHTML);
      view.unmount();
    }
    expect(new Set(glyphs).size).toBe(kinds.length);
  });

  it("falls back to the catch-all icon for a name with no extension at all", async () => {
    renderModal();
    await pickUploaded("README", "application/pdf");
    expect(icon().getAttribute("viewBox")).toBe("0 0 384 512");
  });
});

describe("removing an uploaded file", () => {
  it("drops the file and refuses to save without one", async () => {
    const { onSave } = renderModal();
    type("Licence");
    await pickUploaded("licence.pdf", "application/pdf");
    fireEvent.click(document.body.querySelector(".remove-file"));
    expect(fileRow()).toBeNull();
    await submit();
    expect(await screen.findByText("A document is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("offers no retry control on a file that uploaded cleanly", async () => {
    renderModal();
    await pickUploaded("licence.pdf", "application/pdf");
    expect(document.body.querySelector(".retry-file")).toBeNull();
  });
});

describe("uploading the file", () => {
  it("sends the file to the image endpoint with the current tokens", async () => {
    renderModal();
    await pick(pdf());
    await waitFor(() => expect(upload).toHaveBeenCalled());
    const call = upload.mock.calls[0][0];
    expect(call.accessToken).toBe("access-1");
    expect(call.refreshToken).toBe("refresh-1");
    expect(call.formData.get("images")).toBeInstanceOf(File);
  });

  it("marks the file complete once the upload lands", async () => {
    renderModal();
    await pick(pdf());
    await waitFor(() =>
      expect(document.body.querySelector(".file-success")).toBeInTheDocument()
    );
    expect(document.body.querySelector(".progress-text")).toHaveTextContent("100%");
  });

  // The endpoint's own wording never reaches the DOM -- the drop area has
  // already cleared its row by then -- so a refused upload is only observable
  // as a blocked save.
  it("blocks the save when the endpoint refuses the upload", async () => {
    upload.mockResolvedValue({ success: false, data: [], error: "Bucket full" });
    const { onSave } = renderModal();
    type("Licence");
    await pick(pdf());
    await waitFor(() => expect(upload).toHaveBeenCalled());
    await submit();
    expect(await screen.findByText("File upload failed")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("blocks the save when the endpoint returns a record with no url", async () => {
    upload.mockResolvedValue({ success: true, data: [{}], error: null });
    const { onSave } = renderModal();
    type("Licence");
    await pick(pdf());
    await waitFor(() => expect(upload).toHaveBeenCalled());
    await submit();
    expect(await screen.findByText("File upload failed")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("blocks the save when the upload request throws", async () => {
    upload.mockRejectedValue(new Error("Network Error"));
    const { onSave } = renderModal();
    type("Licence");
    await pick(pdf());
    await waitFor(() => expect(upload).toHaveBeenCalled());
    await submit();
    expect(await screen.findByText("File upload failed")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("blocks the save when the upload throws something with no message", async () => {
    upload.mockRejectedValue({});
    const { onSave } = renderModal();
    type("Licence");
    await pick(pdf());
    await waitFor(() => expect(upload).toHaveBeenCalled());
    await submit();
    expect(await screen.findByText("File upload failed")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses to upload without a signed-in session", async () => {
    renderModal({ user: { accessToken: null } });
    await pick(pdf());
    expect(await screen.findByText("Authentication tokens missing.")).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
  });

  it("refuses to upload without a refresh token", async () => {
    renderModal({ user: { refreshToken: null } });
    await pick(pdf());
    expect(await screen.findByText("Authentication tokens missing.")).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
  });

  it("disables Save while the upload is in flight", async () => {
    let release;
    upload.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    renderModal();
    await pick(pdf());
    expect(primary()).toBeDisabled();
    await act(async () => {
      release(uploaded());
    });
    await waitFor(() => expect(primary()).not.toBeDisabled());
  });
});

describe("validation", () => {
  it("refuses a document with no name", async () => {
    const { onSave } = renderModal();
    await pickUploaded("licence.pdf", "application/pdf");
    await submit();
    expect(await screen.findByText("Document Name is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a name with no document behind it", async () => {
    const { onSave } = renderModal();
    type("Licence");
    await submit();
    expect(await screen.findByText("A document is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("surfaces the schema's complaints as a toast", async () => {
    renderModal();
    await submit();
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(toast.mock.calls[0][0]).toContain("Document Name is required");
    expect(toast.mock.calls[0][1]).toBe("error");
  });
});

describe("saving", () => {
  const readyToSave = async (props) => {
    const view = renderModal(props);
    type("Practice licence");
    await pickUploaded("licence.pdf", "application/pdf");
    return view;
  };

  it("hands the caller the uploaded document and closes", async () => {
    const { onSave, onClose } = await readyToSave();
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toEqual({
      id: expect.any(Number),
      documentName: "Practice licence",
      date: expect.stringMatching(/^\d{2}\/\d{2}\/\d{4}$/),
      uploadBy: "ada@example.com",
      documentsUrl: {
        filename: "licence.pdf",
        url: "https://files.test/f",
        error: null,
      },
      tenantStaffId: "staff-1",
    });
    expect(onClose).toHaveBeenCalled();
    expect(nameInput()).toHaveValue("");
  });

  it("names an anonymous uploader", async () => {
    const { onSave } = await readyToSave({ user: { email: undefined } });
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].uploadBy).toBe("Unknown User");
  });

  it("keeps the id of the document being edited", async () => {
    const { onSave } = await readyToSave({
      mode: "edit",
      initialValues: {
        id: "doc-9",
        documentName: "Old name",
        documentsUrl: { filename: "old.pdf", url: "https://files.test/old.pdf" },
      },
    });
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].id).toBe("doc-9");
  });

  it("reports a refused save and stays open", async () => {
    const { onSave, onClose } = await readyToSave();
    onSave.mockRejectedValue(new Error("Storage quota exceeded"));
    await submit();
    expect(await screen.findByText("Storage quota exceeded")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("falls back to house copy when a refused save says nothing", async () => {
    const { onSave } = await readyToSave();
    onSave.mockRejectedValue({});
    await submit();
    expect(await screen.findByText("Failed to save document")).toBeInTheDocument();
  });
});

describe("editing an existing document", () => {
  const existing = {
    id: "doc-1",
    documentName: "Practice licence",
    documentsUrl: { filename: "licence.pdf", url: "https://files.test/licence.pdf" },
  };

  it("fills the name from the stored document", () => {
    renderModal({ mode: "edit", initialValues: existing });
    expect(nameInput()).toHaveValue("Practice licence");
  });

  it("leaves the name blank for a stored document that has none", () => {
    renderModal({
      mode: "edit",
      initialValues: { id: "doc-1", documentsUrl: { url: "https://files.test/x" } },
    });
    expect(nameInput()).toHaveValue("");
  });

  it("leaves the form blank for an edit with no stored file", async () => {
    const { onSave } = renderModal({
      mode: "edit",
      initialValues: { id: "doc-1", documentName: "Ignored" },
    });
    expect(nameInput()).toHaveValue("");
    await submit();
    expect(await screen.findByText("Document Name is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves the stored file again when nothing new was picked", async () => {
    const { onSave } = renderModal({ mode: "edit", initialValues: existing });
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].documentsUrl).toEqual({
      filename: "licence.pdf",
      url: "https://files.test/licence.pdf",
      error: null,
    });
  });

  it("replaces the stored file when a new one is picked", async () => {
    const { onSave } = renderModal({ mode: "edit", initialValues: existing });
    await pickUploaded("new.pdf", "application/pdf");
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].documentsUrl.filename).toBe("new.pdf");
  });

  it("wipes the form once the modal is closed and reopened for a new document", () => {
    const closed = (props) => (
      <Provider store={makeStore()}>
        <UploadTenantStaffDocumentModal
          onClose={vi.fn()}
          onSave={vi.fn()}
          tenantStaffId="staff-1"
          {...props}
        />
      </Provider>
    );
    const { rerender } = renderModal({ mode: "edit", initialValues: existing });
    expect(nameInput()).toHaveValue("Practice licence");
    rerender(closed({ isOpen: false, mode: "edit", initialValues: existing }));
    rerender(closed({ isOpen: true }));
    expect(nameInput()).toHaveValue("");
  });
});

describe("a file the browser hands over unnamed", () => {
  const unnamed = (mime, bytes) => fileOf("", mime, bytes);

  it("still classifies a nameless file that is too big and blocks the save", async () => {
    const { onSave } = renderModal();
    type("Licence");
    await pick(unnamed("application/pdf", 60 * 1024 * 1024));
    await submit();

    expect(await screen.findByText("File upload failed")).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("still classifies a nameless file of the wrong type and blocks the save", async () => {
    const { onSave } = renderModal();
    type("Licence");
    await pick(unnamed("text/csv"));
    await submit();

    expect(await screen.findByText("File upload failed")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("uploads a nameless file that is otherwise fine", async () => {
    upload.mockResolvedValue(
      uploaded({ data: [{ url: "https://files.test/f", filename: "server-name.pdf" }] })
    );
    renderModal();
    await pick(unnamed("application/pdf"));

    await waitFor(() => expect(fileRow()).toBeInTheDocument());
    // The row only ever shows the name the endpoint wrote back.
    expect(fileRow().textContent).toContain("server-name.pdf");
  });
});

describe("the progress bar the upload area runs on its own", () => {
  // The upload itself is awaited, so the clock has to keep running for the
  // helpers' waitFor while the 300ms ticks are stepped by hand.
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("walks the bar up to a hundred and then stops", async () => {
    renderModal();
    await pickUploaded("licence.pdf", "application/pdf");
    // Ten ticks of 300ms take it from 10% to 100%; the eleventh must not fire.
    await act(async () => {
      vi.advanceTimersByTime(3300);
    });
    expect(document.body.querySelector(".progress-text").textContent).toBe("100%");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps ticking harmlessly once the file has been taken away", async () => {
    renderModal();
    await pickUploaded("licence.pdf", "application/pdf");
    fireEvent.click(document.body.querySelector(".remove-file"));

    await act(async () => {
      vi.advanceTimersByTime(3300);
    });
    expect(fileRow()).toBeNull();
  });
});

describe("saving straight after a validation complaint", () => {
  it("refuses the first save after the missing name is filled in", async () => {
    // The Save handler closes over the errors of the render that built it, so
    // the click that follows a complaint still sees the stale error map.
    const { onSave } = renderModal();
    await pickUploaded("licence.pdf", "application/pdf");
    await submit();
    expect(await screen.findByText("Document Name is required")).toBeInTheDocument();

    type("Licence");
    await submit();
    expect(await screen.findByText("Please fix form errors")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  });
});
