import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import DocumentViewer from "../Components/FileUpload/DocumentViewer";

/**
 * Branch coverage for the document preview overlay.
 *
 * It portals into document.body, so queries go through `document.body` rather
 * than the render container. The arms driven here are the file-type routing
 * (PDF frame, image, Word/other fallback), the download path and its
 * open-in-a-tab fallback, the refusal of a link that carries no signature, and
 * the same scroll-lock / inert-root bookkeeping the modal does.
 */

const noop = () => {};
const body = () => document.body;

const open = (props) =>
  render(
    <DocumentViewer isOpen fileUrl="https://x/a.pdf" fileName="a.pdf" onClose={noop} {...props} />
  );

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
  document.body.style.cssText = "";
  global.URL.createObjectURL = vi.fn(() => "blob:x");
  global.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("open and closed", () => {
  it("renders nothing while closed", () => {
    render(<DocumentViewer isOpen={false} fileUrl="https://x/a.pdf" onClose={noop} />);
    expect(body().querySelector(".doc-viewer-overlay")).toBeNull();
  });

  it("renders the overlay when open", () => {
    open({});
    expect(body().querySelector('[role="dialog"]')).toBeInTheDocument();
  });

  it("falls back to a generic title when the file has no name", () => {
    open({ fileName: undefined });
    expect(screen.getByText("Document Preview")).toBeInTheDocument();
  });

  it("uses the file name as the title when there is one", () => {
    open({ fileName: "Consent form.pdf" });
    expect(screen.getByText("Consent form.pdf")).toBeInTheDocument();
  });
});

describe("file type routing", () => {
  it("shows a PDF in a frame and clears the loader once it loads", () => {
    open({ fileUrl: "https://x/a.pdf" });
    const frame = body().querySelector(".doc-viewer-iframe");
    expect(frame).toBeInTheDocument();
    expect(body().querySelector(".doc-viewer-loading")).toBeInTheDocument();
    fireEvent.load(frame);
    expect(body().querySelector(".doc-viewer-loading")).toBeNull();
  });

  it("ignores a query string when reading the extension", () => {
    open({ fileUrl: "https://x/a.pdf?token=abc" });
    expect(body().querySelector(".doc-viewer-iframe")).toBeInTheDocument();
  });

  it.each(["jpg", "jpeg", "png", "gif", "webp"])("shows a .%s as an image", (ext) => {
    open({ fileUrl: `https://x/a.${ext}`, fileName: `a.${ext}` });
    expect(body().querySelector(".doc-viewer-image")).toBeInTheDocument();
  });

  it("clears the loader when an image loads, and also when it fails", () => {
    const { unmount } = open({ fileUrl: "https://x/a.png" });
    fireEvent.load(body().querySelector(".doc-viewer-image"));
    expect(body().querySelector(".doc-viewer-loading")).toBeNull();
    unmount();

    open({ fileUrl: "https://x/b.png" });
    fireEvent.error(body().querySelector(".doc-viewer-image"));
    expect(body().querySelector(".doc-viewer-loading")).toBeNull();
  });

  it("gives an unnamed image a stand-in alt text", () => {
    open({ fileUrl: "https://x/a.png", fileName: undefined });
    expect(body().querySelector(".doc-viewer-image").alt).toBe("Document preview");
  });

  it.each(["doc", "docx"])("explains that a .%s cannot be previewed", (ext) => {
    open({ fileUrl: `https://x/a.${ext}`, fileName: `a.${ext}` });
    expect(screen.getByText(/Word documents can't be previewed/i)).toBeInTheDocument();
  });

  it("shows a generic message for any other file type", () => {
    open({ fileUrl: "https://x/a.zip", fileName: "a.zip" });
    expect(screen.getByText(/cannot be previewed/i)).toBeInTheDocument();
  });

  it("treats a url with no extension as unpreviewable", () => {
    open({ fileUrl: undefined, fileName: undefined });
    expect(screen.getByText("This file type cannot be previewed.")).toBeInTheDocument();
  });
});

describe("download", () => {
  const captureAnchors = () => {
    const anchors = [];
    const orig = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = orig(tag);
      if (tag === "a") {
        el.click = vi.fn();
        anchors.push(el);
      }
      return el;
    });
    return anchors;
  };

  it("saves the blob under the file's own name", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(["x"]) });
    const anchors = captureAnchors();
    open({ fileName: "report.pdf" });
    fireEvent.click(screen.getByLabelText("Download file"));
    await waitFor(() => expect(anchors.length).toBe(1));
    expect(anchors[0].download).toBe("report.pdf");
  });

  it("falls back to a generic name when the file has none", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(["x"]) });
    const anchors = captureAnchors();
    open({ fileName: undefined });
    fireEvent.click(screen.getByLabelText("Download file"));
    await waitFor(() => expect(anchors.length).toBe(1));
    expect(anchors[0].download).toBe("document");
  });

  it("opens the file in a new tab when the fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("offline"));
    const openTab = vi.spyOn(window, "open").mockImplementation(() => {});
    open({ fileUrl: "https://x/a.pdf" });
    fireEvent.click(screen.getByLabelText("Download file"));
    await waitFor(() =>
      expect(openTab).toHaveBeenCalledWith("https://x/a.pdf", "_blank", "noopener")
    );
  });

  it("offers the same download from the unpreviewable fallback", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(["x"]) });
    const anchors = captureAnchors();
    open({ fileUrl: "https://x/a.docx", fileName: "a.docx" });
    fireEvent.click(screen.getByText("Download File"));
    await waitFor(() => expect(anchors.length).toBe(1));
  });
});

