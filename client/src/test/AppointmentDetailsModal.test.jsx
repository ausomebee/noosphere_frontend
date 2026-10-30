import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import AppointmentDetailsModal from "../Components/Modal/UpcomingDashboardModal/AppointmentDetailsModal";

/**
 * The read-only appointment details sheet.
 *
 * Every value on screen has two possible sources: the full appointment the API
 * returned (`originalData`) or the thin table row it was opened from. The
 * fallbacks below are what make the modal usable when only the row is
 * available, so each field is checked from both directions.
 *
 * Times arrive as "HH:MM" or "HH:MM:SS" and are parsed against the appointment's
 * own date; anything else falls back to now, which is why the malformed cases
 * assert only that a time renders rather than which one.
 */

const onClose = vi.fn();
const onReschedule = vi.fn();

const full = (over = {}) => ({
  originalData: {
    id: "a1",
    date: "2026-03-04",
    startTime: "09:30",
    endTime: "10:45",
    client: { firstName: "Ada", lastName: "Bell" },
    clinicians: [{ fullName: "Dr Grace Hopper" }],
    appointmentServices: [{ serviceCode: { code: "97153", description: "Treatment" } }],
    session: { name: "ABA Therapy" },
    serviceLocation: "Home",
    ...over,
  },
});

const renderModal = (props = {}) =>
  render(
    <AppointmentDetailsModal
      isOpen
      onClose={onClose}
      onReschedule={onReschedule}
      appointment={full()}
      {...props}
    />
  );

const valueUnder = (label) =>
  screen.getByText(label).closest(".detail-column").querySelector(".detail-value").textContent;

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("when it renders at all", () => {
  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(document.body.querySelector(".appointment-details-modal")).toBeNull();
  });

  it("renders nothing without an appointment", () => {
    renderModal({ appointment: null });
    expect(document.body.querySelector(".appointment-details-modal")).toBeNull();
  });

  it("renders the sheet when open with an appointment", () => {
    renderModal();
    expect(screen.getByText("Appointment details")).toBeInTheDocument();
  });
});

describe("reading the appointment", () => {
  it("shows the client's name", () => {
    renderModal();
    expect(screen.getByText(/Ada Bell/)).toBeInTheDocument();
  });

  it("appends a preferred name in brackets", () => {
    renderModal({
      appointment: full({ client: { firstName: "Ada", lastName: "Bell", preferredName: "Addy" } }),
    });
    expect(screen.getByText(/Ada Bell \(Addy\)/)).toBeInTheDocument();
  });

  it("falls back to the row's client name", () => {
    renderModal({ appointment: { clientName: "Row Client" } });
    expect(screen.getByText(/Row Client/)).toBeInTheDocument();
  });

  it("says the client is unknown when neither source has one", () => {
    renderModal({ appointment: {} });
    expect(screen.getByText(/Unknown Client/)).toBeInTheDocument();
  });

  it("joins several clinicians", () => {
    renderModal({
      appointment: full({
        clinicians: [{ fullName: "Dr Grace Hopper" }, { fullName: "Dr Ada Bell" }],
      }),
    });
    expect(valueUnder("Clinician(s)")).toBe("Dr Grace Hopper, Dr Ada Bell");
  });

  it("falls back to the row's clinician", () => {
    renderModal({ appointment: { clinician: "Row Clinician" } });
    expect(valueUnder("Clinician(s)")).toBe("Row Clinician");
  });

  it("says nobody is assigned when neither source has a clinician", () => {
    renderModal({ appointment: {} });
    expect(valueUnder("Clinician(s)")).toBe("Not assigned");
  });

  it("joins service codes with their descriptions", () => {
    renderModal({
      appointment: full({
        appointmentServices: [
          { serviceCode: { code: "97153", description: "Treatment" } },
          { serviceCode: { code: "97155" } },
        ],
      }),
    });
    expect(valueUnder("Service Type")).toBe("97153 - Treatment, 97155");
  });

  it("falls back to the row's service type", () => {
    renderModal({ appointment: { serviceType: "Row Service" } });
    expect(valueUnder("Service Type")).toBe("Row Service");
  });

  it("says the service is unspecified when neither source has one", () => {
    renderModal({ appointment: {} });
    expect(valueUnder("Service Type")).toBe("Not specified");
  });

  it("shows the session name and location", () => {
    renderModal();
    expect(valueUnder("Session Type")).toBe("ABA Therapy");
    expect(valueUnder("Service Location")).toBe("Home");
  });

  it("falls back to the row's session type and location", () => {
    renderModal({ appointment: { sessionType: "Row Session", serviceLocation: "Row Clinic" } });
    expect(valueUnder("Session Type")).toBe("Row Session");
    expect(valueUnder("Service Location")).toBe("Row Clinic");
  });

  it("defaults the session type and location when neither source has them", () => {
    renderModal({ appointment: {} });
    expect(valueUnder("Session Type")).toBe("Group Training");
    expect(valueUnder("Service Location")).toBe("Clinic");
  });

  it.each([
    [true, "Yes"],
    [false, "No"],
  ])("reports travel recorded as %s", (requiresTravel, label) => {
    renderModal({ appointment: full({ requiresTravel }) });
    expect(valueUnder("Requires Travel")).toBe(label);
  });

  it("omits the travel row entirely when the appointment says nothing about it", () => {
    renderModal();
    expect(screen.queryByText("Requires Travel")).not.toBeInTheDocument();
  });
});

