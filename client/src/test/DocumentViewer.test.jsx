import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DocumentViewer from "../Components/FileUpload/DocumentViewer";

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
  it("never hands a DOC file to a third-party viewer", () => {
    render(<DocumentViewer fileUrl="https://example.com/doc.docx" fileName="Word Doc" onClose={vi.fn()} />);
    expect(document.querySelector("iframe")).not.toBeInTheDocument();
    expect(screen.getByText("Download File")).toBeInTheDocument();
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
