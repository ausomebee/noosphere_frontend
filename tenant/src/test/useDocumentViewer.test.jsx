import { describe, it, expect, vi } from "vitest";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";
import { DocumentViewerProvider } from "../hooks/useDocumentViewer";
import useDocumentViewer from "../hooks/useDocumentViewer";

// The provider now reads the caller's tokens and exchanges a stored key for a
// signed link. Neither belongs in a test of the viewer's own state machine, and
// the urls used here are not bucket urls, so the exchange never fires.
vi.mock("../hooks/useAuth", () => ({
  default: () => ({ accessToken: "access-1", refreshToken: "refresh-1" }),
}));
const images = vi.hoisted(() => ({
  getPresignedUrl: vi.fn(async () => null),
}));
vi.mock("../api/imagesApi", () => ({
  default: { GetPresignedUrl: images.getPresignedUrl },
}));


// Mock DocumentViewer — tenant version uses isOpen prop
vi.mock("../Components/FileUpload/DocumentViewer", () => ({
  default: ({ isOpen, fileUrl, fileName, onClose }) =>
    isOpen ? (
      <div data-testid="document-viewer">
        <span data-testid="viewer-url">{fileUrl}</span>
        <span data-testid="viewer-name">{fileName}</span>
        <button data-testid="viewer-close" onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

const TestConsumer = () => {
  const { openDocument, closeDocument, downloadDocument } = useDocumentViewer();
  return (
    <div>
      <button onClick={() => openDocument("report.pdf", "Report")}>Open</button>
      <button onClick={() => closeDocument()}>Close</button>
      <button onClick={() => downloadDocument("http://example.com/file.pdf", "file.pdf")}>Download</button>
    </div>
  );
};

describe("useDocumentViewer", () => {
  it("throws when used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      "useDocumentViewer must be used within a DocumentViewerProvider"
    );
    spy.mockRestore();
  });

  it("renders children inside provider", () => {
    render(
      <DocumentViewerProvider>
        <p>Child Content</p>
      </DocumentViewerProvider>
    );
    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  it("does not show viewer initially", () => {
    render(
      <DocumentViewerProvider>
        <TestConsumer />
      </DocumentViewerProvider>
    );
    expect(screen.queryByTestId("document-viewer")).not.toBeInTheDocument();
  });

  // The overlay opens at once, but the url arrives a tick later: opening now
  // resolves a signed link first, and only a resolved url is handed down.
  it("opens viewer when openDocument is called", async () => {
    render(
      <DocumentViewerProvider>
        <TestConsumer />
      </DocumentViewerProvider>
    );
    fireEvent.click(screen.getByText("Open"));
    expect(screen.getByTestId("document-viewer")).toBeInTheDocument();
    expect(screen.getByTestId("viewer-name").textContent).toBe("Report");
    await waitFor(() =>
      expect(screen.getByTestId("viewer-url").textContent).toBe("report.pdf")
    );
  });

  it("closes viewer when closeDocument is called", () => {
    render(
      <DocumentViewerProvider>
        <TestConsumer />
      </DocumentViewerProvider>
    );
    fireEvent.click(screen.getByText("Open"));
    expect(screen.getByTestId("document-viewer")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("viewer-close"));
    expect(screen.queryByTestId("document-viewer")).not.toBeInTheDocument();
  });

  it("downloadDocument fetches and triggers download", async () => {
    const mockBlob = new Blob(["test"], { type: "application/pdf" });
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: () => Promise.resolve(mockBlob) });
    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:url");
    global.URL.revokeObjectURL = vi.fn();

    const { getByText } = render(
      <DocumentViewerProvider>
        <TestConsumer />
      </DocumentViewerProvider>
    );
    fireEvent.click(getByText("Download"));

    await vi.waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("http://example.com/file.pdf");
    });
  });

  it("downloadDocument falls back to window.open on error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    const mockOpen = vi.fn();
    window.open = mockOpen;

    const { getByText } = render(
      <DocumentViewerProvider>
        <TestConsumer />
      </DocumentViewerProvider>
    );
    fireEvent.click(getByText("Download"));

    await vi.waitFor(() => {
      expect(mockOpen).toHaveBeenCalledWith("http://example.com/file.pdf", "_blank", "noopener");
    });
  });
});

describe("resolving a stored link", () => {
  const BUCKET_URL =
    "https://s3.us-west-1.amazonaws.com/ausomebee-objects-storage/1699999999-photo.png";
  const SIGNED = "https://signed/1699999999-photo.png?X-Amz-Signature=abc";

  const StoredConsumer = () => {
    const { openDocument } = useDocumentViewer();
    return (
      <button onClick={() => openDocument(BUCKET_URL, "Photo")}>
        Open stored
      </button>
    );
  };

  const openStored = () => {
    render(
      <DocumentViewerProvider>
        <StoredConsumer />
      </DocumentViewerProvider>
    );
    fireEvent.click(screen.getByText("Open stored"));
  };

  it("exchanges the object key for a signed link and shows that instead", async () => {
    images.getPresignedUrl.mockClear();
    images.getPresignedUrl.mockResolvedValue(SIGNED);

    openStored();

    await waitFor(() =>
      expect(screen.getByTestId("viewer-url").textContent).toBe(SIGNED)
    );
    // The key, not the whole url: the bucket is the first path segment here.
    expect(images.getPresignedUrl).toHaveBeenCalledWith({
      key: "1699999999-photo.png",
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
  });

  // Falling back to the stored url is deliberate. The overlay recognises an
  // unsigned link and explains itself, which reads better than a blank frame.
  it("keeps the stored url when the exchange is refused", async () => {
    images.getPresignedUrl.mockClear();
    images.getPresignedUrl.mockRejectedValue(new Error("403"));

    openStored();

    await waitFor(() =>
      expect(screen.getByTestId("viewer-url").textContent).toBe(BUCKET_URL)
    );
  });

  it("asks for nothing when the url is not object storage", async () => {
    images.getPresignedUrl.mockClear();
    images.getPresignedUrl.mockResolvedValue(SIGNED);

    render(
      <DocumentViewerProvider>
        <TestConsumer />
      </DocumentViewerProvider>
    );
    fireEvent.click(screen.getByText("Open"));

    await waitFor(() =>
      expect(screen.getByTestId("viewer-url").textContent).not.toBe("")
    );
    expect(images.getPresignedUrl).not.toHaveBeenCalled();
  });
});
