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

  it("uses Google Docs viewer for DOC files", () => {
    render(<DocumentViewer fileUrl="https://example.com/doc.docx" fileName="Word Doc" onClose={vi.fn()} />);
    const iframe = document.querySelector("iframe");
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute("src")).toContain("docs.google.com/gview");
  });

  it("shows download button for unsupported file types", () => {
    render(<DocumentViewer fileUrl="data.csv" fileName="Data" onClose={vi.fn()} />);
    expect(screen.getByText("Download File")).toBeInTheDocument();
  });

  it("shows cannot preview message for unsupported types", () => {
    render(<DocumentViewer fileUrl="data.csv" fileName="Data" onClose={vi.fn()} />);
    expect(screen.getByText("This document type cannot be previewed directly.")).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    const handleClose = vi.fn();
    render(<DocumentViewer fileUrl="test.pdf" fileName="Test" onClose={handleClose} />);
    // Find the close button (has LuX icon)
    const buttons = document.querySelectorAll("button");
    const closeBtn = buttons[buttons.length - 1]; // last button is close
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it("shows loading spinner initially", () => {
    render(<DocumentViewer fileUrl="test.pdf" fileName="Test" onClose={vi.fn()} />);
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });
});
