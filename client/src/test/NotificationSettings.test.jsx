import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NotificationSettings from "../Components/NotificationSettings/NotificationSettings";

const mockNotifications = {
  appointmentScheduled: true,
  appointmentRescheduled: false,
  appointmentAboutToStart: true,
  appointmentStarted: false,
  appointmentCancelled: true,
  appointmentCompletedAwaitingFeedback: false,
  documentRequested: true,
  formShared: false,
  authorizationAboutToExpire: true,
  authorizationExpired: false,
  authorizationUnitsAlmostExhausted: true,
  authorizationUnitsExhausted: false,
  signatureRequested: true,
};

describe("NotificationSettings Component", () => {
  it("renders title and description", () => {
    render(<NotificationSettings notifications={mockNotifications} onToggle={vi.fn()} />);
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Manage how and when you'd like to receive updates.")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(<NotificationSettings notifications={{}} isLoading={true} onToggle={vi.fn()} />);
    // Loading is now the standardized borderless spinner (role="status"), not inline text.
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("does not render notification items when loading", () => {
    render(<NotificationSettings notifications={{}} isLoading={true} onToggle={vi.fn()} />);
    expect(document.querySelector(".profile-notifications-list")).not.toBeInTheDocument();
  });

  it("renders notification labels", () => {
    render(<NotificationSettings notifications={mockNotifications} onToggle={vi.fn()} />);
    expect(screen.getByText("Notify me when a new appointment has been scheduled")).toBeInTheDocument();
    expect(screen.getByText("Notify me when a document has been requested from me")).toBeInTheDocument();
    expect(screen.getByText("Notify me when my signature is requested for a clinical report")).toBeInTheDocument();
  });

  it("renders the notifications list container", () => {
    render(<NotificationSettings notifications={mockNotifications} onToggle={vi.fn()} />);
    expect(document.querySelector(".profile-notifications-list")).toBeInTheDocument();
  });
});
