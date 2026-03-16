import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AuthorizationCard from "../Components/Cards/Dashboard/Authorization/AuthorizationCard";

const mockData = { totalAuthorized: 100, totalCompleted: 65, totalRemaining: 35 };
const mockOptions = [
  { value: "sc1", label: "97151 - Assessment" },
  { value: "sc2", label: "97153 - Adaptive Behavior" },
];

describe("AuthorizationCard Component", () => {
  it("renders title and subtitle", () => {
    render(<AuthorizationCard data={mockData} />);
    expect(screen.getByText("Authorization")).toBeInTheDocument();
    expect(screen.getByText("Overview of authorization usage")).toBeInTheDocument();
  });

  it("displays authorization stats", () => {
    render(<AuthorizationCard data={mockData} />);
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("65")).toBeInTheDocument();
    expect(screen.getByText("35")).toBeInTheDocument();
  });

  it("shows labels with data", () => {
    render(<AuthorizationCard data={mockData} />);
    expect(screen.getByText("Total Completed")).toBeInTheDocument();
    expect(screen.getByText("Total Remaining")).toBeInTheDocument();
  });

  it("shows empty state when no data", () => {
    render(<AuthorizationCard data={null} />);
    expect(screen.getByText("No data")).toBeInTheDocument();
    expect(screen.getByText("Total Authorized Sessions")).toBeInTheDocument();
  });

  it("shows Total Authorized label when empty", () => {
    render(<AuthorizationCard data={null} />);
    expect(screen.getByText("Total Authorized")).toBeInTheDocument();
  });

  it("shows default placeholder when no service code selected", () => {
    render(<AuthorizationCard data={null} serviceCodeOptions={mockOptions} selectedServiceCodeId="" />);
    expect(screen.getByText("Select service code")).toBeInTheDocument();
  });

  it("disables dropdown when no options", () => {
    render(<AuthorizationCard data={null} serviceCodeOptions={[]} />);
    expect(document.querySelector(".input-select")).toBeInTheDocument();
  });

  it("renders gauge SVG elements", () => {
    render(<AuthorizationCard data={mockData} />);
    const svg = document.querySelector(".gauge-svg");
    expect(svg).toBeInTheDocument();
    expect(svg.querySelectorAll("path").length).toBe(2);
  });

  it("calculates gauge fill", () => {
    render(<AuthorizationCard data={mockData} />);
    const filledArc = document.querySelector(".gauge-fill");
    expect(filledArc).toBeInTheDocument();
    expect(filledArc.getAttribute("stroke-dasharray")).toBeTruthy();
  });

  it("shows zero stats when data values missing", () => {
    render(<AuthorizationCard data={{}} />);
    document.querySelectorAll(".stat-number").forEach((stat) => {
      expect(stat.textContent).toBe("0");
    });
  });
});
