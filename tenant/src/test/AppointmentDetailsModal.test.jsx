import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

/**
 * The popover that opens when a calendar event is clicked. It shows the client,
 * therapist, service and session, describes how the appointment repeats, and
 * offers whichever of cancel / reschedule / edit / start the caller passed in.
 *
 * Two things carry the branching. The recurrence description is a small
 * hand-rolled formatter with a separate sentence per rule type and per end
 * condition, so it gets a case each. And the popover positions itself next to
 * the click, flipping left or up when it would fall off the viewport and
 * clamping to the edges after that -- since jsdom reports every element as
 * zero-sized, the tests that exercise the flip stub getBoundingClientRect to
 * give the popover a real width and height.
 */

const navigate = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => ({ showToast: vi.fn() }));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigate };
});

vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

import AppointmentDetailsModal from "../Components/ReusableModal/SchedulerModal/AppointmentDetailsModal";

const appointment = {
  id: "a1",
  clientId: "c1",
  clientName: "Ada Lovelace",
  clinicianNames: ["Grace Hopper", "Alan Turing"],
  serviceLocation: "Home",
  service: [
    { serviceType: "97153", modifierType: "HN" },
    { serviceType: "97155" },
  ],
  sessionName: "Direct Therapy",
};

const renderModal = (props = {}) =>
  render(
    <AppointmentDetailsModal
      isOpen
      onClose={vi.fn()}
      appointment={appointment}
      position={{ x: 100, y: 100 }}
      {...props}
    />
  );

const popover = () => document.querySelector(".appointment-modal-container");

const recurrenceText = () =>
  document.querySelector(".recurrence-badge span").textContent;

beforeEach(() => {
  vi.clearAllMocks();
  window.innerWidth = 1000;
  window.innerHeight = 800;
});

afterEach(() => {
  window.innerWidth = 1024;
  window.innerHeight = 768;
});

