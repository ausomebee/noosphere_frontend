import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DocumentViewer from "../Components/FileUpload/DocumentViewer";

// These cover the overlay's routing, not how a Word file is then shown, which
// has its own suite. Standing it in keeps a network fetch and a megabyte of
// zip library out of every case here.
vi.mock("../Components/FileUpload/WordDocument", () => ({
  default: ({ fileUrl, onDownload }) => (
    <div data-testid="word-document" data-url={fileUrl}>
      <button onClick={onDownload}>Save a copy</button>
    </div>
  ),
}));


describe("DocumentViewer Component", () => {
  it("renders with file name", () => {
    render(<DocumentViewer fileUrl="test.pdf" fileName="My Document" onClose={vi.fn()} />);
    expect(screen.getByText("My Document")).toBeInTheDocument();
  });

  it("shows default title when no fileName", () => {
    render(<DocumentViewer fileUrl="test.pdf" onClose={vi.fn()} />);
    expect(screen.getByText("Document Preview")).toBeInTheDocument();
  });

  it("renders iframe for PDF files", () => {
    render(<DocumentViewer fileUrl="report.pdf" fileName="Report" onClose={vi.fn()} />);
    const iframe = document.querySelector("iframe");
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute("src")).toBe("report.pdf");
  });

  it("renders img for image files", () => {
    render(<DocumentViewer fileUrl="photo.jpg" fileName="Photo" onClose={vi.fn()} />);
    const img = document.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toBe("photo.jpg");
  });

  it("renders img for PNG files", () => {
    render(<DocumentViewer fileUrl="image.png" fileName="Image" onClose={vi.fn()} />);
    expect(document.querySelector("img")).toBeInTheDocument();
  });

  // A third-party viewer fetches the file from its own servers, so the request
  // never carries our origin and the referer-locked bucket denies it.
  it("renders a DOC file locally, never through a third-party viewer", () => {
    render(<DocumentViewer fileUrl="https://example.com/doc.docx" fileName="Word Doc" onClose={vi.fn()} />);
    // A third-party viewer would fetch the file to its own servers, which for
    // a clinical record means handing it to someone else.
    expect(document.querySelector("iframe")).not.toBeInTheDocument();
    expect(screen.getByTestId("word-document")).toHaveAttribute(
      "data-url",
      "https://example.com/doc.docx"
    );
  });

  it("shows download button for unsupported file types", () => {
    render(<DocumentViewer fileUrl="data.csv" fileName="Data" onClose={vi.fn()} />);
    expect(screen.getByText("Download File")).toBeInTheDocument();
  });

  it("shows cannot preview message for unsupported types", () => {
    render(<DocumentViewer fileUrl="data.csv" fileName="Data" onClose={vi.fn()} />);
    expect(screen.getByText("This file type cannot be previewed.")).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    const handleClose = vi.fn();
    render(<DocumentViewer fileUrl="test.pdf" fileName="Test" onClose={handleClose} />);
    const closeBtn = screen.getByLabelText("Close document viewer");
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it("shows loading spinner initially", () => {
    render(<DocumentViewer fileUrl="test.pdf" fileName="Test" onClose={vi.fn()} />);
    const spinner = document.querySelector(".doc-viewer-spinner");
    expect(spinner).toBeInTheDocument();
  });
});

describe("a link that cannot work", () => {
  const UNSIGNED =
    "https://s3.us-west-1.amazonaws.com/ausomebee-objects-storage/x.pdf";
  const renderUnsigned = (url = UNSIGNED) =>
    render(<DocumentViewer fileUrl={url} fileName="x.pdf" onClose={vi.fn()} />);

  // A bucket link with no signature reaches S3 anonymous and is denied, so
  // framing it would only show an empty panel.
  it("explains itself instead of framing a pdf it cannot read", () => {
    renderUnsigned();
    expect(document.querySelector("iframe")).not.toBeInTheDocument();
    expect(
      screen.getByText(/secure link is missing or has expired/i)
    ).toBeInTheDocument();
  });

  it("withholds the download prompt", () => {
    renderUnsigned();
    expect(screen.queryByText("Download File")).not.toBeInTheDocument();
  });

  // This overlay gates its loader on isLoading alone, so without the extra
  // guard the explanation would sit hidden behind a spinner with nothing left
  // to wait for.
  it("shows no spinner, and does not hide the explanation", () => {
    renderUnsigned();
    expect(document.querySelector(".doc-viewer-spinner")).not.toBeInTheDocument();
    expect(document.querySelector(".doc-viewer-content-hidden")).not.toBeInTheDocument();
  });

  it("still frames a signed link to the same object", () => {
    renderUnsigned(`${UNSIGNED}?X-Amz-Signature=abc`);
    expect(document.querySelector("iframe")).toBeInTheDocument();
  });

  it("reports a refused response rather than saving it", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 403, blob: async () => new Blob(["x"]) });
    URL.createObjectURL = vi.fn(() => "blob:x");
    const openTab = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <DocumentViewer fileUrl="https://cdn.example.com/a.pdf" fileName="a.pdf" onClose={vi.fn()} />
    );
    fireEvent.click(screen.getByLabelText("Download file"));
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalled());

    // The old code saved S3's error body as though it were the document.
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(openTab).not.toHaveBeenCalled();

    openTab.mockRestore();
    delete global.fetch;
  });
});

describe("a file the browser cannot preview", () => {
  const show = (url, name) =>
    render(<DocumentViewer fileUrl={url} fileName={name} onClose={vi.fn()} />);

  // Only a pdf iframe or an image ever reports that it loaded. A Word file
  // reports nothing, so holding the loader for it left the spinner turning
  // forever with the download prompt hidden behind it.
  it("hands a Word file straight to the renderer, with no loader of its own", () => {
    show("https://cdn.example.com/notes.docx", "notes.docx");

    // The renderer runs its own loader while it fetches and lays the document
    // out; the overlay waiting on it too left a spinner that never stopped.
    expect(document.querySelector(".doc-viewer-spinner")).not.toBeInTheDocument();
    expect(document.querySelector(".doc-viewer-content-hidden")).not.toBeInTheDocument();
    expect(screen.getByTestId("word-document")).toBeInTheDocument();
  });

  it("does the same for a type it does not recognise", () => {
    show("https://cdn.example.com/archive.zip", "archive.zip");
    expect(document.querySelector(".doc-viewer-spinner")).not.toBeInTheDocument();
    expect(screen.getByText("Download File")).toBeInTheDocument();
  });

  it("still holds the loader for a pdf until it loads", () => {
    show("https://cdn.example.com/a.pdf", "a.pdf");
    expect(document.querySelector(".doc-viewer-spinner")).toBeInTheDocument();
  });
});
