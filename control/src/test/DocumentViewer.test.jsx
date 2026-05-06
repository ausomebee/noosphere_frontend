import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DocumentViewer from "../Components/ReusableModal/DocumentViewer";

describe("DocumentViewer Component", () => {
  it("returns null when not open", () => {
    const { container } = render(
      <DocumentViewer isOpen={false} fileUrl="test.pdf" fileName="Test" onClose={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders with file name when open", () => {
    render(<DocumentViewer isOpen={true} fileUrl="test.pdf" fileName="My Document" onClose={vi.fn()} />);
    expect(screen.getByText("My Document")).toBeInTheDocument();
  });

  it("shows default title when no fileName", () => {
    render(<DocumentViewer isOpen={true} fileUrl="test.pdf" onClose={vi.fn()} />);
    expect(screen.getByText("Document Preview")).toBeInTheDocument();
  });

  it("renders iframe for PDF files", () => {
    render(<DocumentViewer isOpen={true} fileUrl="report.pdf" fileName="Report" onClose={vi.fn()} />);
    const iframe = document.querySelector("iframe");
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute("src")).toBe("report.pdf");
  });

  it("renders img for image files", () => {
    render(<DocumentViewer isOpen={true} fileUrl="photo.jpg" fileName="Photo" onClose={vi.fn()} />);
    const img = document.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toBe("photo.jpg");
  });

  it("uses Google Docs viewer for DOC files", () => {
    render(<DocumentViewer isOpen={true} fileUrl="https://example.com/doc.docx" fileName="Word Doc" onClose={vi.fn()} />);
    const iframe = document.querySelector("iframe");
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute("src")).toContain("docs.google.com/gview");
  });

  it("shows download button for unsupported file types", () => {
    render(<DocumentViewer isOpen={true} fileUrl="data.csv" fileName="Data" onClose={vi.fn()} />);
    expect(screen.getByText("Download File")).toBeInTheDocument();
  });

  it("shows cannot preview message for unsupported types", () => {
    render(<DocumentViewer isOpen={true} fileUrl="data.csv" fileName="Data" onClose={vi.fn()} />);
    expect(screen.getByText("This file type cannot be previewed.")).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    const handleClose = vi.fn();
    render(<DocumentViewer isOpen={true} fileUrl="test.pdf" fileName="Test" onClose={handleClose} />);
    const closeBtn = screen.getByLabelText("Close document viewer");
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it("has dialog role for accessibility", () => {
    render(<DocumentViewer isOpen={true} fileUrl="test.pdf" fileName="Test" onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes on Escape key", () => {
    const handleClose = vi.fn();
    render(<DocumentViewer isOpen={true} fileUrl="test.pdf" fileName="Test" onClose={handleClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(handleClose).toHaveBeenCalled();
  });
});