describe("a link that cannot work", () => {
  const UNSIGNED = "https://s3.us-west-1.amazonaws.com/ausomebee-objects-storage/x.pdf";

  it("explains itself instead of framing a pdf it cannot read", () => {
    open({ fileUrl: UNSIGNED, fileName: "x.pdf" });
    expect(body().querySelector(".doc-viewer-fallback")).not.toBeNull();
    expect(body().querySelector("iframe")).toBeNull();
    expect(screen.getByText(/secure link is missing or has expired/i)).toBeInTheDocument();
  });

  it("withholds the download prompt", () => {
    open({ fileUrl: UNSIGNED, fileName: "x.pdf" });
    expect(screen.queryByText("Download File")).toBeNull();
  });

  // This overlay gates its loader on isLoading alone, so without the extra
  // guard the explanation above would stay hidden behind a spinner that has
  // nothing left to wait for.
  it("shows no spinner, and does not hide the explanation", () => {
    open({ fileUrl: UNSIGNED, fileName: "x.pdf" });
    expect(body().querySelector(".doc-viewer-spinner")).toBeNull();
    expect(body().querySelector(".doc-viewer-body").getAttribute("aria-busy")).toBe("false");
    expect(body().querySelector(".doc-viewer-content-hidden")).toBeNull();
  });

  it("still frames a signed link to the same object", () => {
    open({ fileUrl: `${UNSIGNED}?X-Amz-Signature=abc`, fileName: "x.pdf" });
    expect(body().querySelector("iframe")).not.toBeNull();
  });

  it("reports a refused response rather than saving it", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      blob: async () => new Blob(["<Error>AccessDenied</Error>"]),
    });
    const openTab = vi.spyOn(window, "open").mockImplementation(() => {});
    open({ fileUrl: "https://x/a.pdf", fileName: "a.pdf" });
    fireEvent.click(screen.getByLabelText("Download file"));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
    expect(openTab).not.toHaveBeenCalled();
  });
});

describe("a file the browser cannot preview", () => {
  // Only a pdf iframe or an image ever reports that it loaded. A Word file
  // reports nothing, so holding the loader for it left the spinner turning
  // forever with the download prompt hidden behind it.
  it("shows a Word file's download prompt instead of a spinner", () => {
    open({ fileUrl: "https://x/notes.docx", fileName: "notes.docx" });

    expect(body().querySelector(".doc-viewer-spinner")).toBeNull();
    expect(body().querySelector(".doc-viewer-content-hidden")).toBeNull();
    expect(body().querySelector(".doc-viewer-body").getAttribute("aria-busy")).toBe("false");
    expect(screen.getByText(/Word documents can't be previewed/i)).toBeInTheDocument();
    expect(screen.getByText("Download File")).toBeInTheDocument();
  });

  it("does the same for a type it does not recognise", () => {
    open({ fileUrl: "https://x/archive.zip", fileName: "archive.zip" });
    expect(body().querySelector(".doc-viewer-spinner")).toBeNull();
    expect(screen.getByText("Download File")).toBeInTheDocument();
  });

  // The pdf and image paths must still wait for their load event.
  it("still holds the loader for a pdf until it loads", () => {
    open({ fileUrl: "https://x/a.pdf", fileName: "a.pdf" });
    expect(body().querySelector(".doc-viewer-spinner")).not.toBeNull();
  });
});

describe("closing", () => {
  it("closes on a backdrop click", () => {
    const onClose = vi.fn();
    open({ onClose });
    fireEvent.click(body().querySelector(".doc-viewer-overlay"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores a click inside the panel", () => {
    const onClose = vi.fn();
    open({ onClose });
    fireEvent.click(body().querySelector(".doc-viewer-modal"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on the close button", () => {
    const onClose = vi.fn();
    open({ onClose });
    fireEvent.click(screen.getByLabelText("Close document viewer"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape and ignores every other key", () => {
    const onClose = vi.fn();
    open({ onClose });
    fireEvent.keyDown(document, { key: "a" });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stops listening for Escape once closed", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <DocumentViewer isOpen fileUrl="https://x/a.pdf" onClose={onClose} />
    );
    rerender(<DocumentViewer isOpen={false} fileUrl="https://x/a.pdf" onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("page bookkeeping while open", () => {
  it("locks the body and restores the scroll position on close", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    Object.defineProperty(window, "scrollY", { configurable: true, value: 90 });

    const { unmount } = open({});
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.style.top).toBe("-90px");

    unmount();
    expect(document.body.style.overflow).toBe("");
    expect(scrollTo).toHaveBeenCalledWith(0, 90);
  });

  it("leaves the body alone when it never opened", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const { unmount } = render(
      <DocumentViewer isOpen={false} fileUrl="https://x/a.pdf" onClose={noop} />
    );
    expect(document.body.style.overflow).toBe("");
    unmount();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("marks #root inert while open and clears it on unmount", () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);

    const { unmount } = open({});
    expect(root.hasAttribute("inert")).toBe(true);
    unmount();
    expect(root.hasAttribute("inert")).toBe(false);
  });

  it("copes with an app that has no #root element", () => {
    expect(() => {
      const { unmount } = open({});
      unmount();
    }).not.toThrow();
  });

  it("shows the loader again when the file changes", () => {
    const { rerender } = render(
      <DocumentViewer isOpen fileUrl="https://x/a.pdf" fileName="a.pdf" onClose={noop} />
    );
    fireEvent.load(body().querySelector(".doc-viewer-iframe"));
    expect(body().querySelector(".doc-viewer-loading")).toBeNull();

    rerender(
      <DocumentViewer isOpen fileUrl="https://x/b.pdf" fileName="b.pdf" onClose={noop} />
    );
    expect(body().querySelector(".doc-viewer-loading")).toBeInTheDocument();
  });
});
