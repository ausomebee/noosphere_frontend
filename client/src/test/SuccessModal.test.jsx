import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SuccessModal from "../Components/Modal/SuccessModal";

describe("SuccessModal Component", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<SuccessModal isOpen={false} onClose={vi.fn()} />);
    // Modal portals to body, container should be empty
    expect(container.innerHTML).toBe("");
  });

  it("renders Awesome title when open", () => {
    render(<SuccessModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Awesome")).toBeInTheDocument();
  });

  it("renders success message", () => {
    render(<SuccessModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Your reschedule request has been sent!")).toBeInTheDocument();
  });

  it("renders SVG illustration", () => {
    render(<SuccessModal isOpen={true} onClose={vi.fn()} />);
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});
