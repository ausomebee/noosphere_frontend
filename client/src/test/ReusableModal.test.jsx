import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ReusableModal from "../Components/Modal/ReusableModal";

describe("ReusableModal Component", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<ReusableModal isOpen={false} onClose={vi.fn()} title="Test" />);
    expect(container.innerHTML).toBe("");
  });

  it("renders modal when open", () => {
    render(<ReusableModal isOpen={true} onClose={vi.fn()} title="Test Modal" />);
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
  });

  it("renders subtitle", () => {
    render(<ReusableModal isOpen={true} onClose={vi.fn()} title="Test" subTitle="A subtitle" />);
    expect(screen.getByText("A subtitle")).toBeInTheDocument();
  });

  it("renders primary and secondary buttons", () => {
    render(<ReusableModal isOpen={true} onClose={vi.fn()} title="Test" primaryButtonText="Save" secondaryButtonText="Cancel" />);
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("calls onPrimaryButtonClick", () => {
    const handlePrimary = vi.fn((e) => e.preventDefault());
    render(<ReusableModal isOpen={true} onClose={vi.fn()} title="Test" primaryButtonText="Save" onPrimaryButtonClick={handlePrimary} />);
    fireEvent.click(screen.getByText("Save"));
    expect(handlePrimary).toHaveBeenCalled();
  });

  it("calls onSecondaryButtonClick", () => {
    const handleSecondary = vi.fn();
    render(<ReusableModal isOpen={true} onClose={vi.fn()} title="Test" secondaryButtonText="Cancel" onSecondaryButtonClick={handleSecondary} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(handleSecondary).toHaveBeenCalled();
  });

  it("shows spinner when loading", () => {
    render(<ReusableModal isOpen={true} onClose={vi.fn()} title="Test" primaryButtonText="Save" primaryButtonLoading={true} />);
    expect(document.querySelector(".modal-btn-spinner")).toBeInTheDocument();
    expect(screen.queryByText("Save")).not.toBeInTheDocument();
  });

  it("disables primary button when loading", () => {
    render(<ReusableModal isOpen={true} onClose={vi.fn()} title="Test" primaryButtonText="Save" primaryButtonLoading={true} />);
    expect(document.querySelector('button[type="submit"]')).toBeDisabled();
  });

  it("disables secondary button when primary loading", () => {
    render(<ReusableModal isOpen={true} onClose={vi.fn()} title="Test" primaryButtonText="Save" secondaryButtonText="Cancel" primaryButtonLoading={true} />);
    expect(screen.getByText("Cancel")).toBeDisabled();
  });

  it("renders children", () => {
    render(<ReusableModal isOpen={true} onClose={vi.fn()} title="Test"><p>Body content</p></ReusableModal>);
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("renders tabs", () => {
    const tabs = [{ name: "Tab1", content: <p>Content 1</p> }, { name: "Tab2", content: <p>Content 2</p> }];
    render(<ReusableModal isOpen={true} onClose={vi.fn()} title="Test" tabs={tabs} activeTab="Tab1" />);
    expect(screen.getByText("Tab1")).toBeInTheDocument();
    expect(screen.getByText("Tab2")).toBeInTheDocument();
  });
});
