import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const showToast = vi.fn();
vi.mock("../Helper/ShowToast", () => ({ showToast: (...a) => showToast(...a) }));

// FileUploadArea has its own suite. Here it is a probe: the test drives the
// modal by calling the callbacks the real component would fire, which is the
// only way to exercise the upload lifecycle without a network round trip.
const { uploadArea } = vi.hoisted(() => ({ uploadArea: {} }));
vi.mock("../Components/FileUpload/FileUploadArea", () => ({
  default: (props) => {
    uploadArea.props = props;
    return <div data-testid="upload-area" />;
  },
}));

import ClientDocumentUploadModal from "../Components/Modal/ClientDocumentUploadModal";

/**
 * The dialog a client uses to attach files to a request.
 *
 * It holds two independent busy flags: `uploading`, which it sets itself while
 * FileUploadArea is transferring a file, and `loading`, which the parent sets
 * while it saves. Either one locks both footer buttons, so a test that wants
 * to click Attach has to make sure neither is set.
 *
 * The attach button is also disabled until at least one file has landed, which
 * makes the "please upload at least one file" guard inside the submit handler
 * unreachable from the UI -- the tests below pin the disabled button instead of
 * pretending the guard can fire.
 */

const onClose = vi.fn();
const onFilesReady = vi.fn();

const renderModal = (props = {}) =>
  render(
    <ClientDocumentUploadModal
      isOpen
      onClose={onClose}
      onFilesReady={onFilesReady}
      {...props}
    />
  );

const upload = (...files) =>
  act(() => {
    uploadArea.props.onUploadComplete(files);
  });

// Found by role rather than by label: while either busy flag is set the
// primary button swaps its text for a spinner.
const attach = () => document.body.querySelector('button[type="submit"]');
const cancel = () => screen.getByText("Cancel").closest("button");
const spinner = () => document.body.querySelector(".modal-btn-spinner");

beforeEach(() => {
  vi.clearAllMocks();
  // ReusableModal portals into document.body and React keeps bookkeeping on
  // that node, so the DOM is left to Testing Library's own cleanup.
  delete uploadArea.props;
  // ReusableModal restores the page scroll position when it unmounts, and
  // jsdom has no layout to scroll.
  window.scrollTo = vi.fn();
  onFilesReady.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the upload dialog", () => {
  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText("Upload Document")).toBeNull();
  });

  it("titles and labels itself for a single file", () => {
    renderModal();
    expect(screen.getByText("Upload Document")).toBeInTheDocument();
    expect(screen.getByText("Upload file")).toBeInTheDocument();
    expect(uploadArea.props.multiple).toBe(false);
    expect(uploadArea.props.hint).toBe("PDF, DOCX, JPG, PNG, XLSX — max 15MB");
  });

  it("titles and labels itself in the plural when several are allowed", () => {
    renderModal({ allowMultiple: true });
    expect(screen.getByText("Upload Multiple Documents")).toBeInTheDocument();
    expect(screen.getByText("Upload files (multiple allowed)")).toBeInTheDocument();
    expect(uploadArea.props.multiple).toBe(true);
    expect(uploadArea.props.hint).toBe(
      "PDF, DOCX, JPG, PNG, XLSX — multiple files allowed, max 15MB each"
    );
  });

  it("holds the upload area to a fifteen-megabyte limit", () => {
    renderModal();
    expect(uploadArea.props.maxSizeMB).toBe(15);
    expect(uploadArea.props.accept).toBe(".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx");
  });

  it("keeps the attach button disabled until a file has landed", () => {
    renderModal();
    expect(attach()).toBeDisabled();
  });

  it("closes on cancel without attaching anything", () => {
    renderModal();
    fireEvent.click(cancel());
    expect(onClose).toHaveBeenCalled();
    expect(onFilesReady).not.toHaveBeenCalled();
  });
});

