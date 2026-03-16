import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Button from "../Components/Button/Button";

describe("Button Component", () => {
  it("renders with label text", () => {
    render(<Button label="Click me" />);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("calls onClick handler when clicked", () => {
    const handleClick = vi.fn();
    render(<Button label="Submit" onClick={handleClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("shows spinner and hides label when loading", () => {
    render(<Button label="Save" loading={true} />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Loading");
    expect(screen.queryByText("Save")).not.toBeInTheDocument();
    expect(button.querySelector(".btn-spinner")).toBeInTheDocument();
  });

  it("is disabled when loading", () => {
    render(<Button label="Save" loading={true} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("is disabled when disabled prop is true", () => {
    render(<Button label="Save" disabled={true} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("does not call onClick when disabled", () => {
    const handleClick = vi.fn();
    render(<Button label="Save" disabled={true} onClick={handleClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("does not call onClick when loading", () => {
    const handleClick = vi.fn();
    render(<Button label="Save" loading={true} onClick={handleClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("applies variant class", () => {
    render(<Button label="Test" variant="danger" />);
    expect(screen.getByRole("button").className).toContain("btn-danger");
  });

  it("applies size class", () => {
    render(<Button label="Test" size="large" />);
    expect(screen.getByRole("button").className).toContain("btn-large");
  });

  it("renders icon on the left by default", () => {
    const icon = <svg data-testid="test-icon" />;
    render(<Button label="With Icon" icon={icon} />);
    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
  });

  it("sets correct button type", () => {
    render(<Button label="Submit" type="submit" />);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("defaults to type button", () => {
    render(<Button label="Click" />);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});
