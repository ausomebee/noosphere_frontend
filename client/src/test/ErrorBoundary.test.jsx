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
    expect(screen.getByText("Refresh Page")).toBeInTheDocument();
  });

  it("does NOT expose stack trace", () => {
    render(<ErrorBoundary><ThrowError shouldThrow={true} /></ErrorBoundary>);
    expect(screen.queryByText("Test error")).not.toBeInTheDocument();
    expect(document.querySelector("details")).not.toBeInTheDocument();
  });

  it("shows refresh button", () => {
    render(<ErrorBoundary><ThrowError shouldThrow={true} /></ErrorBoundary>);
    const btn = screen.getByText("Refresh Page");
    expect(btn.tagName).toBe("BUTTON");
  });
});
