import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SuccessModal from "../Components/Modal/SuccessModal";

describe("SuccessModal Component", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<SuccessModal isOpen={false} onClose={vi.fn()} />);
    // Modal portals to body, container should be empty
    expect(container.innerHTML).toBe("");
  });

  it("renders default title when open", () => {
    render(<SuccessModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Awesome")).toBeInTheDocument();
  });

  it("renders default message", () => {
    render(<SuccessModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Your request has been processed!")).toBeInTheDocument();
  });

  it("renders custom title and message", () => {
    render(
      <SuccessModal
        isOpen={true}
        onClose={vi.fn()}
        title="Thank you!"
        message="Your session feedback has been submitted!"
      />
    );
    expect(screen.getByText("Thank you!")).toBeInTheDocument();
    expect(screen.getByText("Your session feedback has been submitted!")).toBeInTheDocument();
  });

  it("renders SVG illustration", () => {
    render(<SuccessModal isOpen={true} onClose={vi.fn()} />);
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});
