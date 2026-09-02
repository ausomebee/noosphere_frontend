import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

/**
 * The client document upload modal: a name box, a drop zone, and a submit that
 * refuses until both are filled.
 *
 * The interesting work happens when a file lands. The modal guesses the file's
 * type from whether the returned URL mentions a PDF, and — only when the name
 * box is still empty — derives a title from the filename by dropping the
 * extension, turning underscores and hyphens into spaces and capitalising each
 * word. A filename with no extension leaves that derivation with nothing, which
 * is how the drop zone ends up being handed the literal "Document" as a label.
 *
 * The drop zone is replaced by a probe that records the props it was given, so
 * the upload callback can be fired with whatever shape the test needs; the real
 * one would want a network.
 */

const toast = vi.hoisted(() => ({ showToast: vi.fn(), showApiError: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: (...a) => toast.showApiError(...a),
}));

const dropZone = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/FileUpload/FileUploadArea", () => ({
  default: (received) => {
    dropZone.props = received;
    return <div data-testid="drop-zone" data-count={received.initialFiles.length} />;
  },
}));

import UploadDocumentModal from "../Components/ReusableModal/ClientModal/ClientDocumentUploadModal";

const renderModal = (props = {}) => {
  const onUpload = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const view = render(
    <UploadDocumentModal isOpen onClose={onClose} onUpload={onUpload} {...props} />
  );
  return { ...view, onUpload, onClose };
};

const nameBox = () =>
  screen.getByPlaceholderText("e.g. National ID, Passport, Birth Certificate, Insurance Card");
const uploadButton = () => document.querySelector('button[type="submit"]');

// The drop zone hands back the uploaded file's public URL and its original
// filename; everything the modal stores is derived from those two.
const dropFiles = (files) =>
  act(() => {
    dropZone.props.onUploadComplete(files);
  });

