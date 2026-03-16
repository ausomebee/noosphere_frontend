import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Alert from "../Components/Alert/Alert";

describe("Alert Component", () => {
  it("renders message text", () => {
    render(<Alert message="Something happened" />);
    expect(screen.getByText("Something happened")).toBeInTheDocument();
  });

  it("applies default variant class", () => {
    const { container } = render(<Alert message="Test" />);
    expect(container.querySelector(".alert-default")).toBeInTheDocument();
  });

  it("applies info variant class", () => {
    const { container } = render(<Alert message="Info" variant="info" />);
    expect(container.querySelector(".alert-info")).toBeInTheDocument();
  });

  it("applies warning variant class", () => {
    const { container } = render(<Alert message="Warning" variant="warning" />);
    expect(container.querySelector(".alert-warning")).toBeInTheDocument();
  });

  it("applies danger variant class", () => {
    const { container } = render(<Alert message="Danger" variant="danger" />);
    expect(container.querySelector(".alert-danger")).toBeInTheDocument();
  });

  it("renders primary action button", () => {
    const handleClick = vi.fn();
    render(<Alert message="Test" primaryAction={{ label: "Confirm", onClick: handleClick }} />);
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Confirm"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders secondary action button", () => {
    const handleClick = vi.fn();
    render(<Alert message="Test" secondaryAction={{ label: "Dismiss", onClick: handleClick }} />);
    expect(screen.getByText("Dismiss")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Dismiss"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders both action buttons", () => {
    render(
      <Alert
        message="Test"
        primaryAction={{ label: "Yes", onClick: vi.fn() }}
        secondaryAction={{ label: "No", onClick: vi.fn() }}
      />
    );
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("renders without action buttons", () => {
    const { container } = render(<Alert message="Simple alert" />);
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBe(0);
  });
});
