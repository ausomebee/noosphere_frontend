import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DocumentViewerProvider } from "../hooks/useDocumentViewer";
import useDocumentViewer from "../hooks/useDocumentViewer";

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
  const { openDocument, closeDocument } = useDocumentViewer();
  return (
    <div>
      <button onClick={() => openDocument("report.pdf", "Report")}>Open</button>
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

  it("opens viewer when openDocument is called", () => {
    render(
      <DocumentViewerProvider>
        <TestConsumer />
      </DocumentViewerProvider>
    );
    fireEvent.click(screen.getByText("Open"));
    expect(screen.getByTestId("document-viewer")).toBeInTheDocument();
    expect(screen.getByTestId("viewer-url").textContent).toBe("report.pdf");
    expect(screen.getByTestId("viewer-name").textContent).toBe("Report");
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
