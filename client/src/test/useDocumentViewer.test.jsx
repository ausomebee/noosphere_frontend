import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DocumentViewerProvider } from "../hooks/useDocumentViewer";
import useDocumentViewer from "../hooks/useDocumentViewer";

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

  it("opens viewer when openDocument is called", () => {
    render(
      <DocumentViewerProvider>
        <TestConsumer />
      </DocumentViewerProvider>
    );
    fireEvent.click(screen.getByText("Open"));
    expect(screen.getByTestId("document-viewer")).toBeInTheDocument();
    expect(screen.getByTestId("viewer-url").textContent).toBe("test.pdf");
    expect(screen.getByTestId("viewer-name").textContent).toBe("Test Doc");
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
