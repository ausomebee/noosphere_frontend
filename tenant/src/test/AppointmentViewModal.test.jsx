import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import AppointmentViewModal from "../Components/ReusableModal/SchedulerModal/AppointmentViewModal";

/**
 * The read-only appointment details modal opened from a notification. It is
 * handed whatever row shape the caller happens to have — Upcoming and Past rows
 * differ — so every field goes through a defensive renderer rather than being
 * read straight out of the record.
 *
 * That renderer is most of the surface worth testing: a missing value becomes
 * an em dash, an object value is flattened to its date and time, the date is
 * parsed and reformatted unless it cannot be parsed at all, and the service
 * types come from either an array or a single string. The fixtures below
 * therefore feed it deliberately ragged records.
 *
 * The four action callbacks are optional and each one that is supplied renders
 * its own button; supplying none removes the whole action row. Those buttons are
 * the shared `Button`, whose accessible name is its label, so they are addressed
 * by role and name.
 */

const DASH = "—";

const appointmentRecord = (over = {}) => ({
  clientName: "Ada Lovelace",
  therapistName: "Dr. Grace Hopper",
  date: "2025-03-14T09:00:00.000Z",
  time: "9:00 AM",
  serviceTypes: ["Direct therapy", "Assessment"],
  sessionType: "In person",
  ...over,
});

const renderModal = (props = {}) =>
  render(
    <AppointmentViewModal
      isOpen
      onClose={vi.fn()}
      appointment={appointmentRecord()}
      {...props}
    />
  );

// Each field is a label paragraph followed by its value paragraph.
const fieldValue = (label) =>
  screen.getByText(label).nextElementSibling.textContent;

const actionRow = () => document.body.querySelector(".modal-content .flex.gap-3");

beforeEach(() => {
  vi.clearAllMocks();
  // ReusableModal restores the page scroll as it unmounts, which jsdom refuses
  // to implement and logs about on every single test.
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

describe("when the modal has nothing to show", () => {
  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(document.body.querySelector(".modal-content")).toBeNull();
  });

  it("renders nothing without an appointment", () => {
    renderModal({ appointment: null });
    expect(document.body.querySelector(".modal-content")).toBeNull();
  });
});

describe("the appointment fields", () => {
  it("lays out a fully populated appointment", () => {
    renderModal();
    expect(document.body.querySelector(".modal-title-text")).toHaveTextContent(
      "Appointment details"
    );
    expect(fieldValue("Client")).toBe("Ada Lovelace");
    expect(fieldValue("Clinician(s)")).toBe("Dr. Grace Hopper");
    expect(fieldValue("Date")).toBe("Mar 14, 2025");
    expect(fieldValue("Time")).toBe("9:00 AM");
    expect(fieldValue("Service Type(s)")).toBe("Direct therapy, Assessment");
    expect(fieldValue("Session Type")).toBe("In person");
  });

  it("dashes out fields the record never set", () => {
    renderModal({
      appointment: {
        clientName: null,
        therapistName: undefined,
        time: "",
        sessionType: null,
      },
    });
    expect(fieldValue("Client")).toBe(DASH);
    expect(fieldValue("Clinician(s)")).toBe(DASH);
    expect(fieldValue("Time")).toBe(DASH);
    expect(fieldValue("Session Type")).toBe(DASH);
  });

  // Some row shapes carry a nested { date, time } instead of a plain string.
  it("flattens an object value into its date and time", () => {
    renderModal({
      appointment: appointmentRecord({
        clientName: { date: "Mar 14", time: "9:00 AM" },
      }),
    });
    expect(fieldValue("Client")).toBe("Mar 14 · 9:00 AM");
  });

  it("keeps whichever half of an object value exists", () => {
    renderModal({
      appointment: appointmentRecord({ clientName: { time: "9:00 AM" } }),
    });
    expect(fieldValue("Client")).toBe("9:00 AM");
  });

  it("dashes out an object value with neither half", () => {
    renderModal({ appointment: appointmentRecord({ clientName: {} }) });
    expect(fieldValue("Client")).toBe(DASH);
  });
});

describe("the appointment date", () => {
  it("falls back to the dateTime when there is no date", () => {
    renderModal({
      appointment: appointmentRecord({
        date: undefined,
        dateTime: "2025-12-01T00:00:00.000Z",
      }),
    });
    expect(fieldValue("Date")).toBe("Dec 01, 2025");
  });

  it("dashes out an appointment with no date at all", () => {
    renderModal({
      appointment: appointmentRecord({ date: null, dateTime: null }),
    });
    expect(fieldValue("Date")).toBe(DASH);
  });

  // A date the browser cannot parse is shown as it was stored rather than as
  // "Invalid Date", which is what formatting it would produce.
  it("shows an unparseable date exactly as it was stored", () => {
    renderModal({ appointment: appointmentRecord({ date: "sometime soon" }) });
    expect(fieldValue("Date")).toBe("sometime soon");
  });
});

describe("the service types", () => {
  it("joins a list of service types", () => {
    renderModal({
      appointment: appointmentRecord({ serviceTypes: ["Assessment"] }),
    });
    expect(fieldValue("Service Type(s)")).toBe("Assessment");
  });

  it("falls back to the single service type when the list is empty", () => {
    renderModal({
      appointment: appointmentRecord({
        serviceTypes: [],
        serviceType: "Parent training",
      }),
    });
    expect(fieldValue("Service Type(s)")).toBe("Parent training");
  });

  it("falls back to the single service type when the list is not a list", () => {
    renderModal({
      appointment: appointmentRecord({
        serviceTypes: "Direct therapy",
        serviceType: "Parent training",
      }),
    });
    expect(fieldValue("Service Type(s)")).toBe("Parent training");
  });

  it("dashes out an appointment with no service type of either shape", () => {
    renderModal({
      appointment: appointmentRecord({ serviceTypes: [], serviceType: undefined }),
    });
    expect(fieldValue("Service Type(s)")).toBe(DASH);
  });
});

describe("the actions", () => {
  it("draws no action row when the caller supplies no callbacks", () => {
    renderModal();
    expect(actionRow()).toBeNull();
  });

  it("draws only the actions the caller permitted", () => {
    renderModal({ onStart: vi.fn(), onCancel: vi.fn() });
    expect(actionRow()).not.toBeNull();
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reschedule" })).toBeNull();
  });

  it("runs each action from its own button", () => {
    const onStart = vi.fn();
    const onEdit = vi.fn();
    const onReschedule = vi.fn();
    const onCancel = vi.fn();
    renderModal({ onStart, onEdit, onReschedule, onCancel });
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Reschedule" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onReschedule).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("keeps the action row for a single reschedule callback", () => {
    const onReschedule = vi.fn();
    renderModal({ onReschedule });
    expect(actionRow()).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Reschedule" }));
    expect(onReschedule).toHaveBeenCalledTimes(1);
  });

  it("keeps the action row for a single edit callback", () => {
    renderModal({ onEdit: vi.fn() });
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });
});

describe("dismissing the modal", () => {
  it("closes from the cross in the header", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes from a click on the backdrop", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(document.body.querySelector(".modal-overlay"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stays open when the click landed inside the modal", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(document.body.querySelector(".modal-content"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
