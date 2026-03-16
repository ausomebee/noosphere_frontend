import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NewFolderModal from "../Components/Modal/DocumentModal/NewFolderModal";

describe("NewFolderModal Component", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<NewFolderModal isOpen={false} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders create mode title", () => {
    render(<NewFolderModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Create New Folder")).toBeInTheDocument();
  });

  it("renders rename mode title", () => {
    render(<NewFolderModal isOpen={true} onClose={vi.fn()} isRenameMode={true} initialName="Old" />);
    expect(screen.getByText("Rename Folder")).toBeInTheDocument();
  });

  it("renders Create Folder button in create mode", () => {
    render(<NewFolderModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Create Folder")).toBeInTheDocument();
  });

  it("renders Save Changes button in rename mode", () => {
    render(<NewFolderModal isOpen={true} onClose={vi.fn()} isRenameMode={true} initialName="Old" />);
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
  });

  it("renders Cancel button", () => {
    render(<NewFolderModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("renders folder name input", () => {
    render(<NewFolderModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Folder Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. Medical Records 2025")).toBeInTheDocument();
  });

  it("pre-fills name in rename mode", () => {
    render(<NewFolderModal isOpen={true} onClose={vi.fn()} isRenameMode={true} initialName="My Folder" />);
    const input = screen.getByPlaceholderText("e.g. Medical Records 2025");
    expect(input.value).toBe("My Folder");
  });

  it("calls onClose when Cancel clicked", () => {
    const handleClose = vi.fn();
    render(<NewFolderModal isOpen={true} onClose={handleClose} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(handleClose).toHaveBeenCalled();
  });
});