describe("the date and time", () => {
  it("formats the appointment's own slot", () => {
    renderModal();
    expect(valueUnder("Date and Time")).toBe("03/04/2026 • 9:30 AM - 10:45 AM");
  });

  it("accepts a time carrying seconds", () => {
    renderModal({ appointment: full({ startTime: "09:30:00", endTime: "10:45:00" }) });
    expect(valueUnder("Date and Time")).toContain("9:30 AM - 10:45 AM");
  });

  it("pads a single-digit hour", () => {
    renderModal({ appointment: full({ startTime: "9:05", endTime: "10:00" }) });
    expect(valueUnder("Date and Time")).toContain("9:05 AM");
  });

  it("keeps the minutes on an afternoon slot", () => {
    // A trailing-group regex used to eat the minutes off "16:07"; this pins it.
    renderModal({ appointment: full({ startTime: "16:07", endTime: "17:07" }) });
    expect(valueUnder("Date and Time")).toContain("4:07 PM - 5:07 PM");
  });

  it("still renders a time when the string is malformed", () => {
    renderModal({ appointment: full({ startTime: "nonsense", endTime: "also nonsense" }) });
    expect(valueUnder("Date and Time")).toMatch(/\d{1,2}:\d{2} [AP]M/);
  });

  it("still renders a time when the appointment has none", () => {
    renderModal({ appointment: full({ startTime: null, endTime: null }) });
    expect(valueUnder("Date and Time")).toMatch(/12:00 AM/);
  });

  it("still renders a time when a numeric time slips through", () => {
    renderModal({ appointment: full({ startTime: 930, endTime: 1045 }) });
    expect(valueUnder("Date and Time")).toMatch(/\d{1,2}:\d{2} [AP]M/);
  });

  it("says so when the date itself is unusable", () => {
    renderModal({ appointment: full({ date: "not-a-date" }) });
    expect(valueUnder("Date and Time")).toContain("Invalid Date");
  });

  it("falls back to today when the appointment has no date", () => {
    renderModal({ appointment: full({ date: null }) });
    expect(valueUnder("Date and Time")).toMatch(/^\d{2}\/\d{2}\/\d{4}/);
  });
});

