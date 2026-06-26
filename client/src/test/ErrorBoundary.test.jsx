import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "../Helper/ErrorBoundary";

const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) throw new Error("Test error");
  return <p>No error</p>;
};

describe("ErrorBoundary", () => {
  const originalError = console.error;
  beforeAll(() => { console.error = vi.fn(); });
  afterAll(() => { console.error = originalError; });

  it("renders children when no error", () => {
    render(<ErrorBoundary><p>Child content</p></ErrorBoundary>);
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("renders fallback UI when error occurs", () => {
    render(<ErrorBoundary><ThrowError shouldThrow={true} /></ErrorBoundary>);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("offers Try Again and Reload Page buttons", () => {
    render(<ErrorBoundary><ThrowError shouldThrow={true} /></ErrorBoundary>);
    expect(screen.getByText("Try Again").tagName).toBe("BUTTON");
    expect(screen.getByText("Reload Page").tagName).toBe("BUTTON");
  });
});
