import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ReusableTable from "../Components/Table/ReuseableTable";

const mockColumns = [{ key: "name", title: "Name" }, { key: "email", title: "Email" }];
const mockData = [
  { id: "1", name: "John Doe", email: "john@example.com" },
  { id: "2", name: "Jane Smith", email: "jane@example.com" },
  { id: "3", name: "Bob Wilson", email: "bob@example.com" },
];
const mockTabs = [{ key: "all", label: "All" }, { key: "active", label: "Active", count: 2 }];

describe("ReusableTable Component", () => {
  it("renders title and subtitle", () => {
    render(<ReusableTable title="Users" subtitle="Manage users" columns={mockColumns} data={mockData} />);
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Manage users")).toBeInTheDocument();
  });

  it("renders column headers", () => {
    render(<ReusableTable title="Users" columns={mockColumns} data={mockData} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("renders data rows", () => {
    render(<ReusableTable title="Users" columns={mockColumns} data={mockData} />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    render(<ReusableTable title="Users" columns={mockColumns} data={[]} emptyState={{ title: "No users found", subtitle: "Add a user" }} />);
    expect(screen.getByText("No users found")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(<ReusableTable title="Users" columns={mockColumns} data={[]} loading={true} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders tabs and calls onTabChange", () => {
    const handleTabChange = vi.fn();
    render(<ReusableTable title="Users" columns={mockColumns} data={mockData} tabs={mockTabs} activeTab="all" onTabChange={handleTabChange} />);
    fireEvent.click(screen.getByText("Active"));
    expect(handleTabChange).toHaveBeenCalledWith("active");
  });

  it("shows tab count badge", () => {
    render(<ReusableTable title="Users" columns={mockColumns} data={mockData} tabs={mockTabs} activeTab="all" />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("handles search with debounce", () => {
    const handleSearch = vi.fn();
    vi.useFakeTimers();
    render(<ReusableTable title="Users" columns={mockColumns} data={mockData} onSearch={handleSearch} />);
    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "John" } });
    expect(handleSearch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(handleSearch).toHaveBeenCalledWith("John");
    vi.useRealTimers();
  });

  it("renders pagination", () => {
    render(<ReusableTable title="Users" columns={mockColumns} data={mockData} pagination={{ currentPage: 1, totalPages: 3 }} onPageChange={vi.fn()} />);
    expect(screen.getByText("Previous")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("disables Previous on first page", () => {
    render(<ReusableTable title="Users" columns={mockColumns} data={mockData} pagination={{ currentPage: 1, totalPages: 3 }} onPageChange={vi.fn()} />);
    expect(screen.getByText("Previous").closest("button")).toBeDisabled();
  });

  it("disables Next on last page", () => {
    render(<ReusableTable title="Users" columns={mockColumns} data={mockData} pagination={{ currentPage: 3, totalPages: 3 }} onPageChange={vi.fn()} />);
    expect(screen.getByText("Next").closest("button")).toBeDisabled();
  });

  it("calls onPageChange on click", () => {
    const handlePageChange = vi.fn();
    render(<ReusableTable title="Users" columns={mockColumns} data={mockData} pagination={{ currentPage: 2, totalPages: 3 }} onPageChange={handlePageChange} />);
    fireEvent.click(screen.getByText("Next").closest("button"));
    expect(handlePageChange).toHaveBeenCalledWith(3);
  });
});