describe("the recurrence badge", () => {
  const withRecurrence = (recurrence) =>
    renderModal({ appointment: full({ isRecurring: true, recurrence }) });

  it("says a one-off does not repeat", () => {
    renderModal();
    expect(screen.getByText("Does not repeat")).toBeInTheDocument();
  });

  it("says so when the appointment is flagged recurring but carries no rule", () => {
    renderModal({ appointment: full({ isRecurring: true }) });
    expect(screen.getByText("Does not repeat")).toBeInTheDocument();
  });

  it("describes a daily interval", () => {
    withRecurrence({ type: "day", interval: 3 });
    expect(screen.getByText("Every 3 days")).toBeInTheDocument();
  });

  it("describes a plain daily rule with an occurrence count", () => {
    withRecurrence({ type: "day", endType: "after", occurrences: 5 });
    expect(screen.getByText("Daily for 5 occurrences")).toBeInTheDocument();
  });

  it("describes a plain daily rule ending on a date", () => {
    withRecurrence({ type: "day", endType: "on", endOn: "2026-06-01" });
    expect(screen.getByText("Daily until 06/01/2026")).toBeInTheDocument();
  });

  it("describes a plain daily rule that never ends", () => {
    withRecurrence({ type: "day" });
    expect(screen.getByText("Daily")).toBeInTheDocument();
  });

  it("ignores an unusable end date on a daily rule", () => {
    withRecurrence({ type: "day", endOn: "not-a-date" });
    expect(screen.getByText("Daily")).toBeInTheDocument();
  });

  it("describes a weekly rule and its days", () => {
    withRecurrence({ type: "week", days: ["Mon", "Wed"] });
    expect(screen.getByText("Weekly on Mon, Wed")).toBeInTheDocument();
  });

  it("describes a weekly rule ending on a date", () => {
    withRecurrence({ type: "week", days: ["Mon"], endType: "on", endOn: "2026-06-01" });
    expect(screen.getByText("Weekly on Mon until 06/01/2026")).toBeInTheDocument();
  });

  it("copes with a weekly rule naming no days", () => {
    withRecurrence({ type: "week" });
    expect(screen.getByText("Weekly on")).toBeInTheDocument();
  });

  it("describes a monthly rule", () => {
    withRecurrence({ type: "month", day: 12 });
    expect(screen.getByText("Monthly on day 12")).toBeInTheDocument();
  });

  it("defaults a monthly rule to the first of the month", () => {
    withRecurrence({ type: "month" });
    expect(screen.getByText("Monthly on day 1")).toBeInTheDocument();
  });

  it("describes a monthly rule with an occurrence count", () => {
    withRecurrence({ type: "month", day: 2, endType: "after", occurrences: 4 });
    expect(screen.getByText("Monthly on day 2 for 4 occurrences")).toBeInTheDocument();
  });

  it("describes a monthly rule ending on a date", () => {
    withRecurrence({ type: "month", day: 2, endOn: "2026-06-01" });
    expect(screen.getByText("Monthly on day 2 until 06/01/2026")).toBeInTheDocument();
  });

  it("calls anything else a custom recurrence", () => {
    withRecurrence({ type: "fortnight" });
    expect(screen.getByText("Custom Recurrence")).toBeInTheDocument();
  });
});

describe("closing and rescheduling", () => {
  it("closes from the header button", () => {
    renderModal();
    fireEvent.click(screen.getByLabelText("Close appointment details"));
    expect(onClose).toHaveBeenCalled();
  });

  it("closes when the backdrop is clicked", () => {
    renderModal();
    fireEvent.click(document.body.querySelector(".appointment-details-overlay"));
    expect(onClose).toHaveBeenCalled();
  });

  it("stays open when the sheet itself is clicked", () => {
    renderModal();
    fireEvent.click(document.body.querySelector(".appointment-details-modal"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("hands the whole appointment to the reschedule callback", () => {
    const appointment = full();
    renderModal({ appointment });
    fireEvent.click(screen.getByText("Request Reschedule"));
    expect(onReschedule).toHaveBeenCalledWith(appointment);
  });
});

describe("service codes with pieces missing", () => {
  it("renders a service with no code and no description", () => {
    renderModal({ appointment: full({ appointmentServices: [{ serviceCode: {} }] }) });
    expect(valueUnder("Service Type")).toBe("");
  });

  it("renders a service whose serviceCode is absent entirely", () => {
    renderModal({ appointment: full({ appointmentServices: [{}] }) });
    expect(valueUnder("Service Type")).toBe("");
  });
});