describe("when it renders at all", () => {
  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(popover()).toBeNull();
  });

  it("renders nothing without an appointment", () => {
    renderModal({ appointment: null });
    expect(popover()).toBeNull();
  });

  it("shows the appointment's details", () => {
    renderModal();
    expect(screen.getByText("Appointment Details")).toBeInTheDocument();
    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper, Alan Turing")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("97153 (HN), 97155")).toBeInTheDocument();
    expect(screen.getByText("Direct Therapy")).toBeInTheDocument();
  });

  it("falls back on every field the appointment leaves out", () => {
    renderModal({ appointment: { id: "a2", clientId: "c2" } });
    expect(screen.getByText(/Unknown Client/)).toBeInTheDocument();
    expect(screen.getByText("Unknown Therapist")).toBeInTheDocument();
    expect(screen.getByText("Unknown Session")).toBeInTheDocument();
    expect(screen.getAllByText("Not specified")).toHaveLength(2);
  });

  it("says the service is unspecified when the list is empty", () => {
    renderModal({ appointment: { ...appointment, service: [] } });
    expect(screen.getByText("Not specified")).toBeInTheDocument();
  });

  it("closes from the cross", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(document.querySelector(".close-button"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("describing the recurrence", () => {
  const describing = (over) =>
    renderModal({ appointment: { ...appointment, ...over } });

  it("says a one-off appointment does not repeat", () => {
    describing({});
    expect(recurrenceText()).toBe("Does not repeat");
  });

  it("says so too when the flag is set but the rule is missing", () => {
    describing({ isRecurring: true });
    expect(recurrenceText()).toBe("Does not repeat");
  });

  it("counts the days of a daily rule with an interval", () => {
    describing({ isRecurring: true, recurrence: { type: "day", interval: 3 } });
    expect(recurrenceText()).toBe("Every 3 days");
  });

  it("counts the occurrences of a plain daily rule", () => {
    describing({
      isRecurring: true,
      recurrence: { type: "day", endType: "after", occurrences: 6 },
    });
    expect(recurrenceText()).toBe("Daily for 6 occurrences");
  });

  it("gives the end date of a plain daily rule", () => {
    describing({
      isRecurring: true,
      recurrence: { type: "day", endType: "on", endOn: "2030-04-05" },
    });
    expect(recurrenceText()).toBe("Daily until 04/05/2030");
  });

  it("leaves a daily rule open ended when its end date is nonsense", () => {
    describing({
      isRecurring: true,
      recurrence: { type: "day", endType: "on", endOn: "not a date" },
    });
    expect(recurrenceText()).toBe("Daily");
  });

  it("leaves a daily rule open ended when it never ends", () => {
    describing({
      isRecurring: true,
      recurrence: { type: "day", endType: "never" },
    });
    expect(recurrenceText()).toBe("Daily");
  });

  it("lists the weekdays of a weekly rule", () => {
    describing({
      isRecurring: true,
      recurrence: { type: "week", days: ["mon", "wed"] },
    });
    expect(recurrenceText()).toBe("Weekly on mon, wed");
  });

  it("gives the end date of a weekly rule", () => {
    describing({
      isRecurring: true,
      recurrence: {
        type: "week",
        days: ["mon"],
        endType: "on",
        endOn: "2030-04-05",
      },
    });
    expect(recurrenceText()).toBe("Weekly on mon until 04/05/2030");
  });

  it("copes with a weekly rule that names no days", () => {
    describing({ isRecurring: true, recurrence: { type: "week" } });
    expect(recurrenceText()).toBe("Weekly on ");
  });

  it("ignores a weekly end date that will not parse", () => {
    describing({
      isRecurring: true,
      recurrence: {
        type: "week",
        days: ["mon"],
        endType: "on",
        endOn: "nope",
      },
    });
    expect(recurrenceText()).toBe("Weekly on mon");
  });

  it("names the day of the month of a monthly rule", () => {
    describing({
      isRecurring: true,
      recurrence: { type: "month", day: 12, endType: "never" },
    });
    expect(recurrenceText()).toBe("Monthly on day 12");
  });

  it("defaults a monthly rule to the first of the month", () => {
    describing({ isRecurring: true, recurrence: { type: "month" } });
    expect(recurrenceText()).toBe("Monthly on day 1");
  });

  it("counts the occurrences of a monthly rule", () => {
    describing({
      isRecurring: true,
      recurrence: { type: "month", day: 3, endType: "after", occurrences: 4 },
    });
    expect(recurrenceText()).toBe("Monthly on day 3 for 4 occurrences");
  });

  it("gives the end date of a monthly rule", () => {
    describing({
      isRecurring: true,
      recurrence: { type: "month", day: 3, endOn: "2030-04-05" },
    });
    expect(recurrenceText()).toBe("Monthly on day 3 until 04/05/2030");
  });

  it("ignores a monthly end date that will not parse", () => {
    describing({
      isRecurring: true,
      recurrence: { type: "month", day: 3, endOn: "nope" },
    });
    expect(recurrenceText()).toBe("Monthly on day 3");
  });

  it("gives up on a rule it has no sentence for", () => {
    describing({ isRecurring: true, recurrence: { type: "custom" } });
    expect(recurrenceText()).toBe("Custom Recurrence");
  });
});

describe("placing the popover", () => {
  const at = () => ({
    left: popover().style.left,
    top: popover().style.top,
  });

  it("sits below and to the right of the click", () => {
    renderModal({ position: { x: 100, y: 100 } });
    // 110px of a 1000px viewport across, 110px of an 800px viewport down --
    // the vertical share comes out of a float division, so compare loosely.
    expect(at().left).toBe("11vw");
    expect(parseFloat(at().top)).toBeCloseTo(13.75);
  });

  it("flips to the left when it would overflow the right edge", () => {
    renderModal({ position: { x: 900, y: 100 } });
    expect(at().left).toBe("49vw");
  });

  it("flips above when it would overflow the bottom edge", () => {
    renderModal({ position: { x: 100, y: 700 } });
    expect(at().top).toBe("48.75vh");
  });

  it("falls back to a fixed corner without a click position", () => {
    renderModal({ position: null });
    expect(at()).toEqual({ left: "50vw", top: "50vh" });
  });

  it("falls back to a fixed corner when the click has no coordinates", () => {
    renderModal({ position: { x: 0, y: 100 } });
    expect(at()).toEqual({ left: "50vw", top: "50vh" });
  });

  it("falls back to a fixed corner when the click has no vertical coordinate", () => {
    renderModal({ position: { x: 100, y: 0 } });
    expect(at()).toEqual({ left: "50vw", top: "50vh" });
  });

  it("clamps to the viewport once it has measured itself", () => {
    // jsdom reports every element as zero-sized, so the popover normally uses
    // its 400x300 fallback; give it a size wider and taller than the viewport
    // and both the flip and the clamp have to fire.
    const rect = vi
      .spyOn(Element.prototype, "getBoundingClientRect")
      .mockReturnValue({ width: 2000, height: 1600 });

    renderModal({ position: { x: 200, y: 200 } });
    expect(at()).toEqual({ left: "0vw", top: "0vh" });
    rect.mockRestore();
  });
});

describe("the footer actions", () => {
  it("offers nothing when the caller passes no handlers", () => {
    renderModal();
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
    expect(screen.queryByText("Reschedule")).not.toBeInTheDocument();
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByText("Start Appointment")).not.toBeInTheDocument();
  });

  it("hands the appointment back to each handler it was given", () => {
    const onCancel = vi.fn();
    const onReschedule = vi.fn();
    const onEdit = vi.fn();
    renderModal({ onCancel, onReschedule, onEdit });

    fireEvent.click(screen.getByText("Cancel"));
    fireEvent.click(screen.getByText("Reschedule"));
    fireEvent.click(screen.getByText("Edit"));

    expect(onCancel).toHaveBeenCalledWith(appointment);
    expect(onReschedule).toHaveBeenCalledWith(appointment);
    expect(onEdit).toHaveBeenCalledWith(appointment);
  });

  it("routes to the session runner", () => {
    renderModal({ canStart: true });
    fireEvent.click(screen.getByText("Start Appointment"));
    expect(navigate).toHaveBeenCalledWith("/appointments/start/a1/c1");
  });

  it("strips an occurrence stamp off the id before routing", () => {
    renderModal({
      canStart: true,
      appointment: { ...appointment, id: "a1_1700000000" },
    });
    fireEvent.click(screen.getByText("Start Appointment"));
    expect(navigate).toHaveBeenCalledWith("/appointments/start/a1/c1");
  });

  it("refuses to start an appointment with no id", () => {
    renderModal({
      canStart: true,
      appointment: { ...appointment, id: undefined },
    });
    fireEvent.click(screen.getByText("Start Appointment"));

    expect(toast.showToast).toHaveBeenCalledWith(
      "Missing appointment or client ID",
      "error"
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it("refuses to start an appointment with no client", () => {
    renderModal({
      canStart: true,
      appointment: { ...appointment, clientId: undefined },
    });
    fireEvent.click(screen.getByText("Start Appointment"));

    expect(toast.showToast).toHaveBeenCalledWith(
      "Missing appointment or client ID",
      "error"
    );
  });

  it("refuses an id that is nothing but an occurrence stamp", () => {
    renderModal({
      canStart: true,
      appointment: { ...appointment, id: "_1700000000" },
    });
    fireEvent.click(screen.getByText("Start Appointment"));

    expect(toast.showToast).toHaveBeenCalledWith(
      "Invalid appointment ID",
      "error"
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});