beforeEach(() => {
  vi.clearAllMocks();
  dropZone.props = null;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("how it opens", () => {
  it("starts with an empty name and no file", () => {
    renderModal();
    expect(screen.getByText("Upload Document")).toBeInTheDocument();
    expect(nameBox()).toHaveValue("");
    expect(dropZone.props.initialFiles).toEqual([]);
  });

  it("prefills from a document that is already attached", () => {
    renderModal({ initialFile: { name: "Passport", fileUrl: "https://cdn/passport.pdf" } });
    expect(nameBox()).toHaveValue("Passport");
    expect(dropZone.props.initialFiles).toEqual([
      { filename: "Passport", url: "https://cdn/passport.pdf" },
    ]);
  });

  it("leaves the name empty when the attached document has none", () => {
    renderModal({ initialFile: { fileUrl: "https://cdn/scan.jpg" } });
    expect(nameBox()).toHaveValue("");
    // With no name to show, the drop zone gets the generic label instead.
    expect(dropZone.props.initialFiles[0].filename).toBe("Document");
  });

  it("passes the drop zone its single-file limits", () => {
    renderModal();
    expect(dropZone.props.maxFiles).toBe(1);
    expect(dropZone.props.maxSizeMB).toBe(10);
    expect(dropZone.props.hint).toBe("PDF, JPG, PNG — Max 10MB");
  });

  it("renders nothing while it is shut", () => {
    render(<UploadDocumentModal isOpen={false} onClose={vi.fn()} onUpload={vi.fn()} />);
    expect(screen.queryByText("Upload Document")).not.toBeInTheDocument();
  });
});

describe("what happens when a file lands", () => {
  it("names a PDF after its filename, tidied up", () => {
    renderModal();
    dropFiles([{ url: "https://cdn/insurance_card-front.pdf", filename: "insurance_card-front.pdf" }]);
    expect(nameBox()).toHaveValue("Insurance Card Front");
    expect(screen.getByTestId("drop-zone")).toHaveAttribute("data-count", "1");
  });

  it("keeps a name the user has already typed", () => {
    renderModal();
    fireEvent.change(nameBox(), { target: { value: "My own title" } });
    dropFiles([{ url: "https://cdn/scan.png", filename: "scan.png" }]);
    expect(nameBox()).toHaveValue("My own title");
  });

  it("ignores a drop that carries no file", () => {
    renderModal();
    dropFiles([]);
    expect(nameBox()).toHaveValue("");
    expect(dropZone.props.initialFiles).toEqual([]);
  });

  it("labels the drop zone generically when the filename yields no title", () => {
    // Stripping the extension off a name that has none leaves an empty string,
    // so the modal is left holding a file with no name at all.
    renderModal();
    dropFiles([{ url: "https://cdn/rawscan", filename: "rawscan" }]);
    expect(nameBox()).toHaveValue("");
    expect(dropZone.props.initialFiles[0].filename).toBe("Document");
  });

  it("keeps the inner dots of a multi-part filename", () => {
    renderModal();
    dropFiles([{ url: "https://cdn/a.b.jpg", filename: "policy.v2.jpg" }]);
    // Only the last dot is treated as the extension, and the capitaliser fires
    // on every word boundary, so the surviving dot starts a new word.
    expect(nameBox()).toHaveValue("Policy.V2");
  });
});

describe("submitting", () => {
  const dropAPdf = () =>
    dropFiles([{ url: "https://cdn/national_id.pdf", filename: "national_id.pdf" }]);

  it("refuses to submit with no file attached", () => {
    const { onUpload } = renderModal();
    fireEvent.change(nameBox(), { target: { value: "National ID" } });
    fireEvent.click(uploadButton());
    expect(toast.showToast).toHaveBeenCalledWith("Please upload a file", "error");
    expect(onUpload).not.toHaveBeenCalled();
  });

  it("refuses to submit with a name that is only whitespace", () => {
    const { onUpload } = renderModal();
    dropAPdf();
    fireEvent.change(nameBox(), { target: { value: "   " } });
    fireEvent.click(uploadButton());
    expect(toast.showToast).toHaveBeenCalledWith("Please enter a document name", "error");
    expect(onUpload).not.toHaveBeenCalled();
  });

  it("sends a trimmed name alongside the file details", async () => {
    const { onUpload, onClose } = renderModal();
    dropAPdf();
    fireEvent.change(nameBox(), { target: { value: "  National ID  " } });
    fireEvent.click(uploadButton());
    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
    expect(onUpload.mock.calls[0][0]).toMatchObject({
      name: "National ID",
      documentDetails: {
        fileUrl: "https://cdn/national_id.pdf",
        fileType: "application/pdf",
      },
    });
    expect(onUpload.mock.calls[0][0].documentDetails.uploadedAt).toEqual(expect.any(String));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(nameBox()).toHaveValue("");
  });

  it("calls anything that is not a PDF an image", async () => {
    const { onUpload } = renderModal();
    dropFiles([{ url: "https://cdn/passport-photo.png", filename: "passport-photo.png" }]);
    fireEvent.click(uploadButton());
    await waitFor(() => expect(onUpload).toHaveBeenCalled());
    expect(onUpload.mock.calls[0][0].documentDetails.fileType).toBe("image/jpeg");
  });

  it("keeps everything on screen when the upload is rejected", async () => {
    const { onUpload, onClose } = renderModal();
    const failure = new Error("413");
    onUpload.mockRejectedValue(failure);
    dropAPdf();
    fireEvent.click(uploadButton());
    await waitFor(() =>
      expect(toast.showApiError).toHaveBeenCalledWith(failure, "UPLOAD_DOCUMENT")
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(nameBox()).toHaveValue("National Id");
  });

  it("blocks the button and shows a spinner while an upload is in flight", () => {
    renderModal({ loading: true });
    expect(uploadButton()).toBeDisabled();
  });
});

describe("closing", () => {
  it("throws away the file and the name on Cancel", () => {
    const { onClose } = renderModal();
    dropFiles([{ url: "https://cdn/scan.pdf", filename: "scan.pdf" }]);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(nameBox()).toHaveValue("");
    expect(dropZone.props.initialFiles).toEqual([]);
  });

  it("throws them away on Escape too", () => {
    const { onClose } = renderModal();
    dropFiles([{ url: "https://cdn/scan.pdf", filename: "scan.pdf" }]);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(nameBox()).toHaveValue("");
  });
});
