import { describe, it, expect, vi } from "vitest";
import { render, waitFor, screen, fireEvent, act } from "@testing-library/react";
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


// Mock DocumentViewer to avoid side effects
vi.mock("../Components/FileUpload/DocumentViewer", () => ({
  default: ({ fileUrl, fileName, onClose }) => (
    <div data-testid="document-viewer">
      <span data-testid="viewer-url">{fileUrl}</span>
      <span data-testid="viewer-name">{fileName}</span>
      <button data-testid="viewer-close" onClick={onClose}>Close</button>
    </div>
  ),
}));

const TestConsumer = () => {
  const { openDocument, closeDocument } = useDocumentViewer();
  return (
    <div>
      <button onClick={() => openDocument("test.pdf", "Test Doc")}>Open</button>
      <button onClick={() => closeDocument()}>Close</button>
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
        <p>Hello</p>
      </DocumentViewerProvider>
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
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
    expect(screen.getByTestId("viewer-name").textContent).toBe("Test Doc");
    await waitFor(() =>
      expect(screen.getByTestId("viewer-url").textContent).toBe("test.pdf")
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

describe("a presign that comes back late (#46)", () => {
  const BUCKET_A = "https://s3.amazonaws.com/bucket/1699999999-a.png";
  const BUCKET_B = "https://s3.amazonaws.com/bucket/1699999999-b.png";

  const Consumer = () => {
    const { openDocument, closeDocument } = useDocumentViewer();
    return (
      <div>
        <button onClick={() => openDocument(BUCKET_A, "A")}>Open A</button>
        <button onClick={() => openDocument(BUCKET_B, "B")}>Open B</button>
        <button onClick={() => closeDocument()}>Close it</button>
      </div>
    );
  };

  const deferred = () => {
    let resolve;
    const promise = new Promise((r) => { resolve = r; });
    return { promise, resolve };
  };

  it("does not reopen the viewer after it was closed", async () => {
    const pending = deferred();
    images.getPresignedUrl.mockReset();
    images.getPresignedUrl.mockReturnValueOnce(pending.promise);
    render(
      <DocumentViewerProvider>
        <Consumer />
      </DocumentViewerProvider>
    );
    fireEvent.click(screen.getByText("Open A"));
    expect(screen.getByTestId("document-viewer")).toBeInTheDocument();
    expect(images.getPresignedUrl).toHaveBeenCalled();
    fireEvent.click(screen.getByText("Close it"));

    await act(async () => { pending.resolve("https://signed/a"); await pending.promise; });
    expect(screen.queryByTestId("document-viewer")).toBeNull();
  });

  it("does not swap in the first document after a second was opened", async () => {
    const first = deferred();
    images.getPresignedUrl.mockReset();
    images.getPresignedUrl
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce("https://signed/b");
    render(
      <DocumentViewerProvider>
        <Consumer />
      </DocumentViewerProvider>
    );
    fireEvent.click(screen.getByText("Open A"));
    fireEvent.click(screen.getByText("Open B"));
    await waitFor(() =>
      expect(screen.getByTestId("viewer-url").textContent).toBe("https://signed/b")
    );

    await act(async () => { first.resolve("https://signed/a"); await first.promise; });
    expect(screen.getByTestId("viewer-url").textContent).toBe("https://signed/b");
    expect(screen.getByTestId("viewer-name").textContent).toBe("B");
  });
});