describe("uploading files", () => {
  it("locks the dialog while a transfer is in flight", () => {
    renderModal();
    act(() => {
      uploadArea.props.onUploadStart();
    });
    // The modal asks for the label "Uploading..." here, but ReusableModal
    // swaps any busy primary button for a spinner, so the label never shows.
    expect(spinner()).toBeTruthy();
    expect(screen.queryByText("Uploading...")).toBeNull();
    expect(attach()).toBeDisabled();
    expect(cancel()).toBeDisabled();
    expect(uploadArea.props.disabled).toBe(true);
  });

  it("releases the dialog once the transfer completes", async () => {
    renderModal();
    act(() => {
      uploadArea.props.onUploadStart();
    });
    await upload({ filename: "Report.pdf", url: "https://cdn/report.pdf" });
    expect(spinner()).toBeNull();
    expect(screen.getByText("Attach Documents")).toBeInTheDocument();
    expect(attach()).not.toBeDisabled();
  });

  it("releases the dialog when the transfer fails", () => {
    renderModal();
    act(() => {
      uploadArea.props.onUploadStart();
    });
    act(() => {
      uploadArea.props.onUploadError();
    });
    expect(spinner()).toBeNull();
    expect(uploadArea.props.disabled).toBe(false);
  });

  it("locks the dialog while the parent is saving", () => {
    renderModal({ loading: true });
    expect(cancel()).toBeDisabled();
    expect(attach()).toBeDisabled();
    expect(uploadArea.props.disabled).toBe(true);
  });

  it("hands the parent every uploaded url", async () => {
    renderModal({ allowMultiple: true });
    await upload({ filename: "One.pdf", url: "https://cdn/one.pdf" });
    await upload({ filename: "Two.pdf", url: "https://cdn/two.pdf" });
    await act(async () => {
      fireEvent.click(attach());
    });
    expect(onFilesReady).toHaveBeenCalledWith(["https://cdn/one.pdf", "https://cdn/two.pdf"]);
  });

  it("accepts a batch of files from one transfer", async () => {
    renderModal({ allowMultiple: true });
    await upload(
      { filename: "One.pdf", url: "https://cdn/one.pdf" },
      { filename: "Two.pdf", url: "https://cdn/two.pdf" }
    );
    await act(async () => {
      fireEvent.click(attach());
    });
    expect(onFilesReady).toHaveBeenCalledWith(["https://cdn/one.pdf", "https://cdn/two.pdf"]);
  });

  it("names an upload the server returned without a filename", async () => {
    renderModal();
    await upload({ url: "https://cdn/one.pdf" });
    // The name is only kept for the modal's own bookkeeping, so the proof it
    // was defaulted is that the file still submits under its url.
    await act(async () => {
      fireEvent.click(attach());
    });
    expect(onFilesReady).toHaveBeenCalledWith(["https://cdn/one.pdf"]);
  });

  it("returns the parent's promise so the buttons stay locked", async () => {
    let settle;
    onFilesReady.mockReturnValue(
      new Promise((resolve) => {
        settle = resolve;
      })
    );
    renderModal();
    await upload({ filename: "One.pdf", url: "https://cdn/one.pdf" });
    await act(async () => {
      fireEvent.click(attach());
    });
    expect(cancel()).toBeDisabled();
    await act(async () => {
      settle();
    });
    expect(cancel()).not.toBeDisabled();
  });
});

describe("removing an uploaded file", () => {
  it("drops the removed file from the submitted urls", async () => {
    renderModal({ allowMultiple: true });
    await upload(
      { filename: "One.pdf", url: "https://cdn/one.pdf" },
      { filename: "Two.pdf", url: "https://cdn/two.pdf" }
    );
    act(() => {
      uploadArea.props.onRemove({ url: "https://cdn/one.pdf" });
    });
    await act(async () => {
      fireEvent.click(attach());
    });
    expect(onFilesReady).toHaveBeenCalledWith(["https://cdn/two.pdf"]);
  });

  it("matches a removal reported under fileUrl instead of url", async () => {
    renderModal({ allowMultiple: true });
    await upload(
      { filename: "One.pdf", url: "https://cdn/one.pdf" },
      { filename: "Two.pdf", url: "https://cdn/two.pdf" }
    );
    act(() => {
      uploadArea.props.onRemove({ fileUrl: "https://cdn/two.pdf" });
    });
    await act(async () => {
      fireEvent.click(attach());
    });
    expect(onFilesReady).toHaveBeenCalledWith(["https://cdn/one.pdf"]);
  });

  it("keeps everything when the removal names no file", async () => {
    renderModal();
    await upload({ filename: "One.pdf", url: "https://cdn/one.pdf" });
    act(() => {
      uploadArea.props.onRemove(undefined);
    });
    await act(async () => {
      fireEvent.click(attach());
    });
    expect(onFilesReady).toHaveBeenCalledWith(["https://cdn/one.pdf"]);
  });

  it("disables attaching again once the last file is removed", async () => {
    renderModal();
    await upload({ filename: "One.pdf", url: "https://cdn/one.pdf" });
    expect(attach()).not.toBeDisabled();

    act(() => {
      uploadArea.props.onRemove({ url: "https://cdn/one.pdf" });
    });
    expect(attach()).toBeDisabled();
    expect(showToast).not.toHaveBeenCalled();
  });
});
