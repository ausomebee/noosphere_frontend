import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DocumentViewerProvider } from "../hooks/useDocumentViewer";
import useDocumentViewer from "../hooks/useDocumentViewer";

// Mock DocumentViewer — control version uses isOpen prop + portal
vi.mock("../Components/ReusableModal/DocumentViewer", () => ({
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
      <button onClick={() => openDocument("invoice.pdf", "Invoice")}>Open</button>
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
        <p>Admin Panel</p>
      </DocumentViewerProvider>
    );
    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
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
    expect(screen.getByTestId("viewer-url").textContent).toBe("invoice.pdf");
    expect(screen.getByTestId("viewer-name").textContent).toBe("Invoice");
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
