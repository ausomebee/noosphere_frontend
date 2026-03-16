import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OverviewCard from "../Components/Cards/Dashboard/Overview/OverviewCard";

const mockData = {
  completedSessions: 42,
  avgSessionDuration: "01:30hrs",
  upcomingSessions: 5,
  chartData: [
    { month: "Jan", value: 8 },
    { month: "Feb", value: 12 },
    { month: "Mar", value: 6 },
    { month: "Apr", value: 18 },
    { month: "May", value: 10 },
  ],
};

describe("OverviewCard Component", () => {
  it("renders title and subtitle", () => {
    render(<OverviewCard data={mockData} />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Your sessions at a glance")).toBeInTheDocument();
  });

  it("displays stats when data is provided", () => {
    render(<OverviewCard data={mockData} />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("01:30hrs")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows empty state when no data", () => {
    render(<OverviewCard data={null} />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("shows empty state when chartData is empty", () => {
    render(<OverviewCard data={{ chartData: [] }} />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("renders bars for each data point", () => {
    render(<OverviewCard data={mockData} />);
    expect(screen.getByText("Jan")).toBeInTheDocument();
    expect(screen.getByText("May")).toBeInTheDocument();
  });

  it("shows tooltip on bar hover with value", () => {
    render(<OverviewCard data={mockData} />);
    const barGroups = document.querySelectorAll(".bar-group");
    fireEvent.mouseEnter(barGroups[0]);
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("sessions")).toBeInTheDocument();
    expect(document.querySelector(".bar-tooltip")).toBeInTheDocument();
  });

  it("hides tooltip when mouse leaves bar", () => {
    render(<OverviewCard data={mockData} />);
    const barGroups = document.querySelectorAll(".bar-group");
    fireEvent.mouseEnter(barGroups[0]);
    expect(screen.getByText("8")).toBeInTheDocument();
    fireEvent.mouseLeave(barGroups[0]);
    expect(screen.queryByText("sessions")).not.toBeInTheDocument();
  });

  it("calls onPeriodChange when period selector changes", () => {
    const handlePeriodChange = vi.fn();
    render(<OverviewCard data={mockData} onPeriodChange={handlePeriodChange} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "week" } });
    expect(handlePeriodChange).toHaveBeenCalledWith("week");
  });

  it("renders period selector with correct default", () => {
    render(<OverviewCard data={mockData} selectedPeriod="month" />);
    expect(screen.getByRole("combobox").value).toBe("month");
  });

  it("renders placeholder months in empty state", () => {
    render(<OverviewCard data={null} />);
    expect(document.querySelectorAll(".bar-label").length).toBe(5);
  });
});
