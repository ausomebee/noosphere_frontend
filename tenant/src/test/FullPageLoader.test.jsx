import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FullPageLoader from "../Components/FullPageLoader";

describe("FullPageLoader", () => {
  it("renders the logo image", () => {
    render(<FullPageLoader />);
    const img = screen.getByAltText("Noosphere");
    expect(img).toBeInTheDocument();
  });

  it("has role=status for accessibility", () => {
    render(<FullPageLoader />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("contains sr-only loading text", () => {
    render(<FullPageLoader />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("applies pulse animation to logo", () => {
    render(<FullPageLoader />);
    const img = screen.getByAltText("Noosphere");
    expect(img.style.animation).toContain("logoBreath");
  });
});
